import { Command } from 'commander';
import { AIMatchCommand } from './command/ai-match-command';
import { mainCommand } from './command/application';
import { createDebugOption } from './command/debug-option';

AIMatchCommand.parseAsync();
//
//
// const command = new Command('test');
// command.addOption(createDebugOption());
// command.action(() => {
//     console.log({ ops: command.opts() });
//
//     return new Promise(() => true);
// });
// command.parseAsync(process.argv)
//     .then(() => process.exit(0))
//     .catch((error) => mainCommand.error(error));
//
// mainCommand.parseAsync(process.argv)
//     .then(() => process.exit(0))
//     .catch((error) => mainCommand.error(error));
