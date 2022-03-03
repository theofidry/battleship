import { isInteger } from './assert-is-integer';
import assert = require('node:assert');

export function isNatural(value: unknown): value is number {
    return isInteger(value) && value >= 0;
}

export function assertIsNatural(value: unknown, message?: string): asserts value is number {
    assert(isNatural(value), message);
}
