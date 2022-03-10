import { Logger } from '../../logger/logger';
import { Player } from '../../player/player';
import { Fleet } from '../../ship/fleet';
import { InteractiveHitStrategy } from '../hit-strategy/interactive-hit-strategy';
import { RandomPlacementStrategy } from '../placement-strategy/random-placement-strategy';
import { Cell, StandardOpponentGrid } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';
import { parseCoordinate } from './coordinate-parser';
import { createGridPrinter } from './grid-printer';
import { InteractivePlayer } from './interactive-player';

export function createInteractivePlayer(fleet: Fleet, logger: Logger): Player<StdColumnIndex, StdRowIndex, Cell> {
    return new InteractivePlayer(
        'You',
        fleet,
        RandomPlacementStrategy,
        new InteractiveHitStrategy(
            parseCoordinate,
            logger,
        ),
        () => new StandardOpponentGrid(),
        createGridPrinter(logger),
    );
}
