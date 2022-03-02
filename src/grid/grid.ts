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

export type GridLines<
    ColumnIndex extends Index,
    RowIndex extends Index,
> = Map<RowIndex, Row<ColumnIndex>>;

function getRow<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(lines: Readonly<GridLines<ColumnIndex, RowIndex>>, rowIndex: RowIndex): Row<ColumnIndex> {
    const row = lines.get(rowIndex);

    assertIsNotUndefined(
        row,
        OutOfBoundCoordinate.forRow(
            rowIndex,
            lines.keySeq().toArray(),
        ),
    );

    return row;
}

function assertRowHasColumn<
    ColumnIndex extends Index,
    RowIndex extends Index,
>(row: Readonly<Row<ColumnIndex>>, columnIndex: ColumnIndex): void {
    assert(
        row.has(columnIndex),
        OutOfBoundCoordinate.forColumn(
            columnIndex,
            row.keySeq().toArray(),
        ),
    );
}

export class Grid<
    ColumnIndex extends Index,
    RowIndex extends Index,
> {
    constructor(
        readonly lines: Readonly<GridLines<ColumnIndex, RowIndex>>,
    ) {
        assertAllRowsHaveSameColumns(lines);
    }

    fillCells(coordinates: Array<Coordinate<ColumnIndex, RowIndex>>): Grid<ColumnIndex, RowIndex> {
        let lines = this.lines;
        let row: Row<ColumnIndex>;

        coordinates.forEach(({ columnIndex, rowIndex }) => {
            row = getRow(lines, rowIndex);

            assertRowHasColumn(row, columnIndex);

            row = row.set(columnIndex, Cell.FULL);

            lines = lines.set(rowIndex, row);
        });

        return new Grid(lines);
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

class InvalidGridError<ColumnIndex extends Index> extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidGridError';
    }

    static forColumns<ColumnIndex extends Index>(a: ColumnIndex[], b: ColumnIndex[]): InvalidGridError<ColumnIndex> {
        return new InvalidGridError(
            `Expected rows to have identical columns. Got "${stringifyIndices(a)}" and "${stringifyIndices(b)}".`,
        );
    }
}

class OutOfBoundCoordinate<ColumnIndex extends Index> extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidGridError';
    }

    static forRow<RowIndex extends Index>(rowIndex: RowIndex, rowIndices: RowIndex[]): InvalidGridError<RowIndex> {
        return new InvalidGridError(
            `Unknown row index "${rowIndex}". Expected one of "${stringifyIndices(rowIndices)}".`,
        );
    }

    static forColumn<ColumnIndex extends Index>(columnIndex: ColumnIndex, columnIndices: ColumnIndex[]): InvalidGridError<ColumnIndex> {
        return new InvalidGridError(
            `Unknown column index "${columnIndex}". Expected one of "${stringifyIndices(columnIndices)}".`,
        );
    }
}
