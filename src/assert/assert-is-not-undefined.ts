import assert = require('node:assert');

export function assertIsNotUndefined<T>(value: T | undefined, message?: Error | string): asserts value is T {
    assert(value !== undefined, message);
}
