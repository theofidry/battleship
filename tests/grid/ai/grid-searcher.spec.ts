import { expect } from 'chai';
import { List, Map } from 'immutable';
import { toString } from 'lodash';
import heredoc from 'tsheredoc';
import {
    createIndices, createSearch, createStartingCoordinatesFinder, getNextIndexByStep,
    LoopableIndices,
} from '../../../src/grid/ai/grid-searcher';
import { Coordinate } from '../../../src/grid/coordinate';
import { Grid } from '../../../src/grid/grid';
import { printGrid } from '../../../src/grid/grid-printer';

enum Cell {
    EMPTY,
    FULL,
}

const cellPrinter = (cell: Cell) => cell.valueOf();

const COLUMN_INDICES = ['A', 'B', 'C', 'D', 'E'] as const;
type ColumnIndex = typeof COLUMN_INDICES[number];

const ROW_INDICES = ['1', '2', '3', '4', '5'] as const;
type RowIndex = typeof ROW_INDICES[number];

const getNextColumnIndex = (columnIndex: ColumnIndex): ColumnIndex | undefined => {
    const index = COLUMN_INDICES.findIndex((_columnIndex) => _columnIndex === columnIndex);

    return COLUMN_INDICES[index + 1];
};

const getNextRowIndex = (rowIndex: RowIndex): RowIndex | undefined => {
    const index = ROW_INDICES.findIndex((_rowIndex) => _rowIndex === rowIndex);

    return ROW_INDICES[index + 1];
};

function createEmptyGrid(): Grid<ColumnIndex, RowIndex, Cell> {
    return new Grid(Map(
        ROW_INDICES.map((rowIndex) => [
            rowIndex,
            Map(COLUMN_INDICES.map((columnIndex) => [
                columnIndex,
                Cell.EMPTY,
            ])),
        ]),
    ));
}

describe('AI grid searcher components', () => {
    it('has loopable indices', () => {
        const loopableIndices = new LoopableIndices(
            List(COLUMN_INDICES),
            'B',
        );

        const expectedIndices = [
            'B',
            'C',
            'D',
            'E',
            'A',
            'B',
            'C',
            'D',
            'E',
        ];

        expectedIndices.forEach((expected) => {
            const actual = loopableIndices.getNextIndex();

            expect(actual).to.equal(expected);
        });
    });

    it('can create indices', () => {
        const indices = createIndices(
            'B',
            getNextColumnIndex,
        );

        const expected = [
            // No 'A' since we start at 'B'
            'B',
            'C',
            'D',
            'E',
        ];

        expect(indices.toArray()).to.eqls(expected);
    });

    it('can get the next index by a step', () => {
        const actual = getNextIndexByStep(
            getNextColumnIndex,
            'B',
            2,
        );

        expect(actual).to.equal('D');
    });

    it('can get the next index by a step (out of bound)', () => {
        const actual = getNextIndexByStep(
            getNextColumnIndex,
            'E',
            2,
        );

        expect(actual).to.equal(undefined);
    });

    it('can get the starting coordinates', () => {
        const actual = createStartingCoordinatesFinder(
                new Coordinate('A', '1'),
                getNextRowIndex,
            )(2)
            .map(toString)
            .toArray();

        const expected = [
            'A1',
            'A2',
        ];

        expect(actual).to.eqls(expected);
    });
});

const createMarkedGrisFromSearch = (paths: List<List<Coordinate<ColumnIndex, RowIndex>>>): ReadonlyArray<string> => {
    return paths
        .map((coordinates) => {
            const grid = createEmptyGrid()
                .fillCells(coordinates.toArray(), Cell.FULL, (existingValue) => existingValue === Cell.EMPTY);

            return printGrid(grid.getRows(), cellPrinter);
        })
        .toArray();
};

describe('AI grid searcher', () => {
    const search = createSearch(
        new Coordinate('A', '1'),
        getNextColumnIndex,
        getNextRowIndex,
    );

    it('can screen the grid for when the smallest ship searched is of size 2', () => {
        const paths = createMarkedGrisFromSearch(search(2));

        const expected = [
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    2    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    3    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    4    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    5    │ 1 │ 0 │ 1 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    2    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    3    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    4    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    5    │ 0 │ 1 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
        ];

        expect(paths).to.eqls(expected);
    });

    it('can screen the grid for when the smallest ship searched is of size 3', () => {
        const paths = createMarkedGrisFromSearch(search(3));

        const expected = [
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    4    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    5    │ 0 │ 1 │ 0 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    2    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    5    │ 1 │ 0 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    3    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    4    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
        ];

        expect(paths).to.eqls(expected);
    });
});
