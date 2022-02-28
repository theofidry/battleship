import { ShotResponse } from '@app/communications/ShotResponse';
import { Coordinate } from '@app/grid/Coordinate';
import { PlayerShip } from '@app/player/PlayerShip';

export class PlayerFleet {
    constructor(
        private readonly fleet: Array<PlayerShip>,
    ) {
    }

    recordHit(coordinate: Coordinate): ShotResponse {
        return ShotResponse.MISS;
    }
}
