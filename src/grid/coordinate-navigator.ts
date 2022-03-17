import { Collection, List, Map as ImmutableMap, OrderedSet } from 'immutable';
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

export enum DiagonalDirection {
    TOP_LEFT_TO_BOTTOM_RIGHT,
    BOTTOM_LEFT_TO_BOTTOM_RIGHT,
}

/**
 * The navigator provides an API to easily consume and navigates a grid-coordinate
 * system.
 */
export class CoordinateNavigator<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>{
    private readonly cachedOrigins = new Map<DiagonalDirection, Coordinate<ColumnIndex, RowIndex>>();

    constructor(
        public readonly findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly findNextColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly columnIndexSorter: IndexSorter<ColumnIndex>,
        public readonly findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly findNextRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly rowIndexSorter: IndexSorter<RowIndex>,
        public readonly reference: Coordinate<ColumnIndex, RowIndex>,
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
        const candidatesMap: ImmutableMap<Coordinate<ColumnIndex, RowIndex>, List<Coordinate<ColumnIndex, RowIndex>>> = ImmutableMap(
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

    // traverseDiagonally(
    //     origin: Coordinate<ColumnIndex, RowIndex>,
    //     direction: DiagonalDirection,
    // ): List<Coordinate<ColumnIndex, RowIndex>> {
    //
    // }

    createGridTraverser(): GridTraverser<ColumnIndex, RowIndex> {
        // TODO
        return () => List();
    }

    createStartingCoordinatesFinder(): StartingCoordinatesFinder<ColumnIndex, RowIndex> {
        // TODO
        return () => List();
    }

    findGridOrigin(direction: DiagonalDirection): Coordinate<ColumnIndex, RowIndex> {
        const cachedOrigin = this.cachedOrigins.get(direction);

        if (undefined !== cachedOrigin) {
            return cachedOrigin;
        }

        const origin = findOrigin(
            this.reference,
            this.findPreviousColumnIndex,
            this.findPreviousRowIndex,
            this.findNextRowIndex,
            direction,
        );

        this.cachedOrigins.set(direction, origin);

        return origin;
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

function findOrigin<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> (
    reference: Coordinate<ColumnIndex, RowIndex>,
    findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
    findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
    findNextRowIndex: AdjacentIndexFinder<RowIndex>,
    direction: DiagonalDirection,
): Coordinate<ColumnIndex, RowIndex> {
    const originColumnIndex = findFirstIndex(
        reference.columnIndex,
        findPreviousColumnIndex,
    );

    let originRowIndex: RowIndex;

    switch (direction) {
        case DiagonalDirection.TOP_LEFT_TO_BOTTOM_RIGHT:
            originRowIndex = findFirstIndex(
                reference.rowIndex,
                findPreviousRowIndex,
            );
            break;

        case DiagonalDirection.BOTTOM_LEFT_TO_BOTTOM_RIGHT:
            originRowIndex = findFirstIndex(
                reference.rowIndex,
                findNextRowIndex,
            );
            break;

        default:
            assertIsUnreachableCase(direction);
            throw new Error('Should not be reached.');
    }

    return new Coordinate(originColumnIndex, originRowIndex);
}

function findFirstIndex<Index extends PropertyKey>(
    reference: Index,
    findPreviousIndex: AdjacentIndexFinder<Index>,
): Index {
    let previousIndex = reference;
    let potentialPreviousIndex: Index | undefined = reference;

    while (potentialPreviousIndex !== undefined) {
        previousIndex = potentialPreviousIndex!;
        potentialPreviousIndex = findPreviousIndex(previousIndex);
    }

    return previousIndex;
}
