import { assert } from './assert';

export function assertIsUnreachableCase(_: never, message = 'unreachable') {
    return assert(false, message) as never;
}
