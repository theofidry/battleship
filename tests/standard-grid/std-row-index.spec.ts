import { expect } from 'chai';
import {
    findNextRowIndex, findPreviousRowIndex, sortRowIndex, StdRowIndex,
} from '../../src/standard-grid/std-row-index';

class IndexSet {
    constructor(
        readonly title: string,
        readonly columnIndex: StdRowIndex,
        readonly expectedPreviousIndex: StdRowIndex | undefined,
        readonly expectedNextIndex: StdRowIndex | undefined,
    ) {
    }
}

function* provideIndexSet(): Generator<IndexSet> {
    yield new IndexSet(
        'first row',
        StdRowIndex.Row1,
        undefined,
        StdRowIndex.Row2,
    );

    yield new IndexSet(
        'after-first row',
        StdRowIndex.Row2,
        StdRowIndex.Row1,
        StdRowIndex.Row3,
    );

    yield new IndexSet(
        'mid-row',
        StdRowIndex.Row8,
        StdRowIndex.Row7,
        StdRowIndex.Row9,
    );

    yield new IndexSet(
        'before-last row',
        StdRowIndex.Row9,
        StdRowIndex.Row8,
        StdRowIndex.Row10,
    );

    yield new IndexSet(
        'last row',
        StdRowIndex.Row10,
        StdRowIndex.Row9,
        undefined,
    );
}

describe('StdRowIndex', () => {
    for (const { title, columnIndex, expectedPreviousIndex, expectedNextIndex } of provideIndexSet()) {
        it(`can find the previous index: ${title}`, () => {
            expect(findPreviousRowIndex(columnIndex)).to.equal(expectedPreviousIndex);
        });

        it(`can find the next index: ${title}`, () => {
            expect(findNextRowIndex(columnIndex)).to.equal(expectedNextIndex);
        });
    }

    it('can be sorted', () => {
        const input = [
            StdRowIndex.Row1,
            StdRowIndex.Row10,
            StdRowIndex.Row7,
            StdRowIndex.Row3,
            StdRowIndex.Row7,
        ];

        const expected = [
            StdRowIndex.Row1,
            StdRowIndex.Row3,
            StdRowIndex.Row7,
            StdRowIndex.Row7,
            StdRowIndex.Row10,
        ];

        expect(input.sort(sortRowIndex)).to.eqls(expected);
    });
});
