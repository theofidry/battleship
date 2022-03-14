import { AdaptablePlayer } from '../player/adaptable-player';
import { Player } from '../player/player';
import { Fleet } from '../ship/fleet';
import { RandomHitStrategy } from './hit-strategy/random-hit-strategy';
import { SmartHitStrategy } from './hit-strategy/smart-hit-strategy';
import { RandomPlacementStrategy } from './placement-strategy/random-placement-strategy';
import { Cell, StandardOpponentGrid } from './standard-opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export function createDumbAIPlayer(name: string, fleet: Fleet): Player<StdColumnIndex, StdRowIndex, Cell> {
    return createDumbAIVersion2Player(name, fleet);
}

function createDumbAIVersion1Player(name: string, fleet: Fleet): Player<StdColumnIndex, StdRowIndex, Cell> {
    return new AdaptablePlayer(
        `AI.I ${name}`.trim(),
        fleet,
        RandomPlacementStrategy,
        RandomHitStrategy,
        () => new StandardOpponentGrid(),
    );
}

function createDumbAIVersion2Player(name: string, fleet: Fleet): Player<StdColumnIndex, StdRowIndex, Cell> {
    return new AdaptablePlayer(
        `AI.II ${name}`.trim(),
        fleet,
        RandomPlacementStrategy,
        new SmartHitStrategy(),
        () => new StandardOpponentGrid(),
    );
}
