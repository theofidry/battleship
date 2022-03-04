import assert = require('node:assert');

export function isInteger(value: unknown): value is number {
    return Number.isInteger(value);
}

export function assertIsInteger(value: unknown, message?: Error | string): asserts value is number {
    assert(isInteger(value), message);
}
