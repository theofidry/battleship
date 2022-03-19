import { List } from 'immutable';
import * as _ from 'lodash';
import { assert } from '../../assert/assert';
import { Coordinate } from '../../grid/coordinate';
import { ShipPlacement } from '../../grid/player-grid';
import { PlacementStrategy } from '../../player/placement-strategy';
import { Fleet } from '../../ship/fleet';
import { Ship } from '../../ship/ship';
import { ShipDirection } from '../../ship/ship-direction';
import { ShipPosition } from '../../ship/ship-position';
import { EnumHelper } from '../../utils/enum-helper';
import { Cell, StandardPlayerGrid } from '../standard-player-grid';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { STD_ROW_INDICES, StdRowIndex } from '../std-row-index';

export const RandomPlacementStrategy: PlacementStrategy<StdColumnIndex, StdRowIndex, Cell> = {
    place: (fleet: Fleet): StandardPlayerGrid => {
        const initialValue: FleetPlacement = {
            grid: new StandardPlayerGrid([]),
            placements: List(),
        };

        const result = fleet.reduce(
            (previous, ship) => placeShip(previous, ship),
            initialValue,
        );

        return result.grid;
    },
};

type FleetPlacement = {
    grid: StandardPlayerGrid,
    placements: List<ShipPlacement<StdColumnIndex, StdRowIndex>>,
};

const SHIP_DIRECTION_INDICES = EnumHelper.getValues(ShipDirection);

const placeShip = ({ grid, placements }: FleetPlacement, ship: Ship): FleetPlacement => {
    let placement: ShipPlacement<StdColumnIndex, StdRowIndex>;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        placement = selectRandomPlacement(ship);

        try {
            grid = new StandardPlayerGrid(
                placements.push(placement).toArray(),
            );
            placements = placements.push(placement);

            break;
        } catch (error) {
            // Continue
        }
    }

    return { grid, placements };
};

const selectRandomPlacement = (ship: Ship): ShipPlacement<StdColumnIndex, StdRowIndex> => ({
    ship,
    position: new ShipPosition(
        selectRandomOrigin(),
        selectRandomDirection(),
    ),
});

const selectRandomOrigin = (): StdCoordinate => new Coordinate(
    selectRandomColumn(),
    selectRandomRow(),
);

function createSelectRandomIndex<T>(indices: ReadonlyArray<T>): ()=> T {
    return () => {
        const index = _.sample(indices);
        assert(undefined !== index);

        return index;
    };
}

const selectRandomColumn = createSelectRandomIndex(STD_COLUMN_INDICES);
const selectRandomRow = createSelectRandomIndex(STD_ROW_INDICES);
const selectRandomDirection = createSelectRandomIndex(SHIP_DIRECTION_INDICES);
