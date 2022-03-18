import { assert, ErrorFactory } from './assert';

export function isInteger(value: unknown): value is number {
    return Number.isInteger(value);
}

export function assertIsInteger(value: unknown, message?: Error | ErrorFactory | string): asserts value is number {
    assert(isInteger(value), message);
}
