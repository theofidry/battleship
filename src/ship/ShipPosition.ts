import { Coordinate } from '@app/grid/Coordinate';
import { ShipDirection } from '@app/ship/ShipDirection';

export class ShipPosition {
    constructor(
        public readonly origin: Coordinate,
        public readonly direction: ShipDirection,
    ) {
    }
}
