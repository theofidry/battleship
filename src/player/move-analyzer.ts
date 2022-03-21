import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment, CoordinateNavigator } from '../grid/coordinate-navigator';
import { Fleet } from '../ship/fleet';
import { assertIsShipSize, ShipSize } from '../ship/ship-size';
import { PreviousMove } from './hit-strategy';

export class MoveAnalyzer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> {
    private previousMoves: List<PreviousMove<ColumnIndex, RowIndex>> = List();
    private previousHits: List<Coordinate<ColumnIndex, RowIndex>> = List();
    private previousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private opponentFleet: OpponentFleet<ColumnIndex, RowIndex>;

    constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly fleet: Fleet,
        private readonly enableShipSizeTracking: boolean,
    ) {
        this.opponentFleet = new OpponentFleet<ColumnIndex, RowIndex>(fleet);
    }

    recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.previousMoves = this.previousMoves.push(previousMove);

        if ([HitResponse.HIT, HitResponse.SUNK].includes(previousMove.response)) {
            this.previousHits = this.previousHits.push(previousMove.target);
        }

        this.previousAlignments = this.coordinateNavigator.findAlignments(
            this.previousHits,
            this.getMaxShipSize(),
        );

        this.recalculateState();
    }

    private recalculateState(): void {
        if (!this.enableShipSizeTracking) {
            return this.clearHitsIfSunk();
        }

        const previousMove = this.previousMoves.last();

        if (undefined === previousMove || previousMove.response !== HitResponse.SUNK) {
            return;
        }

        console.log({
            previousMove,
            alignments: this.previousAlignments.map(({ direction, coordinates }) => coordinates.map(toString).toArray()).toArray(),
        });

        const sunkAlignment = this.previousAlignments
            .filter((alignment) => alignment.coordinates.includes(previousMove.target))
            .first();   // TODO: handle case where more than one has been found

        assertIsNotUndefined(sunkAlignment);

        this.opponentFleet.markAsPotentiallySunk(sunkAlignment);

        console.log({
            sunkAlignmentCoordinates: sunkAlignment.coordinates.map(toString).toArray(),
            previousHits: this.previousHits.map((coordinate) => coordinate.toString()).toArray(),
        });

        this.previousHits = this.previousHits
            .filter((coordinate) => !sunkAlignment.coordinates.includes(coordinate));

        console.log({
            previousHits: this.previousHits.map((coordinate) => coordinate.toString()).toArray(),
        });
    }

    private clearHitsIfSunk(): void {
        const previousMove = this.previousMoves.last();

        if (undefined !== previousMove && previousMove.response === HitResponse.SUNK) {
            this.previousHits = List();
        }
    }

    getMinShipSize(): ShipSize {
        return this.opponentFleet.getMinShipSize();
    }

    getMaxShipSize(): ShipSize {
        return this.opponentFleet.getMaxShipSize();
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

class OpponentFleet<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private fleet: List<OpponentShip<ColumnIndex, RowIndex>>;
    private minShipSize: ShipSize;
    private maxShipSize: ShipSize;

    constructor(
        gameFleet: Fleet,
    ) {
        const opponentFleet = List(
            gameFleet.map((ship) => new OpponentShip<ColumnIndex, RowIndex>(ship.size)),
        );

        this.fleet = opponentFleet;

        this.minShipSize = calculateMinShipSize(opponentFleet);
        this.maxShipSize = calculateMaxShipSize(opponentFleet);
    }

    getMinShipSize(): ShipSize {
        return this.minShipSize;
    }

    getMaxShipSize(): ShipSize {
        return this.maxShipSize;
    }

    markAsPotentiallySunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const invalidStatuses = [OpponentShipStatus.POTENTIALLY_SUNK, OpponentShipStatus.SUNK];

        const ship = this.fleet
            .filter((_ship) => !invalidStatuses.includes(_ship.getStatus()) && _ship.size === sunkAlignment.coordinates.size)
            .first()!;

        ship.markAsPotentiallySunk(sunkAlignment.coordinates);

        this.recalculateSize();
    }

    private recalculateSize(): void {
        const { fleet } = this;

        this.minShipSize = calculateMinShipSize(fleet);
        this.maxShipSize = calculateMaxShipSize(fleet);
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

    markAsPotentiallySunk(coordinates: List<Coordinate<ColumnIndex, RowIndex>>): void {
        const previousStatus = this.status;

        assert(previousStatus !== OpponentShipStatus.SUNK);

        this.status = OpponentShipStatus.POTENTIALLY_SUNK;
        this.coordinates = coordinates.toArray();
    }
}

function calculateMinShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const validStates = [OpponentShipStatus.NOT_FOUND, OpponentShipStatus.PARTIALLY_HIT];

    const min = fleet
        .filter((ship) => validStates.includes(ship.getStatus()))
        .map((ship) => ship.size)
        .min();

    assertIsShipSize(min);

    return min;
}

function calculateMaxShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const validStates = [OpponentShipStatus.NOT_FOUND, OpponentShipStatus.PARTIALLY_HIT];

    const max = fleet
        .filter((ship) => validStates.includes(ship.getStatus()))
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}
