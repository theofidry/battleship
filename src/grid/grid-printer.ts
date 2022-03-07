import stringConsole from '../utils/string-console';
import { GridRows } from './grid';

export function printGrid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
>(
    gridRows: Readonly<GridRows<ColumnIndex, RowIndex, Cell>>,
    cellPrinter: (cell: Cell)=> number | string | null,
): string {
    const table = {
        ...gridRows
            .map((row) => ({
                ...row
                    .map((cell) => cellPrinter(cell))
                    .toObject(),
            }))
            .toObject(),
    };

    const stringTable = stringConsole.table(table) as unknown as string;

    return stringTable.replace(/'(.+)'/, ' $1 ');
}
