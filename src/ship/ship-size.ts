import { assert } from '../assert/assert';
import { isInteger } from '../assert/assert-is-integer';

export const SHIP_SIZE_INDICES = [2, 3, 4, 5] as const;

export type ShipSize = typeof SHIP_SIZE_INDICES[number];

export function isShipSize(value: unknown): value is ShipSize {
    return isInteger(value) && SHIP_SIZE_INDICES.includes(value as ShipSize);
}

export function assertIsShipSize(value: unknown): asserts value is ShipSize {
    return assert(isShipSize(value));
}
