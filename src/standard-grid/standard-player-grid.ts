import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Cell, Grid, GridRows, Row } from '../grid/grid';
import { PlayerGrid } from '../grid/player-grid';
import { PositionedShip } from '../ship/positioned-ship';
import { Ship } from '../ship/ship';
import { ShipPosition } from '../ship/ship-position';
import { EnumHelper } from '../utils/enum-helper';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export class StandardPlayerGrid implements PlayerGrid<StdColumnIndex, StdRowIndex> {
    private readonly shipMap = new Map<Coordinate<StdColumnIndex, StdRowIndex>, PositionedShip<StdColumnIndex, StdRowIndex>>();
    private readonly fleet: Array<PositionedShip<StdColumnIndex, StdRowIndex>> = [];

    constructor(
        private readonly innerGrid: Grid<StdColumnIndex, StdRowIndex> = createEmptyGrid(),
    ) {
    }

    placeShip(ship: Ship, position: ShipPosition<StdColumnIndex, StdRowIndex>): void {
        const shipCoordinates = getCoordinates(position);
        const positionedShip = new PositionedShip(ship, shipCoordinates);

        this.innerGrid.fillCells(shipCoordinates);

        shipCoordinates.forEach((coordinate) => {
            this.shipMap.set(coordinate, positionedShip);
            this.fleet.push(positionedShip);
        });
    }

    recordHit(coordinate: Coordinate<StdColumnIndex, StdRowIndex>): HitResponse {
        const hitShip = this.shipMap.get(coordinate);

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
}

export function createEmptyRow(): Row<StdColumnIndex> {
    return Map(
        EnumHelper
            .getValues(StdColumnIndex)
            .map((columnIndex) => [columnIndex, Cell.EMPTY]),
    );
}

export function createEmptyGrid(): Grid<StdColumnIndex, StdRowIndex> {
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
