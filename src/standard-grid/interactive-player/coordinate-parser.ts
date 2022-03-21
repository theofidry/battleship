import { Coordinate } from '../../grid/coordinate';
import { Either } from '../../utils/either';
import { EnumHelper } from '../../utils/enum-helper';
import { CoordinateParser } from '../hit-strategy/interactive-hit-strategy';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../std-column-index';
import { STD_ROW_INDICES, StdRowIndex } from '../std-row-index';

export const parseCoordinate: CoordinateParser = (rawCoordinate) => {
    const result = rawCoordinate.match(/([A-Z]+)([0-9]+)/);

    if (null === result) {
        return Either.left(
            InvalidCoordinate.forValue(rawCoordinate),
        );
    }

    const columnIndex = result[1] || '';
    const rowIndex = Number(result[2]);

    if (!EnumHelper.hasValue(StdColumnIndex, columnIndex)) {
        return Either.left(
            InvalidCoordinate.forColumn(rawCoordinate, columnIndex),
        );
    }

    if (!EnumHelper.hasValue(StdRowIndex, rowIndex)) {
        return Either.left(
            InvalidCoordinate.forRow(rawCoordinate, rowIndex),
        );
    }

    return Either.right(new Coordinate(columnIndex, rowIndex));
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
