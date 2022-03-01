import { Grid } from '@app/grid/Grid';
import { Fleet } from '@app/ship/Fleet';

export type FleetPlacer = (grid: Grid, fleet: Fleet) => void;

export interface PlacementStrategy {
    place: FleetPlacer;
}
