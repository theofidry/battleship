import { Map } from 'immutable';
import { Coordinate } from '../grid/coordinate';
import {
    AIErrorHandler, AIHitStrategy, UntouchedCoordinatesFinder,
} from '../player/ai-hit-strategy';
import { Cell as OpponentCell } from './standard-opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdCoordinateNavigator } from './std-coordinate-navigator';
import { StdRowIndex } from './std-row-index';

const findUntouchedCoordinates: UntouchedCoordinatesFinder<StdColumnIndex, StdRowIndex, OpponentCell> = (grid) => {
    return Map(
        grid
            .getRows()
            .toArray()
            .flatMap(
                ([rowIndex, row]) => row
                    .toArray()
                    .filter(([_columnIndex, cell]) => cell === OpponentCell.NONE)
                    .map(([columnIndex]) => new Coordinate(columnIndex, rowIndex)),
            )
            .map((coordinate) => [coordinate.toString(), coordinate]),
    );
};

const errorHandler: AIErrorHandler<StdColumnIndex, StdRowIndex, OpponentCell> = (error) => {
    throw error;
};

export const StdAIHitStrategy = new AIHitStrategy(
    StdCoordinateNavigator,
    findUntouchedCoordinates,
    errorHandler,
);
