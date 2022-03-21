import { Logger } from '../../logger/logger';
import { Fleet } from '../../ship/fleet';
import { InteractiveHitStrategy } from './interactive-hit-strategy';
import { RandomPlacementStrategy } from '../placement-strategy/random-placement-strategy';
import { StandardOpponentGrid } from '../standard-opponent-grid';
import { StdPlayer } from '../std-player';
import { parseCoordinate } from './coordinate-parser';
import { parseGiveUpCommand } from './give-up-command-parser';
import { InteractivePlayer } from './interactive-player';

export function createInteractivePlayer(fleet: Fleet, logger: Logger): StdPlayer {
    return new InteractivePlayer(
        'You',
        fleet,
        RandomPlacementStrategy,
        new InteractiveHitStrategy(
            parseGiveUpCommand(parseCoordinate),
            logger,
        ),
        () => new StandardOpponentGrid(),
    );
}
