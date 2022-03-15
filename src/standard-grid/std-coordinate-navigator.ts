import { CoordinateNavigator } from '../grid/coordinate-navigator';
import { findNextColumnIndex, findPreviousColumnIndex } from './std-column-index';
import { findNextRowIndex, findPreviousRowIndex } from './std-row-index';

export const StdCoordinateNavigator = new CoordinateNavigator(
    findPreviousColumnIndex,
    findNextColumnIndex,
    findPreviousRowIndex,
    findNextRowIndex,
);