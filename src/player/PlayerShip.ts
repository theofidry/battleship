import { Ship } from '@app/ship/Ship';
import { ShipPosition } from '@app/ship/ShipPosition';

export class PlayerShip {
    constructor(
        public readonly ship: Ship,
        public readonly position: ShipPosition,
    ) {
    }
}
