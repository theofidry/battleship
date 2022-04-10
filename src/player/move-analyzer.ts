import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
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
    private triedAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private previousAlignmentsWithConfirmedSunk: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private suspiciousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private opponentFleet: OpponentFleet<ColumnIndex, RowIndex>;

    constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly fleet: Fleet,
        private readonly logger: Logger,
        private readonly enableShipSizeTracking: boolean,
    ) {
        this.opponentFleet = new OpponentFleet<ColumnIndex, RowIndex>(
            fleet,
            coordinateNavigator,
            logger,
        );
    }

    recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.logger.log(`Recording previous move ${previousMove.target.toString()}:${previousMove.response}.`);
        this.logState('State before recalculation');

        this.previousMoves = this.previousMoves.push(previousMove);

        if (!isHitOrSunk(previousMove.response)) {
            this.logger.log('Recording a miss');

            if (!this.enableShipSizeTracking) {
                return this.logger.log('Setting enableShipSizeTracking: do nothing.');
            }

            this.checkOrphanHit();
            this.checkConfirmedAlignment();

            return this.logState('State after orphan check');
        }

        this.logger.log('Add hit and re-calculate alignments.');
        this.addHitAndRecalculateAlignments(previousMove.target);

        this.logState('Recalculating state');
        this.recalculateStateAfterSunk();
        this.checkOrphanHit();
        this.checkConfirmedAlignment();
        this.logState('Recalculated state');
    }

    getMinShipSize(): ShipSize {
        return this.opponentFleet.getMinShipSize();
    }

    getMaxShipSize(): ShipSize {
        return this.opponentFleet.getMaxShipSize();
    }

    getConfirmedMaxShipSize(): ShipSize {
        return this.opponentFleet.getConfirmedMaxShipSize();
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

    private recalculateStateAfterSunk(): void {
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

        const suspiciousAlignmentContainingSunk = suspiciousAlignments
            .filter((alignment) => alignment.contains(previousMove.target))
            .first();

        if (suspiciousAlignments.size > 0 && undefined !== suspiciousAlignmentContainingSunk) {
            this.logger.log('Target belongs to a suspicious alignment.');

            suspiciousAlignments.forEach((suspiciousAlignment) => this.handleAlignmentWithSunkHit(suspiciousAlignment));
            this.suspiciousAlignments = List();

            return;
        }

        this.logger.log('No matching suspicious alignment found.');

        const knownAlignmentContainingSunk = this.previousAlignments
            .filter(
                (alignment) => {
                    return alignment.sortedGaps.size === 0
                        && alignment.contains(previousMove.target);
                }
            )
            .first();

        if (undefined !== knownAlignmentContainingSunk) {
            this.logger.log(`Target belongs to a known alignment: ${knownAlignmentContainingSunk.toString()}.`);

            return this.handleAlignmentWithSunkHit(knownAlignmentContainingSunk);
        }

        this.logger.log('Unexpected sunk! One of the previous sunk alignment is not the size we thought it was.');

        const newSuspiciousAlignments = this.opponentFleet.reconsiderPotentiallySunkShips(
            previousMove.target,
            this.previousMoves,
        );
        assert(newSuspiciousAlignments.size === 1, `Expected to find only one suspicious alignment after reconsidering potentially sunk ships. Found: "${newSuspiciousAlignments.join('", "')}".`);
        const suspiciousAlignment = newSuspiciousAlignments.first()!;

        this.logger.log(`New suspicious alignments found: ${newSuspiciousAlignments.map(toString).join(', ')}.`);

        let suspiciousCoordinates = suspiciousAlignment.sortedCoordinates.push(previousMove.target);
        let sortedSunkCoordinates = this.previousMoves
            .filter(({ target, response }) => response === HitResponse.SUNK && suspiciousAlignment.contains(target))
            .map(({ target }) => target)
            .unshift(previousMove.target);

        while (sortedSunkCoordinates.size > 0) {
            const maxShipSize = this.getMaxShipSize();

            const sunkCoordinate = sortedSunkCoordinates.first();
            assertIsNotUndefined(sunkCoordinate);

            sortedSunkCoordinates = sortedSunkCoordinates.shift();

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
    }

    private handleAlignmentWithSunkHit(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        this.logger.log(`Marking alignment as potentially sunk ${sunkAlignment.toString()}.`);

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

    private checkOrphanHit(): void {
        this.logger.log('Checking for orphan hits.');

        // We might end up in the situation where we have a hit but all the
        // surrounding coordinates are either a miss or a hit belonging to a
        // sunk boat.
        // In this scenario, it means that one of the previously sunk boat was
        // not the size we thought it was.
        if (this.previousHits.size === 0 || this.previousHits.size > 1) {
            return this.logger.log('No orphan found: do nothing.');
        }

        const potentiallyOrphanHit = this.previousHits.first()!;
        const surroundingCoordinates = this.coordinateNavigator.getSurroundingCoordinates(potentiallyOrphanHit);

        const isOrphan = surroundingCoordinates
            .filter((coordinate) => !this.isInPreviousMoves(coordinate))
            .length === 0;

        if (!isOrphan) {
            return this.logger.log('No orphan found: do nothing.');
        }

        const orphanHit = potentiallyOrphanHit;

        this.logger.log(`Orphan hit ${orphanHit.toString()} found!`);

        assert(this.suspiciousAlignments.size === 0, `Did not expect to find an orphan hit whilst having suspicious alignments. Found: "${this.suspiciousAlignments.join('", "')}".`);

        const suspiciousAlignmentFromOrphan = this.opponentFleet.recordOrphanHit(
            orphanHit,
            this.triedAlignments,
            this.previousMoves
                .filter(({ response }) => response === HitResponse.SUNK)
                .map(({ target }) => target),
        );

        if (undefined === suspiciousAlignmentFromOrphan) {
            this.logger.log('No suspicious alignment found from orphan.');

            this.suspiciousAlignments = List();
            this.previousHits = List();

            return;
        }

        this.suspiciousAlignments = List([suspiciousAlignmentFromOrphan]);
        this.checkOrphanSuspiciousAlignment();
    }

    private checkConfirmedAlignment(): void {
        this.logger.log('Checking for confirmed alignment.');

        // TODO: keep track of the sunk coordinates somewhere as we re-use them
        //  in several places
        const sunkCoordinates = this.previousMoves
            .filter(({ target, response }) => HitResponse.SUNK)
            .map(({ target}) => target);

        const alignmentContainsSunkCoordinate = (coordinates: List<Coordinate<ColumnIndex, RowIndex>>): boolean => {
            for (const coordinate of coordinates) {
                for (const sunkCoordinate of sunkCoordinates) {
                    if (coordinate.equals(sunkCoordinate)) {
                        return true;
                    }
                }
            }

            return false;
        };

        const suspiciousAlignments = this.suspiciousAlignments.filter(
            ({ sortedCoordinates, sortedGaps }) => sortedGaps.size === 0 && alignmentContainsSunkCoordinate(sortedCoordinates),
        );

        // We might end up in the situation where we have an alignment for which
        // the surrounding coordinates are either a miss or a hit belonging to a
        // (confirmed) sunk boat which means the boat can be marked as confirmed.
        if (suspiciousAlignments.size === 0) {
            return this.logger.log('No suspicious alignment: do nothing.');
        }

        // TODO: this can be kept as a property instead.
        const knownCoordinates = this.previousMoves.map(({ target }) => target);

        const isAlignmentConfirmed = (alignment: CoordinateAlignment<ColumnIndex, RowIndex>): boolean => {
            const unknownSurroundingCoordinates = alignment.sortedCoordinates
                .flatMap((coordinate) => this.coordinateNavigator.getSurroundingCoordinates(coordinate))
                .filter((coordinate) => !knownCoordinates.contains(coordinate));

            return unknownSurroundingCoordinates.size === 0;
        };

        let newSuspiciousAlignments = this.suspiciousAlignments;

        suspiciousAlignments
            .filter(isAlignmentConfirmed)
            .forEach((alignment) => {
                this.opponentFleet.markAsSunk(alignment);
                this.removeHitsBelongingToAlignment(alignment);

                const suspiciousAlignmentIndex = newSuspiciousAlignments.indexOf(alignment);

                newSuspiciousAlignments = newSuspiciousAlignments.remove(suspiciousAlignmentIndex);
            });

        this.suspiciousAlignments = newSuspiciousAlignments;
        this.checkOrphanSuspiciousAlignment();
    }

    private checkOrphanSuspiciousAlignment(): void {
        this.logger.log('Checking for orphan suspicious alignments.');

        const suspiciousAlignments = this.suspiciousAlignments;

        if (suspiciousAlignments.size > 1) {
            return this.logger.log('More than one suspicious alignment found: do nothing.');
        }

        const { suspiciousAlignment, choppedCoordinate } = this.analyzeSuspiciousAlignment(
            suspiciousAlignments.first()!
        );

        this.logger.log(`Analysis result: ${suspiciousAlignment.toString()} and ${choppedCoordinate?.toString() || 'ø'}.`);

        if (undefined === choppedCoordinate) {
            this.suspiciousAlignments = List([suspiciousAlignment]);
            this.previousHits = List();
        } else {
            this.triedAlignments = this.triedAlignments.push(suspiciousAlignment);
            this.handleAlignmentWithSunkHit(suspiciousAlignment);
            this.previousHits = List([choppedCoordinate]);

            // Check again for orphan hits: the last chopped coordinate may very
            // well be an orphan in which case if left unchecked, we will end
            // up loosing one turn.
            this.checkOrphanHit();
        }
    }

    /**
     * Having the suspicious alignment is not enough. It at least contains a
     * sunk coordinate at an extremum, which means probing at the next
     * extremum is useless.
     * Another issue is that both extremums may already have been probed:
     * the researched ship may be in a different direction.
     */
    private analyzeSuspiciousAlignment(suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): {
        suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex>,
        choppedCoordinate?: Coordinate<ColumnIndex, RowIndex>,
    } {
        this.logger.log(`Analyzing the suspicious alignment ${suspiciousAlignment.toString()}.`);

        const sunkCoordinate = this.getSuspiciousAlignmentSunkCoordinate(suspiciousAlignment);
        const sunkIsHead = sunkCoordinate.equals(suspiciousAlignment.head);

        const isNextExtremum: (coordinate: Coordinate<ColumnIndex, RowIndex>)=> boolean = sunkIsHead
            ? (coordinate) => coordinate.equals(suspiciousAlignment.nextTail)
            : (coordinate) => coordinate.equals(suspiciousAlignment.nextHead);

        const nonSunkExtremumAlreadyTargeted = this.previousMoves
            .map(({ target }) => target)
            .filter(isNextExtremum)
            .size > 0;

        suspiciousAlignment = suspiciousAlignment.removeNextExtremum(sunkCoordinate);

        if (!nonSunkExtremumAlreadyTargeted) {
            // Nothing more to do: the ship may very well continue in the unchecked direction.
            return { suspiciousAlignment };
        }

        this.logger.log('The extremums of the alignment have already been checked. Breaking apart the alignment.');

        // It means that the alignment contains at least two ships: one in the
        // current alignment that has already been sunk and at least another
        // which is in a different direction.
        const head = suspiciousAlignment.head;
        const tail = suspiciousAlignment.tail;
        const newSuspiciousAlignment = sunkIsHead ? suspiciousAlignment.pop() : suspiciousAlignment.shift();

        return {
            suspiciousAlignment: newSuspiciousAlignment.getOrThrowLeft(),
            choppedCoordinate: sunkIsHead ? tail : head,
        };
    }

    private getSuspiciousAlignmentSunkCoordinate(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): Coordinate<ColumnIndex, RowIndex> {
        const sunkCoordinatesFromSuspiciousAlignment = this.previousMoves
            .filter(({ target, response }) => HitResponse.SUNK === response && alignment.contains(target))
            .map(({ target}) => target);

        assert(sunkCoordinatesFromSuspiciousAlignment.size === 1, () => `The alignment ${alignment.toString()} can only contain one sunk coordinate. Found ${sunkCoordinatesFromSuspiciousAlignment.join(', ')}.`);

        return sunkCoordinatesFromSuspiciousAlignment.first()!;
    }

    private isInPreviousMoves(coordinate: Coordinate<ColumnIndex, RowIndex>): boolean {
        return undefined !== this.previousMoves.find(({ target }) => target.equals(coordinate));
    }

    private recalculateAlignments(): void {
        const maxShipSize = this.getMaxShipSize();
        const confirmedMaxShipSize = this.getConfirmedMaxShipSize();

        this.previousAlignments = this.coordinateNavigator.findAlignments(
            this.previousHits,
            maxShipSize,
        );

        // Avoid an unnecessary calculation if the max size is the same: this
        // is cheaper than implementing a caching layer for the coordinate
        // navigator.
        this.previousAlignmentsWithConfirmedSunk = maxShipSize === confirmedMaxShipSize
            ? this.previousAlignments
            : this.coordinateNavigator.findAlignments(
                this.previousHits,
                confirmedMaxShipSize,
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
            previousAlignmentsWithConfirmedSunk: this.previousAlignmentsWithConfirmedSunk.map(toString).toArray(),
            suspiciousAlignments: this.suspiciousAlignments.map(toString).toArray(),
            triedAlignments: this.triedAlignments.map(toString).toArray(),
            sunkShips: formatFleet(OpponentShipStatus.SUNK),
            potentiallySunkShips: formatFleet(OpponentShipStatus.POTENTIALLY_SUNK),
            notFoundShips: formatFleet(OpponentShipStatus.NOT_FOUND),
            opponentFleetMin: this.opponentFleet.getMinShipSize(),
            opponentFleetMax: this.opponentFleet.getMaxShipSize(),
            opponentFleetConfirmedMax: this.opponentFleet.getConfirmedMaxShipSize(),
        });
    }
}

class OpponentFleet<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private readonly fleet: List<OpponentShip<ColumnIndex, RowIndex>>;
    private minShipSize: ShipSize;
    private maxShipSize: ShipSize;
    private confirmedMaxShipSize: ShipSize;

    constructor(
        gameFleet: Fleet,
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly logger: Logger,
    ) {
        const opponentFleet = List(
            gameFleet.map((ship) => new OpponentShip<ColumnIndex, RowIndex>(ship.size)),
        );

        this.fleet = opponentFleet;

        this.minShipSize = calculateMinShipSize(opponentFleet);
        this.maxShipSize = calculateMaxShipSize(opponentFleet);
        this.confirmedMaxShipSize = this.maxShipSize;
    }

    getMinShipSize(): ShipSize {
        return this.minShipSize;
    }

    getMaxShipSize(): ShipSize {
        return this.maxShipSize;
    }

    getConfirmedMaxShipSize(): ShipSize {
        return this.confirmedMaxShipSize;
    }

    getFleet(): List<OpponentShip<ColumnIndex, RowIndex>> {
        return this.fleet;
    }

    find(size: ShipSize, statusOrStatuses: OpponentShipStatus | ReadonlyArray<OpponentShipStatus>): List<OpponentShip<ColumnIndex, RowIndex>> {
        const statuses: ReadonlyArray<OpponentShipStatus> = Array.isArray(statusOrStatuses)
            ? statusOrStatuses
            : [statusOrStatuses];

        return this.fleet.filter((
            ship) => ship.size === size && statuses.includes(ship.getStatus()),
        );
    }

    markAsPotentiallySunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const unsunkShips = this.find(
            alignmentSize,
            OpponentShipStatus.NOT_FOUND,
        );

        const matchingShip = unsunkShips.first();

        if (undefined === matchingShip) {
            this.logger.log('No matching ship found.');

            // This means one of the ship we thought we sank was not of the size
            // we expected. In other words, it was not one single ship but rather
            // a ship AND bits of another one.
            const sunkShipOfSize = this.find(
                    alignmentSize,
                    OpponentShipStatus.POTENTIALLY_SUNK,
                )
                .first();

            assertIsNotUndefined(sunkShipOfSize);

            const suspiciousAlignment = sunkShipOfSize.unmarkAsPotentiallySunk();

            this.logger.log(`Un-marking the ship ${sunkShipOfSize.toString()} as potentially sunk.`);

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

    markAsSunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const unsunkShips = this.find(
            alignmentSize,
            OpponentShipStatus.NOT_FOUND,
        );

        const matchingShip = unsunkShips.first();
        assertIsNotUndefined(matchingShip, 'Expected to find a not found ship of this size.');

        this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as sunk.`);

        matchingShip.markAsSunk(sunkAlignment);

        this.recalculateSize();

        this.logState();
    }

    recordOrphanHit(
        orphanHit: Coordinate<ColumnIndex, RowIndex>,
        invalidAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
        sunkCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    ): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        this.logger.log(`Looking for the potentially sunk ship that can contain the orphan hit ${orphanHit.toString()}.`);

        let shipThatMayContainOrphan: OpponentShip<ColumnIndex, RowIndex> | undefined = undefined;
        let shipsThatMayContainOrphan = this.fleet.filter(
            (ship) => {
                if (!ship.isPotentiallySunk()) {
                    return false;
                }

                const alignment = ship.getAlignment();

                // TODO: there is probably more to do here... For example if the
                // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                // want a match if the orphan hit is F8.
                return undefined !== alignment
                    && alignment.nextExtremums.contains(orphanHit)
                    && !invalidAlignments.contains(alignment);
            },
        );

        if (shipsThatMayContainOrphan.size === 1) {
            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        } else {
            assert(
                shipsThatMayContainOrphan.size === 0,
                `Did not expect to find more than one potentially sunk ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            // If we arrive here it means we previously attempted to split up
            // an alignment which resulted in an orphan hit.
            // This means the alignment we tried to split up was indeed correct.
            shipsThatMayContainOrphan = this.fleet.filter(
                (ship) => {
                    if (!ship.isPotentiallySunk()) {
                        return false;
                    }

                    const alignment = ship.getAlignment();

                    // TODO: there is probably more to do here... For example if the
                    // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                    // want a match if the orphan hit is F8.
                    return undefined !== alignment
                        && alignment.nextExtremums.contains(orphanHit);
                },
            );

            assert(
                shipsThatMayContainOrphan.size === 1,
                `Expected to find exactly one ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        }

        this.logger.log(`Found the ship ${shipThatMayContainOrphan}.`);

        const incorrectAlignmentCoordinates = shipThatMayContainOrphan.unmarkAsPotentiallySunk().sortedCoordinates;

        const correctAlignmentSize = incorrectAlignmentCoordinates.size + 1;
        assertIsShipSize(correctAlignmentSize);

        const correctAlignment = this.coordinateNavigator
            .findAlignments(
                incorrectAlignmentCoordinates.push(orphanHit),
                correctAlignmentSize,
            )
            .first();

        assertIsNotUndefined(correctAlignment, 'Expected to find an alignment.');

        this.logger.log(`Marking the ship matching the alignment ${correctAlignment.toString()} as sunk.`);

        const alignmentSize = correctAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const potentiallySunkShips = this.fleet.filter(
            (ship) => ship.isPotentiallySunk() && ship.size === alignmentSize,
        );

        let suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;

        if (potentiallySunkShips.size === 0) {
            const sunkCoordinatesBelongingToAlignment = sunkCoordinates.filter(
                (coordinate) => correctAlignment.contains(coordinate),
            );

            assert(sunkCoordinatesBelongingToAlignment.size === 1, `Expected to find exactly one sunk coordinate within the alignment ${correctAlignment.toString()}. Found: ${sunkCoordinatesBelongingToAlignment.join(', ')}.`);

            // Do nothing: all is good.
        } else {
            assert(potentiallySunkShips.size === 1, `Expected to find exactly one potentially sunk ship of the size ${alignmentSize}. Found ${potentiallySunkShips.size}.`);

            suspiciousAlignment = potentiallySunkShips.first()!.unmarkAsPotentiallySunk();
        }

        const correctShip = this.find(
                alignmentSize,
                [OpponentShipStatus.NOT_FOUND, OpponentShipStatus.POTENTIALLY_SUNK],
            )
            .first()!;

        correctShip.markAsSunk(correctAlignment);

        return suspiciousAlignment;
    }

    /**
     * We have an unexpected sunk coordinate, which means one of the alignments
     * containing this sunk coordinates is incorrect.
     *
     * This method returns the exhaustive list of potentially sunk ships for
     * which the alignment contains at least one of the hit coordinate of the
     * sunk coordinate.
     */
    reconsiderPotentiallySunkShips(
        incorrectSunk: Coordinate<ColumnIndex, RowIndex>,
        previousMoves: List<PreviousMove<ColumnIndex, RowIndex>>,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        const surroundingCoordinateAsStrings = this.coordinateNavigator
            .getSurroundingCoordinates(incorrectSunk)
            .map(toString);

        const surroundingHitCoordinates = previousMoves
            .filter(({ target, response }) => {
                return response === HitResponse.HIT
                    && surroundingCoordinateAsStrings.includes(target.toString());
            })
            .map(({ target }) => target);

        const alignmentContainsSurroundingHitCoordinates: (alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined)=> boolean = (alignment) => surroundingHitCoordinates.reduce(
            (contains: boolean, coordinate) => contains || (undefined !== alignment && alignment.contains(coordinate)),
            false,
        );

        const suspiciousAlignments = this.fleet
            .filter((ship) => {
                return ship.isPotentiallySunk()
                    && alignmentContainsSurroundingHitCoordinates(ship.getAlignment());
            })
            .map((ship) => ship.unmarkAsPotentiallySunk());

        this.recalculateSize();

        return suspiciousAlignments;
    }

    recalculateSize(): void {
        const { fleet } = this;

        this.minShipSize = calculateMinShipSize(fleet);
        this.maxShipSize = calculateMaxShipSize(fleet);
        this.confirmedMaxShipSize = calculateConfirmedMaxShipSize(fleet);
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
            confirmedMax: this.confirmedMaxShipSize,
        });
    }
}

enum OpponentShipStatus {
    NOT_FOUND = 'NOT_FOUND',
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

    isPotentiallySunk(): boolean {
        return this.status === OpponentShipStatus.POTENTIALLY_SUNK;
    }

    isNotSunk(): boolean {
        return this.status !== OpponentShipStatus.SUNK;
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

    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const previousStatus = this.status;

        assert(previousStatus !== OpponentShipStatus.SUNK);

        this.status = OpponentShipStatus.SUNK;
        this.alignment = alignment;
    }

    toString(): string {
        return `"${this.status},${this.alignment}"`;
    }
}

function calculateMinShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const min = fleet
        .filter((ship) => OpponentShipStatus.NOT_FOUND === ship.getStatus())
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
        .filter((ship) => OpponentShipStatus.NOT_FOUND === ship.getStatus())
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}

function calculateConfirmedMaxShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const max = fleet
        .filter((ship) => ship.isNotSunk())
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}
