import { Map } from 'immutable';
import * as _ from 'lodash';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { Coordinate } from './coordinate';

/**
 * Basic grid which offers an API to easily interact with its cells. The grid
 * itself is not specific to the game and should be seen as block to help to
 * build a game grid.
 */
export class Grid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> {
    constructor(
        private readonly rows: Readonly<GridRows<ColumnIndex, RowIndex, Cell>>,
    ) {
        assertAllRowsHaveSameColumns(rows);
    }

    fillCells(
        coordinates: ReadonlyArray<Coordinate<ColumnIndex, RowIndex>>,
        value: Cell,
        allowWrite: (existingValue: Cell)=> boolean = () => true,
    ): Grid<ColumnIndex, RowIndex, Cell> {
        let rows = this.rows;
        let row: Row<ColumnIndex, Cell>;

        coordinates.forEach((coordinate) => {
            const { columnIndex, rowIndex } = coordinate;

            row = getRow(rows, rowIndex);

            assertRowHasColumn(row, columnIndex);
            // TS understand Cell|undefined here. This is due to ImmutableJS API
            // but Cell could very well include undefined hence we cannot do
            // a non-undefined assertion here.
            const existingValue = row.get(columnIndex) as Cell;

            if (!allowWrite(existingValue)) {
                throw CannotOverwriteCell.forCell(coordinate, existingValue);
            }

            row = row.set(columnIndex, value);

            rows = rows.set(rowIndex, row);
        });

        return new Grid(rows);
    }

    getCell(coordinate: Coordinate<ColumnIndex, RowIndex>): Cell {
        const row = getRow(this.rows, coordinate.rowIndex);

        assertRowHasColumn(row, coordinate.columnIndex);

        return row.get(coordinate.columnIndex) as Cell;
    }

    getRows(): Readonly<GridRows<ColumnIndex, RowIndex, Cell>> {
        return this.rows;
    }
}

export type Row<ColumnIndex extends PropertyKey, Cell> = Map<ColumnIndex, Cell>;

export type GridRows<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
    > = Map<RowIndex, Row<ColumnIndex, Cell>>;

function getRow<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey, Cell>(
    rows: Readonly<GridRows<ColumnIndex, RowIndex, Cell>>,
    rowIndex: RowIndex,
): Row<ColumnIndex, Cell> {
    const row = rows.get(rowIndex);

    assertIsNotUndefined(
        row,
        GridOutOfBoundCoordinate.forRow(
            rowIndex,
            rows.keySeq().toArray(),
        ),
    );

    return row;
}

function assertRowHasColumn<ColumnIndex extends PropertyKey, Cell>(
    row: Readonly<Row<ColumnIndex, Cell>>,
    columnIndex: ColumnIndex,
): void {
    assert(
        row.has(columnIndex),
        GridOutOfBoundCoordinate.forColumn(
            columnIndex,
            row.keySeq().toArray(),
        ),
    );
}

function assertAllRowsHaveSameColumns<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
>(rows: Readonly<GridRows<ColumnIndex, RowIndex, Cell>>): void {
    let columns: ColumnIndex[];
    let rowColumns: ColumnIndex[];

    rows.forEach((row) => {
        rowColumns = row.keySeq().toArray();

        if (undefined === columns) {
            columns = rowColumns;
        }

        assert(
            _.isEqual(rowColumns, columns),
            () => InvalidGrid.forColumns(rowColumns, columns),
        );
    });
}

function stringifyIndices<I extends PropertyKey>(indices: I[]): string {
    return indices.join('", "');
}

class InvalidGrid extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidGrid';
    }

    static forColumns<ColumnIndex extends PropertyKey>(a: ColumnIndex[], b: ColumnIndex[]): InvalidGrid {
        return new InvalidGrid(
            `Expected rows to have identical columns. Got "${stringifyIndices(a)}" and "${stringifyIndices(b)}".`,
        );
    }
}

class GridOutOfBoundCoordinate extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'OutOfBoundCoordinate';
    }

    static forRow<
        RowIndex extends PropertyKey>(
        rowIndex: RowIndex,
        rowIndices: RowIndex[],
    ): GridOutOfBoundCoordinate {
        return new GridOutOfBoundCoordinate(
            `Unknown row index "${rowIndex}". Expected one of "${stringifyIndices(rowIndices)}".`,
        );
    }

    static forColumn<
        ColumnIndex extends PropertyKey>(
        columnIndex: ColumnIndex,
        columnIndices: ColumnIndex[],
    ): GridOutOfBoundCoordinate {
        return new GridOutOfBoundCoordinate(
            `Unknown column index "${columnIndex}". Expected one of "${stringifyIndices(columnIndices)}".`,
        );
    }
}

class CannotOverwriteCell extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'CannotOverwriteCell';
    }

    static forCell<
        ColumnIndex extends PropertyKey,
        RowIndex extends PropertyKey,
        Cell,
    >(
        coordinate: Coordinate<ColumnIndex, RowIndex>,
        existingValue: Cell,
    ): CannotOverwriteCell {
        return new CannotOverwriteCell(
            `Cannot overwrite the value "${existingValue}" for the coordinate "${coordinate}".`,
        );
    }
}
