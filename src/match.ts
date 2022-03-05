import { map, Observable, range, shareReplay, Subject, takeUntil, tap, throwError } from 'rxjs';
import { assertIsNotUndefined } from './assert/assert-is-not-undefined';
import { HitResponse } from './communication/hit-response';
import { Coordinate } from './grid/coordinate';
import { Logger } from './logger/logger';
import { Player } from './player/player';
import assert = require('node:assert');

function selectPlayer<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>(
    playerA: Player<ColumnIndex, RowIndex>,
    playerB: Player<ColumnIndex, RowIndex>,
) {
    return map((turn: number) => {
        const players = [playerB, playerA];

        const playerIndex = turn % 2;
        const player = players.splice(playerIndex, 1)[0];
        const opponent = players[0];

        assertIsNotUndefined(player, `Could not find the player for the turn "${turn}".`);
        assertIsNotUndefined(opponent, `Could not find the player opponent for the turn "${turn}".`);

        return { turn, player, opponent };
    });
}

export type TurnResult<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    winner: Player<ColumnIndex, RowIndex>|undefined,
    turn: number,
};

class InvalidPlayerResponse<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> extends Error {
    constructor(
        message: string,
        public readonly turn: number,
        public readonly playerName: string,
        public readonly opponentName: string,
        public readonly target: Coordinate<ColumnIndex, RowIndex>,
    ) {
        super(message);
    }
}

class PlayerTurn<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    constructor(
        public readonly logger: Logger,
        public readonly turn: number,
        public readonly player: Player<ColumnIndex, RowIndex>,
        public readonly opponent: Player<ColumnIndex, RowIndex>,
    ) {
    }

    play(): TurnResult<ColumnIndex, RowIndex> {
        const targetCoordinate = this.player.askMove();
        this.logger.log(`"${this.player.name}" targets "${targetCoordinate.toString()}".`);

        return this.opponent
            .askResponse(targetCoordinate)
            .map((hitResponse) => this.handleOpponentResponse(
                hitResponse,
                targetCoordinate,
            ))
            .orElseThrow(
                this.createError(
                    'The opponent could not respond.',
                    targetCoordinate,
                ),
            );
    }

    private handleOpponentResponse(
        hitResponse: HitResponse,
        targetCoordinate: Coordinate<ColumnIndex, RowIndex>
    ): TurnResult<ColumnIndex, RowIndex> {
        this.logger.log(`"${this.opponent.name}" replies "${hitResponse}".`);

        const acknowledgement = this.player.sendResponse(hitResponse);

        acknowledgement
            .ifPresent(() => this.logger.log(`"${this.player.name}" acknowledges the answer.`))
            .orElseThrow(
                this.createError(
                    'The player could not acknowledge the opponent response.',
                    targetCoordinate,
                ),
            );

        return {
            winner: HitResponse.WON === hitResponse ? this.player : undefined,
            turn: this.turn,
        };
    }

    private createError(
        message: string,
        targetCoordinate: Coordinate<ColumnIndex, RowIndex>,
    ): InvalidPlayerResponse<ColumnIndex, RowIndex> {
        return new InvalidPlayerResponse(
            message,
            this.turn,
            this.player.name,
            this.opponent.name,
            targetCoordinate,
        );
    }
}

class MaxTurnReached extends Error {
    static forMaxTurn(maxTurn: number): MaxTurnReached {
        return new MaxTurnReached(`The match could not be finished in ${maxTurn} turns.`);
    }
}

export class Match<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    constructor(private readonly logger: Logger) {
    }

    /**
     * Plays the match between two players. Once the game is finished, the
     * winner is returned.
     */
    play(
        playerA: Player<ColumnIndex, RowIndex>,
        playerB: Player<ColumnIndex, RowIndex>,
        maxTurn: number,
    ): Observable<TurnResult<ColumnIndex, RowIndex>> {
        assert(maxTurn > 1, `Expect the match to allow at least 2 turns. Got ${maxTurn}.`);

        const maxTurnOffset = maxTurn + 1;
        const playing = new Subject();
        this.logger.log(`Starting a match between the player "${playerA.name}" and "${playerB.name}".`);

        return range(1, maxTurnOffset + 1)
            .pipe(
                takeUntil(playing),
                map((turn) => {
                    if (turn > maxTurn) {
                        throw MaxTurnReached.forMaxTurn(maxTurn);
                    }

                    return turn;
                }),
                tap((turn) => this.logger.log(`Turn ${turn}.`)),
                selectPlayer(playerA, playerB),
                map(({ turn, player, opponent }) => {
                    const playerTurn = new PlayerTurn(
                        this.logger,
                        turn,
                        player,
                        opponent,
                    );

                    return playerTurn.play();
                }),
                tap(({ winner, turn }) => {
                    if (winner !== undefined) {
                        this.logger.log(`"${winner.name}" has won the match in ${turn} turns.`);
                        playing.next(true);
                        playing.complete();
                    }
                }),
                shareReplay(maxTurnOffset),
            );
    }
}
