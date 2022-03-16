import { Command } from 'commander';
import { firstValueFrom, map } from 'rxjs';
import { ConsoleLogger } from '../logger/console-logger';
import { BasicMatchLogger } from '../match/basic-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { STD_COLUMN_INDICES } from '../standard-grid/std-column-index';
import { STD_ROW_INDICES } from '../standard-grid/std-row-index';
import { EnumHelper } from '../utils/enum-helper';
import { createAIVersionOption } from './ai-version-option';
import assert = require('node:assert');

export const AIMatchCommand = new Command('ai:test-match');

AIMatchCommand
    .description('Starts a match between two AIs')
    .addOption(createAIVersionOption())
    .action(() => {
        const { ai } = AIMatchCommand.opts();
        assert(EnumHelper.hasValue(AIVersion, ai));

        const logger = new ConsoleLogger();
        const match = new Match(new BasicMatchLogger(logger));
        const fleet = createFleet();

        const play$ = match
            .play(
                createAIPlayer(fleet, ai),
                createAIPlayer(fleet, ai),
                STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
            )
            // eslint-disable-next-line no-void
            .pipe(map(() => void 0));

        return firstValueFrom(play$);
    });
