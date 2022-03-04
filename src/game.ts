import { map, Observable, range, tap, throwError } from 'rxjs';
import { assertIsNotUndefined } from './assert/assert-is-not-undefined';
import { HitResponse } from './communications/hit-response';
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

        return { player, opponent };
    });
}

function throwInvalidResponse() {
    return throwError(() => new Error('Invalid response received!'));
}

export class Game<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    constructor(private readonly logger: Logger) {
    }

    play(
        playerA: Player<ColumnIndex, RowIndex>,
        playerB: Player<ColumnIndex, RowIndex>,
        maxTurn = 100,
    ) {
        this.logger.log(`Starting a game between the player ${playerA.name} and ${playerB.name}`);

        return range(0, maxTurn)
            .pipe(
                tap((turn) => this.logger.log(`Turn ${turn}`)),
                selectPlayer(playerA, playerB),
                map(({ player, opponent }) => this.playTurn(player, opponent)),
            );
    }

    private playTurn(
        player: Player<ColumnIndex, RowIndex>,
        opponent: Player<ColumnIndex, RowIndex>,
    ): Observable<Player<ColumnIndex, RowIndex> | undefined> {
        const targetCoordinate = player.askMove();
        this.logger.log(`Player ${player.name} targets ${targetCoordinate.toString()}`);

        return opponent
            .askResponse(targetCoordinate)
            .ifPresent((hitResponse) => {
                this.logger.log(`Player ${player.name} replies ${hitResponse}`);
                player.sendResponse(hitResponse);
            })
            .map((hitResponse) => {
                this.logger.log(`Player ${player.name} replies ${hitResponse}`);
                player.sendResponse(hitResponse);

                return HitResponse.WON === hitResponse ? player : undefined;
            })
            .orElse(throwInvalidResponse());
    }
}
