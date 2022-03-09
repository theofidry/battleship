import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/dump-player';
import { STD_COLUMN_INDICES } from './standard-grid/std-column-index';
import { STD_ROW_INDICES } from './standard-grid/std-row-index';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();

match
    .play(
        createDumbPlayer('A', fleet),
        createDumbPlayer('B', fleet),
        STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
    )
    .subscribe();
