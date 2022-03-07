import stringConsole from '../utils/string-console';
import { Grid } from './grid';

export function printGrid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
>(
    grid: Grid<ColumnIndex, RowIndex, Cell>,
    cellPrinter: (cell: Cell)=> number | string | null,
): string {
    const table = {
        ...grid.getRows()
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
