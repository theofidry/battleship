import { PlayerGrid } from '../grid/player-grid';
import { Fleet } from '../ship/fleet';
import { PositionedShip } from '../ship/positioned-ship';

export type FleetPlacer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = (fleet: Fleet)=> PlayerGrid<ColumnIndex, RowIndex, PositionedShip<ColumnIndex, RowIndex>|undefined>;

export interface PlacementStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    place: FleetPlacer<ColumnIndex, RowIndex>;
}
