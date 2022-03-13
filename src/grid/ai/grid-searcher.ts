import { List } from 'immutable';
import { range } from 'lodash';
import { isNotUndefined } from '../../assert/assert-is-not-undefined';
import { ShipSize } from '../../ship/ship-size';
import { Coordinate } from '../coordinate';
import assert = require('node:assert');

/**
 * Creates a search function which returns a list of possible sets of coordinates.
 * Each set is enough to completely cover the grid (defined by the column and row
 * indices) with the minimal amount of coordinates whilst ensuring that no ship
 * of the given size can slip through.
 */
export function createSearch<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    gridOrigin: Coordinate<ColumnIndex, RowIndex>,
    getNextColumnIndex: (columnIndex: ColumnIndex)=> ColumnIndex | undefined,
    getNextRowIndex: (rowIndex: RowIndex)=> RowIndex | undefined,
): (minShipSize: ShipSize)=> List<List<Coordinate<ColumnIndex, RowIndex>>> {
    const findStartingCoordinates = createStartingCoordinatesFinder(
        gridOrigin,
        getNextRowIndex,
    );
    const traverseGrid = createGridTraverser(
        getNextColumnIndex,
        getNextRowIndex,
    );

    return (minShipSize) => {
        const startingCoordinates = findStartingCoordinates(minShipSize);
        return startingCoordinates
            .map((startingCoordinate) => traverseGrid(
                minShipSize,
                startingCoordinate,
                startingCoordinates.map((coordinate) => coordinate.rowIndex),
            ));
    };
}

/**
 * When initiating a search for a grid, there is likely several possible starting
 * points which will result in different paths.
 *
 * For example for the grid [A-J;1-10] which has A1 as origin, the starting points
 * for:
 * minShipSize=2 are A1 and A2.
 * minShipSize=3 are A1, A2 and A3.
 */
export function createStartingCoordinatesFinder<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    gridOrigin: Coordinate<ColumnIndex, RowIndex>,
    getNextRowIndex: (rowIndex: RowIndex)=> RowIndex | undefined,
): (minShipSize: ShipSize)=> List<Coordinate<ColumnIndex, RowIndex>> {
    return (minShipSize) => List(
        range(0, minShipSize)
            .map((distanceToOrigin) => getNextIndexByStep(
                getNextRowIndex,
                gridOrigin.rowIndex,
                distanceToOrigin,
            ))
            .filter(isNotUndefined)
            .map((newRowIndex) => new Coordinate(
                gridOrigin.columnIndex,
                newRowIndex,
            )),
    );
}

/**
 * Traverses the grid diagonally with the given origin as a starting point.
 */
function createGridTraverser<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    getNextColumnIndex: (columnIndex: ColumnIndex)=> ColumnIndex | undefined,
    getNextRowIndex: (rowIndex: RowIndex)=> RowIndex | undefined,
): (
    minShipSize: ShipSize,
    origin: Coordinate<ColumnIndex, RowIndex>,
    possibleStartingRows: List<RowIndex>,
)=> List<Coordinate<ColumnIndex, RowIndex>> {
    return (minShipSize, origin, possibleStartingRows) => {
        const columns = createIndices(origin.columnIndex, getNextColumnIndex);
        const loopableStartingRows = new LoopableIndices(
            possibleStartingRows,
            origin.rowIndex,
        );

        const getNextRowByStep = (originRowIndex: RowIndex) => getNextIndexByStep(
            getNextRowIndex,
            originRowIndex,
            minShipSize,
        );

        const startingCoordinates = columns
            .map((startingColumnIndex) => new Coordinate(
                startingColumnIndex,
                loopableStartingRows.getNextIndex(),
            ));

        return startingCoordinates
            .flatMap((startingCoordinate) => {
                const rowIndices = createIndices(
                    startingCoordinate.rowIndex,
                    getNextRowByStep,
                );

                return rowIndices.map((rowIndex) => new Coordinate(
                    startingCoordinate.columnIndex,
                    rowIndex,
                ));
            });
    };
}

/**
 * For example goes from 1 to 3 if the step is 2.
 */
export function getNextIndexByStep<Index extends PropertyKey>(
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
