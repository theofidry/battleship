import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateNavigator } from '../../src/grid/coordinate-navigator';

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

const findNextTestColumnIndex = (columnIndex: TestColumnIndex): TestColumnIndex | undefined => {
    const index = TEST_COLUMN_INDICES.findIndex((_columnIndex) => _columnIndex === columnIndex);

    return TEST_COLUMN_INDICES[index + 1];
};

const findPreviousTestColumnIndex = (columnIndex: TestColumnIndex): TestColumnIndex | undefined => {
    const index = TEST_COLUMN_INDICES.findIndex((_columnIndex) => _columnIndex === columnIndex);

    return TEST_COLUMN_INDICES[index - 1];
};

const findNextTestRowIndex = (rowIndex: TestRowIndex): TestRowIndex | undefined => {
    const index = TEST_ROW_INDICES.findIndex((_rowIndex) => _rowIndex === rowIndex);

    return TEST_ROW_INDICES[index + 1];
};

const findPreviousTestRowIndex = (rowIndex: TestRowIndex): TestRowIndex | undefined => {
    const index = TEST_ROW_INDICES.findIndex((_rowIndex) => _rowIndex === rowIndex);

    return TEST_ROW_INDICES[index - 1];
};

export const testCoordinateNavigator = new CoordinateNavigator(
    findPreviousTestColumnIndex,
    findNextTestColumnIndex,
    findPreviousTestRowIndex,
    findNextTestRowIndex,
);
