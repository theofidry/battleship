import stringConsole from '../utils/string-console';
import { Coordinate } from './coordinate';
import { GridRows } from './grid';

export type CellPrinter<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> = (cell: Cell, coordinate: Coordinate<ColumnIndex, RowIndex>)=> number | string | null;

export function printGrid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
>(
    gridRows: Readonly<GridRows<ColumnIndex, RowIndex, Cell>>,
    cellPrinter: CellPrinter<ColumnIndex, RowIndex, Cell>,
): string {
    const table = {
        ...gridRows
            .map((row, rowIndex) => ({
                ...row
                    .map((cell, columnIndex) => cellPrinter(cell, new Coordinate(columnIndex, rowIndex)))
                    .toObject(),
            }))
            .toObject(),
    };

    const stringTable = stringConsole.table(table) as unknown as string;

    return stringTable.replaceAll(/'(.+?)'/g, ' $1 ');
}
