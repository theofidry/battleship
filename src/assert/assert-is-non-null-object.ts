import assert = require('node:assert');

export function isNonNullObject(value: unknown): value is object {
    return 'object' === typeof value && null !== value;
}

export function assertIsNonNullObject(value: unknown, message?: Error | string): asserts value is object {
    assert(
        isNonNullObject(value),
        message,
    );
}
