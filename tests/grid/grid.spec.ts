// noinspection NonAsciiCharacters

import { expect } from 'chai';
import { Map } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
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

        const actual = getGridRowsAsObject(grid);

        expect(actual).to.eqls(expected);
    });

    it('allows to create a grid with only some of the rows and columns', () => {
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

        const actual = getGridRowsAsObject(grid);

        expect(actual).to.eqls(expected);
    });

    it('does not allow to create a grid with rows of different columns', () => {
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

        const createGrid = () => new GreekJapaneseGrid(lines);

        expect(createGrid).to.throw('Expected rows to have identical columns. Got "β" and "α", "β".');
    });
});

class FillingGridSet {
    constructor(
        readonly title: string,
        readonly lines: Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>,
        readonly coordinates: Array<Coordinate<GreekColumnIndex, JapaneseRowIndex>>,
        readonly expectedLinesOrErrorMessage: unknown,
    ) {
    }
}

function* provideFillingGridSets(): Generator<FillingGridSet> {
    const minimalLines = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
        [
            'いち',
            Map<GreekColumnIndex, Cell>([
                ['α', Cell.EMPTY],
                ['β', Cell.FULL],
            ]),
        ],
    ]);

    yield new FillingGridSet(
        'Fill a single empty cell',
        minimalLines,
        [
            new Coordinate('α', 'いち'),
        ],
        {
            'いち': {
                'α': Cell.FULL,
                'β': Cell.FULL,
            },
        },
    );

    yield new FillingGridSet(
        'Fill an already filled cell',
        minimalLines,
        [
            new Coordinate('β', 'いち'),
        ],
        {
            'いち': {
                'α': Cell.EMPTY,
                'β': Cell.FULL,
            },
        },
    );

    yield new FillingGridSet(
        'Fill an out of bound cell (column)',
        Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.EMPTY],
                ]),
            ],
        ]),
        [
            new Coordinate('β', 'いち'),
        ],
        'Unknown column index "β". Expected one of "α".',
    );

    yield new FillingGridSet(
        'Fill an out of bound cell (row)',
        minimalLines,
        [
            new Coordinate('β', 'に'),
        ],
        'Unknown row index "に". Expected one of "いち".',
    );

    yield new FillingGridSet(
        'Fill multiple cells with one out of bound cell (row)',
        minimalLines,
        [
            new Coordinate('β', 'いち'),
            new Coordinate('β', 'に'),
        ],
        'Unknown row index "に". Expected one of "いち".',
    );

    yield new FillingGridSet(
        'nominal',
        Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
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
                    ['α', Cell.EMPTY],
                    ['β', Cell.EMPTY],
                ]),
            ],
        ]),
        [
            new Coordinate('α', 'いち'),
            new Coordinate('β', 'いち'),
            new Coordinate('α', 'さん'),
            new Coordinate('β', 'さん'),
            new Coordinate('β', 'に'),
        ],
        {
            'いち': {
                'α': Cell.FULL,
                'β': Cell.FULL,
            },
            'さん': {
                'α': Cell.FULL,
                'β': Cell.FULL,
            },
            'に': {
                'α': Cell.EMPTY,
                'β': Cell.FULL,
            },
        },
    );
}

describe('filling Grid', () => {
    for (const { title, lines, coordinates, expectedLinesOrErrorMessage } of provideFillingGridSets()) {
        if ('string' === typeof expectedLinesOrErrorMessage) {
            const expectedErrorMessage: string = expectedLinesOrErrorMessage;

            it(`does not allow to fill out of bound cells: ${title}`, () => {
                const originalGrid = new GreekJapaneseGrid(lines);
                const originalGridLines = getGridRowsAsObject(originalGrid);

                const sourceGrid = new GreekJapaneseGrid(lines);

                const fillGrid = () => sourceGrid.fillCells(coordinates);

                const sourceGridLines = getGridRowsAsObject(sourceGrid);

                expect(fillGrid).to.throw(expectedErrorMessage);
                expect(sourceGridLines).to.eqls(originalGridLines);
            });
        } else {
            const expectedLines = expectedLinesOrErrorMessage;

            it(`allows to mark cells as filled: ${title}`, () => {
                const originalGrid = new GreekJapaneseGrid(lines);
                const originalGridLines = getGridRowsAsObject(originalGrid);

                const sourceGrid = new GreekJapaneseGrid(lines);

                const filledGrid = sourceGrid.fillCells(coordinates);

                const sourceGridLines = getGridRowsAsObject(sourceGrid);
                const filledGridLines = getGridRowsAsObject(filledGrid);

                expect(sourceGridLines).to.eqls(originalGridLines);
                expect(filledGridLines).to.eqls(expectedLines);
            });
        }
    }
});
