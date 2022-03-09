import { Map, OrderedSet } from 'immutable';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Grid, GridRows, Row } from '../grid/grid';
import { PlayerGrid, ShipPlacement } from '../grid/player-grid';
import { PositionedShip } from '../ship/positioned-ship';
import { ShipDirection } from '../ship/ship-direction';
import { EnumHelper } from '../utils/enum-helper';
import { StdColumnIndex } from './std-column-index';
import { StdCoordinate } from './std-coordinate';
import { StdRowIndex } from './std-row-index';
import assert = require('node:assert');

export type Cell = PositionedShip<StdColumnIndex, StdRowIndex> | undefined;

export class StandardPlayerGrid implements PlayerGrid<
    StdColumnIndex,
    StdRowIndex,
    Cell
> {
    private readonly innerGrid: Readonly<Grid<StdColumnIndex, StdRowIndex, Cell>>;
    private readonly fleet: ReadonlyArray<PositionedShip<StdColumnIndex, StdRowIndex>>;

    constructor(
        fleet: ReadonlyArray<ShipPlacement<StdColumnIndex, StdRowIndex>>,
    ) {
        this.fleet = fleet.map((shipPlacement) => {
            const shipCoordinates = getCoordinates(shipPlacement);

            return new PositionedShip(shipPlacement.ship, shipCoordinates);
        });

        this.innerGrid = this.fleet.reduce(
            (grid, positionedShip) => grid.fillCells(
                positionedShip.coordinates.toArray(),
                positionedShip,
                (cell) => undefined === cell,
            ),
            createEmptyGrid(),
        );
    }

    recordHit(coordinate: StdCoordinate): HitResponse {
        const hitShip = this.innerGrid.getCell(coordinate);

        if (undefined === hitShip) {
            return HitResponse.MISS;
        }

        hitShip.markAsHit(coordinate);

        if (!hitShip.isSunk()) {
            return HitResponse.HIT;
        }

        const fleetSunk = this.fleet.reduce(
            (sunk, ship) => sunk && ship.isSunk(),
            true,
        );

        return fleetSunk ? HitResponse.WON : HitResponse.SUNK;
    }

    getRows(): Readonly<GridRows<StdColumnIndex, StdRowIndex, Cell>> {
        return this.innerGrid.getRows();
    }
}

export function getCoordinates(
    shipPlacement: ShipPlacement<StdColumnIndex, StdRowIndex>,
): OrderedSet<StdCoordinate> {
    const columns = EnumHelper.getValues(StdColumnIndex);
    const rows = EnumHelper.getValues(StdRowIndex);

    if (shipPlacement.position.direction === ShipDirection.HORIZONTAL) {
        const rowIndex = shipPlacement.position.origin.rowIndex;

        const subColumns = getSubIndices(
            shipPlacement.position.origin.columnIndex,
            columns,
            shipPlacement.ship.size,
        );

        return OrderedSet<StdCoordinate>(
            subColumns.map((columnIndex) => new Coordinate(columnIndex, rowIndex)),
        );
    }

    const columnIndex = shipPlacement.position.origin.columnIndex;

    const subRows = getSubIndices(
        shipPlacement.position.origin.rowIndex,
        rows,
        shipPlacement.ship.size,
    );

    return OrderedSet<StdCoordinate>(
        subRows.map((rowIndex) => new Coordinate(columnIndex, rowIndex)),
    );
}

function createEmptyRow(): Row<StdColumnIndex, Cell> {
    return Map(
        EnumHelper
            .getValues(StdColumnIndex)
            .map((columnIndex) => [columnIndex, undefined]),
    );
}

function createEmptyGrid(): Grid<StdColumnIndex, StdRowIndex, Cell> {
    const rows = Map(
        EnumHelper
            .getValues(StdRowIndex)
            .map((rowIndex) => [rowIndex, createEmptyRow()]),
    );

    return new Grid(rows);
}

function getSubIndices<T extends PropertyKey>(start: T, source: T[], length: number): T[] {
    const startIndex = source.findIndex((value) => value === start);
    assert(-1 !== startIndex);

    const subIndices = source.slice(startIndex, startIndex + length);

    assert(
        subIndices.length === length,
        new OutOfBoundPlacement(`Out of bond: last element found is "${subIndices[subIndices.length - 1]}".`),
    );

    return subIndices;
}

class OutOfBoundPlacement extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'OutOfBoundPlacement';
    }
}
