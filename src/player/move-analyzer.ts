import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined, isNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse, isHitOrSunk } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment, isAlignmentWithNoGap } from '../grid/coordinate-alignment';
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

        this.logger.log('recording previous move.');
        this.logState('state before recalculation');

        this.previousMoves = this.previousMoves.push(previousMove);

        if (!isHitOrSunk(previousMove.response)) {
            this.logger.log('ignore previous move; do nothing');
            return;
        }

        this.addHitAndRecalculateAlignments(previousMove.target);

        this.logState('recalculating state');
        this.recalculateState();
        this.logState('recalculation done.');
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
            this.logger.log('enableShipSizeTracking not enabled: clear hits if sunk');
            return this.clearHits();
        }

        const sunkSuspiciousAlignment = suspiciousAlignments
            .filter((alignment) => alignment.contains(previousMove.target))
            .first();

        if (suspiciousAlignments.size > 0 && undefined !== sunkSuspiciousAlignment) {
            this.logger.log('Target belongs to a suspicious alignment.');
            suspiciousAlignments.forEach((suspiciousAlignment) => this.handleAlignmentWithSunkHit(suspiciousAlignment));

            this.suspiciousAlignments = List();

            return;
        }

        const sunkAlignment = this.previousAlignments
            .filter(
                (alignment) => alignment.contains(previousMove.target)
                    && alignment.sortedGaps.size === 0
            )
            .first();

        if (undefined !== sunkAlignment) {
            this.logger.log('Target belongs to a known alignment.');

            return this.handleAlignmentWithSunkHit(sunkAlignment);
        }

        this.logger.log('Unexpected sunk! One of the previous sunk alignment is not the size we thought it was.');

        const surroundingCoordinateStrings = this.coordinateNavigator
            .getSurroundingCoordinates(previousMove.target)
            .map(toString);

        const surroundingHitCoordinates = this.previousMoves
            .filter(({ target, response }) => {
                return response === HitResponse.HIT
                    && surroundingCoordinateStrings.includes(target.toString());
            })
            .map(({ target }) => target);

        const alignmentContainsSurroundingHitCoordinates = (alignment: CoordinateAlignment<ColumnIndex, RowIndex>) => surroundingHitCoordinates.reduce(
            (contains, coordinate) => contains || alignment.contains(coordinate),
            false,
        );

        const potentiallySunkAlignments = this.opponentFleet
            .getFleet()
            .filter((ship) => ship.getStatus() === OpponentShipStatus.POTENTIALLY_SUNK)
            .filter((ship) => {
                const alignment = ship.getAlignment();

                return undefined !== alignment && alignmentContainsSurroundingHitCoordinates(alignment);
            })
            .map((ship) => ship.unmarkAsPotentiallySunk());

        // TODO: move the block above to the opponentFleet in order to keep the recalculateSize private?
        this.opponentFleet.recalculateSize();

        console.log({
            potentiallySunkAlignments: potentiallySunkAlignments.map(toString).toArray(),
        });

        assert(potentiallySunkAlignments.size > 0, 'Expected to find a suspicious alignment.');

        // TODO: handle when there is more than one
        const suspiciousAlignment = potentiallySunkAlignments.first()!;

        let suspiciousCoordinates = suspiciousAlignment.sortedCoordinates.push(previousMove.target);
        let sortedSunkCoordinates = this.previousMoves
            .filter(({ target, response }) => response === HitResponse.SUNK && suspiciousAlignment.contains(target))
            .map(({ target }) => target)
            .unshift(previousMove.target);
        //let sunkCoordinate: Coordinate<ColumnIndex, RowIndex> | undefined;
        //let alignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>;
        //let matchingAlignment: CoordinateAlignment<ColumnIndex, RowIndex>;

        while (sortedSunkCoordinates.size > 0) {
            const maxShipSize = this.getMaxShipSize();

            const sunkCoordinate = sortedSunkCoordinates.first();
            assertIsNotUndefined(sunkCoordinate);

            sortedSunkCoordinates = sortedSunkCoordinates.shift();

            const prefilterAlignments = this.coordinateNavigator
                .findAlignments(
                    suspiciousCoordinates,
                    maxShipSize,
                );

            console.log({
                prefilterAlignments: prefilterAlignments.map(toString).toArray(),
                gaps: prefilterAlignments
                    .map((alignment) => alignment.sortedGaps)
                    .filter((gaps) => gaps.size > 0)
                    .map((gaps) => gaps.map(toString).join(','))
                    .toArray(),
            });

            const alignments = this.coordinateNavigator
                .findAlignments(
                    suspiciousCoordinates,
                    maxShipSize,
                )
                .filter((alignment) => alignment.contains(sunkCoordinate));

            let alignmentsWithoutGap = alignments.filter(isAlignmentWithNoGap);

            if (alignmentsWithoutGap.size === 0) {
                alignmentsWithoutGap = alignments
                    .flatMap((alignment) => this.coordinateNavigator.explodeByGaps(alignment))
                    .filter(isAlignmentWithNoGap)
                    .filter((alignment) => alignment.contains(sunkCoordinate));
            }

            assert(
                alignmentsWithoutGap.size === 1,
                () => `Expected to find only one alignment containing the sunk coordinate ${sunkCoordinate.toString()} among the coordinates ${suspiciousCoordinates.join(', ')} for the max size of ${maxShipSize}. Got: "${alignments.map(toString).join('", "')}".`,
            );

            const matchingAlignment = alignmentsWithoutGap.first()!;

            this.handleAlignmentWithSunkHit(matchingAlignment);
            suspiciousCoordinates = suspiciousCoordinates.filter((coordinate) => !matchingAlignment.contains(coordinate));
        }

        this.previousHits = suspiciousCoordinates;


        // const potentiallySunkAlignment = suspiciousAlignment;
        //
        // const alignments = this.coordinateNavigator
        //     .findAlignments(
        //         potentiallySunkAlignment.sortedCoordinates.push(previousMove.target),
        //         this.getMaxShipSize(),
        //     )
        //     .filter((alignment) => alignment.sortedGaps.size === 0);
        //
        // alignments.forEach(
        //     (alignment) => this.handleAlignmentWithSunkHit(alignment),
        // );
        //
        // console.log({
        //     alignments: alignments.map(toString).toArray(),
        // });
    }

    private handleAlignmentWithSunkHit(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        this.logger.log(`Marking alignment as potentially sunk ${sunkAlignment.toString()}`);

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

        console.log({
            label: label,
            previousMoves: this.previousMoves
                .map(({ target, response }) => ({ target: target.toString(), response }))
                .toArray(),
            previousHits: this.previousHits.map(toString).toArray(),
            alignments: this.previousAlignments.map(toString).toArray(),
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
            this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as sunk.`);

            matchingShip.markAsPotentiallySunk(sunkAlignment);
        }

        this.recalculateSize();

        this.logState();

        return Either.right(undefined);
    }

    recalculateSize(): void {
        const { fleet } = this;

        this.minShipSize = calculateMinShipSize(fleet);
        this.maxShipSize = calculateMaxShipSize(fleet);
    }

    private logState(): void {
        const remainingShips: ShipSize[] = [];
        const potentiallySunkShips: ShipSize[] = [];

        this.fleet.forEach((ship) => {
            switch (ship.getStatus()) {
                case OpponentShipStatus.NOT_FOUND:
                    remainingShips.push(ship.size);
                    break;

                case OpponentShipStatus.POTENTIALLY_SUNK:
                    potentiallySunkShips.push(ship.size);
                    break;
            }
        });

        this.logger.log({
            remainingShips,
            potentiallySunkShips,
            min: this.minShipSize,
            max: this.maxShipSize,
        });
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

    getAlignment(): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        return this.alignment;
    }

    unmarkAsPotentiallySunk(): CoordinateAlignment<ColumnIndex, RowIndex> {
        assert(this.status === OpponentShipStatus.POTENTIALLY_SUNK);

        this.status = OpponentShipStatus.NOT_FOUND;

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
