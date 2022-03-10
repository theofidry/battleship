import chalk from 'chalk';
import {
    concatMap, map, MonoTypeOperatorFunction, Observable, OperatorFunction, range, shareReplay,
    Subject, takeUntil, tap,
} from 'rxjs';
import { assertIsNotUndefined } from './assert/assert-is-not-undefined';
import { HitResponse } from './communication/hit-response';
import { Coordinate } from './grid/coordinate';
import { Logger } from './logger/logger';
import { Player } from './player/player';
import { InteractivePlayer } from './standard-grid/interactive-player/interactive-player';
import assert = require('node:assert');

export class Match<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentGridCell,
> {
    constructor(private readonly logger: Logger) {
    }

    /**
     * Plays the match between two players. Once the game is finished, the
     * winner is returned.
     */
    play(
        playerA: Player<ColumnIndex, RowIndex, OpponentGridCell>,
        playerB: Player<ColumnIndex, RowIndex, OpponentGridCell>,
        maxTurn: number,
    ): Observable<TurnResult<ColumnIndex, RowIndex, OpponentGridCell>> {
        assert(maxTurn > 1, `Expect the match to allow at least 2 turns. Got ${maxTurn}.`);

        const maxTurnOffset = maxTurn + 1;
        const playing = new Subject();
        this.logger.log(`Starting a match between the player "${chalk.redBright(playerA.name)}" and "${chalk.blueBright(playerB.name)}".`);

        return range(1, maxTurnOffset + 1)
            .pipe(
                takeUntil(playing),
                checkMaxTurn(maxTurn),
                selectPlayer(playerA, playerB),
                tap(({ player }) => {
                    const newLineCount = 4;

                    if (!(player instanceof InteractivePlayer)) {
                        for (let i = 0; i < newLineCount; i++) {
                            this.logger.log('');
                        }
                    }
                }),
                tap(({ turn, player} ) => this.logger.log(`Turn ${turn}: ${playerA.name === player.name ? chalk.redBright(playerA.name) : chalk.blueBright(playerB.name)}`)),
                playTurn(this.logger),
                endGameIfWinnerDecided(this.logger, playing),
                shareReplay(maxTurnOffset),
            );
    }
}

function checkMaxTurn(maxTurn: number): MonoTypeOperatorFunction<number> {
    return tap((turn) => {
        if (turn > maxTurn) {
            throw MaxTurnReached.forMaxTurn(maxTurn);
        }
    });
}

type TurnBeginning<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey, OpponentGridCell> = {
    turn: number,
    player: Player<ColumnIndex, RowIndex, OpponentGridCell>,
    opponent: Player<ColumnIndex, RowIndex, OpponentGridCell>,
};

function selectPlayer<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey, OpponentGridCell>(
    playerA: Player<ColumnIndex, RowIndex, OpponentGridCell>,
    playerB: Player<ColumnIndex, RowIndex, OpponentGridCell>,
): OperatorFunction<number, TurnBeginning<ColumnIndex, RowIndex, OpponentGridCell>> {
    return map((turn) => {
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
    OpponentGridCell,
> = {
    winner: Player<ColumnIndex, RowIndex, OpponentGridCell>|undefined,
    turn: number,
};

function playTurn<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentGridCell,
>(
    logger: Logger,
): OperatorFunction<
    TurnBeginning<ColumnIndex, RowIndex, OpponentGridCell>,
    TurnResult<ColumnIndex, RowIndex, OpponentGridCell>
> {
    return concatMap(({ turn, player, opponent }) => {
        const playerTurn = new PlayerTurn(
            logger,
            turn,
            player,
            opponent,
        );

        return playerTurn.play();
    });
}

function endGameIfWinnerDecided<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentGridCell,
>(
    logger: Logger,
    playing: Subject<any>,
): MonoTypeOperatorFunction<TurnResult<ColumnIndex, RowIndex, OpponentGridCell>> {
    return tap(({ winner, turn }) => {
        if (winner !== undefined) {
            logger.log(`"${winner.name}" has won the match in ${turn} turns.`);
            playing.next(true);
            playing.complete();
        }
    });
}

class PlayerTurn<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentGridCell,
> {
    constructor(
        public readonly logger: Logger,
        public readonly turn: number,
        public readonly player: Player<ColumnIndex, RowIndex, OpponentGridCell>,
        public readonly opponent: Player<ColumnIndex, RowIndex, OpponentGridCell>,
    ) {
    }

    play(): Observable<TurnResult<ColumnIndex, RowIndex, OpponentGridCell>> {
        return this.player
            .askMove()
            .pipe(
                map((targetCoordinate) => this.getResult(targetCoordinate)),
            );
    }

    private getResult(targetCoordinate: Coordinate<ColumnIndex, RowIndex>): TurnResult<ColumnIndex, RowIndex, OpponentGridCell> {
        this.logger.log(`P: targets "${targetCoordinate.toString()}".`);

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
    ): TurnResult<ColumnIndex, RowIndex, OpponentGridCell> {
        let hitResponseString: string = hitResponse.valueOf();

        switch (hitResponse) {
            case HitResponse.SUNK:
                hitResponseString = chalk.yellowBright(hitResponse);
                break;

            case HitResponse.HIT:
                hitResponseString = chalk.redBright(hitResponse);
                break;

            case HitResponse.MISS:
                hitResponseString = chalk.blueBright(hitResponse);
                break;

            case HitResponse.WON:
                hitResponseString = chalk.bold(chalk.yellowBright(hitResponse));
                break;
        }

        this.logger.log(`O: replies "${hitResponseString}".`);

        const acknowledgement = this.player.sendResponse(hitResponse);

        acknowledgement
            .ifPresent(() => this.logger.log('P: acknowledges the answer.'))
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
    constructor(message?: string) {
        super(message);

        this.name = 'MaxTurnReached';
    }

    static forMaxTurn(maxTurn: number): MaxTurnReached {
        return new MaxTurnReached(`The match could not be finished in ${maxTurn} turns.`);
    }
}

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
