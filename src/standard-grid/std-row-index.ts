import { createFindNextIndex, createFindPreviousIndex, createIndexSorter } from '../grid/index';
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

export const findPreviousRowIndex = createFindPreviousIndex(STD_ROW_INDICES);
export const findNextRowIndex = createFindNextIndex(STD_ROW_INDICES);
export const sortRowIndex = createIndexSorter(STD_ROW_INDICES);
