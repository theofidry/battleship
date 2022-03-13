import { Command } from 'commander';
import { getCurrentRevision } from '../utils/version';
import { AIBenchmarkCommand } from './ai-benchmark-command';
import { AIMatchCommand } from './ai-match-command';
import { matchCommand } from './match-command';

export const mainCommand = (new Command('main'))
    .description('BattleShip CLI game')
    .version(getCurrentRevision())
    .addCommand(matchCommand)
    .addCommand(AIMatchCommand)
    .addCommand(AIBenchmarkCommand);
