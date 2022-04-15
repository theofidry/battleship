import { List, Set } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../../assert/assert';
import { assertIsNotUndefined } from '../../assert/assert-is-not-undefined';
import { HitResponse, isHitOrSunk } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import {
    CoordinateAlignment, isAlignmentWithNoGap, verifyAlignment,
} from '../../grid/coordinate-alignment';
import { CoordinateNavigator } from '../../grid/coordinate-navigator';
import { Logger } from '../../logger/logger';
import { Fleet } from '../../ship/fleet';
import { ShipSize } from '../../ship/ship-size';
import { PreviousMove } from '../hit-strategy';
import { OpponentFleet } from './opponent-fleet';
import { PreviousMoves } from './previous-moves';

export class MoveAnalyzer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> {
    private readonly previousMoves: PreviousMoves<ColumnIndex, RowIndex>;
    private previousHits: List<Coordinate<ColumnIndex, RowIndex>> = List();
    private previousAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private triedAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private previousAlignmentsWithConfirmedSunk: List<CoordinateAlignment<ColumnIndex, RowIndex>> = List();
    private suspiciousAlignments: Set<CoordinateAlignment<ColumnIndex, RowIndex>> = Set();
    private opponentFleet: OpponentFleet<ColumnIndex, RowIndex>;

    constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly fleet: Fleet,
        private readonly logger: Logger,
        private readonly enableShipSizeTracking: boolean,
    ) {
        this.previousMoves = new PreviousMoves();

        this.opponentFleet = new OpponentFleet<ColumnIndex, RowIndex>(
            fleet,
            coordinateNavigator,
            this.previousMoves,
            logger,
        );
    }

    recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.logger.log(`Recording previous move ${previousMove.target.toString()}:${previousMove.response}.`);
        this.logState('State before recalculation');

        this.previousMoves.push(previousMove);

        if (isHitOrSunk(previousMove.response)) {
            this.logger.log('Add hit and re-calculate alignments.');
            this.addHitAndRecalculateAlignments(previousMove.target);
        } else if (!this.enableShipSizeTracking) {
            return this.logger.log('Recording a miss: do nothing.');
        }

        if (!this.enableShipSizeTracking) {
            this.logger.log('Setting enableShipSizeTracking not enabled: clear hits if sunk.');

            return previousMove.response === HitResponse.SUNK
                ? this.clearHits()
                : this.logger.log('Nothing to do.');
        }

        this.logState('Recalculating state');
        this.recalculateState();
        this.logState('Recalculated state');
    }

    getMinShipSize(): ShipSize {
        return this.opponentFleet.minShipSize;
    }

    getMaxShipSize(): ShipSize {
        return this.opponentFleet.maxShipSize;
    }

    getConfirmedMaxShipSize(): ShipSize {
        return this.opponentFleet.verifiedMaxShipSize;
    }

    getPreviousMoves(): List<PreviousMove<ColumnIndex, RowIndex>> {
        return this.previousMoves.all;
    }

    getPreviousHits(): List<Coordinate<ColumnIndex, RowIndex>> {
        return this.previousHits;
    }

    getHitAlignments(): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return this.previousAlignments;
    }

    getSuspiciousHitAlignments(): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return this.suspiciousAlignments.toList();
    }

    private recalculateState(): void {
        const { previousHits, previousAlignments, suspiciousAlignments } = this;

        if (previousHits.size === 0 && previousAlignments.size === 0 && suspiciousAlignments.size === 0) {
            return this.logger.log('Nothing to do.');
        }

        this.checkAlignmentsContainingSunkCoordinates();
        this.checkSuspiciousAlignments();
        this.checkOrphanHit();

        // handleAlignmentWithSunkHit(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        //     this.logger.log(`Marking alignment as non-verified sunk ${sunkAlignment.toString()}.`);
        //
        //     this.opponentFleet
        //         .markAsNonVerifiedSunk(sunkAlignment)
        //         .fold(
        //             (suspiciousAlignments) => this.suspiciousAlignments = suspiciousAlignments,
        //             () => this.removeAlignmentCoordinatesFromPreviousHits(sunkAlignment),
        //         );
        // }
        //
        // this.handleAlignmentWithSunkCoordinate()
        //
        // const suspiciousAlignmentContainingSunks = suspiciousAlignments.filter(
        //     (alignment) => alignment.containsAny(this.previousMoves.sunkCoordinates),
        // );
        //
        // if (suspiciousAlignments.size > 0 && undefined !== suspiciousAlignmentContainingSunks) {
        //     this.logger.log('Target belongs to a suspicious alignment.');
        //
        //     suspiciousAlignments.forEach((suspiciousAlignment) => this.handleAlignmentWithSunkCoordinate(suspiciousAlignment));
        //     this.suspiciousAlignments = List();
        //
        //     return;
        // }
        //
        // this.logger.log('No matching suspicious alignment found.');
        //
        // const knownAlignmentContainingSunk = this.previousAlignments
        //     .filter(
        //         (alignment) => {
        //             return alignment.sortedGaps.size === 0
        //                 && alignment.contains(previousMove.target);
        //         }
        //     )
        //     .first();
        //
        // if (undefined !== knownAlignmentContainingSunk) {
        //     this.logger.log(`Target belongs to a known alignment: ${knownAlignmentContainingSunk.toString()}.`);
        //
        //     return this.handleAlignmentWithSunkCoordinate(knownAlignmentContainingSunk);
        // }
        //
        // this.logger.log('Unexpected sunk! One of the previous sunk alignment is not the size we thought it was.');
        //
        // const newSuspiciousAlignments = this.opponentFleet.reviewNonVerifiedSunkShips(previousMove.target);
        // assert(newSuspiciousAlignments.size === 1, `Expected to find only one suspicious alignment after reconsidering non-verified sunk ships. Found: "${newSuspiciousAlignments.join('", "')}".`);
        // const suspiciousAlignment = newSuspiciousAlignments.first()!;
        //
        // this.logger.log(`New suspicious alignments found: ${newSuspiciousAlignments.map(toString).join(', ')}.`);
        //
        // let suspiciousCoordinates = suspiciousAlignment.sortedCoordinates.push(previousMove.target);
        // let sortedSunkCoordinates = this.previousMoves.sunkCoordinates
        //     .filter((coordinate) => suspiciousAlignment.contains(coordinate))
        //     .sort(this.coordinateNavigator.createCoordinatesSorter())
        //     .unshift(previousMove.target);
        //
        // while (sortedSunkCoordinates.size > 0) {
        //     const maxShipSize = this.getMaxShipSize();
        //
        //     const sunkCoordinate = sortedSunkCoordinates.first();
        //     assertIsNotUndefined(sunkCoordinate);
        //
        //     sortedSunkCoordinates = sortedSunkCoordinates.shift();
        //
        //     const alignments = this.coordinateNavigator
        //         .findAlignments(
        //             suspiciousCoordinates,
        //             maxShipSize,
        //         )
        //         .filter((alignment) => alignment.contains(sunkCoordinate));
        //
        //     let alignmentsWithoutGap = alignments.filter(isAlignmentWithNoGap);
        //
        //     if (alignmentsWithoutGap.size === 0) {
        //         alignmentsWithoutGap = alignments
        //             .flatMap((alignment) => this.coordinateNavigator.explodeByGaps(alignment))
        //             .filter(isAlignmentWithNoGap)
        //             .filter((alignment) => alignment.contains(sunkCoordinate));
        //     }
        //
        //     assert(
        //         alignmentsWithoutGap.size === 1,
        //         () => `Expected to find only one alignment containing the sunk coordinate ${sunkCoordinate.toString()} among the coordinates ${suspiciousCoordinates.join(', ')} for the max size of ${maxShipSize}. Got: "${alignments.map(toString).join('", "')}".`,
        //     );
        //
        //     const matchingAlignment = alignmentsWithoutGap.first()!;
        //
        //     this.handleAlignmentWithSunkCoordinate(matchingAlignment);
        //     suspiciousCoordinates = suspiciousCoordinates.filter((coordinate) => !matchingAlignment.contains(coordinate));
        // }
        //
        // this.previousHits = suspiciousCoordinates;
    }

    private checkSuspiciousAlignments(): void {
        this.logger.log('Checking suspicious alignments.');

        // const alignmentContainingSunks = this.suspiciousAlignments.filter(
        //     (alignment) => alignment.containsAny(this.previousMoves.sunkCoordinates),
        // );
        //
        // alignmentContainingSunks.forEach((alignment) => this.handleAlignmentWithSunkCoordinate(alignment));
    }

    private checkAlignmentsContainingSunkCoordinates(): void {
        this.logger.log('Checking alignments containing sunk coordinates.');

        const alignmentContainingSunks = this.previousAlignments.filter(
            (alignment) => alignment.containsAny(this.previousMoves.sunkCoordinates),
        );

        alignmentContainingSunks.forEach((alignment) => this.handleAlignmentWithSunkCoordinate(alignment));
    }

    private handleAlignmentWithSunkCoordinate(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const alignmentCertain = this.isAlignmentCertain(alignment);

        const result = alignmentCertain
            ? this.opponentFleet.markAsSunk(alignment)
            : this.opponentFleet.markAsNonVerifiedSunk(alignment);

        result.fold(
            (newSuspiciousAlignments) => {
                this.logger.log(`Could not mark the alignment ${alignment.toString()} as ${alignmentCertain ? '' : 'non-verified '}sunk: add it ot the list of suspicious alignments.`);

                this.suspiciousAlignments = this.suspiciousAlignments.merge(newSuspiciousAlignments);
            },
            () => this.removeAlignmentCoordinatesFromPreviousHits(alignment),
        );
    }

    private addHitAndRecalculateAlignments(target: Coordinate<ColumnIndex, RowIndex>): void {
        this.previousHits = this.previousHits.push(target);

        this.recalculateAlignments();
    }

    private removeAlignmentCoordinatesFromPreviousHits(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        this.previousHits = this.previousHits
            .filter((coordinate) => !alignment.contains(coordinate));

        this.recalculateAlignments();
    }

    private checkOrphanHit(): void {
        this.logger.log('Checking for orphan hits.');

        const { previousHits } = this;

        // We might end up in the situation where we have a hit but all the
        // surrounding coordinates are either a miss or a hit belonging to a
        // sunk boat.
        // In this scenario, it means that one of the previously sunk boat was
        // not the size we thought it was.
        if (previousHits.size === 0 || previousHits.size > 1) {
            return this.logger.log('No orphan found: do nothing.');
        }

        const potentiallyOrphanHit = previousHits.first()!;
        const surroundingCoordinates = this.coordinateNavigator.getSurroundingCoordinates(potentiallyOrphanHit);

        const isOrphan = surroundingCoordinates.every(
            (coordinate) => this.previousMoves.contains(coordinate),
        );

        if (!isOrphan) {
            return this.logger.log('No orphan found: do nothing.');
        }

        const orphanHit = potentiallyOrphanHit;

        this.logger.log(`Orphan hit ${orphanHit.toString()} found!`);

        assert(this.suspiciousAlignments.size === 0, `Did not expect to find an orphan hit whilst having suspicious alignments. Found: "${this.suspiciousAlignments.join('", "')}".`);

        const suspiciousAlignmentFromOrphan = this.opponentFleet.recordOrphanHit(
            orphanHit,
            this.triedAlignments,
            this.previousMoves.sunkCoordinates,
        );

        if (undefined === suspiciousAlignmentFromOrphan) {
            this.logger.log('No suspicious alignment found from orphan.');

            throw new Error('Is this possible?');
        }

        this.suspiciousAlignments = this.suspiciousAlignments.add(suspiciousAlignmentFromOrphan);
    }

    // private checkConfirmedAlignment(): void {
    //     this.logger.log('Checking for confirmed alignment.');
    //
    //     const sunkCoordinates = this.previousMoves.sunkCoordinates;
    //
    //     const alignmentContainsSunkCoordinate = (coordinates: List<Coordinate<ColumnIndex, RowIndex>>): boolean => {
    //         for (const coordinate of coordinates) {
    //             for (const sunkCoordinate of sunkCoordinates) {
    //                 if (coordinate.equals(sunkCoordinate)) {
    //                     return true;
    //                 }
    //             }
    //         }
    //
    //         return false;
    //     };
    //
    //     const suspiciousAlignments = this.suspiciousAlignments.filter(
    //         ({ sortedCoordinates, sortedGaps }) => sortedGaps.size === 0 && alignmentContainsSunkCoordinate(sortedCoordinates),
    //     );
    //
    //     // We might end up in the situation where we have an alignment for which
    //     // the surrounding coordinates are either a miss or a hit belonging to a
    //     // (confirmed) sunk boat which means the boat can be marked as confirmed.
    //     if (suspiciousAlignments.size === 0) {
    //         return this.logger.log('No suspicious alignment: do nothing.');
    //     }
    //
    //     const knownCoordinates = this.previousMoves.knownCoordinates;
    //
    //     const isAlignmentConfirmed = (alignment: CoordinateAlignment<ColumnIndex, RowIndex>): boolean => {
    //         const unknownSurroundingCoordinates = alignment.sortedCoordinates
    //             .flatMap((coordinate) => this.coordinateNavigator.getSurroundingCoordinates(coordinate))
    //             .filter((coordinate) => !knownCoordinates.contains(coordinate));
    //
    //         return unknownSurroundingCoordinates.size === 0;
    //     };
    //
    //     let newSuspiciousAlignments = this.suspiciousAlignments;
    //
    //     suspiciousAlignments
    //         .filter(isAlignmentConfirmed)
    //         .forEach((alignment) => {
    //             this.opponentFleet.markAsSunk(alignment);
    //             this.removeAlignmentCoordinatesFromPreviousHits(alignment);
    //
    //             const suspiciousAlignmentIndex = newSuspiciousAlignments.indexOf(alignment);
    //
    //             newSuspiciousAlignments = newSuspiciousAlignments.remove(suspiciousAlignmentIndex);
    //         });
    //
    //     this.suspiciousAlignments = newSuspiciousAlignments;
    //     this.checkOrphanSuspiciousAlignment();
    // }

    // private checkOrphanSuspiciousAlignment(): void {
    //     this.logger.log('Checking for orphan suspicious alignments.');
    //
    //     const suspiciousAlignments = this.suspiciousAlignments;
    //
    //     if (suspiciousAlignments.size > 1) {
    //         return this.logger.log('More than one suspicious alignment found: do nothing.');
    //     }
    //
    //     this.suspiciousAlignments = List();
    //
    //     const { suspiciousAlignment, choppedCoordinate } = this.analyzeSuspiciousAlignment(
    //         suspiciousAlignments.first()!
    //     );
    //
    //     this.logger.log(`Analysis result: ${suspiciousAlignment.toString()} and ${choppedCoordinate?.toString() || 'ø'}.`);
    //
    //     if (undefined === choppedCoordinate) {
    //         this.suspiciousAlignments = List([suspiciousAlignment]);
    //         this.previousHits = List();
    //     } else {
    //         this.triedAlignments = this.triedAlignments.push(suspiciousAlignment);
    //         this.handleAlignmentWithSunkCoordinate(suspiciousAlignment);
    //         this.previousHits = List([choppedCoordinate]);
    //     }
    // }

    private isAlignmentCertain(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): boolean {
        return verifyAlignment(alignment)
            .map(({ alignment: verifiedAlignment }) => this.getAlignmentSurroundingCoordinates(verifiedAlignment))
            .map((coordinates) => coordinates.every(
                (coordinate) => this.previousMoves.missCoordinates.contains(coordinate),
            ))
            .getOrElse(false);
    }

    private getAlignmentSurroundingCoordinates(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
        return alignment.sortedCoordinates
            .toSet()
            .flatMap((coordinate) => this.coordinateNavigator.getSurroundingCoordinates(coordinate))
            .toList()
            .filter((coordinate) => !alignment.contains(coordinate));
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

        const nonSunkExtremumAlreadyTargeted = this.previousMoves.knownCoordinates
            .filter(isNextExtremum)
            .size > 0;

        suspiciousAlignment = suspiciousAlignment
            .removeNextExtremum(sunkCoordinate)
            .getOrThrowLeft();

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
        const sunkCoordinatesFromSuspiciousAlignment = this.previousMoves.sunkCoordinates.filter(
            (coordinate) => alignment.contains(coordinate),
        );

        assert(sunkCoordinatesFromSuspiciousAlignment.size === 1, () => `The alignment ${alignment.toString()} can only contain one sunk coordinate. Found ${sunkCoordinatesFromSuspiciousAlignment.join(', ')}.`);

        return sunkCoordinatesFromSuspiciousAlignment.first()!;
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
        this.logger.log({
            label: label,
            previousMoves: this.previousMoves.all
                .map(({ target, response }) => ({ target: target.toString(), response }))
                .toArray(),
            previousHits: this.previousHits.map(toString).toArray(),
            previousAlignments: this.previousAlignments.map(toString).toArray(),
            previousAlignmentsWithConfirmedSunk: this.previousAlignmentsWithConfirmedSunk.map(toString).toArray(),
            suspiciousAlignments: this.suspiciousAlignments.map(toString).toArray(),
            triedAlignments: this.triedAlignments.map(toString).toArray(),
            sunkShips: this.opponentFleet.sunkShips().map(toString).toArray(),
            nonVerifiedSunkShips: this.opponentFleet.nonVerifiedSunkShips().map(toString).toArray(),
            notFoundShips: this.opponentFleet.notFoundShips().map(toString).toArray(),
            opponentFleetMin: this.opponentFleet.minShipSize,
            opponentFleetMax: this.opponentFleet.maxShipSize,
            opponentFleetConfirmedMax: this.opponentFleet.verifiedMaxShipSize,
        });
    }
}
