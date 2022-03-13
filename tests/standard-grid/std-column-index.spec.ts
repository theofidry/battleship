import { expect } from 'chai';
import {
    getNextColumnIndex, getPreviousColumnIndex, StdColumnIndex,
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
        it(`can give the previous index: ${title}`, () => {
            expect(getPreviousColumnIndex(columnIndex)).to.equal(expectedPreviousIndex);
        });

        it(`can give the next index: ${title}`, () => {
            expect(getNextColumnIndex(columnIndex)).to.equal(expectedNextIndex);
        });
    }
});
