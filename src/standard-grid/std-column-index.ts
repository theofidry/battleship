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

export function getPreviousColumnIndex(columnIndex: StdColumnIndex): StdColumnIndex | undefined {
    const currentIndex = STD_COLUMN_INDICES.findIndex((index) => index === columnIndex);

    return STD_COLUMN_INDICES[currentIndex - 1];
}

export function getNextColumnIndex(columnIndex: StdColumnIndex): StdColumnIndex | undefined {
    const currentIndex = STD_COLUMN_INDICES.findIndex((_index) => _index === columnIndex);

    return STD_COLUMN_INDICES[currentIndex + 1];
}
