import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { printGrid } from '../../grid/grid-printer';
import { Logger } from '../../logger/logger';
import { Player } from '../../player/player';
import { PositionedShip } from '../../ship/positioned-ship';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdRowIndex } from '../std-row-index';

export type PlayerGridPrinter = (player: Player<StdColumnIndex, StdRowIndex, Cell>)=> void;

export function createGridPrinter(logger: Logger): PlayerGridPrinter {
    return (player) => printPlayerGrid(player, logger);
}

function printPlayerGrid(player: Player<StdColumnIndex, StdRowIndex, Cell>, logger: Logger): void {
    logger.log('Your fleet:');
    logger.log(
        printGrid(
            player.getPlayerGridRows(),
            printPlayerCell,
        ),
    );

    logger.log('Your target grid:');
    logger.log(
        printGrid(
            player.getOpponentGridRows(),
            printOpponentCell,
        ),
    );
}

function printPlayerCell(cell: PositionedShip<StdColumnIndex, StdRowIndex> | undefined, _coordinate: StdCoordinate): string {
    if (undefined === cell) {
        return '.';
    }

    return cell.isSunk() ? 'S' : '▓';
}

function printOpponentCell(cell: Cell): string {
    switch (cell) {
        case Cell.NONE:
            return '.';

        case Cell.MISSED:
            return ' ';

        case Cell.HIT:
            return '▓';
    }

    assertIsUnreachableCase(cell);
}
