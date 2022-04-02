import { Option, OptionValues } from 'commander';
import { assert } from '../assert/assert';
import { hasOwnProperty } from '../utils/has-own-property';
import { parseDebugEnv } from './parse-debug-env';

export function createDebugOption(flags = '--debug', description = 'Enables debug mode.'): Option {
    const option = new Option(flags, description);

    return option.default(parseDebugEnv().orElse(false));
}

export type DebugOption = {
    debug: boolean;
};

export function parseDebugOption(options: OptionValues): DebugOption {
    assert(hasOwnProperty(options, 'debug'));

    const debug = options['debug'];

    console.log({ options });

    assert('boolean' === typeof debug);

    return { debug };
}
