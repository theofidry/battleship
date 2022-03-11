import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { Coordinate } from '../../grid/coordinate';
import { GridRows } from '../../grid/grid';
import { Logger } from '../../logger/logger';
import { Player } from '../../player/player';
import { PositionedShip } from '../../ship/positioned-ship';
import { printTable } from '../../utils/table-printer';
import { Cell } from '../standard-opponent-grid';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdRowIndex } from '../std-row-index';

const TABLE_SEPARATOR = ' '.repeat(10);

export type PlayerGridPrinter = (player: Player<StdColumnIndex, StdRowIndex, Cell>)=> void;

export function createGridPrinter(logger: Logger): PlayerGridPrinter {
    return (player) => printPlayerGrid(player, logger);
}

function printPlayerGrid(player: Player<StdColumnIndex, StdRowIndex, Cell>, logger: Logger): void {
    const targetGrid = printTable(
        createOpponentTable(player.getOpponentGridRows()),
    );
    const playerGrid = printTable(
        createPlayerTable(player.getPlayerGridRows()),
    );

    const firstTableLength = targetGrid.split('\n')[0]!.length;
    const message = 'Your target grid:'.padEnd(firstTableLength + TABLE_SEPARATOR.length) + 'Your fleet:';

    logger.log(message);
    logger.log(combineTables(targetGrid, playerGrid));
}

function createPlayerTable(
    rows: Readonly<GridRows<StdColumnIndex, StdRowIndex, PositionedShip<StdColumnIndex, StdRowIndex>|undefined>>,
): ReadonlyArray<ReadonlyArray<string>> {
    return rows
        .map(
            (row, rowIndex) => row
                .map((cell, columnIndex) => createPlayerCell(
                    cell,
                    new Coordinate(columnIndex, rowIndex),
                ))
                .toList()
                .unshift(String(rowIndex.valueOf()))
                .toArray(),
        )
        .toList()
        .unshift([
            ' ',
            ...STD_COLUMN_INDICES.map((columnIndex) => columnIndex.valueOf()),
        ])
        .toArray();
}

function createPlayerCell(cell: PositionedShip<StdColumnIndex, StdRowIndex> | undefined, coordinate: StdCoordinate): string {
    if (undefined === cell) {
        return ' ';
    }

    const positionedShip = cell;

    if (positionedShip.isSunk()) {
        return 'S';
    }

    if (positionedShip.isHit(coordinate)) {
        return '░';
    }

    return '▓';
}

function createOpponentTable(
    rows: Readonly<GridRows<StdColumnIndex, StdRowIndex, Cell>>,
): ReadonlyArray<ReadonlyArray<string>> {
    return rows
        .map(
            (row, rowIndex) => row
                .map(createOpponentCell)
                .toList()
                .unshift(String(rowIndex.valueOf()))
                .toArray(),
        )
        .toList()
        .unshift([
            ' ',
            ...STD_COLUMN_INDICES.map((columnIndex) => columnIndex.valueOf()),
        ])
        .toArray();
}

function createOpponentCell(cell: Cell): string {
    switch (cell) {
        case Cell.NONE:
            return ' ';

        case Cell.MISSED:
            return '✕';

        case Cell.HIT:
            return '▓';
    }

    assertIsUnreachableCase(cell);
}

function combineTables(tableA: string, tableB: string): string {
    const tableARows = tableA.split('\n');
    const tableBRows = tableB.split('\n');

    return tableARows
        .map((row, index) => `${row}${TABLE_SEPARATOR}${tableBRows[index]}`)
        .join('\n');
}
