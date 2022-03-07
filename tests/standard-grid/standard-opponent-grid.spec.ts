import { expect } from 'chai';
import heredoc from 'tsheredoc';
import { Coordinate } from '../../src/grid/coordinate';
import { printGrid as printGenericGrid } from '../../src/grid/grid-printer';
import { Cell, StandardOpponentGrid } from '../../src/standard-grid/standard-opponent-grid';
import { StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdRowIndex } from '../../src/standard-grid/std-row-index';

const cellPrinter = (cell: Cell) => cell.valueOf();
const printGrid = (grid: StandardOpponentGrid) => printGenericGrid(grid.getRows(), cellPrinter);

describe('StandardOpponentGrid', () => {
    it('creates an empty grid', () => {
        const grid = new StandardOpponentGrid();

        const expected = heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │ F │ G │ H │ I │ J │
            ├─────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    6    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    7    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    8    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    9    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │   10    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
            `);

        expect(printGrid(grid)).to.equal(expected);
    });

    it('can mark a coordinate as hit', () => {
        const grid = new StandardOpponentGrid();

        grid.markAsHit(new Coordinate(StdColumnIndex.B, StdRowIndex.Row3));

        const expected = heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │ F │ G │ H │ I │ J │
            ├─────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 2 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    6    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    7    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    8    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    9    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │   10    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
            `);

        expect(printGrid(grid)).to.equal(expected);
    });

    it('can mark a coordinate as missed', () => {
        const grid = new StandardOpponentGrid();

        grid.markAsMissed(new Coordinate(StdColumnIndex.B, StdRowIndex.Row3));

        const expected = heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │ F │ G │ H │ I │ J │
            ├─────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    6    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    7    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    8    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    9    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │   10    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
            `);

        expect(printGrid(grid)).to.equal(expected);
    });
});
