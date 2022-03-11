import { expect } from 'chai';
import heredoc from 'tsheredoc';
import { Coordinate } from '../../../src/grid/coordinate';
import { BufferLogger } from '../../../src/logger/buffer-logger';
import { Player } from '../../../src/player/player';
import { createPatrolBoat, createSubmarine } from '../../../src/ship/ship';
import { ShipDirection } from '../../../src/ship/ship-direction';
import { ShipPosition } from '../../../src/ship/ship-position';
import { createGridPrinter } from '../../../src/standard-grid/interactive-player/grid-printer';
import { Cell, StandardOpponentGrid } from '../../../src/standard-grid/standard-opponent-grid';
import { StandardPlayerGrid } from '../../../src/standard-grid/standard-player-grid';
import { StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { StdRowIndex } from '../../../src/standard-grid/std-row-index';

describe('GridPrinter', () => {
    it('prints a player\'s grid and target grid', () => {
        const logger = new BufferLogger();
        const printGrid = createGridPrinter(logger);

        const playerGrid = new StandardPlayerGrid([
            {
                ship: createSubmarine(),
                position: new ShipPosition(
                    new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                    ShipDirection.HORIZONTAL,
                ),
            },
            {
                ship: createPatrolBoat(),
                position: new ShipPosition(
                    new Coordinate(StdColumnIndex.D, StdRowIndex.Row7),
                    ShipDirection.HORIZONTAL,
                ),
            },
            {
                ship: createPatrolBoat(),
                position: new ShipPosition(
                    new Coordinate(StdColumnIndex.H, StdRowIndex.Row3),
                    ShipDirection.VERTICAL,
                ),
            },
        ]);

        playerGrid.recordHit(new Coordinate(StdColumnIndex.D, StdRowIndex.Row7));

        playerGrid.recordHit(new Coordinate(StdColumnIndex.H, StdRowIndex.Row3));
        playerGrid.recordHit(new Coordinate(StdColumnIndex.H, StdRowIndex.Row4));

        const opponentGrid = new StandardOpponentGrid();
        opponentGrid.markAsMissed(new Coordinate(StdColumnIndex.B, StdRowIndex.Row2));
        opponentGrid.markAsHit(new Coordinate(StdColumnIndex.E, StdRowIndex.Row4));

        const playerMock = {
            getPlayerGridRows: () => playerGrid.getRows(),
            getOpponentGridRows: () => opponentGrid.getRows(),
        } as unknown as Player<StdColumnIndex, StdRowIndex, Cell>;

        printGrid(playerMock);

        const expected = heredoc(`
        Your fleet:
        ┌─────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
        │ (index) │  A  │  B  │  C  │  D  │  E  │  F  │  G  │  H  │  I  │  J  │
        ├─────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │    1    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    2    │  .  │  ▓  │  ▓  │  ▓  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    3    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  S  │  .  │  .  │
        │    4    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  S  │  .  │  .  │
        │    5    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    6    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    7    │  .  │  .  │  .  │  ░  │  ▓  │  .  │  .  │  .  │  .  │  .  │
        │    8    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    9    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │   10    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        └─────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
        
        Your target grid:
        ┌─────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
        │ (index) │  A  │  B  │  C  │  D  │  E  │  F  │  G  │  H  │  I  │  J  │
        ├─────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │    1    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    2    │  .  │     │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    3    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    4    │  .  │  .  │  .  │  .  │  ▓  │  .  │  .  │  .  │  .  │  .  │
        │    5    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    6    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    7    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    8    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │    9    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        │   10    │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │  .  │
        └─────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
        `);

        const actual = logger.getRecords()
            .map(({ message }) => message)
            .join('\n');

        expect(actual).to.equal(expected);
    });
});
