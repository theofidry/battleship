import { Coordinate } from '../../grid/coordinate';
import { EnumHelper } from '../../utils/enum-helper';
import { CoordinateParser } from '../hit-strategy/interactive-hit-strategy';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../std-column-index';
import { STD_ROW_INDICES, StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

export const parseCoordinate: CoordinateParser = (rawCoordinate) => {
    const result = rawCoordinate.match(/([A-Z]+)([0-9]+)/);

    assert(
        null !== result,
        InvalidCoordinate.forValue(rawCoordinate),
    );

    const columnIndex = result[1] || '';
    const rowIndex = Number(result[2]);

    assert(
        EnumHelper.hasValue(StdColumnIndex, columnIndex),
        InvalidCoordinate.forColumn(rawCoordinate, columnIndex),
    );
    assert(
        EnumHelper.hasValue(StdRowIndex, rowIndex),
        InvalidCoordinate.forRow(rawCoordinate, rowIndex),
    );

    return new Coordinate(columnIndex, rowIndex);
};

class InvalidCoordinate extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidCoordinate';
    }

    static forValue(original: string): InvalidCoordinate {
        return new InvalidCoordinate(
            `Could not parse the coordinate "${original}". Expected a value following the format CR where C is one of the column "${STD_COLUMN_INDICES.join('", "')}" and R one of the row "${STD_ROW_INDICES.join('", "')}".`,
        );
    }

    static forColumn(original: string, columnIndex: string): InvalidCoordinate {
        return new InvalidCoordinate(
            `Could not parse the coordinate "${original}". Expected column to be one of "${STD_COLUMN_INDICES.join('", "')}". Got "${columnIndex}".`,
        );
    }

    static forRow(original: string, rowIndex: number): InvalidCoordinate {
        return new InvalidCoordinate(
            `Could not parse the coordinate "${original}". Expected row to be one of "${STD_ROW_INDICES.join('", "')}". Got "${rowIndex}".`,
        );
    }
}
