import { Column, getColumnRange } from '@app/grid/Column';
import { expect } from 'chai';

class ColumnRangeSet {
    constructor(
        public readonly title: string,
        public readonly start: Column,
        public readonly length: number,
        public readonly expected: Readonly<Array<Column>> | string,
    ) {
    }
}

describe('Column', () => {
    for (const { title, start, length, expected } of provideColumnRanges()) {
        if ('string' === typeof expected) {
            const expectedErrorMessage: string = expected;

            it(`is cannot get columns within invalid range: ${title}`, () => {
                expect(
                    () => getColumnRange(start, length),
                ).to.throw(expectedErrorMessage);
            });
        } else {
            const expectedColumns: Readonly<Array<Column>> = expected;

            it(`is can get columns within range: ${title}`, () => {
                const actual = getColumnRange(start, length);

                expect(actual).to.eqls(expectedColumns);
            });
        }
    }
});

function* provideColumnRanges(): Generator<ColumnRangeSet> {
    const outOfBoundErrorMessage = 'Out of bond';

    yield new ColumnRangeSet(
        'first no column',
        Column.A,
        0,
        [],
    );

    yield new ColumnRangeSet(
        'first single column',
        Column.A,
        1,
        [Column.A],
    );

    yield new ColumnRangeSet(
        'first column with invalid (negative) length',
        Column.A,
        -1,
        'Expected length to be a natural',
    );

    yield new ColumnRangeSet(
        'two first column',
        Column.A,
        2,
        [Column.A, Column.B],
    );

    yield new ColumnRangeSet(
        'two mid-column',
        Column.C,
        2,
        [Column.C, Column.D],
    );

    yield new ColumnRangeSet(
        'last column',
        Column.J,
        1,
        [Column.J],
    );

    yield new ColumnRangeSet(
        'last no column',
        Column.J,
        0,
        [],
    );

    yield new ColumnRangeSet(
        'last column and beyond',
        Column.J,
        2,
        outOfBoundErrorMessage,
    );

    yield new ColumnRangeSet(
        'mid-column and beyond',
        Column.G,
        5,
        outOfBoundErrorMessage,
    );
}
