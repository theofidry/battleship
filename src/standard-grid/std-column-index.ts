import { createFindNextIndex, createFindPreviousIndex, createIndexSorter } from '../grid/index';
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

export const findPreviousColumnIndex = createFindPreviousIndex(STD_COLUMN_INDICES);
export const findNextColumnIndex = createFindNextIndex(STD_COLUMN_INDICES);
export const sortColumnIndex = createIndexSorter(STD_COLUMN_INDICES);
