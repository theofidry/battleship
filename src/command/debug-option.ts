import { Option } from 'commander';

export function createDebugOption(flags = '--debug', description = 'Enables debug mode.'): Option {
    const option = new Option(flags, description);

    return option.default(false);
}
