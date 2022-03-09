import { EnumHelper } from '../utils/enum-helper';

export enum StdColumnIndex {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D',
    E = 'E',
    F = 'F',
    G = 'G',
    H = 'H',
    I = 'I',
    J = 'J',
}

export const STD_COLUMN_INDICES = EnumHelper.getValues(StdColumnIndex);
