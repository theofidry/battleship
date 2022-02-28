import { selectRandomColumn } from '@app/grid/Column';
import { Coordinate } from '@app/grid/Coordinate';
import { HitStrategy } from '@app/player/hit-strategy/HitStrategy';
import * as _ from 'lodash';

const selectRandomLine = (): number => _.random(0, 10, false);

export const RandomHitStrategy: HitStrategy = {
    decide: () => new Coordinate(
        selectRandomColumn(),
        selectRandomLine(),
    ),
};
