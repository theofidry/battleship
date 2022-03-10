import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { printGrid } from '../../grid/grid-printer';
import { Logger } from '../../logger/logger';
import { AdaptablePlayer } from '../../player/adaptable-player';
import { PositionedShip } from '../../ship/positioned-ship';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdRowIndex } from '../std-row-index';

export type PlayerGridPrinter = (player: AdaptablePlayer<StdColumnIndex, StdRowIndex, Cell>)=> void;

export function createGridPrinter(logger: Logger): PlayerGridPrinter {
    return (player) => printPlayerGrid(player, logger);
}

export function printPlayerGrid(player: AdaptablePlayer<StdColumnIndex, StdRowIndex, Cell>, logger: Logger): void {
    logger.log(
        printGrid(
            player.getPlayerGridRows(),
            printPlayerCell,
        ),
    );

    logger.log(
        printGrid(
            player.getOpponentGridRows(),
            printOpponentCell,
        ),
    );
}

function printPlayerCell(cell: PositionedShip<StdColumnIndex, StdRowIndex> | undefined, coordinate: StdCoordinate): string {
    if (undefined === cell) {
        return ' ';
    }

    const positionedShip = cell;

    if (positionedShip.isSunk()) {
        return 'S';
    }

    if (positionedShip.isHit(coordinate)) {
        return 'H';
    }

    return 'I';
}

function printOpponentCell(cell: Cell): string {
    switch (cell) {
        case Cell.NONE:
            return '';

        case Cell.MISSED:
            return 'M';

        case Cell.HIT:
            return 'H';
    }

    assertIsUnreachableCase(cell);
}
