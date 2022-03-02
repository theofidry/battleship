import { Map } from 'immutable';
import { expect } from 'chai';
import { Cell, Grid, GridLines, assertIsValidGrid } from '../../src/grid/grid';

type GreekColumnIndex = 'α' | 'β';
type JapaneseRowIndex = 'いち' | 'さん' | 'に';

class GreekJapaneseGrid implements Grid<GreekColumnIndex, JapaneseRowIndex> {
    constructor(
        readonly lines: Readonly<GridLines<GreekColumnIndex, JapaneseRowIndex>>
    ) {
    }

    getLines(): Readonly<GridLines<GreekColumnIndex, JapaneseRowIndex>> {
        return this.lines;
    }
}

describe('Grid', () => {
    it('allows to create a (valid) grid with custom columns', () => {
        const lines = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
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
        const grid = new GreekJapaneseGrid(lines);

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

        const actual = grid.getLines()
            .map(row => row.toObject())
            .toObject();

        expect(actual).to.eqls(expected);
        expect(() => assertIsValidGrid(grid)).to.not.throw();
    });

    it('allows to create a (valid) grid with only some of the rows and columns', () => {
        const lines = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['β', Cell.FULL],
                ]),
            ],
        ]);
        const grid = new GreekJapaneseGrid(lines);

        const expected = {
            'いち': {
                'β': Cell.FULL,
            },
        };

        const actual = grid.getLines()
            .map(row => row.toObject())
            .toObject();

        expect(actual).to.eqls(expected);
        expect(() => assertIsValidGrid(grid)).to.not.throw();
    });

    it('allows to create an (invalid) grid with rows of different columns', () => {
        const lines = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
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
        const grid = new GreekJapaneseGrid(lines);

        const expected = {
            'いち': {
                'α': Cell.EMPTY,
                'β': Cell.EMPTY,
            },
            'さん': {
                'β': Cell.FULL,
            },
        };

        const actual = grid.getLines()
            .map(row => row.toObject())
            .toObject();

        expect(actual).to.eqls(expected);
        expect(() => assertIsValidGrid(grid)).to.throw('Expected rows to have identical columns. Got "α", "β" and "β"');
    });
});
