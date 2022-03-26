import { Command } from 'commander';
import { lastValueFrom, map } from 'rxjs';
import { assert } from '../assert/assert';
import { ConsoleLogger } from '../logger/console-logger';
import { InteractiveVsAiMatchLogger } from '../match/interactive-vs-ai-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import {
    createInteractivePlayer,
} from '../standard-grid/interactive-player/interactive-player-factory';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { MAX_TURN } from '../standard-grid/std-coordinate';
import { EnumHelper } from '../utils/enum-helper';
import { createAIVersionOption } from './ai-version-option';
import { createDebugOption } from './debug-option';

export const matchCommand = new Command('match');

matchCommand
    .description('Starts a match against the AI')
    .addOption(createAIVersionOption())
    .addOption(createDebugOption())
    .action(() => {
        const { ai, debug } = matchCommand.opts();

        assert(EnumHelper.hasValue(AIVersion, ai));
        assert('boolean' === typeof debug);

        const logger = new ConsoleLogger();
        const match = new Match(
            new InteractiveVsAiMatchLogger(logger),
        );
        const fleet = createFleet();

        const play$ = match
            .play(
                createAIPlayer(fleet, ai, debug, logger),
                createInteractivePlayer(fleet, logger),
                MAX_TURN,
            )
            .pipe(map(() => undefined));

        return lastValueFrom(play$);
    });
