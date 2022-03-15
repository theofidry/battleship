import { AdaptablePlayer } from '../player/adaptable-player';
import { Fleet } from '../ship/fleet';
import { RandomHitStrategy } from './hit-strategy/random-hit-strategy';
import { RandomPlacementStrategy } from './placement-strategy/random-placement-strategy';
import { StandardOpponentGrid } from './standard-opponent-grid';
import { StdPlayer } from './std-player';

export function createDumbAIPlayer(name: string, fleet: Fleet): StdPlayer {
    return new AdaptablePlayer(
        `AI${name}`.trim(),
        fleet,
        RandomPlacementStrategy,
        RandomHitStrategy,
        () => new StandardOpponentGrid(),
    );
}
