import { Coordinate } from '../grid/coordinate';
import { AdaptablePlayer } from '../player/adaptable-player';
import { Player } from '../player/player';
import { Fleet } from '../ship/fleet';
import { CoordinateParser, InteractiveHitStrategy } from './hit-strategy/interactive-hit-strategy';
import { RandomPlacementStrategy } from './placement-strategy/random-placement-strategy';
import { StandardOpponentGrid } from './standard-opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export function createInteractivePlayer(fleet: Fleet): Player<StdColumnIndex, StdRowIndex> {
    return new AdaptablePlayer(
        'You',
        fleet,
        RandomPlacementStrategy,
        new InteractiveHitStrategy(
            coordinateParser,
        ),
        () => new StandardOpponentGrid(),
    );
}

export const coordinateParser: CoordinateParser = (value) => {
    console.log({value});
    process.exit(1);
    return new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);
};
