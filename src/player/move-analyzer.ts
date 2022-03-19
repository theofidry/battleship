import { List } from 'immutable';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment } from '../grid/coordinate-navigator';
import { assertIsShipSize, ShipSize } from '../ship/ship-size';
import { PreviousMove } from './hit-strategy';
import { Fleet } from '../ship/fleet';

export class MoveAnalyzer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> {
    private previousMoves: List<PreviousMove<ColumnIndex, RowIndex>> = List();
    private previousHits: List<Coordinate<ColumnIndex, RowIndex>> = List();
    private previousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private minShipSize: ShipSize = 2;
    private maxShipSize: ShipSize = 5;

    constructor(
        private readonly fleet: Fleet,
        private readonly enableShipSizeTracking: boolean,
    ) {
        const shipSizes = fleet.map((ship) => ship.size);

        const minShipSize = Math.min(...shipSizes);
        assertIsShipSize(minShipSize);

        const maxShipSize = Math.max(...shipSizes);
        assertIsShipSize(maxShipSize);

        this.minShipSize = minShipSize;
        this.maxShipSize = maxShipSize;
    }

    recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.previousMoves = this.previousMoves.push(previousMove);

        if (previousMove.response === HitResponse.HIT) {
            this.previousHits = this.previousHits.push(previousMove.target);
        }

        if (previousMove.response === HitResponse.SUNK) {
            if (this.previousHits.size === 2) {
                this.minShipSize = 3;
            }

            this.previousHits = List();
        }
    }

    recordPreviousHitAlignments(alignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>): void {
        this.previousAlignments = alignments;
    }

    getMinShipSize(): ShipSize {
        return this.minShipSize;
    }

    getMaxShipSize(): ShipSize {
        return this.maxShipSize;
    }

    getPreviousMoves(): List<PreviousMove<ColumnIndex, RowIndex>> {
        return this.previousMoves;
    }

    getPreviousHits(): List<Coordinate<ColumnIndex, RowIndex>> {
        return this.previousHits;
    }
}
