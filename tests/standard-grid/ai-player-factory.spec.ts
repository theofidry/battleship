import { expect } from 'chai';
import { createFleet } from '../../src/ship/fleet';
import { AIVersion, createAIPlayer } from '../../src/standard-grid/ai-player-factory';

describe('AIPlayerFactory', () => {
    const fleet = createFleet();

    it('creates an AI with a random name', () => {
        const player = createAIPlayer(fleet, AIVersion.V1);

        expect(player.name).to.match(/^AI\.I .+$/);
    });

    it('creates an AI with an arbitrary name', () => {
        const player = createAIPlayer(fleet, AIVersion.V1, 'Brandon');

        expect(player.name).to.equal('AI.I Brandon');
    });
});
