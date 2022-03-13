import { EnumHelper } from '../utils/enum-helper';

export enum StdRowIndex {
    Row1 = 1,
    Row2,
    Row3,
    Row4,
    Row5,
    Row6,
    Row7,
    Row8,
    Row9,
    Row10,
}

export const STD_ROW_INDICES = EnumHelper.getValues(StdRowIndex);

export function getPreviousRowIndex(rowIndex: StdRowIndex): StdRowIndex | undefined {
    const currentIndex = STD_ROW_INDICES.findIndex((index) => index === rowIndex);

    return STD_ROW_INDICES[currentIndex - 1];
}

export function getNextRowIndex(rowIndex: StdRowIndex): StdRowIndex | undefined {
    const currentIndex = STD_ROW_INDICES.findIndex((_index) => _index === rowIndex);

    return STD_ROW_INDICES[currentIndex + 1];
}
