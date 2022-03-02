import { Map } from 'immutable';
import * as _ from 'lodash';
import assert = require('node:assert');

export enum Cell {
    EMPTY,
    FULL,
}

export type Index = number | string | symbol;

export type Row<ColumnIndex extends Index> = Map<ColumnIndex, Cell>;

export type GridRows<
    ColumnIndex extends Index,
    RowIndex extends Index,
> = Map<RowIndex, Row<ColumnIndex>>;

export class Grid<
    ColumnIndex extends Index,
    RowIndex extends Index,
> {
    constructor(
        readonly rows: Readonly<GridRows<ColumnIndex, RowIndex>>,
    ) {
        assertAllRowsHaveSameColumns(rows);
    }

    getRows(): Readonly<GridRows<ColumnIndex, RowIndex>> {
        return this.rows;
    }
}

function assertAllRowsHaveSameColumns<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(rows: Readonly<GridRows<ColumnIndex, RowIndex>>): void {
    let columns: ColumnIndex[];
    let rowColumns: ColumnIndex[];

    rows.forEach((row) => {
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
