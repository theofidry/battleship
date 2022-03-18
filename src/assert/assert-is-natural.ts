import { assert, ErrorFactory } from './assert';
import { isInteger } from './assert-is-integer';

export function isNatural(value: unknown): value is number {
    return isInteger(value) && value >= 0;
}

export function assertIsNatural(value: unknown, message?: Error | ErrorFactory | string): asserts value is number {
    assert(isNatural(value), message);
}
