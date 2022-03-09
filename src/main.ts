import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/create-dump-player';
import { createInteractivePlayer } from './standard-grid/interactive-player-factory';
import { STD_COLUMN_INDICES } from './standard-grid/std-column-index';
import { STD_ROW_INDICES } from './standard-grid/std-row-index';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();

match
    .play(
        createDumbPlayer('A', fleet),
        createInteractivePlayer(fleet),
        STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
    )
    .subscribe();
