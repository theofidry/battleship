import { Coordinate } from '../grid/coordinate';
import { CoordinateNavigator } from '../grid/coordinate-navigator';
import {
    findNextColumnIndex, findPreviousColumnIndex, sortColumnIndex, StdColumnIndex,
} from './std-column-index';
import { findNextRowIndex, findPreviousRowIndex, sortRowIndex, StdRowIndex } from './std-row-index';

export const StdCoordinateNavigator = new CoordinateNavigator(
    findPreviousColumnIndex,
    findNextColumnIndex,
    sortColumnIndex,
    findPreviousRowIndex,
    findNextRowIndex,
    sortRowIndex,
    new Coordinate(StdColumnIndex.A, StdRowIndex.Row1),
);
