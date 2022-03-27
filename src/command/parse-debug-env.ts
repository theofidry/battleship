import { hasOwnProperty } from '../utils/has-own-property';
import { just, nothing, Optional } from '../utils/optional';

export function parseDebugEnv(): Optional<boolean> {
    const env = process.env;

    return hasOwnProperty(env, 'DEBUG') ? just(true) : nothing();
}
