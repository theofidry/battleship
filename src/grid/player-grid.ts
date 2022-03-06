import { HitResponse } from '../communication/hit-response';
import { Ship } from '../ship/ship';
import { ShipPosition } from '../ship/ship-position';
import { Coordinate } from './coordinate';
import { GridRows } from './grid';

export type ShipPlacement<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = { ship: Ship, position: ShipPosition<ColumnIndex, RowIndex> };

/**
 * Represents a player's grid, i.e. the grid the player owns and on which
 * he/she/they place their fleet.
 */
export interface PlayerGrid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    placeShip(): void;

    recordHit(coordinate: Coordinate<ColumnIndex, RowIndex>): HitResponse;

    getRows(): Readonly<GridRows<ColumnIndex, RowIndex>>;
}
