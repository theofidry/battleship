import { expect } from 'chai';
import { OrderedSet } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { ShipPlacement } from '../../src/grid/player-grid';
import { Ship } from '../../src/ship/ship';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipPosition } from '../../src/ship/ship-position';
import { getCoordinates } from '../../src/standard-grid/standard-player-grid';
import { StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdRowIndex } from '../../src/standard-grid/std-row-index';
import { expectError } from '../chai-assertions';

function normalizeCoordinates(values: OrderedSet<Coordinate<StdColumnIndex, StdRowIndex>>): ReadonlyArray<string> {
    return values
        .toArray()
        .map((coordinate) => coordinate.toString());
}

class CoordinateSet {
    constructor(
        readonly title: string,
        readonly shipPosition: ShipPlacement<StdColumnIndex, StdRowIndex>,
        readonly expected: ReadonlyArray<string>,
    ) {
    }
}

function* coordinatesProvider(): Generator<CoordinateSet> {
    yield new CoordinateSet(
        'ship placed horizontally in the middle of the grid',
        {
            ship: new Ship('TestShip', 3),
            position: new ShipPosition(
                new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                ShipDirection.HORIZONTAL,
            ),
        },
        ['B2', 'C2', 'D2'],
    );

    yield new CoordinateSet(
        'ship placed vertically in the middle of the grid',
        {
            ship: new Ship('TestShip', 3),
            position: new ShipPosition(
                new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                ShipDirection.VERTICAL,
            ),
        },
        ['B2', 'B3', 'B4'],
    );

    yield new CoordinateSet(
        'ship placed at the top-left edge',
        {
            ship: new Ship('TestShip', 2),
            position: new ShipPosition(
                new Coordinate(StdColumnIndex.A, StdRowIndex.Row1),
                ShipDirection.HORIZONTAL,
            ),
        },
        ['A1', 'B1'],
    );

    yield new CoordinateSet(
        'ship placed at the bottom-right edge',
        {
            ship: new Ship('TestShip', 2),
            position: new ShipPosition(
                new Coordinate(StdColumnIndex.I, StdRowIndex.Row10),
                ShipDirection.HORIZONTAL,
            ),
        },
        ['I10', 'J10'],
    );
}

describe('StandardPlayerGrid', () => {
    describe('getCoordinates()', () => {
        for (const { title, shipPosition, expected } of coordinatesProvider()) {
            it(`can get the coordinates: ${title}`, () => {
                const actual = normalizeCoordinates(getCoordinates(shipPosition));

                expect(actual).to.eqls(expected);
            });
        }

        it('cannot place a ship outside of the grid (column)', () => {
            const shipPlacement = {
                ship: new Ship('TestShip', 2),
                position: new ShipPosition(
                    new Coordinate(StdColumnIndex.J, StdRowIndex.Row10),
                    ShipDirection.HORIZONTAL,
                ),
            };

            const coordinates = () => getCoordinates(shipPlacement);

            expectError(
                'OutOfBoundPlacement',
                'Out of bond: last element found is "J".',
                coordinates,
            );
        });

        it('cannot place a ship outside of the grid (row)', () => {
            const shipPlacement = {
                ship: new Ship('TestShip', 2),
                position: new ShipPosition(
                    new Coordinate(StdColumnIndex.J, StdRowIndex.Row10),
                    ShipDirection.VERTICAL,
                ),
            };

            const coordinates = () => getCoordinates(shipPlacement);

            expectError(
                'OutOfBoundPlacement',
                'Out of bond: last element found is "10".',
                coordinates,
            );
        });
    });

    describe('::recordHit()', () => {
        it('', () => {

        });
    });
});
