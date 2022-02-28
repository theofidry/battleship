import { Coordinate } from '@app/grid/Coordinate';
import { OpponentGrid } from '@app/grid/OpponentGrid';

export type HitDecider = (grid: OpponentGrid) => Coordinate;

export interface HitStrategy {
    decide: HitDecider;
}
