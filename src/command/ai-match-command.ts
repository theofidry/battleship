import { filter, lastValueFrom, map, tap } from 'rxjs';
import { ConsoleLogger } from '../logger/console-logger';
import { BasicMatchLogger } from '../match/basic-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { calculateEfficiency } from '../standard-grid/efficiency';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
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

export const AIMatchCommand = createCommand(
    'ai:test-match',
    'Starts a match between two AIs',
    [],
    [
        createAIVersionOption(),
        createDebugOption(),
    ],
    noopParser,
    parseOptions,
    (args, { ai, debug }) => {
        const logger = new ConsoleLogger();
        const match = new Match(new BasicMatchLogger(logger));
        const fleet = createFleet();

        const play$ = match
            .play(
                createAIPlayer(fleet, ai, debug, logger),
                createAIPlayer(fleet, AIVersion.V1, false, logger),
                MAX_TURN,
            )
            .pipe(
                filter(({ winner }) => undefined !== winner),
                tap(({ turn }) => console.log(`Efficiency: ${calculateEfficiency(fleet, turn)}%`)),
                map(() => undefined),
            );

        return lastValueFrom(play$);
    }
);
