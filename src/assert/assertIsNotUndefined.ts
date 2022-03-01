import assert = require('node:assert');

export function assertIsNotUndefined<T>(value: T | undefined): asserts value is T {
    assert(value !== undefined);
}
