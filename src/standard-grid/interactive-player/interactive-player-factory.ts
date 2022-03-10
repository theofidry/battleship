import { Logger } from '../../logger/logger';
import { AdaptablePlayer } from '../../player/adaptable-player';
import { Player } from '../../player/player';
import { Fleet } from '../../ship/fleet';
import { InteractiveHitStrategy } from '../hit-strategy/interactive-hit-strategy';
import { RandomPlacementStrategy } from '../placement-strategy/random-placement-strategy';
import { StandardOpponentGrid } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';
import { parseCoordinate } from './coordinate-parser';

export function createInteractivePlayer(fleet: Fleet, logger: Logger): Player<StdColumnIndex, StdRowIndex> {
    return new AdaptablePlayer(
        'You',
        fleet,
        RandomPlacementStrategy,
        new InteractiveHitStrategy(
            parseCoordinate,
            logger,
        ),
        () => new StandardOpponentGrid(),
    );
}
