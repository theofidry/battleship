import { mainCommand } from './command/application';

mainCommand.parseAsync(process.argv)
    .then(() => process.exit(0))
    .catch((error) => mainCommand.error(error));
