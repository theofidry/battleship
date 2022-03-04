import { map, range, tap } from 'rxjs';
import { assertIsNotUndefined } from './assert/assert-is-not-undefined';
import { HitResponse } from './communication/hit-response';
import { Coordinate } from './grid/coordinate';
import { Logger } from './logger/logger';
import { Player } from './player/player';

function selectPlayer<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>(
    playerA: Player<ColumnIndex, RowIndex>,
    playerB: Player<ColumnIndex, RowIndex>,
) {
    return map((turn: number) => {
        const players = [playerA, playerB];

        const playerIndex = turn % 2;
        const player = players.splice(playerIndex, 1)[0];
        const opponent = players[0];

        assertIsNotUndefined(player, `Could not find the player for the turn "${turn}".`);
        assertIsNotUndefined(opponent, `Could not find the player opponent for the turn "${turn}".`);

        return { turn, player, opponent };
    });
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

class PlayerTurn<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    constructor(
        public readonly logger: Logger,
        public readonly turn: number,
        public readonly player: Player<ColumnIndex, RowIndex>,
        public readonly opponent: Player<ColumnIndex, RowIndex>,
    ) {
    }

    play(): Player<ColumnIndex, RowIndex> | undefined {
        const targetCoordinate = this.player.askMove();
        this.logger.log(`Player ${this.player.name} targets ${targetCoordinate.toString()}`);

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
    ): Player<ColumnIndex, RowIndex> | undefined {
        this.logger.log(`Player ${this.player.name} replies ${hitResponse}.`);

        const acknowledgement = this.player.sendResponse(hitResponse);

        acknowledgement.orElseThrow(
            this.createError(
                'The player could not acknowledge the opponent response.',
                targetCoordinate,
            ),
        );

        return HitResponse.WON === hitResponse ? this.player : undefined;
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

export class Game<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    constructor(private readonly logger: Logger) {
    }

    play(
        playerA: Player<ColumnIndex, RowIndex>,
        playerB: Player<ColumnIndex, RowIndex>,
        maxTurn = 100,
    ) {
        this.logger.log(`Starting a game between the player ${playerA.name} and ${playerB.name}.`);

        return range(0, maxTurn)
            .pipe(
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
            );
    }
}
