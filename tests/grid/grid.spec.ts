// noinspection NonAsciiCharacters

import { expect } from 'chai';
import { Map } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { Grid } from '../../src/grid/grid';

enum Cell {
    EMPTY,
    FULL,
}

type GreekColumnIndex = 'α' | 'β';
type JapaneseRowIndex = 'いち' | 'さん' | 'に';

class GreekJapaneseGrid extends Grid<GreekColumnIndex, JapaneseRowIndex, Cell> {
}

function getGridRowsAsObject<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
>(grid: Grid<ColumnIndex, RowIndex, Cell>): any {
    return grid.getRows()
        .map((row) => row.toObject())
        .toObject();
}

describe('Grid#constructor', () => {
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

describe('Grid::getCell()', () => {
    const grid = new GreekJapaneseGrid(
        Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
            [
                'いち',
                Map<GreekColumnIndex, Cell>([
                    ['α', Cell.EMPTY],
                ]),
            ],
        ]),
    );

    it('allows to get a specific cell', () => {
        const coordinate = new Coordinate('α', 'いち');

        expect(grid.getCell(coordinate)).to.equal(Cell.EMPTY);
    });

    it('cannot give a cell with out of bounds coordinate (row)', () => {
        const getCoordinate = () => grid.getCell(new Coordinate('α', 'さん'));

        expect(getCoordinate).to.throw('Unknown row index "さん". Expected one of "いち".');
    });

    it('cannot give a cell with out of bounds coordinate (column)', () => {
        const getCoordinate = () => grid.getCell(new Coordinate('β', 'いち'));

        expect(getCoordinate).to.throw('Unknown column index "β". Expected one of "α".');
    });
});

class FillingGridSet {
    constructor(
        readonly title: string,
        readonly rows: Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>,
        readonly coordinates: Array<Coordinate<GreekColumnIndex, JapaneseRowIndex>>,
        readonly expectedRowsOrErrorMessage: unknown,
    ) {
    }
}

function* provideFillingGridSets(): Generator<FillingGridSet> {
    const minimalRows = Map<JapaneseRowIndex, Map<GreekColumnIndex, Cell>>([
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
        minimalRows,
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
        minimalRows,
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
        minimalRows,
        [
            new Coordinate('β', 'に'),
        ],
        'Unknown row index "に". Expected one of "いち".',
    );

    yield new FillingGridSet(
        'Fill multiple cells with one out of bound cell (row)',
        minimalRows,
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

describe('Grid filling', () => {
    for (const { title, rows, coordinates, expectedRowsOrErrorMessage } of provideFillingGridSets()) {
        if ('string' === typeof expectedRowsOrErrorMessage) {
            const expectedErrorMessage: string = expectedRowsOrErrorMessage;

            it(`does not allow to fill out of bound cells: ${title}`, () => {
                const originalGrid = new GreekJapaneseGrid(rows);
                const originalGridRows = getGridRowsAsObject(originalGrid);

                const sourceGrid = new GreekJapaneseGrid(rows);

                const fillGrid = () => sourceGrid.fillCells(coordinates, Cell.FULL);

                const sourceGridRows = getGridRowsAsObject(sourceGrid);

                expect(fillGrid).to.throw(expectedErrorMessage);
                expect(sourceGridRows).to.eqls(originalGridRows);
            });
        } else {
            const expectedRows = expectedRowsOrErrorMessage;

            it(`allows to mark cells as filled: ${title}`, () => {
                const originalGrid = new GreekJapaneseGrid(rows);
                const originalGridRows = getGridRowsAsObject(originalGrid);

                const sourceGrid = new GreekJapaneseGrid(rows);

                const filledGrid = sourceGrid.fillCells(coordinates, Cell.FULL);

                const sourceGridRows = getGridRowsAsObject(sourceGrid);
                const filledGridRows = getGridRowsAsObject(filledGrid);

                expect(sourceGridRows).to.eqls(originalGridRows);
                expect(filledGridRows).to.eqls(expectedRows);
            });
        }
    }
});
