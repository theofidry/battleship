import { Map } from 'immutable';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Grid, GridRows, Row } from '../grid/grid';
import { PlayerGrid } from '../grid/player-grid';
import { PositionedShip } from '../ship/positioned-ship';
import { Ship } from '../ship/ship';
import { ShipPosition } from '../ship/ship-position';
import { EnumHelper } from '../utils/enum-helper';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

type Cell = PositionedShip<StdColumnIndex, StdRowIndex> | undefined;

export class StandardPlayerGrid implements PlayerGrid<
    StdColumnIndex,
    StdRowIndex,
    Cell
> {
    private readonly innerGrid: Readonly<Grid<StdColumnIndex, StdRowIndex, Cell>>;
    private readonly fleet: ReadonlyArray<PositionedShip<StdColumnIndex, StdRowIndex>>;

    constructor(
        fleet: ReadonlyArray<{ ship: Ship, position: ShipPosition<StdColumnIndex, StdRowIndex> }>,
    ) {
        this.fleet = fleet.map(({ ship, position }) => {
            const shipCoordinates = getCoordinates(position);

            return new PositionedShip(ship, shipCoordinates);
        });

        this.innerGrid = this.fleet.reduce(
            (grid, positionedShip) => grid.fillCells(
                positionedShip.coordinates,
                positionedShip,
            ),
            createEmptyGrid(),
        );
    }

    recordHit(coordinate: Coordinate<StdColumnIndex, StdRowIndex>): HitResponse {
        const hitShip = this.innerGrid.getCell(coordinate);

        if (undefined === hitShip) {
            return HitResponse.MISS;
        }

        hitShip.markAsHit(coordinate);

        if (!hitShip.isSunk()) {
            return HitResponse.HIT;
        }

        const fleetSunk = this.fleet.reduce(
            (sunk, ship) => sunk = sunk && ship.isSunk(),
            true,
        );

        return fleetSunk ? HitResponse.WON : HitResponse.SUNK;
    }

    getRows(): Readonly<GridRows<StdColumnIndex, StdRowIndex, Cell>> {
        return this.innerGrid.getRows();
    }
}

export function createEmptyRow(): Row<StdColumnIndex, Cell> {
    return Map(
        EnumHelper
            .getValues(StdColumnIndex)
            .map((columnIndex) => [columnIndex, undefined]),
    );
}

export function createEmptyGrid(): Grid<StdColumnIndex, StdRowIndex, Cell> {
    const rows = Map(
        EnumHelper
            .getValues(StdRowIndex)
            .map((rowIndex) => [rowIndex, createEmptyRow()]),
    );

    return new Grid(rows);
}

function getCoordinates(
    ship: ShipPosition<StdColumnIndex, StdRowIndex>,
): ReadonlyArray<Coordinate<StdColumnIndex, StdRowIndex>> {

}
