import { assertIsInteger } from './assert-is-integer';
import assert = require('node:assert');

export function assertIsNatural(value: unknown, message?: string): asserts value is number {
    assertIsInteger(value, message);
    assert(value >= 0, message);
}
