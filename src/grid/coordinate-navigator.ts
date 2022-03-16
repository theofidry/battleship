import { List, Map, Set } from 'immutable';
import { toString } from 'lodash';
import { isNotUndefined } from '../assert/assert-is-not-undefined';
import { ShipDirection } from '../ship/ship-direction';
import { ShipSize } from '../ship/ship-size';
import { Either } from '../utils/either';
import { Coordinate } from './coordinate';

export type AdjacentIndexFinder<Index extends PropertyKey> = (index: Index)=> Index | undefined;
export type DistantIndexFinder<Index extends PropertyKey> = (index: Index, step: number)=> Index | undefined;

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

/**
 * The navigator provides an API to easily consume and navigates a grid-coordinate
 * system.
 */
export class CoordinateNavigator<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>{
    constructor(
        public readonly findPreviousColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly findNextColumnIndex: AdjacentIndexFinder<ColumnIndex>,
        public readonly findPreviousRowIndex: AdjacentIndexFinder<RowIndex>,
        public readonly findNextRowIndex: AdjacentIndexFinder<RowIndex>,
    ) {
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
        ];
    }

    calculateDistance(
        first: Coordinate<ColumnIndex, RowIndex>,
        second: Coordinate<ColumnIndex, RowIndex>,
    ): Either<NonAlignedCoordinates, number> {
        if (first.columnIndex === second.columnIndex) {
            const distances = [
                calculateDistanceBetweenIndices(
                    first.rowIndex,
                    second.rowIndex,
                    this.findNextRowIndex,
                ),
                calculateDistanceBetweenIndices(
                    first.rowIndex,
                    second.rowIndex,
                    this.findPreviousRowIndex,
                ),
            ];

            return Either.right(
                Math.min(...distances.filter(isNotUndefined)),
            );
        }

        if (first.rowIndex === second.rowIndex) {
            const distances = [
                calculateDistanceBetweenIndices(
                    first.columnIndex,
                    second.columnIndex,
                    this.findNextColumnIndex,
                ),
                calculateDistanceBetweenIndices(
                    first.columnIndex,
                    second.columnIndex,
                    this.findPreviousColumnIndex,
                ),
            ];

            return Either.right(
                Math.min(...distances.filter(isNotUndefined)),
            );
        }

        return Either.left(NonAlignedCoordinates.forPair(first, second));
    }

    findAlignments(
        coordinates: Set<Coordinate<ColumnIndex, RowIndex>>,
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

        const candidatesMap: Map<Coordinate<ColumnIndex, RowIndex>, List<Coordinate<ColumnIndex, RowIndex>>> = Map(
            coordinates
                .toList()
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
                .push(reference),
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
): number | undefined {
    let count = 0;
    let next = first;
    let potentialNext: Index | undefined;

    while (next !== second) {
        potentialNext = findNextIndex(next);

        if (undefined === potentialNext) {
            return undefined;
        }

        next = potentialNext;
        count++;
    }

    return count;
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
