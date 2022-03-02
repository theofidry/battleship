import { Map } from 'immutable';
import * as _ from 'lodash';
import assert = require('node:assert');

export enum Cell {
    EMPTY,
    FULL,
}

export type Index = number | string | symbol;

export type Row<ColumnIndex extends Index> = Map<ColumnIndex, Cell>;

export type GridLines<
    ColumnIndex extends Index,
    RowIndex extends Index,
> = Map<RowIndex, Row<ColumnIndex>>;

export class Grid<
    ColumnIndex extends Index,
    RowIndex extends Index,
> {
    constructor(
        readonly lines: Readonly<GridLines<ColumnIndex, RowIndex>>,
    ) {
        assertAllRowsHaveSameColumns(lines);
    }

    getLines(): Readonly<GridLines<ColumnIndex, RowIndex>> {
        return this.lines;
    }
}

function assertAllRowsHaveSameColumns<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(lines: Readonly<GridLines<ColumnIndex, RowIndex>>): void {
    let columns: ColumnIndex[];
    let rowColumns: ColumnIndex[];

    lines.forEach((row) => {
        rowColumns = row.keySeq().toArray();

        if (undefined === columns) {
            columns = rowColumns;
        }

        assert(
            _.isEqual(rowColumns, columns),
            InvalidGridError.forColumns(rowColumns, columns),
        );
    });
}

function stringifyIndices<I extends Index>(indices: I[]): string {
    return indices.join('", "');
}

class InvalidGridError extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidGridError';
    }

    static forColumns<ColumnIndex extends Index>(a: ColumnIndex[], b: ColumnIndex[]): InvalidGridError {
        return new InvalidGridError(
            `Expected rows to have identical columns. Got "${stringifyIndices(a)}" and "${stringifyIndices(b)}".`,
        );
    }
}
