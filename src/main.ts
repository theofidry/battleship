import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/dump-player';
import { StdColumnIndex } from './standard-grid/std-column-index';
import { StdRowIndex } from './standard-grid/std-row-index';
import { EnumHelper } from './utils/enum-helper';
import cli, { Command } from 'commander';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();

match
    .play(
        createDumbPlayer('A', fleet),
        createDumbPlayer('B', fleet),
        EnumHelper.getValues(StdColumnIndex).length * EnumHelper.getValues(StdRowIndex).length * 2,
    )
    .subscribe();

const program = new Command('start');

program.description('Starts a match against the AI');

program.
