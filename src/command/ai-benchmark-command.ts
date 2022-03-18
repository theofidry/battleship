import chalk from 'chalk';
import { Command, InvalidOptionArgumentError } from 'commander';
import { isNumber, mean, range } from 'lodash';
import { combineLatest, filter, firstValueFrom, map, Observable, tap } from 'rxjs';
import { assert } from '../assert/assert';
import { ConsoleLogger } from '../logger/console-logger';
import { Logger } from '../logger/logger';
import { Match } from '../match/match';
import { NullMatchLogger } from '../match/null-match-logger';
import { createFleet, Fleet } from '../ship/fleet';
import { AIVersion, AIVersionNames, createAIPlayer } from '../standard-grid/std-ai-player-factory';
import { STD_COLUMN_INDICES } from '../standard-grid/std-column-index';
import { STD_ROW_INDICES } from '../standard-grid/std-row-index';
import { EnumHelper } from '../utils/enum-helper';
import { formatTime } from '../utils/time-formatter';
import { createAIVersionOption } from './ai-version-option';

export const AIBenchmarkCommand = new Command('ai:benchmark');

const DEFAULT_SAMPLES_SIZE = 50;
const MAX_TURN = STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2;

AIBenchmarkCommand
    .description('Runs several matches between two AIs')
    .option('-s, --samples <number>', 'Number of matches to play', parseSampleOption, DEFAULT_SAMPLES_SIZE)
    .addOption(createAIVersionOption())
    .action(() => {
        const { samples, ai } = AIBenchmarkCommand.opts();
        const startTimeInSeconds = process.hrtime()[0];
        const fleet = createFleet();

        assert(isNumber(samples));
        assert(EnumHelper.hasValue(AIVersion, ai));

        console.log(`Starting benchmark between ${AIVersionNames[ai]} for ${chalk.yellowBright(samples)} matches.`);

        const play$ = playMatches(fleet, samples, ai)
            .pipe(
                tap((averageEndTurn) => {
                    const endTimeInSeconds = process.hrtime()[0];
                    const elapsedTime = endTimeInSeconds - startTimeInSeconds;

                    console.log(`Matches finished in ${chalk.redBright(averageEndTurn)} turns on average (efficiency: ${chalk.redBright(calculateEfficiency(fleet, averageEndTurn) + '%')}).`);
                    console.log(`Took ${chalk.yellowBright(formatTime(elapsedTime))}.`);
                }),
                // eslint-disable-next-line no-void
                map(() => void 0),
            );

        return firstValueFrom(play$);
    });

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

function playMatches(fleet: Fleet, nbrOfMatches: number, version: AIVersion): Observable<number> {
    const logger = new ConsoleLogger();

    const matches = range(0, nbrOfMatches).map(() => startMatch(logger, fleet, version));

    return combineLatest(matches)
        .pipe(
            map(mean),
        );
}

function startMatch(logger: Logger, fleet: Fleet, version: AIVersion): Observable<number> {
    const match = new Match(new NullMatchLogger());

    return match
        .play(
            createAIPlayer(fleet, version),
            createAIPlayer(fleet, version),
            STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
        )
        .pipe(
            filter(({ winner }) => undefined !== winner),
            map(({ turn }) => turn),
        );
}

function calculateEfficiency(fleet: Fleet, average: number): number {
    const fleetSize = fleet.reduce((sum, { size }) => sum + size, 0);

    const min = fleetSize * 2 - 1; // minimum amount of turns it takes to end the game
    const max = MAX_TURN - 1;      // maximum amount of turns it takes to end the game

    const maxDistance = max - min;
    const averageDistance = average - min;

    return Math.floor((1 - averageDistance / maxDistance) * 100);
}
