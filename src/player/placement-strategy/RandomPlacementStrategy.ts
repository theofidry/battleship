import { assertNotUndefined } from '@app/assert/notUndefined';
import { selectRandomColumn } from '@app/grid/Column';
import { Coordinate } from '@app/grid/Coordinate';
import { Grid } from '@app/grid/Grid';
import { PlacementStrategy } from '@app/player/placement-strategy/PlacementStrategy';
import { PlayerFleet } from '@app/player/PlayerFleet';
import { PlayerShip } from '@app/player/PlayerShip';
import { Fleet } from '@app/ship/Fleet';
import { ShipDirection } from '@app/ship/ShipDirection';
import { ShipPosition } from '@app/ship/ShipPosition';
import { EnumHelper } from '@app/utils/enum-helper';
import * as _ from 'lodash';

const selectRandomLine = (): number => _.random(0, 10, false);

const DIRECTION_INDEX = EnumHelper.getValues(ShipDirection);

const selectRandomDirection = (): ShipDirection => {
    const randomDirection = _.sample(DIRECTION_INDEX);
    assertNotUndefined(randomDirection);

    return randomDirection;
};

export const RandomPlacementStrategy: PlacementStrategy = {
    place: (grid: Grid, fleet: Fleet) => new PlayerFleet(
        fleet.map(
            ship => new PlayerShip(
                ship,
                new ShipPosition(
                    new Coordinate(
                        selectRandomColumn(),
                        selectRandomLine(),
                    ),
                    selectRandomDirection(),
                ),
            ),
        ),
    ),
};
