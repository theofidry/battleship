import { List } from 'immutable';
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

    calculateDistance(first: Coordinate<ColumnIndex, RowIndex>, second: Coordinate<ColumnIndex, RowIndex>): Either<NonAlignedCoordinates, number> {
        return Either.left(new NonAlignedCoordinates('TODO'));
    }

    findAlignments(
        coordinates: List<Coordinate<ColumnIndex, RowIndex>>,
        maxDistance: ShipSize,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        return List();
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
