import { sample } from 'lodash';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { Logger } from '../logger/logger';
import { AdaptablePlayer } from '../player/adaptable-player';
import { Fleet } from '../ship/fleet';
import { RandomPlacementStrategy } from './placement-strategy/random-placement-strategy';
import { StandardOpponentGrid } from './standard-opponent-grid';
import { createHitStrategy } from './std-ai-hit-strategy';
import { StdPlayer } from './std-player';

export enum AIVersion {
    V1 = 'v1',
    V2 = 'v2',
    V3 = 'v3',
}

export const AIVersionNames: Record<AIVersion, string> = {
    [AIVersion.V1]: 'AI.I',
    [AIVersion.V2]: 'AI.II',
    [AIVersion.V3]: 'AI.III',
};

const NAME_LIST = [
    'Ash',
    'Avery',
    'Artemis',
    'Dae',
    'Paxton',
    'Rin',
    'Rory',
    'Sage',
];

function pickRandomName(): string {
    const name = sample(NAME_LIST);
    assertIsNotUndefined(name);

    return name;
}

export function createAIPlayer(
    fleet: Fleet,
    version: AIVersion,
    debug: boolean,
    logger: Logger,
    name = ''
): StdPlayer {
    const trimmedName = name.trim();
    const resolvedName = trimmedName || pickRandomName();

    return new AdaptablePlayer(
        `${AIVersionNames[version]} ${resolvedName}`.trim(),
        fleet,
        RandomPlacementStrategy,
        createHitStrategy(version, debug, logger),
        () => new StandardOpponentGrid(),
    );
}
