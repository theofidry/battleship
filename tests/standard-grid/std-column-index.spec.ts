import { expect } from 'chai';
import {
    findNextColumnIndex, findPreviousColumnIndex, sortColumnIndex, StdColumnIndex,
} from '../../src/standard-grid/std-column-index';

class IndexSet {
    constructor(
        readonly title: string,
        readonly columnIndex: StdColumnIndex,
        readonly expectedPreviousIndex: StdColumnIndex | undefined,
        readonly expectedNextIndex: StdColumnIndex | undefined,
    ) {
    }
}

function* provideIndexSet(): Generator<IndexSet> {
    yield new IndexSet(
        'first column',
        StdColumnIndex.A,
        undefined,
        StdColumnIndex.B,
    );

    yield new IndexSet(
        'after-first column',
        StdColumnIndex.B,
        StdColumnIndex.A,
        StdColumnIndex.C,
    );

    yield new IndexSet(
        'mid-column',
        StdColumnIndex.E,
        StdColumnIndex.D,
        StdColumnIndex.F,
    );

    yield new IndexSet(
        'before-last column',
        StdColumnIndex.I,
        StdColumnIndex.H,
        StdColumnIndex.J,
    );

    yield new IndexSet(
        'last column',
        StdColumnIndex.J,
        StdColumnIndex.I,
        undefined,
    );
}

describe('StdColumnIndex', () => {
    for (const { title, columnIndex, expectedPreviousIndex, expectedNextIndex } of provideIndexSet()) {
        it(`can find the previous index: ${title}`, () => {
            expect(findPreviousColumnIndex(columnIndex)).to.equal(expectedPreviousIndex);
        });

        it(`can find the next index: ${title}`, () => {
            expect(findNextColumnIndex(columnIndex)).to.equal(expectedNextIndex);
        });
    }

    it('can be sorted', () => {
        const input = [
            StdColumnIndex.A,
            StdColumnIndex.J,
            StdColumnIndex.I,
            StdColumnIndex.C,
            StdColumnIndex.I,
        ];

        const expected = [
            StdColumnIndex.A,
            StdColumnIndex.C,
            StdColumnIndex.I,
            StdColumnIndex.I,
            StdColumnIndex.J,
        ];

        expect(input.sort(sortColumnIndex)).to.eqls(expected);
    });
});
