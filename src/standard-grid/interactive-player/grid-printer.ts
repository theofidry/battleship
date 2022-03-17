import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { GridRows } from '../../grid/grid';
import { Logger } from '../../logger/logger';
import { printTable } from '../../utils/table-printer';
import { Cell as OpponentGridCell } from '../standard-opponent-grid';
import { Cell as PlayerGridCell } from '../standard-player-grid';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdPlayer } from '../std-player';
import { StdRowIndex } from '../std-row-index';

const TABLE_SEPARATOR = ' '.repeat(10);

export function printPlayerGrid(player: StdPlayer, logger: Logger): void {
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

export function createPlayerTable(
    rows: Readonly<GridRows<StdColumnIndex, StdRowIndex, PlayerGridCell>>,
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

function createPlayerCell(cell: PlayerGridCell, coordinate: StdCoordinate): string {
    if (undefined === cell) {
        return ' ';
    }

    if (HitResponse.MISS === cell) {
        return '✕';
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

export function createOpponentTable(
    rows: Readonly<GridRows<StdColumnIndex, StdRowIndex, OpponentGridCell>>,
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

function createOpponentCell(cell: OpponentGridCell): string {
    switch (cell) {
        case OpponentGridCell.NONE:
            return ' ';

        case OpponentGridCell.MISSED:
            return '✕';

        case OpponentGridCell.HIT:
            return '▓';
    }

    assertIsUnreachableCase(cell);
}

function combineTables(tableA: string, tableB: string): string {
    const tableARows = tableA.split('\n');
    const tableBRows = tableB.split('\n');

    return tableARows
        .map((row, index) => row + TABLE_SEPARATOR + tableBRows[index])
        .join('\n')
        .trimEnd();
}
