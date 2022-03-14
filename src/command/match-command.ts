import { Command } from 'commander';
import { firstValueFrom, map } from 'rxjs';
import { ConsoleLogger } from '../logger/console-logger';
import { InteractiveVsAiMatchLogger } from '../match/interactive-vs-ai-match-logger';
import { Match } from '../match/match';
import { createFleet } from '../ship/fleet';
import { createDumbAIPlayer } from '../standard-grid/dump-player-factory';
import {
    createInteractivePlayer,
} from '../standard-grid/interactive-player/interactive-player-factory';
import { STD_COLUMN_INDICES } from '../standard-grid/std-column-index';
import { STD_ROW_INDICES } from '../standard-grid/std-row-index';

export const matchCommand = (new Command('match'))
    .description('Starts a match against the AI')
    .action(() => {
        const logger = new ConsoleLogger();
        const match = new Match(new InteractiveVsAiMatchLogger(logger));
        const fleet = createFleet();

        const play$ = match
            .play(
                createDumbAIPlayer('', fleet),
                createInteractivePlayer(fleet, logger),
                STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
            )
            // eslint-disable-next-line no-void
            .pipe(map(() => void 0));

        return firstValueFrom(play$);
    });
