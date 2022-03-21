import { List, Map } from 'immutable';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment } from '../grid/coordinate-navigator';
import { OpponentGrid } from '../grid/opponent-grid';
import { AppliedChoiceStrategy, ChoiceStrategy } from './ai-hit-strategy';
import { AiHitStrategyStateRecorder } from './ai-hit-strategy-state-recorder';

export class NullAIHitStrategyStateRecorder implements AiHitStrategyStateRecorder<any, any, any> {
    recordChoices(
        grid: OpponentGrid<any, any, any>,
        untouchedCoordinates: Map<string, Coordinate<any, any>>,
        previousHits: List<Coordinate<any, any>>,
        alignedHitCoordinatesList: List<CoordinateAlignment<any, any>>,
        filters: List<ChoiceStrategy<any, any>>,
        choicesList: List<AppliedChoiceStrategy<any, any>>,
    ): void {
        // Do nothing
    }
}
