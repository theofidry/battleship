import { Collection, List, Map, OrderedSet } from 'immutable';
import { findLastIndex } from 'lodash';
import { isNotUndefined } from '../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../assert/assert-is-unreachable';
import { ShipDirection } from '../ship/ship-direction';
import { ShipSize } from '../ship/ship-size';
import { Either } from '../utils/either';
import { Coordinate } from './coordinate';

export type AdjacentIndexFinder<Index extends PropertyKey> = (index: Index)=> Index | undefined;
export type DistantIndexFinder<Index extends PropertyKey> = (index: Index, step: number)=> Index | undefined;
export type IndexSorter<Index extends PropertyKey> = (left: Index, right: Index)=> number;

export type GridTraverser<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = (
    minSize: number,
    origin: Coordinate<ColumnIndex, RowIndex>,
)=> List<Coordinate<ColumnIndex, RowIndex>>;

export type StartingCoordinatesFinder<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = (
    minSize: number,
    origin: Coordinate<ColumnIndex, RowIndex>,
)=> List<Coordinate<ColumnIndex, RowIndex>>;

export type CoordinateAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly direction: ShipDirection,
    readonly coordinates: List<Coordinate<ColumnIndex, RowIndex>>,
};

export type CoordinateSorter<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = (left: Coordinate<ColumnIndex, RowIndex>, right: Coordinate<ColumnIndex, RowIndex>)=> number;

/**
 * The navigator provides an API to easily consume and navigates a grid-coordinate
 * system.
 */
export class CoordinateNavigator<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>{
    constructor(
        public readonly findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly findNextColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly columnIndexSorter: IndexSorter<ColumnIndex>,
        public readonly findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly findNextRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly rowIndexSorter: IndexSorter<RowIndex>,
    ) {
    }

    createCoordinatesSorter(): CoordinateSorter<ColumnIndex, RowIndex> {
        return (left, right) => {
            const rowSortResult = this.rowIndexSorter(left.rowIndex, right.rowIndex);

            if (rowSortResult !== 0) {
                return rowSortResult;
            }

            return this.columnIndexSorter(left.columnIndex, right.columnIndex);
        };
    }

    /**
     * Gets the coordinates that are adjacent, horizontally and vertically, to
     * the given target.
     *
     * For example with a grid system of (column,row)=(A-J,1-10), the surrounding
     * coordinates of E8 will be E7,E9,D8,F8.
     */
    getSurroundingCoordinates(target: Coordinate<ColumnIndex, RowIndex>): ReadonlyArray<Coordinate<ColumnIndex, RowIndex>> {
        const targetColumnIndex = target.columnIndex;
        const targetRowIndex = target.rowIndex;

        const potentialColumnIndices = [
            this.findPreviousColumnIndex(targetColumnIndex),
            this.findNextColumnIndex(targetColumnIndex),
        ].filter(isNotUndefined);

        const potentialRowIndices = [
            this.findPreviousRowIndex(targetRowIndex),
            this.findNextRowIndex(targetRowIndex),
        ].filter(isNotUndefined);

        return [
            ...potentialColumnIndices.map(
                (columnIndex) => new Coordinate(columnIndex, targetRowIndex),
            ),
            ...potentialRowIndices.map(
                (rowIndex) => new Coordinate(targetColumnIndex, rowIndex),
            ),
        ].sort(this.createCoordinatesSorter());
    }

    /**
     * Calculates the distance between two points. For example the distance
     * between A1 and C1 is 2.
     *
     * If the points are not aligned an error is given.
     */
    calculateDistance(
        first: Coordinate<ColumnIndex, RowIndex>,
        second: Coordinate<ColumnIndex, RowIndex>,
    ): Either<NonAlignedCoordinates, number> {
        if (this.createCoordinatesSorter()(first, second) > 0) {
            return this.calculateDistance(second, first);
        }

        const error = NonAlignedCoordinates.forPair(first, second);

        if (first.columnIndex === second.columnIndex) {
            const distance = calculateDistanceBetweenIndices(
                first.rowIndex,
                second.rowIndex,
                this.findNextRowIndex,
            );

            return distance
                .swap()
                .map(() => error)
                .swap();
        }

        if (first.rowIndex === second.rowIndex) {
            const distance = calculateDistanceBetweenIndices(
                first.columnIndex,
                second.columnIndex,
                this.findNextColumnIndex,
            );

            return distance
                .swap()
                .map(() => error)
                .swap();
        }

        return Either.left(error);
    }

    /**
     * Finds sets of coordinates that are aligned together within the max
     * distance, i.e. if aligned but the distance between the two points
     * exceeds the maximum distance given then they will not be recognised
     * as aligned.
     *
     * For example given the points A1, A2, A3, A5 and E1, without considering the
     * distance then the alignments found will be (A1, A2, A3, A5) and (A1, E1).
     * If the max distance is less than 4 however, then the last alignment
     * (A1, E1) will be discarded. A5 will be kept though since the distance
     * between A3 and A5 is less than 4.
     */
    findAlignments(
        coordinates: Collection<unknown, Coordinate<ColumnIndex, RowIndex>>,
        maxDistance: ShipSize,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        /*
        Implementation details

        Given the set a0, a1, a2, a3, a4, we first map each coordinate to
        the subset of the following coordinates:

        Map([
           [a0, [a1, a2, a3, a4, a5]]
           [a1, [a2, a3, a4, a5]]
           [a2, [a3, a4, a5]]
           [a3, [a4, a5]]
           [a4, [a5]]
           [a5, []]
        ])

        Then for each pair we find out if there is an alignment and the distance:

        Map([
           [a0, [{a1,H,2}, -, -, -, {a5,V,3}]]
           [a1, [-, {a3,H,5}, -]]
           [a2, [{a3,H,1}, {a4,H,2}]]
           [a3, [-]]
           [a4, []]
        ])

        Then we can discard the alignments for which the distance exceeds the max
        one and then re-group each sets together:

        Map([
           [a0, [{H, [a1]}, {V, [a5]}]]
           [a1, []
           [a0, [{H, [a3, a4]}]
           [a3, []]
           [a4, []]
        ])

        Then this result is transformed to its final form.
        */

        const coordinatesSorter = this.createCoordinatesSorter();
        const candidatesMap: Map<Coordinate<ColumnIndex, RowIndex>, List<Coordinate<ColumnIndex, RowIndex>>> = Map(
            coordinates
                .toList()
                .sort(coordinatesSorter)
                .map((coordinate, index, collection) => {
                    const nextCoordinates = collection.slice(index + 1);

                    return [coordinate, nextCoordinates];
                })
        );

        const mapCandidateToPotentialAlignment = (
            candidate: Coordinate<ColumnIndex, RowIndex>,
            reference: Coordinate<ColumnIndex, RowIndex>,
        ): CoordinateAlignmentCandidate<ColumnIndex, RowIndex> => ({
            candidate,
            alignment: findCoordinatesAlignmentDirection(candidate, reference),
            distance: this.calculateDistance(candidate, reference).getOrElse(NaN),
        });

        const filterInvalidAlignmentCandidate = (
            alignmentCandidate: CoordinateAlignmentCandidate<ColumnIndex, RowIndex>,
        ): alignmentCandidate is ValidCoordinateAlignmentCandidate<ColumnIndex, RowIndex> => {
            const { alignment, distance } = alignmentCandidate;

            return isNotUndefined(alignment)
                && Number.isInteger(distance)
                && distance <= maxDistance;
        };

        const groupCandidatesFromDirection = (
            direction: ShipDirection,
            alignmentCandidates: List<ValidCoordinateAlignmentCandidate<ColumnIndex, RowIndex>>,
            reference: Coordinate<ColumnIndex, RowIndex>,
        ): CoordinateAlignment<ColumnIndex, RowIndex> => ({
            direction,
            coordinates: alignmentCandidates
                .filter(({ alignment }) => alignment === direction)
                .map(({ candidate }) => candidate)
                .push(reference)
                .sort(coordinatesSorter),
        });

        const filterRedundantAlignments = (
            alignment: CoordinateAlignment<ColumnIndex, RowIndex>,
            alignmentIndex: number,
            alignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
        ): boolean => {
            if (alignmentIndex === 0) {
                return true;
            }

            // A lower-bound alignment cannot contain an upper-bound one hence
            // we can skip some checks.
            const previousAlignment = alignments.get(alignmentIndex - 1);

            if (undefined === previousAlignment) {
                return true;
            }

            return !alignment.coordinates.reduce(
                (alignmentIsContained, coordinate) => {
                    return alignmentIsContained && previousAlignment.coordinates.contains(coordinate);
                },
                true as boolean,
            );
        };

        return candidatesMap
            .filter((candidates) => candidates.size > 0)
            .map((candidates, reference) => {
                return candidates
                    .map((candidate) => mapCandidateToPotentialAlignment(candidate, reference))
                    .filter(filterInvalidAlignmentCandidate);
            })
            .filter((candidates) => candidates.size > 0)
            .map((candidates, reference) => [
                groupCandidatesFromDirection(ShipDirection.HORIZONTAL, candidates, reference),
                groupCandidatesFromDirection(ShipDirection.VERTICAL, candidates, reference),
            ])
            .toList()
            .flatMap((candidates) => candidates)
            .filter(({ coordinates: _coordinates }) => _coordinates.size > 1)
            .filter(filterRedundantAlignments);
    }

    /**
     * Finds missing coordinates within an alignment. For example for the
     * alignments (A1, A3) and (B2, E2), the coordinates found will be A2, C2,
     * and D2.
     */
    findAlignmentGaps(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
        const direction = alignment.direction;

        if (alignment.coordinates.size <= 1) {
            return List();
        }

        if (direction === ShipDirection.HORIZONTAL) {
            const rowIndex = alignment.coordinates.first()!.rowIndex;

            const missingColumns = findIndexGaps(
                alignment
                    .coordinates
                    .sort(this.createCoordinatesSorter())
                    .map((coordinate) => coordinate.columnIndex)
                    .toOrderedSet(),
                this.findNextColumnIndex,
            );

            return missingColumns.map((columnIndex) => new Coordinate(columnIndex, rowIndex));
        }

        if (direction === ShipDirection.VERTICAL) {
            const columnIndex = alignment.coordinates.first()!.columnIndex;

            const missingRows = findIndexGaps(
                alignment
                    .coordinates
                    .sort(this.createCoordinatesSorter())
                    .map((coordinate) => coordinate.rowIndex)
                    .toOrderedSet(),
                this.findNextRowIndex,
            );

            return missingRows.map((rowIndex) => new Coordinate(columnIndex, rowIndex));
        }

        assertIsUnreachableCase(direction);

        throw new Error('Unreachable.');
    }

    /**
     * Finds the coordinates at the extremums of the given alignments.
     *
     * For example for the alignments (A1, A3) and (B2, E2), the coordinates
     * found will be A4, A2 and F2.
     */
    findNextExtremums(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
        const direction = alignment.direction;

        if (alignment.coordinates.size === 0) {
            return List();
        }

        if (direction === ShipDirection.HORIZONTAL) {
            const rowIndex = alignment.coordinates.first()!.rowIndex;

            const missingColumns = findIndexExtremums(
                alignment
                    .coordinates
                    .sort(this.createCoordinatesSorter())
                    .map((coordinate) => coordinate.columnIndex)
                    .toOrderedSet(),
                this.findPreviousColumnIndex,
                this.findNextColumnIndex,
            );

            return missingColumns.map((columnIndex) => new Coordinate(columnIndex, rowIndex));
        }

        if (direction === ShipDirection.VERTICAL) {
            const columnIndex = alignment.coordinates.first()!.columnIndex;

            const missingRows = findIndexExtremums(
                alignment
                    .coordinates
                    .sort(this.createCoordinatesSorter())
                    .map((coordinate) => coordinate.rowIndex)
                    .toOrderedSet(),
                this.findPreviousRowIndex,
                this.findNextRowIndex,
            );

            return missingRows.map((rowIndex) => new Coordinate(columnIndex, rowIndex));
        }

        assertIsUnreachableCase(direction);

        throw new Error('Unreachable.');
    }

    createGridTraverser(): GridTraverser<ColumnIndex, RowIndex> {
        // TODO
        return () => List();
    }

    createStartingCoordinatesFinder(): StartingCoordinatesFinder<ColumnIndex, RowIndex> {
        // TODO
        return () => List();
    }
}

export class NonAlignedCoordinates extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'NonAlignedCoordinates';
    }

    static forPair(first: Coordinate<any, any>, second: Coordinate<any, any>): NonAlignedCoordinates {
        return new NonAlignedCoordinates(
            `The coordinates "${first.toString()}" and "${second.toString()}" are not aligned.`,
        );
    }
}

function calculateDistanceBetweenIndices<Index extends PropertyKey>(
    first: Index,
    second: Index,
    findNextIndex: AdjacentIndexFinder<Index>,
): Either<undefined, number> {
    let count = 0;
    let next = first;
    let potentialNext: Index | undefined;

    while (next !== second) {
        potentialNext = findNextIndex(next);

        if (undefined === potentialNext) {
            return Either.left(undefined);
        }

        next = potentialNext;
        count++;
    }

    return Either.right(count);
}

function findCoordinatesAlignmentDirection<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    first: Coordinate<ColumnIndex, RowIndex>,
    second: Coordinate<ColumnIndex, RowIndex>,
): ShipDirection | undefined {
    if (first.columnIndex === second.columnIndex) {
        return ShipDirection.VERTICAL;
    }

    if (first.rowIndex === second.rowIndex) {
        return ShipDirection.HORIZONTAL;
    }

    return undefined;
}

type CoordinateAlignmentCandidate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly candidate: Coordinate<ColumnIndex, RowIndex>,
    readonly alignment: ShipDirection | undefined,
    readonly distance: number,
};

type ValidCoordinateAlignmentCandidate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly candidate: Coordinate<ColumnIndex, RowIndex>,
    readonly alignment: ShipDirection,
    readonly distance: number,
};

function findIndexGaps<Index extends PropertyKey>(
    sortedIndices: OrderedSet<Index>,
    findNextIndex: AdjacentIndexFinder<Index>,
): List<Index> {
    const first = sortedIndices.first();
    const last = sortedIndices.last();

    if (first === undefined || last === undefined || sortedIndices.size <= 1) {
        return List();
    }

    let next = first;
    let potentialNext: Index | undefined;

    const missingIndices: Index[] = [];

    while (next !== last) {
        potentialNext = findNextIndex(next);

        if (undefined === potentialNext) {
            break;
        }

        next = potentialNext;

        if (!sortedIndices.contains(next)) {
            missingIndices.push(next);
        }
    }

    return List(missingIndices);
}

function findIndexExtremums<Index extends PropertyKey>(
    sortedIndices: OrderedSet<Index>,
    findPreviousIndex: AdjacentIndexFinder<Index>,
    findNextIndex: AdjacentIndexFinder<Index>,
): List<Index> {
    const missingIndices: Array<Index|undefined> = [];
    const first = sortedIndices.first();
    const last = sortedIndices.last();

    if (undefined !== first) {
        missingIndices.push(findPreviousIndex(first));
    }

    if (undefined !== last) {
        missingIndices.push(findNextIndex(last));
    }

    return List(missingIndices.filter(isNotUndefined));
}
