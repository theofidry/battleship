import { Grid } from '@app/grid/Grid';
import { PlayerFleet } from '@app/player/PlayerFleet';
import { Fleet } from '@app/ship/Fleet';

export type FleetPlacer = (grid: Grid, fleet: Fleet) => PlayerFleet;

export interface PlacementStrategy {
    place: FleetPlacer;
}
