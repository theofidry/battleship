import { assert, ErrorFactory } from '../assert/assert';
import { isInteger } from '../assert/assert-is-integer';
import { createFindPreviousIndex } from '../grid/index';

export const SHIP_SIZE_INDICES = [2, 3, 4, 5] as const;

export type ShipSize = typeof SHIP_SIZE_INDICES[number];

export function isShipSize(value: unknown): value is ShipSize {
    return isInteger(value) && SHIP_SIZE_INDICES.includes(value as ShipSize);
}

export function assertIsShipSize(value: unknown, message?:  Error | ErrorFactory | string): asserts value is ShipSize {
    return assert(isShipSize(value), message);
}

export const getPreviousShipSize = createFindPreviousIndex(SHIP_SIZE_INDICES);
