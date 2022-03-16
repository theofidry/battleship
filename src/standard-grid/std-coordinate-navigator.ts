import { CoordinateNavigator } from '../grid/coordinate-navigator';
import { findNextColumnIndex, findPreviousColumnIndex, sortColumnIndex } from './std-column-index';
import { findNextRowIndex, findPreviousRowIndex, sortRowIndex } from './std-row-index';

export const StdCoordinateNavigator = new CoordinateNavigator(
    findPreviousColumnIndex,
    findNextColumnIndex,
    sortColumnIndex,
    findPreviousRowIndex,
    findNextRowIndex,
    sortRowIndex,
);
