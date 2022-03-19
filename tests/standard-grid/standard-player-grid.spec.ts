import { assert } from '../../src/assert/assert';
import { expect } from 'chai';
import { OrderedSet } from 'immutable';
import heredoc from 'tsheredoc';
import { assertIsUnreachableCase } from '../../src/assert/assert-is-unreachable';
import { HitResponse } from '../../src/communication/hit-response';
import { Coordinate } from '../../src/grid/coordinate';
import { printGrid as printGenericGrid } from '../../src/grid/grid-printer';
import { ShipPlacement } from '../../src/grid/player-grid';
import { isPositionedShip, PositionedShip } from '../../src/ship/positioned-ship';
import { Ship } from '../../src/ship/ship';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipPosition } from '../../src/ship/ship-position';
import {
    Cell, getCoordinates, StandardPlayerGrid,
} from '../../src/standard-grid/standard-player-grid';
import { StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../src/standard-grid/std-coordinate';
import { StdRowIndex } from '../../src/standard-grid/std-row-index';
import { expectError } from '../chai-assertions';

function normalizeCoordinates(values: OrderedSet<StdCoordinate>): ReadonlyArray<string> {
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

const cellPrinter = (cell: Cell) => Number(undefined !== cell);
const printGrid = (grid: StandardPlayerGrid) => printGenericGrid(grid.getRows(), cellPrinter);
const hit = (grid: StandardPlayerGrid, columnIndex: StdColumnIndex, rowIndex: StdRowIndex) => {
    const coordinate = new Coordinate(columnIndex, rowIndex);

    const hitResponse = grid.recordHit(coordinate);
    const cell = grid.getRows().get(rowIndex)!.get(columnIndex);
    const shipMessage = mapCellToMessage(cell);

    assert(
        hitResponse === HitResponse.HIT || hitResponse === HitResponse.SUNK,
        `Expected to record a hit or sunk for the coordinate "${coordinate.toString()}". Got "${hitResponse}". ${shipMessage}`,
    );
};

function mapCellToMessage(cell: Cell): string {
    switch (true) {
        case undefined === cell:
            return 'No ship found.';

        case HitResponse.MISS === cell:
            return 'Missed.';

        case isPositionedShip(cell):
            assert(isPositionedShip(cell));
            return `Found ship ${cell.ship.name} with the coordinates "${cell.coordinates.map((shipCoordinate) => shipCoordinate.toString()).join('", "')}".`;
    }

    assertIsUnreachableCase(cell as never);

    return '';
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

    describe('instantiation', () => {
        it('creates an empty grid if no ship is given', () => {
            const grid = new StandardPlayerGrid([]);

            const expected = heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │ F │ G │ H │ I │ J │
            ├─────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    6    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    7    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    8    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    9    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │   10    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
            `);

            expect(printGrid(grid)).to.equal(expected);
        });

        it('creates a grid with the ships on it', () => {
            const grid = new StandardPlayerGrid([
                {
                    ship: new Ship('ShipX0', 2),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                        ShipDirection.VERTICAL,
                    ),
                },
                {
                    ship: new Ship('ShipX0', 3),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.E, StdRowIndex.Row7),
                        ShipDirection.HORIZONTAL,
                    ),
                },
            ]);

            const expected = heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │ F │ G │ H │ I │ J │
            ├─────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    6    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    7    │ 0 │ 0 │ 0 │ 0 │ 1 │ 1 │ 1 │ 0 │ 0 │ 0 │
            │    8    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │    9    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            │   10    │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
            `);

            expect(printGrid(grid)).to.equal(expected);
        });

        it('cannot create a grid with ships overlapping', () => {
            const createGrid = () => new StandardPlayerGrid([
                {
                    ship: new Ship('ShipX0', 2),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                        ShipDirection.VERTICAL,
                    ),
                },
                {
                    ship: new Ship('ShipX0', 3),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.A, StdRowIndex.Row3),
                        ShipDirection.HORIZONTAL,
                    ),
                },
            ]);

            expectError(
                'CannotOverwriteCell',
                'Cannot overwrite the value "ShipX0:(B2, B3)=(0, 0)" for the coordinate "B3".',
                createGrid,
            );
        });
    });

    describe('::recordHit()', () => {
        let grid: StandardPlayerGrid;

        beforeEach(() => {
            grid = new StandardPlayerGrid([
                {
                    ship: new Ship('ShipX0', 2),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.B, StdRowIndex.Row2),
                        ShipDirection.VERTICAL,
                    ),
                },
                {
                    ship: new Ship('ShipX0', 3),
                    position: new ShipPosition(
                        new Coordinate(StdColumnIndex.E, StdRowIndex.Row7),
                        ShipDirection.HORIZONTAL,
                    ),
                },
            ]);
        });

        it('records "hit" if the given coordinate hits a ship', () => {
            const coordinate = new Coordinate(StdColumnIndex.B, StdRowIndex.Row2);
            const expected = HitResponse.HIT;

            const actual = grid.recordHit(coordinate);

            expect(actual).to.equal(expected);
        });

        it('records "miss" if the given coordinate does not hit a ship', () => {
            const coordinate = new Coordinate(StdColumnIndex.B, StdRowIndex.Row1);
            const expected = HitResponse.MISS;

            const actual = grid.recordHit(coordinate);

            expect(actual).to.equal(expected);
        });

        it('records "sunk" if the given coordinate hits a ship and sunk it', () => {
            hit(grid, StdColumnIndex.B, StdRowIndex.Row2);

            const coordinate = new Coordinate(StdColumnIndex.B, StdRowIndex.Row3);
            const expected = HitResponse.SUNK;

            const actual = grid.recordHit(coordinate);

            expect(actual).to.equal(expected);
        });

        it('records "won" if the given coordinate sunks the last ship', () => {
            hit(grid, StdColumnIndex.B, StdRowIndex.Row2);
            hit(grid, StdColumnIndex.B, StdRowIndex.Row3);
            hit(grid, StdColumnIndex.E, StdRowIndex.Row7);
            hit(grid, StdColumnIndex.F, StdRowIndex.Row7);

            const coordinate = new Coordinate(StdColumnIndex.G, StdRowIndex.Row7);
            const expected = HitResponse.WON;

            const actual = grid.recordHit(coordinate);

            expect(actual).to.equal(expected);
        });
    });
});
