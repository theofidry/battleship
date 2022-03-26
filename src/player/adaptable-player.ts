import { Observable, single, tap } from 'rxjs';
import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { GridRows } from '../grid/grid';
import { OpponentGrid } from '../grid/opponent-grid';
import { PlayerGrid } from '../grid/player-grid';
import { Fleet } from '../ship/fleet';
import { just, nothing, Optional } from '../utils/optional';
import { HitStrategy } from './hit-strategy';
import { PlacementStrategy } from './placement-strategy';
import { Player } from './player';

/**
 * Player implementation which provides an API that should be extensible enough
 * to create a variety of strategies/difficulty.
 */
export class AdaptablePlayer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
> implements Player<ColumnIndex, RowIndex, PlayerGridCell, OpponentGridCell> {
    private readonly grid: PlayerGrid<ColumnIndex, RowIndex, PlayerGridCell>;

    private readonly opponentGrid: OpponentGrid<ColumnIndex, RowIndex, OpponentGridCell>;

    private lastMove: Coordinate<ColumnIndex, RowIndex> | undefined;

    private lastResponse: HitResponse | undefined;

    constructor(
        public readonly name: string,
        fleet: Fleet,
        placementStrategy: PlacementStrategy<ColumnIndex, RowIndex, PlayerGridCell>,
        private readonly hitStrategy: HitStrategy<ColumnIndex, RowIndex, OpponentGridCell>,
        opponentGridFactory: ()=> OpponentGrid<ColumnIndex, RowIndex, OpponentGridCell>,
    ) {
        this.grid = placementStrategy.place(fleet);
        this.opponentGrid = opponentGridFactory();
    }

    askMove(): Observable<Coordinate<ColumnIndex, RowIndex>> {
        const { lastMove, lastResponse } = this;

        const previousMove = !lastMove || !lastResponse
            ? undefined
            : { target: lastMove, response: lastResponse };

        return this.hitStrategy
            .decide(
                this.opponentGrid,
                previousMove,
            )
            .pipe(
                tap((nextMove) => this.lastMove = nextMove),
                single(),    // This is to ensure it behaves the same way as if the input was a user input
            );
    }

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement> {
        const { lastMove } = this;

        if (undefined === lastMove) {
            return nothing();
        }

        switch (response) {
            case HitResponse.MISS:
                this.opponentGrid.markAsMissed(lastMove);
                break;

            case HitResponse.HIT:
            case HitResponse.SUNK:
                this.opponentGrid.markAsHit(lastMove);
                break;

            case HitResponse.WON:
                break;
        }

        this.lastResponse = response;

        return just(ShotAcknowledgement.OK);
    }

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse> {
        try {
            return just(this.grid.recordHit(coordinates));
        } catch (error) {
            return nothing();
        }
    }

    getPlayerGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, PlayerGridCell>> {
        return this.grid.getRows();
    }

    getOpponentGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, OpponentGridCell>> {
        return this.opponentGrid.getRows();
    }
}
