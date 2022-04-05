import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse, isHitOrSunk } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment } from '../grid/coordinate-alignment';
import { CoordinateNavigator } from '../grid/coordinate-navigator';
import { Logger } from '../logger/logger';
import { Fleet } from '../ship/fleet';
import { assertIsShipSize, ShipSize } from '../ship/ship-size';
import { Either } from '../utils/either';
import { PreviousMove } from './hit-strategy';

export class MoveAnalyzer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> {
    private previousMoves: List<PreviousMove<ColumnIndex, RowIndex>> = List();
    private previousHits: List<Coordinate<ColumnIndex, RowIndex>> = List();
    private previousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private suspiciousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private opponentFleet: OpponentFleet<ColumnIndex, RowIndex>;

    constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly fleet: Fleet,
        private readonly logger: Logger,
        private readonly enableShipSizeTracking: boolean,
    ) {
        this.opponentFleet = new OpponentFleet<ColumnIndex, RowIndex>(fleet, logger);
    }

    recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.logger.log(`Recording previous move ${previousMove.target.toString()}:${previousMove.response}.`);
        this.logState('State before recalculation');

        this.previousMoves = this.previousMoves.push(previousMove);

        if (!isHitOrSunk(previousMove.response)) {
            return this.logger.log('Ignore previous move: do nothing.');
        }

        this.logger.log('Add hit and re-calculate alignments.');
        this.addHitAndRecalculateAlignments(previousMove.target);

        this.logState('Recalculating state');
        this.recalculateState();
        this.logState('Recalculated state');
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

    getSuspiciousHitAlignments(): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return this.suspiciousAlignments;
    }

    private recalculateState(): void {
        const previousMove = this.previousMoves.last();
        const suspiciousAlignments = this.suspiciousAlignments;

        if (undefined === previousMove || previousMove.response !== HitResponse.SUNK) {
            this.logger.log('Nothing to do.');
            // If is not sunk there is nothing special to do.
            return;
        }

        if (!this.enableShipSizeTracking) {
            this.logger.log('Setting enableShipSizeTracking not enabled: clear hits if sunk.');
            return this.clearHits();
        }

        const sunkSuspiciousAlignment = suspiciousAlignments
            .filter((alignment) => alignment.contains(previousMove.target))
            .first();

        if (suspiciousAlignments.size > 0 && undefined !== sunkSuspiciousAlignment) {
            this.logger.log('Target belongs to a suspicious alignment.');
            suspiciousAlignments.forEach((suspiciousAlignment) => this.handleAlignmentWithSunkHit(suspiciousAlignment));

            this.suspiciousAlignments = List();
        } else {
            this.logger.log('No matching suspicious alignment found.');

            // TODO: maybe sunk alignment needs to be calculated in a special way (with no gaps?)
            const sunkAlignment = this.previousAlignments
                .filter((alignment) => alignment.contains(previousMove.target))
                .first();   // TODO: handle case where more than one has been found
            assertIsNotUndefined(sunkAlignment);

            this.handleAlignmentWithSunkHit(sunkAlignment);
        }
    }

    private handleAlignmentWithSunkHit(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        this.opponentFleet
            .markAsPotentiallySunk(sunkAlignment)
            .fold(
                (suspiciousAlignments) => this.suspiciousAlignments = suspiciousAlignments,
                () => this.removeHitsBelongingToAlignment(sunkAlignment),
            );
    }

    private addHitAndRecalculateAlignments(target: Coordinate<ColumnIndex, RowIndex>): void {
        this.previousHits = this.previousHits.push(target);

        this.recalculateAlignments();
    }

    private removeHitsBelongingToAlignment(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        this.previousHits = this.previousHits
            .filter((coordinate) => !alignment.contains(coordinate));

        this.recalculateAlignments();
    }

    private recalculateAlignments(): void {
        this.previousAlignments = this.coordinateNavigator.findAlignments(
            this.previousHits,
            this.getMaxShipSize(),
        );
    }

    private clearHits(): void {
        this.previousHits = List();
        this.previousAlignments = List();
    }

    private logState(label: string): void {
        const formatFleet = (shipStatus: OpponentShipStatus) => this.opponentFleet
            .getFleet()
            .filter((ship) => ship.getStatus() === shipStatus)
            .map(({ size }) => size)
            .join('|');

        this.logger.log({
            label: label,
            previousMoves: this.previousMoves
                .map(({ target, response }) => ({ target: target.toString(), response }))
                .toArray(),
            previousHits: this.previousHits.map(toString).toArray(),
            previousAlignments: this.previousAlignments.map(toString).toArray(),
            suspiciousAlignments: this.suspiciousAlignments.map(toString).toArray(),
            sunkShips: formatFleet(OpponentShipStatus.SUNK),
            potentiallySunkShips: formatFleet(OpponentShipStatus.POTENTIALLY_SUNK),
            notFoundShips: formatFleet(OpponentShipStatus.NOT_FOUND),
            opponentFleetMin: this.opponentFleet.getMinShipSize(),
            opponentFleetMax: this.opponentFleet.getMaxShipSize(),
        });
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
        private readonly logger: Logger,
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

    getFleet(): List<OpponentShip<ColumnIndex, RowIndex>> {
        return this.fleet;
    }

    markAsPotentiallySunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        const unsunkShips = this.fleet
            .filter((ship) => isNotFoundStatus(ship.getStatus()) && ship.size === alignmentSize);

        const matchingShip = unsunkShips.first();

        if (undefined === matchingShip) {
            // This means one of the ship we thought we sank was not of the size
            // we expected. In other words, it was not one single ship but rather
            // a ship AND bits of another one.
            const sunkShipOfSize = this.fleet
                .filter((ship) => ship.getStatus() === OpponentShipStatus.POTENTIALLY_SUNK && ship.size === alignmentSize)
                .first();

            assertIsNotUndefined(sunkShipOfSize);

            const suspiciousAlignment = sunkShipOfSize.unmarkAsPotentiallySunk();

            return Either.left(List([
                sunkAlignment,
                suspiciousAlignment,
            ]));
        } else {
            this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as potentially sunk.`);

            matchingShip.markAsPotentiallySunk(sunkAlignment);
        }

        this.recalculateSize();

        this.logState();

        return Either.right(undefined);
    }

    private recalculateSize(): void {
        const { fleet } = this;

        this.minShipSize = calculateMinShipSize(fleet);
        this.maxShipSize = calculateMaxShipSize(fleet);
    }

    private logState(): void {
        const remainingShips: ShipSize[] = [];
        const potentiallySunkShips: ShipSize[] = [];
        const sunkShips: ShipSize[] = [];

        this.fleet.forEach((ship) => {
            switch (ship.getStatus()) {
                case OpponentShipStatus.NOT_FOUND:
                    remainingShips.push(ship.size);
                    break;

                case OpponentShipStatus.POTENTIALLY_SUNK:
                    potentiallySunkShips.push(ship.size);
                    break;

                case OpponentShipStatus.SUNK:
                    potentiallySunkShips.push(ship.size);
                    break;
            }
        });

        this.logger.log({
            remainingShips,
            potentiallySunkShips,
            sunkShips,
            min: this.minShipSize,
            max: this.maxShipSize,
        });
    }
}

enum OpponentShipStatus {
    NOT_FOUND = 'NOT_FOUND',
    PARTIALLY_HIT = 'PARTIALLY_HIT',
    POTENTIALLY_SUNK = 'POTENTIALLY_SUNK',
    SUNK = 'SUNK',
}

class OpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined;
    private status = OpponentShipStatus.NOT_FOUND;

    constructor(
        public readonly size: ShipSize,
    ) {
        this.alignment = undefined;
    }

    getStatus(): OpponentShipStatus {
        return this.status;
    }

    unmarkAsPotentiallySunk(): CoordinateAlignment<ColumnIndex, RowIndex> {
        assert(this.status === OpponentShipStatus.POTENTIALLY_SUNK);

        const alignment = this.alignment;
        assertIsNotUndefined(alignment);

        return alignment;
    }

    markAsPotentiallySunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const previousStatus = this.status;

        assert(previousStatus !== OpponentShipStatus.SUNK);

        this.status = OpponentShipStatus.POTENTIALLY_SUNK;
        this.alignment = alignment;
    }
}

function calculateMinShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const min = fleet
        .filter((ship) => isNotFoundStatus(ship.getStatus()))
        .map((ship) => ship.size)
        .min();

    assertIsShipSize(min);

    return min;
}

function calculateMaxShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const max = fleet
        .filter((ship) => isNotFoundStatus(ship.getStatus()))
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}

function isNotFoundStatus(status: OpponentShipStatus): boolean {
    return [OpponentShipStatus.NOT_FOUND, OpponentShipStatus.PARTIALLY_HIT].includes(status);
}
