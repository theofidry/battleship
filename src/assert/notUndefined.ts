import assert = require('node:assert');

export function assertNotUndefined<T>(value: T | undefined): asserts value is T {
    assert(value !== undefined);
}
