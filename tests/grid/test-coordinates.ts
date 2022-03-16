import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateNavigator } from '../../src/grid/coordinate-navigator';
import {
    createFindNextIndex, createFindPreviousIndex, createIndexSorter,
} from '../../src/grid/index';

export enum TestCell {
    EMPTY,
    FULL,
}

export const testCellPrinter = (cell: TestCell) => cell.valueOf();

export const TEST_COLUMN_INDICES = ['A', 'B', 'C', 'D', 'E'] as const;
export type TestColumnIndex = typeof TEST_COLUMN_INDICES[number];

export const TEST_ROW_INDICES = ['1', '2', '3', '4', '5'] as const;
export type TestRowIndex = typeof TEST_ROW_INDICES[number];

export type TestCoordinate = Coordinate<TestColumnIndex, TestRowIndex>;

const findPreviousTestColumnIndex = createFindPreviousIndex(TEST_COLUMN_INDICES);
const findNextTestColumnIndex = createFindNextIndex(TEST_COLUMN_INDICES);
const sortTestColumnIndex = createIndexSorter(TEST_COLUMN_INDICES);

const findPreviousTestRowIndex = createFindPreviousIndex(TEST_ROW_INDICES);
const findNextTestRowIndex = createFindNextIndex(TEST_ROW_INDICES);
const sortTestRowIndex = createIndexSorter(TEST_ROW_INDICES);

export const testCoordinateNavigator = new CoordinateNavigator(
    findPreviousTestColumnIndex,
    findNextTestColumnIndex,
    sortTestColumnIndex,
    findPreviousTestRowIndex,
    findNextTestRowIndex,
    sortTestRowIndex,
);
