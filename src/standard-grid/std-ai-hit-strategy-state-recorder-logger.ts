import { List, Map } from 'immutable';
import { toString } from 'lodash';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment } from '../grid/coordinate-alignment';
import { OpponentGrid } from '../grid/opponent-grid';
import { Logger } from '../logger/logger';
import { AppliedChoiceStrategy, ChoiceStrategy } from '../player/ai-hit-strategy';
import { AiHitStrategyStateRecorder } from '../player/ai-hit-strategy-state-recorder';
import { printTable } from '../utils/table-printer';
import { createOpponentTable } from './interactive-player/grid-printer';
import { Cell as OpponentCell } from './standard-opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export class StdAiHitStrategyStateRecorderLogger implements AiHitStrategyStateRecorder<StdColumnIndex, StdRowIndex, OpponentCell> {
    constructor(
        private readonly logger: Logger,
    ) {
    }

    recordChoices(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, OpponentCell>,
        untouchedCoordinates: Map<string, Coordinate<StdColumnIndex, StdRowIndex>>,
        previousHits: List<Coordinate<StdColumnIndex, StdRowIndex>>,
        alignedHitCoordinatesList: List<CoordinateAlignment<StdColumnIndex, StdRowIndex>>,
        filters: List<ChoiceStrategy<StdColumnIndex, StdRowIndex>>,
        choicesList: List<AppliedChoiceStrategy<StdColumnIndex, StdRowIndex>>,
    ): void {
        this.logger.log('The opponent grid state:');
        this.logger.log(
            printTable(
                createOpponentTable(grid.getRows()),
            ),
        );

        const renderCoordinates = (map: Map<unknown, Coordinate<any, any>>) => map
            .valueSeq()
            .map(toString)
            .toArray();

        this.logger.log('List of untouched sortedCoordinates found:');
        this.logger.log(renderCoordinates(untouchedCoordinates));

        this.logger.log(
            'Previous hits:',
            previousHits
                .map(toString)
                .toArray(),
        );
        this.logger.log(
            'Hit sortedCoordinates alignments:',
            alignedHitCoordinatesList
                .map(toString)
                .toArray(),
        );

        this.logger.log(
            'Filters applied:',
            filters
                .map(({ strategy }) => strategy)
                .toArray(),
        );

        this.logger.log('Choice lists:');
        this.logger.log(
            choicesList
                .map(({ strategy, coordinates }) => [strategy, renderCoordinates(coordinates)])
                .toArray(),
        );
    }
}
