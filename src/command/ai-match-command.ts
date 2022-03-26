import { Command } from 'commander';
import { filter, firstValueFrom, map, tap } from 'rxjs';
import { assert } from '../assert/assert';
import { ConsoleLogger } from '../logger/console-logger';
import { BasicMatchLogger } from '../match/basic-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { STD_COLUMN_INDICES } from '../standard-grid/std-column-index';
import { MAX_TURN } from '../standard-grid/std-coordinate';
import { STD_ROW_INDICES } from '../standard-grid/std-row-index';
import { EnumHelper } from '../utils/enum-helper';
import { calculateEfficiency } from './ai-benchmark-command';
import { createAIVersionOption } from './ai-version-option';
import { createDebugOption } from './debug-option';

export const AIMatchCommand = new Command('ai:test-match');

AIMatchCommand
    .description('Starts a match between two AIs')
    .addOption(createAIVersionOption())
    .addOption(createDebugOption())
    .action(() => {
        const { ai, debug } = AIMatchCommand.opts();

        assert(EnumHelper.hasValue(AIVersion, ai));
        assert('boolean' === typeof debug);

        const logger = new ConsoleLogger();
        const match = new Match(new BasicMatchLogger(logger));
        const fleet = createFleet();

        const play$ = match
            .play(
                createAIPlayer(fleet, ai, debug, logger),
                createAIPlayer(fleet, ai, false, logger),
                MAX_TURN,
            )
            // eslint-disable-next-line no-void
            .pipe(
                filter(({ winner }) => undefined !== winner),
                tap(({ turn }) => console.log(`Efficiency: ${calculateEfficiency(fleet, turn)}%`)),
                map(() => undefined),
            );

        // TODO: looks like errors are not properly handled?
        return firstValueFrom(play$);
    });
