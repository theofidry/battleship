import chalk from 'chalk';
import { InvalidOptionArgumentError, Option, OptionValues } from 'commander';
import { isNumber, mean, range } from 'lodash';
import { combineLatest, filter, lastValueFrom, map, Observable, tap } from 'rxjs';
import { assert } from '../assert/assert';
import { ConsoleLogger } from '../logger/console-logger';
import { Logger } from '../logger/logger';
import { Match } from '../match/match';
import { NullMatchLogger } from '../match/null-match-logger';
import { createFleet, Fleet } from '../ship/fleet';
import { calculateEfficiency } from '../standard-grid/efficiency';
import { AIVersion, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { MAX_TURN } from '../standard-grid/std-coordinate';
import { hasOwnProperty } from '../utils/has-own-property';
import { formatTime } from '../utils/time-formatter';
import { AIVersionOption, createAIVersionOption, parseAIVersionOption } from './ai-version-option';
import { createCommand, noopParser, OptionParser } from './command';

const DEFAULT_SAMPLES_SIZE = 50;

type SamplesOptions = {
    samples: number;
};

type Options = AIVersionOption & SamplesOptions;

function parseSamples(options: OptionValues): SamplesOptions {
    assert(hasOwnProperty(options, 'samples'));

    const samples = options['samples'];

    assert(isNumber(samples));

    return { samples };
}

const parseOptions: OptionParser<Options> = (options) => {
    return {
        ...parseAIVersionOption(options),
        ...parseSamples(options),
    };
};

function createSampleOption(): Option {
    const option =  new Option(
        '-s, --samples <number>',
        'Number of matches to play',
    );

    option.argParser(parseSampleOption);
    option.default(DEFAULT_SAMPLES_SIZE);

    return option;
}

export const AIBenchmarkCommand = createCommand(
    'ai:benchmark',
    'Runs several matches between two AIs',
    [],
    [
        createAIVersionOption(),
        createSampleOption(),
    ],
    noopParser,
    parseOptions,
    (args, { ai, samples }) => {
        const startTimeInSeconds = process.hrtime()[0];
        const fleet = createFleet();

        const play$ = playMatches(fleet, samples, ai, false)
            .pipe(
                tap((averageEndTurn) => {
                    const endTimeInSeconds = process.hrtime()[0];
                    const elapsedTime = endTimeInSeconds - startTimeInSeconds;
                    const efficiency = calculateEfficiency(fleet, averageEndTurn);

                    console.log(`Matches finished in ${chalk.redBright(averageEndTurn)} turns on average (efficiency: ${chalk.redBright(efficiency + '%')}).`);
                    console.log(`Took ${chalk.yellowBright(formatTime(elapsedTime))}.`);
                }),
                map(() => undefined),
            );

        return lastValueFrom(play$);
    },
);

function parseSampleOption(value: string): number {
    const parsedValue = parseInt(value, 10);

    if (isNaN(parsedValue)) {
        throw new InvalidOptionArgumentError(`"${value} is not a valid number.`);
    }

    if (parsedValue <= 0) {
        throw new InvalidOptionArgumentError(`"${value} is not a valid size. Expected at least 1.`);
    }

    return parsedValue;
}

function playMatches(
    fleet: Fleet,
    nbrOfMatches: number,
    version: AIVersion,
    debug: boolean,
): Observable<number> {
    const logger = new ConsoleLogger();

    const matches = range(0, nbrOfMatches).map(() => startMatch(logger, fleet, version, debug));

    return combineLatest(matches)
        .pipe(
            map(mean),
        );
}

function startMatch(
    logger: Logger,
    fleet: Fleet,
    version: AIVersion,
    debug: boolean,
): Observable<number> {
    const match = new Match(new NullMatchLogger());

    return match
        .play(
            createAIPlayer(fleet, version, debug, logger),
            createAIPlayer(fleet, version, debug, logger),
            MAX_TURN,
        )
        .pipe(
            filter(({ winner }) => undefined !== winner),
            map(({ turn }) => turn),
        );
}
