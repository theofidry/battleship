import { List, Map } from 'immutable';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment } from '../grid/coordinate-navigator';
import { OpponentGrid } from '../grid/opponent-grid';
import { AppliedChoiceStrategy, ChoiceStrategy } from './ai-hit-strategy';

export interface AiHitStrategyStateRecorder<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> {
    recordChoices(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        untouchedCoordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
        previousHits: List<Coordinate<ColumnIndex, RowIndex>>,
        alignedHitCoordinatesList: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
        filters: List<ChoiceStrategy<ColumnIndex, RowIndex>>,
        choicesList: List<AppliedChoiceStrategy<ColumnIndex, RowIndex>>,
    ): void;
}
