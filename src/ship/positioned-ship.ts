import { List, OrderedSet, Set } from 'immutable';
import { Coordinate } from '../grid/coordinate';
import { Ship } from './ship';
import assert = require('node:assert');

export class PositionedShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    private readonly hitCoordinates: Map<string, boolean>;
    private sunk = false;

    constructor(
        public readonly ship: Ship,
        public readonly coordinates: OrderedSet<Coordinate<ColumnIndex, RowIndex>>,
    ) {
        // Sanity check
        assert(ship.size === coordinates.size);

        this.hitCoordinates = new Map(
            coordinates.map((coordinate) => [coordinate.toString(), false]),
        );
    }

    markAsHit(coordinate: Coordinate<ColumnIndex, RowIndex>): void {
        const coordinateKey = coordinate.toString();
        this.assertIsKnownCoordinate(coordinateKey);

        this.hitCoordinates.set(coordinateKey, true);

        this.sunk = calculateIsSunk(this.getHits().toArray());
    }

    isSunk(): boolean {
        return this.sunk;
    }

    getHits(): List<boolean> {
        return List(this.hitCoordinates.values());
    }

    private assertIsKnownCoordinate(coordinate: string): void {
        assert(
            this.hitCoordinates.has(coordinate),
            OutOfBoundShipCoordinate.forCoordinates(
                coordinate,
                Array.from(this.hitCoordinates.keys()),
            ),
        );
    }
}

class OutOfBoundShipCoordinate extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'OutOfBoundShipCoordinate';
    }

    static forCoordinates(
        invalidCoordinate: string,
        knownCoordinates: ReadonlyArray<string>,
    ): OutOfBoundShipCoordinate {
        return new OutOfBoundShipCoordinate(
            `Unknown coordinate "${invalidCoordinate.toString()}". Expected one of "${knownCoordinates.join('", "')}".`,
        );
    }
}

function calculateIsSunk(hits: boolean[]): boolean {
    return hits.reduce(
        (sunk: boolean, hit) => sunk && hit,
        true,
    );
}
