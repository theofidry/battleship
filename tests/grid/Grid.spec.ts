import { Cell } from '@app/grid/Cell';
import { Column } from '@app/grid/Column';
import { Coordinate } from '@app/grid/Coordinate';
import { createEmptyLine, createEmptyLines, Grid, Lines } from '@app/grid/Grid';
import { LineNumber } from '@app/grid/LineNumber';
import { PlayerShip } from '@app/player/PlayerShip';
import { createPatrolBoat } from '@app/ship/Ship';
import { ShipDirection } from '@app/ship/ShipDirection';
import { ShipPosition } from '@app/ship/ShipPosition';
import { expect } from 'chai';

class ShipPlacementSet {
    constructor(
        public readonly title: string,
        public readonly fleet: Array<Readonly<PlayerShip>>,
        public readonly expected: Readonly<Lines>,
    ) {
    }
}

describe('Grid', () => {
    for (const { title, fleet, expected } of provideShipPlacement()) {
        it(`is can place ships: ${title}`, () => {
            const grid = new Grid();

            for (const ship of fleet) {
                grid.placeShip(ship);
            }

            expect(grid.getLines()).to.eqls(expected);
        });
    }
});

function* provideShipPlacement(): Generator<ShipPlacementSet> {
    const emptyLines: Readonly<Lines> = createEmptyLines();

    yield new ShipPlacementSet(
        'no ship',
        [],
        emptyLines,
    );

    yield new ShipPlacementSet(
        'single patrol bot vertically',
        [
            new PlayerShip(
                createPatrolBoat(),
                new ShipPosition(
                    new Coordinate(Column.B, LineNumber.Line3),
                    ShipDirection.VERTICAL,
                ),
            ),
        ],
        {
            ...emptyLines,
            ...{
                [LineNumber.Line3]: {
                    [Column.A]: Cell.EMPTY,
                    [Column.B]: Cell.FULL,
                    [Column.C]: Cell.EMPTY,
                    [Column.D]: Cell.EMPTY,
                    [Column.E]: Cell.EMPTY,
                    [Column.F]: Cell.EMPTY,
                    [Column.G]: Cell.EMPTY,
                    [Column.H]: Cell.EMPTY,
                    [Column.I]: Cell.EMPTY,
                    [Column.J]: Cell.EMPTY,
                }
            },
            ...{
                [LineNumber.Line4]: {
                    [Column.A]: Cell.EMPTY,
                    [Column.B]: Cell.FULL,
                    [Column.C]: Cell.EMPTY,
                    [Column.D]: Cell.EMPTY,
                    [Column.E]: Cell.EMPTY,
                    [Column.F]: Cell.EMPTY,
                    [Column.G]: Cell.EMPTY,
                    [Column.H]: Cell.EMPTY,
                    [Column.I]: Cell.EMPTY,
                    [Column.J]: Cell.EMPTY,
                }
            },
        },
    );

    yield new ShipPlacementSet(
        'single patrol bot horizontally',
        [
            new PlayerShip(
                createPatrolBoat(),
                new ShipPosition(
                    new Coordinate(Column.B, LineNumber.Line3),
                    ShipDirection.HORIZONTAL,
                ),
            ),
        ],
        {
            ...emptyLines,
            ...{
                [LineNumber.Line3]: {
                    [Column.A]: Cell.EMPTY,
                    [Column.B]: Cell.FULL,
                    [Column.C]: Cell.FULL,
                    [Column.D]: Cell.EMPTY,
                    [Column.E]: Cell.EMPTY,
                    [Column.F]: Cell.EMPTY,
                    [Column.G]: Cell.EMPTY,
                    [Column.H]: Cell.EMPTY,
                    [Column.I]: Cell.EMPTY,
                    [Column.J]: Cell.EMPTY,
                }
            },
        },
    );
}
