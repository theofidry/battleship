import assert = require('node:assert');

export function assertIsInteger(value: unknown, message?: string): asserts value is number {
    assert(Number.isInteger(value), message);
}
