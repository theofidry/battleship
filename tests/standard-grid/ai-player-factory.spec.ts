import { expect } from 'chai';
import { NullLogger } from '../../src/logger/null-logger';
import { createFleet } from '../../src/ship/fleet';
import { AIVersion, createAIPlayer } from '../../src/standard-grid/std-ai-player-factory';

describe('AIPlayerFactory', () => {
    const fleet = createFleet();

    it('creates an AI with a random name', () => {
        const player = createAIPlayer(
            fleet,
            AIVersion.V1,
            false,
            new NullLogger(),
        );

        expect(player.name).to.match(/^AI\.I .+$/);
    });

    it('creates an AI with an arbitrary name', () => {
        const player = createAIPlayer(
            fleet,
            AIVersion.V1,
            false,
            new NullLogger(),
            'Brandon',
        );

        expect(player.name).to.equal('AI.I Brandon');
    });
});
