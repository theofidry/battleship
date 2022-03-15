import { PlayerGrid } from '../grid/player-grid';
import { Fleet } from '../ship/fleet';

export type FleetPlacer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> = (fleet: Fleet)=> PlayerGrid<ColumnIndex, RowIndex, Cell>;

export interface PlacementStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> {
    place: FleetPlacer<ColumnIndex, RowIndex, Cell>;
}
