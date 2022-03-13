import { Command } from 'commander';
import { getCurrentRevision } from '../utils/version';
import { matchCommand } from './match-command';

export const mainCommand = (new Command('main'))
    .description('BattleShip CLI game')
    .version(getCurrentRevision())
    .addCommand(matchCommand);
