import { expect } from 'chai';
import { Map } from 'immutable';
import heredoc from 'tsheredoc';
import { Grid } from '../../src/grid/grid';
import { printGrid } from '../../src/grid/grid-printer';

enum Cell {
    EMPTY,
    FULL,
}

type ColumnIndex = 'A' | 'B';
type RowIndex = '1' | '2' | '3';

const cellPrinter = (cell: Cell) => cell.valueOf();

describe('GridPrinter', () => {
    it('can print a grid', () => {
        const grid = new Grid<ColumnIndex, RowIndex, Cell>(Map([
            [
                '1',
                Map([
                    ['A', Cell.EMPTY],
                    ['B', Cell.EMPTY],
                ]),
            ],
            [
                '2',
                Map([
                    ['A', Cell.EMPTY],
                    ['B', Cell.FULL],
                ]),
            ],[
                '3',
                Map([
                    ['A', Cell.FULL],
                    ['B', Cell.FULL],
                ]),
            ],
        ]));

        const expected = heredoc(`
        ┌─────────┬───┬───┐
        │ (index) │ A │ B │
        ├─────────┼───┼───┤
        │    1    │ 0 │ 0 │
        │    2    │ 0 │ 1 │
        │    3    │ 1 │ 1 │
        └─────────┴───┴───┘
        `);

        const actual = printGrid(grid, cellPrinter);

        expect(actual).to.equal(expected);
    });
});
