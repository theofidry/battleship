import assert = require('node:assert');

export function isNotUndefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

export function assertIsNotUndefined<T>(value: T | undefined, message?: Error | string): asserts value is T {
    assert(isNotUndefined(value), message);
}
