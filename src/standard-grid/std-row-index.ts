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

export const ROWS_INDICES = EnumHelper.getValues(StdRowIndex);
