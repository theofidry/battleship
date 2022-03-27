import { lastValueFrom, map } from 'rxjs';
import { ConsoleLogger } from '../logger/console-logger';
import { InteractiveVsAiMatchLogger } from '../match/interactive-vs-ai-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import {
    createInteractivePlayer,
} from '../standard-grid/interactive-player/interactive-player-factory';
import { createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { MAX_TURN } from '../standard-grid/std-coordinate';
import { AIVersionOption, createAIVersionOption, parseAIVersionOption } from './ai-version-option';
import { createCommand, noopParser, OptionParser } from './command';
import { createDebugOption, DebugOption, parseDebugOption } from './debug-option';

type Options = AIVersionOption & DebugOption;

const parseOptions: OptionParser<Options> = (options) => {
    return {
        ...parseAIVersionOption(options),
        ...parseDebugOption(options),
    };
};

export const matchCommand = createCommand(
    'match',
    'Starts a match against the AI',
    [],
    [
        createAIVersionOption(),
        createDebugOption(),
    ],
    noopParser,
    parseOptions,
    (args, { ai, debug }) => {
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
    },
);
