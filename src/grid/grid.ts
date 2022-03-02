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

export interface Grid<
    ColumnIndex extends Index,
    RowIndex extends Index,
> {
    getLines(): Readonly<GridLines<ColumnIndex, RowIndex>>;
}

export function assertIsValidGrid<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(grid: Grid<ColumnIndex, RowIndex>): void {
    const lines = grid.getLines();

    assertAllRowsHaveSameColumns(lines);
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
            `Expected rows to have identical columns. Got "${columns.join('", "')}" and "${rowColumns.join('", "')}".`
        );
    });
}
