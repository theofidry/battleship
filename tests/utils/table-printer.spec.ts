import { expect } from 'chai';
import heredoc from 'tsheredoc';
import { printTable } from '../../src/utils/table-printer';

class TableSet {
    constructor(
        readonly title: string,
        readonly rows: ReadonlyArray<ReadonlyArray<string>>,
        readonly expected: string,
    ) {
    }
}

function* provideTableSets(): Generator<TableSet> {
    yield new TableSet(
        'empty',
        [],
        '',
    );

    yield new TableSet(
        'single empty row',
        [[]],
        heredoc(`
        ┌┐
        ││
        └┘
        `),
    );

    yield new TableSet(
        'one column',
        [
            ['A'],
        ],
        heredoc(`
        ┌─────┐
        │  A  │
        └─────┘
        `),
    );

    yield new TableSet(
        'basic plane unicode',
        [
            ['■'],
        ],
        heredoc(`
        ┌─────┐
        │  ■  │
        └─────┘
        `),
    );

    yield new TableSet(
        'astral plane unicode',
        [
            ['❌'],
        ],
        heredoc(`
        ┌─────┐
        │  ❌  │
        └─────┘
        `),
    );

    yield new TableSet(
        'one column two characters',
        [
            ['AB'],
        ],
        heredoc(`
        ┌─────┐
        │ AB  │
        └─────┘
        `),
    );

    yield new TableSet(
        'one column three characters',
        [
            ['ABC'],
        ],
        heredoc(`
        ┌─────┐
        │ ABC │
        └─────┘
        `),
    );

    yield new TableSet(
        'one column four characters',
        [
            ['ABCD'],
        ],
        heredoc(`
        ┌─────┐
        │ABCD │
        └─────┘
        `),
    );

    yield new TableSet(
        'one column five characters',
        [
            ['ABCDE'],
        ],
        heredoc(`
        ┌─────┐
        │ABCDE│
        └─────┘
        `),
    );

    yield new TableSet(
        'two columns',
        [
            ['A', 'B'],
        ],
        heredoc(`
        ┌─────┬─────┐
        │  A  │  B  │
        └─────┴─────┘
        `),
    );

    yield new TableSet(
        'two rows',
        [
            ['A'],
            ['B'],
        ],
        heredoc(`
        ┌─────┐
        │  A  │
        ├─────┤
        │  B  │
        └─────┘
        `),
    );

    yield new TableSet(
        'two rows two columns',
        [
            ['A', 'B'],
            ['C', 'D'],
        ],
        heredoc(`
        ┌─────┬─────┐
        │  A  │  B  │
        ├─────┼─────┤
        │  C  │  D  │
        └─────┴─────┘
      `),
    );
}

describe('TablePrinter', () => {
    for (const { title, rows, expected } of provideTableSets()) {
        it(`can draw tables: ${title}`, () => {
            expect(printTable(rows)).to.equal(expected);
        });
    }
});
