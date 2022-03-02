// noinspection NonAsciiCharacters

import { expect } from 'chai';
import { Map } from 'immutable';
import { Cell, Grid, Index } from '../../src/grid/grid';

type GreekColumnIndex = 'α' | 'β';
type JapaneseRowIndex = 'いち' | 'さん' | 'に';

class GreekJapaneseGrid extends Grid<GreekColumnIndex, JapaneseRowIndex> {
}

function getGridRowsAsObject<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(grid: Grid<ColumnIndex, RowIndex>) {
    return grid.getRows()
        .map((row) => row.toObject())
        .toObject();
}

describe('Grid creation', () => {
    it('allows to create a grid with custom columns', () => {
        const rows = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.EMPTY],
                    ['β', Cell.FULL],
                ]),
            ],
            [
                'さん',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.EMPTY],
                    ['β', Cell.EMPTY],
                ]),
            ],
            [
                'に',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.FULL],
                    ['β', Cell.FULL],
                ]),
            ],
        ]);
        const grid = new GreekJapaneseGrid(rows);

        const expected = {
            'いち': {
                'α': Cell.EMPTY,
                'β': Cell.FULL,
            },
            'さん': {
                'α': Cell.EMPTY,
                'β': Cell.EMPTY,
            },
            'に': {
                'α': Cell.FULL,
                'β': Cell.FULL,
            },
        };

        const actual = getGridRowsAsObject(grid);

        expect(actual).to.eqls(expected);
    });

    it('allows to create a grid with only some of the rows and columns', () => {
        const rows = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['β', Cell.FULL],
                ]),
            ],
        ]);
        const grid = new GreekJapaneseGrid(rows);

        const expected = {
            'いち': {
                'β': Cell.FULL,
            },
        };

        const actual = getGridRowsAsObject(grid);

        expect(actual).to.eqls(expected);
    });

    it('does not allow to create a grid with rows of different columns', () => {
        const rows = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.EMPTY],
                    ['β', Cell.EMPTY],
                ]),
            ],
            [
                'さん',
                Map<GreekColumnIndex, Cell>([
                    ['β', Cell.FULL],
                ]),
            ],
        ]);

        const createGrid = () => new GreekJapaneseGrid(rows);

        expect(createGrid).to.throw('Expected rows to have identical columns. Got "β" and "α", "β".');
    });
});
