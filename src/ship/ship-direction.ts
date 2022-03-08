import { EnumHelper } from '../utils/enum-helper';

export enum ShipDirection {
    HORIZONTAL, // From left to right
    VERTICAL,   // From top to bottom
}

export const SHIP_DIRECTION_INDICES = EnumHelper.getValues(ShipDirection);
