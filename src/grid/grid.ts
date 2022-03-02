import { Map } from 'immutable';
import * as _ from 'lodash';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { Coordinate } from './coordinate';
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

function getRow<ColumnIndex extends Index, RowIndex extends Index>(
    rows: Readonly<GridRows<ColumnIndex, RowIndex>>,
    rowIndex: RowIndex,
): Row<ColumnIndex> {
    const row = rows.get(rowIndex);

    assertIsNotUndefined(
        row,
        OutOfBoundCoordinate.forRow(
            rowIndex,
            rows.keySeq().toArray(),
        ),
    );

    return row;
}

function assertRowHasColumn<ColumnIndex extends Index>(
    row: Readonly<Row<ColumnIndex>>,
    columnIndex: ColumnIndex,
): void {
    assert(
        row.has(columnIndex),
        OutOfBoundCoordinate.forColumn(
            columnIndex,
            row.keySeq().toArray(),
        ),
    );
}

/**
 * Basic grid which offers an API to easily interact with its cells. The grid
 * itself is not specific to the game and should be seen as block to help to
 * build a game grid.
 */
export class Grid<
    ColumnIndex extends Index,
    RowIndex extends Index,
> {
    constructor(
        readonly rows: Readonly<GridRows<ColumnIndex, RowIndex>>,
    ) {
        assertAllRowsHaveSameColumns(rows);
    }

    fillCells(coordinates: Array<Coordinate<ColumnIndex, RowIndex>>): Grid<ColumnIndex, RowIndex> {
        let rows = this.rows;
        let row: Row<ColumnIndex>;

        coordinates.forEach(({ columnIndex, rowIndex }) => {
            row = getRow(rows, rowIndex);

            assertRowHasColumn(row, columnIndex);

            row = row.set(columnIndex, Cell.FULL);

            rows = rows.set(rowIndex, row);
        });

        return new Grid(rows);
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

class OutOfBoundCoordinate extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidGridError';
    }

    static forRow<RowIndex extends Index>(rowIndex: RowIndex, rowIndices: RowIndex[]): OutOfBoundCoordinate {
        return new InvalidGridError(
            `Unknown row index "${rowIndex}". Expected one of "${stringifyIndices(rowIndices)}".`,
        );
    }

    static forColumn<ColumnIndex extends Index>(columnIndex: ColumnIndex, columnIndices: ColumnIndex[]): OutOfBoundCoordinate {
        return new InvalidGridError(
            `Unknown column index "${columnIndex}". Expected one of "${stringifyIndices(columnIndices)}".`,
        );
    }
}
