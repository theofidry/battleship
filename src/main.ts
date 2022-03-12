import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match/match';
import { InteractiveVsAiMatchLogger } from './match/interactive-vs-ai-match-logger';
import { createFleet } from './ship/fleet';
import { createDumbAIPlayer } from './standard-grid/dump-player-factory';
import {
    createInteractivePlayer,
} from './standard-grid/interactive-player/interactive-player-factory';
import { STD_COLUMN_INDICES } from './standard-grid/std-column-index';
import { STD_ROW_INDICES } from './standard-grid/std-row-index';

const logger = new ConsoleLogger();
const match = new Match(new InteractiveVsAiMatchLogger(logger));
const fleet = createFleet();

match
    .play(
        createDumbAIPlayer('.I', fleet),
        createInteractivePlayer(fleet, logger),
        STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
    )
    .subscribe();
