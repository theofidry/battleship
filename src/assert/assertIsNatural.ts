import assert = require('node:assert');
import { assertIsInteger } from '@app/assert/assertIsInteger';

export function assertIsNatural(value: unknown, message?: string): asserts value is number {
    assertIsInteger(value, message);
    assert(value >= 0, message);
}
