import {
    catchError,
    concatMap, map, MonoTypeOperatorFunction, Observable, OperatorFunction, range, shareReplay,
    Subject, switchMap, takeUntil, tap, throwError,
} from 'rxjs';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Player } from '../player/player';
import { MatchLogger } from './match-logger';

export class Match<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
> {
    constructor(private readonly logger: MatchLogger) {
    }

    /**
     * Plays the match between two players. Once the game is finished, the
     * winner is returned.
     */
    play(
        playerA: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
        playerB: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
        maxTurn: number,
    ): Observable<TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>> {
        assert(maxTurn > 1, `Expect the match to allow at least 2 turns. Got ${maxTurn}.`);

        const maxTurnOffset = maxTurn + 1;
        const playing = new Subject();
        this.logger.start(playerA, playerB);

        return range(1, maxTurnOffset + 1)
            .pipe(
                takeUntil(playing),
                checkMaxTurn(maxTurn),
                tap((turn) => this.logger.startTurn(turn)),
                selectPlayer(playerA, playerB),
                tap(({ player }) => this.logger.recordSelectedPlayer(player)),
                playTurn(this.logger),
                tap(() => this.logger.endTurn()),
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

type TurnBeginning<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
> = {
    turn: number,
    player: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
    opponent: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
};

function selectPlayer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
>(
    playerA: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
    playerB: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
): OperatorFunction<number, TurnBeginning<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>> {
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
    PlayerGridCell,
    OpponentGridCell,
> = {
    winner: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>|undefined,
    turn: number,
};

function playTurn<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
>(
    logger: MatchLogger,
): OperatorFunction<
    TurnBeginning<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
    TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>
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
    PlayerGridCell,
    OpponentGridCell,
>(
    logger: MatchLogger,
    playing: Subject<any>,
): MonoTypeOperatorFunction<TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>> {
    return tap(({ winner, turn }) => {
        if (winner !== undefined) {
            logger.recordWinner(winner, turn);
            playing.next(true);
            playing.complete();
        }
    });
}

class PlayerTurn<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
> {
    constructor(
        public readonly logger: MatchLogger,
        public readonly turn: number,
        public readonly player: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
        public readonly opponent: Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>,
    ) {
    }

    play(): Observable<TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell>> {
        let move$: Observable<Coordinate<ColumnIndex, RowIndex>>;

        try {
            move$ = this.player.askMove();
        } catch (error) {
            // We wrap this around in order to be able to use the catchError
            // close afterwards.
            // Indeed, there can be two types of failures here: one is an
            // uncaught error throw by askMove but another can be from askMove
            // itself that returns an empty observable or an error observable.
            move$ = throwError(error);
        }

        return move$
            .pipe(
                map((targetCoordinate) => this.getResult(targetCoordinate)),
                catchError((error) => {
                    this.logger.stopGame(this.opponent);

                    return throwError(error);
                })
            );
    }

    private getResult(targetCoordinate: Coordinate<ColumnIndex, RowIndex>): TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell> {
        this.logger.recordPlayerMove(this.player, targetCoordinate);

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
    ): TurnResult<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell> {
        this.logger.recordOpponentResponse(this.opponent, hitResponse);

        const acknowledgement = this.player.sendResponse(hitResponse);

        acknowledgement
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
