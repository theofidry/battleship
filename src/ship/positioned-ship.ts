import { Coordinate } from '../grid/coordinate';
import { Ship } from './ship';

export class PositionedShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private readonly hitCoordinates: Map<Coordinate<ColumnIndex, RowIndex>, boolean>;

    constructor(
        public readonly ship: Ship,
        public readonly coordinates: ReadonlyArray<Coordinate<ColumnIndex, RowIndex>>,
    ) {
        this.hitCoordinates = new Map(
            coordinates.map((coordinate) => [coordinate, false]),
        );
    }

    markAsHit(coordinate: Coordinate<ColumnIndex, RowIndex>): void {

    }

    isSunk(): boolean {
        return false;
    }
}
