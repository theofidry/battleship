import { Collection, List, Map as ImmutableMap, OrderedSet } from 'immutable';
import { range, toString } from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined, isNotUndefined } from '../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../assert/assert-is-unreachable';
import { ShipDirection } from '../ship/ship-direction';
import { ShipSize } from '../ship/ship-size';
import { Either } from '../utils/either';
import { Coordinate } from './coordinate';
import { CoordinateAlignment } from './coordinate-alignment';

export type AdjacentIndexFinder<Index extends PropertyKey> = (index: Index)=> Index | undefined;
export type IndexSorter<Index extends PropertyKey> = (left: Index, right: Index)=> number;

export type IncompleteCoordinateAlignment<
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
    private cachedOrigin: Coordinate<ColumnIndex, RowIndex> | undefined;
    private cachedColumnIndices: List<ColumnIndex> | undefined;
    private cachedRowIndices: List<RowIndex> | undefined;
    private cachedGridTraverseResults: Map<ShipSize, List<List<Coordinate<ColumnIndex, RowIndex>>>> = new Map();

    constructor(
        public readonly findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly findNextColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly columnIndexSorter: IndexSorter<ColumnIndex>,
        public readonly findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly findNextRowIndex: AdjacentIndexFinder<RowIndex>,
        private readonly rowIndexSorter: IndexSorter<RowIndex>,
        private readonly reference: Coordinate<ColumnIndex, RowIndex>,
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
     * Gets the sortedCoordinates that are adjacent, horizontally and vertically, to
     * the given target.
     *
     * For example with a grid system of (column,row)=(A-J,1-10), the surrounding
     * sortedCoordinates of E8 will be E7,E9,D8,F8.
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

    findCompleteAlignments(
        coordinates: Collection<unknown, Coordinate<ColumnIndex, RowIndex>>,
        maxDistance: ShipSize,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return this
            .findAlignedCoordinates(coordinates, maxDistance)
            .map((alignment) => {
                const [head, tail] = this.findNextExtremums(alignment).toArray();

                return new CoordinateAlignment(
                    alignment.direction,
                    alignment.coordinates,
                   this.findAlignmentGaps(alignment),
                   head,
                   tail,
                );
            });
    }

    /**
     * @internal
     *
     * Finds sets of sortedCoordinates that are aligned together within the max
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
    findAlignedCoordinates(
        coordinates: Collection<unknown, Coordinate<ColumnIndex, RowIndex>>,
        maxDistance: ShipSize,
    ): List<IncompleteCoordinateAlignment<ColumnIndex, RowIndex>> {
        /*
        Implementation details

        Given the set a0, a1, a2, a3, a4, we first map each coordinate to
        the subset of the following sortedCoordinates:

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
                // We use < here instead of <= since the distance needs to account
                // for the origin.
                // For example, when we look for alignments for D5 with a max
                // distance of 3, then an example of max alignment would be
                // D5, D6, D7 in which case distance(D5, D7) = 2.
                && distance < maxDistance;
        };

        const groupCandidatesFromDirection = (
            direction: ShipDirection,
            alignmentCandidates: List<ValidCoordinateAlignmentCandidate<ColumnIndex, RowIndex>>,
            reference: Coordinate<ColumnIndex, RowIndex>,
        ): IncompleteCoordinateAlignment<ColumnIndex, RowIndex> => ({
            direction,
            coordinates: alignmentCandidates
                .filter(({ alignment }) => alignment === direction)
                .map(({ candidate }) => candidate)
                .push(reference)
                .sort(coordinatesSorter),
        });

        const filterRedundantAlignments = (
            alignment: IncompleteCoordinateAlignment<ColumnIndex, RowIndex>,
            alignmentIndex: number,
            alignments: List<IncompleteCoordinateAlignment<ColumnIndex, RowIndex>>,
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
     * @internal
     *
     * Finds missing sortedCoordinates within an alignment. For example for the
     * alignments (A1, A3) and (B2, E2), the sortedCoordinates found will be A2, C2,
     * and D2.
     */
    findAlignmentGaps(alignment: IncompleteCoordinateAlignment<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
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
     * @internal
     *
     * Finds the sortedCoordinates at the extremums of the given alignments.
     *
     * For example for the alignments (A1, A3) and (B2, E2), the sortedCoordinates
     * found will be A4, A2 and F2.
     */
    findNextExtremums(alignment: IncompleteCoordinateAlignment<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
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

    traverseGrid(minShipSize: ShipSize): List<List<Coordinate<ColumnIndex, RowIndex>>> {
        let traverseResults = this.cachedGridTraverseResults.get(minShipSize);

        if (undefined !== traverseResults) {
            return traverseResults;
        }

        const lists = this.traverseGridDiagonally(minShipSize);

        traverseResults = lists
            .flatMap((list) => [list, this.mirror(list)])
            .filter((list) => list.size > 0)
            .map((list) => list.sort(this.createCoordinatesSorter()))
            .toMap()
            .mapKeys((_key, list) => list.map(toString).join(';'))
            .toList();

        this.cachedGridTraverseResults.set(minShipSize, traverseResults);

        return traverseResults;
    }

    private traverseGridDiagonally(
        minShipSize: ShipSize,
    ): List<List<Coordinate<ColumnIndex, RowIndex>>> {
        /*
        Implementation details.

        Uses the pattern "traverse grid diagonally" to find a result (list of
        sortedCoordinates) and then apply the transformation "translation" to this
        pattern to obtain a different result.

        It applies this transformation as many times as necessary to obtain the
        exhaustive list of results.
         */
        const columnIndices = this.getColumnIndices();

        const startingCoordinates = this.findStartingCoordinates(minShipSize);

        return startingCoordinates
            .map((startingCoordinate) => traverseGridDiagonally(
                columnIndices,
                minShipSize,
                startingCoordinates,
                startingCoordinate,
                this.findNextRowIndex,
            ));
    }

    /**
     * Gets the grid origin, for example A1 in the standard grid.
     */
    getGridOrigin(): Coordinate<ColumnIndex, RowIndex> {
        const { cachedOrigin } = this;

        if (undefined !== cachedOrigin) {
            return cachedOrigin;
        }

        const origin = getOrigin(
            this.reference,
            this.findPreviousColumnIndex,
            this.findPreviousRowIndex,
        );

        this.cachedOrigin = origin;

        return origin;
    }

    /**
     * Gets list of the grid column indices.
     */
    getColumnIndices(): List<ColumnIndex> {
        const { cachedColumnIndices } = this;

        if (undefined !== cachedColumnIndices) {
            return cachedColumnIndices;
        }

        const origin = this.getGridOrigin();

        const columnIndices = createIndices(
            origin.columnIndex,
            this.findNextColumnIndex,
        );

        this.cachedColumnIndices = columnIndices;

        return columnIndices;
    }

    /**
     * Gets list of the grid row indices.
     */
    getRowIndices(): List<RowIndex> {
        const { cachedRowIndices } = this;

        if (undefined !== cachedRowIndices) {
            return cachedRowIndices;
        }

        const origin = this.getGridOrigin();

        const rowIndices = createIndices(
            origin.rowIndex,
            this.findNextRowIndex,
        );

        this.cachedRowIndices = rowIndices;

        return rowIndices;
    }

    findStartingCoordinates(minShipSize: ShipSize): List<Coordinate<ColumnIndex, RowIndex>> {
        const origin = this.getGridOrigin();

        return List(
            range(0, minShipSize)
                .map((distanceToOrigin) => findNextIndexByStep(
                    this.findNextRowIndex,
                    origin.rowIndex,
                    distanceToOrigin,
                ))
                .filter(isNotUndefined)
                .map((newRowIndex) => new Coordinate(
                    origin.columnIndex,
                    newRowIndex,
                ))
                .sort(this.createCoordinatesSorter())
        );
    }

    private mirror(coordinates: List<Coordinate<ColumnIndex, RowIndex>>): List<Coordinate<ColumnIndex, RowIndex>> {
        const rowIndices = this.getRowIndices();
        const reversedRowIndices = rowIndices.reverse();

        const getReversedRowIndex = (rowIndex: RowIndex): RowIndex => {
            const index = rowIndices.keyOf(rowIndex);
            assertIsNotUndefined(index);

            return reversedRowIndices.get(index)!;
        };

        return coordinates
            .map(({ columnIndex, rowIndex }) => new Coordinate(
                columnIndex,
                getReversedRowIndex(rowIndex),
            ));
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

function getOrigin<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    reference: Coordinate<ColumnIndex, RowIndex>,
    findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
    findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
): Coordinate<ColumnIndex, RowIndex> {
    const originColumnIndex = findFirstIndex(
        reference.columnIndex,
        findPreviousColumnIndex,
    );

    const originRowIndex = findFirstIndex(
        reference.rowIndex,
        findPreviousRowIndex,
    );

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

/**
 * For example goes from 1 to 3 if the step is 2.
 */
export function findNextIndexByStep<Index extends PropertyKey>(
    getNextIndex: (index: Index)=> Index | undefined,
    initialValue: Index,
    stepSize: number,
): Index | undefined {
    assert(Number.isInteger(stepSize));
    assert(stepSize >= 0);

    return range(0, stepSize)
        .reduce(
            (previousValue: Index | undefined) => {
                if (undefined === previousValue) {
                    return undefined;
                }

                return getNextIndex(previousValue);
            },
            initialValue,
        );
}

export function createIndices<Index>(
    originIndex: Index,
    getNextIndex: (index: Index)=> Index | undefined,
): List<Index> {
    const indices = [originIndex];

    let previousColumnIndex: Index = originIndex;
    let nextColumnIndex: Index | undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        nextColumnIndex = getNextIndex(previousColumnIndex);

        if (undefined === nextColumnIndex) {
            break;
        }

        indices.push(nextColumnIndex);
        previousColumnIndex = nextColumnIndex;
    }

    return List(indices);
}

/**
 * @internal
 */
export class LoopableIndices<Index extends PropertyKey>{
    private nextIndexIndex: number | undefined;

    constructor(
        private readonly indices: List<Index>,
        private readonly initialIndex: Index,
    ) {
        assert(indices.contains(initialIndex));
    }

    getNextIndex(): Index {
        const { nextIndexIndex, initialIndex } = this;

        if (nextIndexIndex === undefined) {
            // The first one we pick should be the initial index
            this.nextIndexIndex = this.indices.keyOf(initialIndex);

            return initialIndex;
        }

        let newNextIndexIndex = nextIndexIndex + 1;

        if (!this.indices.has(newNextIndexIndex)) {
            // Loop back to the beginning
            newNextIndexIndex = 0;
        }

        this.nextIndexIndex = newNextIndexIndex;

        return this.indices.get(newNextIndexIndex)!;
    }
}

/**
 * Traverses the grid diagonally leaving a certain gap between diagonals. For
 * example a traverse (the result changes depending of the starting coordinate)
 * the grid with a ship size of 2 (leaves a gap of one cell):
 *
 * ┌───┬───┬───┬───┬───┬───┐
 * │   │ A │ B │ C │ D │ E │
 * ├───┼───┼───┼───┼───┼───┤
 * │ 1 │ 0 │ 1 │ 0 │ 1 │ 0 │
 * │ 2 │ 1 │ 0 │ 1 │ 0 │ 1 │
 * │ 3 │ 0 │ 1 │ 0 │ 1 │ 0 │
 * │ 4 │ 1 │ 0 │ 1 │ 0 │ 1 │
 * │ 5 │ 0 │ 1 │ 0 │ 1 │ 0 │
 * └───┴───┴───┴───┴───┴───┘
 */
function traverseGridDiagonally<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    columnIndices: List<ColumnIndex>,
    minShipSize: ShipSize,
    // traversal starting sortedCoordinates: need to be one of the grid starting coordinate
    potentialStartingCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    startingCoordinate: Coordinate<ColumnIndex, RowIndex>,
    findNextRowIndex: AdjacentIndexFinder<RowIndex>,
): List<Coordinate<ColumnIndex, RowIndex>> {
    /*
    Implementation details.

    Although the result is diagonals, the way we achieve this result is
    differently.

    We have a list of "potential starting sortedCoordinates" which defines the
    exhaustive minimal list of points to start the traverse from to cover the
    grid. From this list, we can get the row index of the starting point. We
    then loop over the remaining rows by a step matching the min ship size for
    the whole column.

    Once the first column done, we start over with the next column, the initial
    row index shifted by 1 (among the starting sortedCoordinates, if the last one is
    reached we loop over to the beginning) and traverse the column in a similar
    fashion.

    Repeat the process for each column.
     */
    assert(potentialStartingCoordinates.contains(startingCoordinate));

    const loopableStartingRows = new LoopableIndices(
        potentialStartingCoordinates.map(({ rowIndex }) => rowIndex),
        startingCoordinate.rowIndex,
    );

    const findNextRowByStep: AdjacentIndexFinder<RowIndex> = (initialValue) => findNextIndexByStep(
        findNextRowIndex,
        initialValue,
        minShipSize,
    );

    const traverseStartingCoordinates = columnIndices
        .map((startingColumnIndex) => new Coordinate(
            startingColumnIndex,
            loopableStartingRows.getNextIndex(),
        ));

    return traverseStartingCoordinates
        .flatMap((traverseFirstCoordinate) => {
            const rowIndices = createIndices(
                traverseFirstCoordinate.rowIndex,
                findNextRowByStep,
            );

            return rowIndices.map((rowIndex) => new Coordinate(
                traverseFirstCoordinate.columnIndex,
                rowIndex,
            ));
        });
}
