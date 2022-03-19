import { List } from 'immutable';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment, CoordinateNavigator } from '../grid/coordinate-navigator';
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
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
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

        this.previousAlignments = this.coordinateNavigator.findAlignments(
            this.previousHits,
            this.getMaxShipSize(),
        );

        this.analyze();

        // TODO
        if (previousMove.response === HitResponse.SUNK) {
            if (this.previousHits.size === 2) {
                this.minShipSize = 3;
            }

            this.previousHits = List();
        }
    }

    private analyze(): void {
        if (!this.enableShipSizeTracking) {
            return this.clearHitsIfSunk();
        }

        if (undefined === previousMove) {
            return;
        }

        this.previousMoves = this.previousMoves.push(previousMove);

        if (previousMove.response === HitResponse.HIT) {
            this.previousHits = this.previousHits.push(previousMove.target);
        }

        this.previousAlignments = this.coordinateNavigator.findAlignments(
            this.previousHits,
            this.getMaxShipSize(),
        );

        // TODO
        if (previousMove.response === HitResponse.SUNK) {
            if (this.previousHits.size === 2) {
                this.minShipSize = 3;
            }

            this.previousHits = List();
        }
    }

    private clearHitsIfSunk(): void {
        const previousMove = this.previousMoves.last();

        if (undefined !== previousMove && previousMove.response === HitResponse.SUNK) {
            this.previousHits = List();
        }
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

    getHitAlignments(): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return this.previousAlignments;
    }
}

enum OpponentShipStatus {
    NOT_FOUND,
    PARTIALLY_HIT,
    POTENTIALLY_SUNK,
    SUNK,
}

class OpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private coordinates: Array<Coordinate<ColumnIndex, RowIndex> | undefined>;
    private status = OpponentShipStatus.NOT_FOUND;

    constructor(
        public readonly size: ShipSize,
    ) {
        this.coordinates = new Array(size).fill(undefined);
    }

    getStatus(): OpponentShipStatus {
        return this.status;
    }
}
