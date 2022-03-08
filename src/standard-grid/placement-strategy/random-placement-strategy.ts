import { List } from 'immutable';
import { ShipPlacement } from '../../grid/player-grid';
import { PlacementStrategy } from '../../player/placement-strategy';
import { Fleet } from '../../ship/fleet';
import { Ship } from '../../ship/ship';
import { ShipPosition } from '../../ship/ship-position';
import { selectRandomCoordinate, selectRandomDirection } from '../random-selector';
import { StandardPlayerGrid } from '../standard-player-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export const RandomPlacementStrategy: PlacementStrategy<StdColumnIndex, StdRowIndex> = {
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
        selectRandomCoordinate(),
        selectRandomDirection(),
    ),
});
