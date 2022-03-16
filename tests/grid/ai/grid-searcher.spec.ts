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
import {
    TEST_COLUMN_INDICES, TEST_ROW_INDICES, TestCell, testCellPrinter, TestColumnIndex,
    testCoordinateNavigator, TestRowIndex,
} from '../test-coordinates';

function createEmptyGrid(): Grid<TestColumnIndex, TestRowIndex, TestCell> {
    return new Grid(Map(
        TEST_ROW_INDICES.map((rowIndex) => [
            rowIndex,
            Map(TEST_COLUMN_INDICES.map((columnIndex) => [
                columnIndex,
                TestCell.EMPTY,
            ])),
        ]),
    ));
}

describe('AI grid searcher components', () => {
    it('has loopable indices', () => {
        const loopableIndices = new LoopableIndices(
            List(TEST_COLUMN_INDICES),
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
            testCoordinateNavigator.findNextColumnIndex,
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
            testCoordinateNavigator.findNextColumnIndex,
            'B',
            2,
        );

        expect(actual).to.equal('D');
    });

    it('can get the next index by a step (out of bound)', () => {
        const actual = getNextIndexByStep(
            testCoordinateNavigator.findNextColumnIndex,
            'E',
            2,
        );

        expect(actual).to.equal(undefined);
    });

    it('can get the starting coordinates', () => {
        const actual = createStartingCoordinatesFinder(
                new Coordinate('A', '1'),
                testCoordinateNavigator,
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

const createMarkedGrisFromSearch = (paths: List<List<Coordinate<TestColumnIndex, TestRowIndex>>>): ReadonlyArray<string> => {
    return paths
        .map((coordinates) => {
            const grid = createEmptyGrid()
                .fillCells(coordinates.toArray(), TestCell.FULL, (existingValue) => existingValue === TestCell.EMPTY);

            return printGrid(grid.getRows(), testCellPrinter);
        })
        .toArray();
};

describe('AI grid searcher', () => {
    const search = createSearch(
        new Coordinate('A', '1'),
        testCoordinateNavigator,
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
