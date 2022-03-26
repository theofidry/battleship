import { Command } from 'commander';
import { filter, lastValueFrom, map, tap } from 'rxjs';
import { assert } from '../assert/assert';
import { ConsoleLogger } from '../logger/console-logger';
import { BasicMatchLogger } from '../match/basic-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { calculateEfficiency } from '../standard-grid/efficiency';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { MAX_TURN } from '../standard-grid/std-coordinate';
import { EnumHelper } from '../utils/enum-helper';
import { createAIVersionOption } from './ai-version-option';
import { createDebugOption } from './debug-option';
import { matchCommand } from './match-command';

export const AIMatchCommand = new Command('ai:test-match');

AIMatchCommand
    .description('Starts a match between two AIs')
    .addOption(createAIVersionOption())
    .addOption(createDebugOption())
    .action(() => {
        const { ai, debug } = matchCommand.opts();

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
            .pipe(
                filter(({ winner }) => undefined !== winner),
                tap(({ turn }) => console.log(`Efficiency: ${calculateEfficiency(fleet, turn)}%`)),
                map(() => undefined),
            );

        return lastValueFrom(play$);
    });
