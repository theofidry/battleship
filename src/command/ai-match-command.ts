import { Command } from 'commander';
import { firstValueFrom, map } from 'rxjs';
import { ConsoleLogger } from '../logger/console-logger';
import { BasicMatchLogger } from '../match/basic-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { createDumbAIPlayer } from '../standard-grid/dump-player-factory';
import { STD_COLUMN_INDICES } from '../standard-grid/std-column-index';
import { STD_ROW_INDICES } from '../standard-grid/std-row-index';

export const AIMatchCommand = (new Command('ai:test-match'))
    .description('Starts a match between two AIs')
    .action(() => {
        const logger = new ConsoleLogger();
        const match = new Match(new BasicMatchLogger(logger));
        const fleet = createFleet();

        const play$ = match
            .play(
                createDumbAIPlayer('.I (1)', fleet),
                createDumbAIPlayer('.I (2)', fleet),
                STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
            )
            // eslint-disable-next-line no-void
            .pipe(map(() => void 0));

        return firstValueFrom(play$);
    });
