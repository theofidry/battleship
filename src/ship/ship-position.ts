import { Coordinate } from '../grid/coordinate';
import { ShipDirection } from './ship-direction';

export class ShipPosition<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    constructor(
        public readonly origin: Coordinate<ColumnIndex, RowIndex>,
        public readonly direction: ShipDirection,
    ) {
    }
}
