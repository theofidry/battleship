import { Observable, of } from 'rxjs';
import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { OpponentGrid } from '../grid/opponent-grid';
import { PlayerGrid } from '../grid/player-grid';
import { Fleet } from '../ship/fleet';
import { PositionedShip } from '../ship/positioned-ship';
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
    Cell,
> implements Player<ColumnIndex, RowIndex> {
    private readonly grid: PlayerGrid<ColumnIndex, RowIndex, PositionedShip<ColumnIndex, RowIndex>|undefined>;

    private readonly opponentGrid: OpponentGrid<ColumnIndex, RowIndex, Cell>;

    private lastMove: Coordinate<ColumnIndex, RowIndex> | undefined;

    constructor(
        public readonly name: string,
        fleet: Fleet,
        placementStrategy: PlacementStrategy<ColumnIndex, RowIndex>,
        private readonly hitStrategy: HitStrategy<ColumnIndex, RowIndex, Cell>,
        opponentGridFactory: ()=> OpponentGrid<ColumnIndex, RowIndex, Cell>,
    ) {
        this.grid = placementStrategy.place(fleet);
        this.opponentGrid = opponentGridFactory();
    }

    askMove(): Observable<Coordinate<ColumnIndex, RowIndex>> {
        const nextMove = this.hitStrategy.decide(this.opponentGrid);

        this.lastMove = nextMove;

        return of(nextMove);
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

        return just(ShotAcknowledgement.OK);
    }

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse> {
        try {
            return just(this.grid.recordHit(coordinates));
        } catch (error) {
            return nothing();
        }
    }
}
