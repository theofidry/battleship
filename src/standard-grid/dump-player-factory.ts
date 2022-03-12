import { AdaptablePlayer } from '../player/adaptable-player';
import { Player } from '../player/player';
import { Fleet } from '../ship/fleet';
import { RandomHitStrategy } from './hit-strategy/random-hit-strategy';
import { RandomPlacementStrategy } from './placement-strategy/random-placement-strategy';
import { Cell, StandardOpponentGrid } from './standard-opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export function createDumbAIPlayer(name: string, fleet: Fleet): Player<StdColumnIndex, StdRowIndex, Cell> {
    return new AdaptablePlayer(
        `AI${name}`.trim(),
        fleet,
        RandomPlacementStrategy,
        RandomHitStrategy,
        () => new StandardOpponentGrid(),
    );
}
