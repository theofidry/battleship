import { Map } from 'immutable';
import { toString } from 'lodash';
import { assertIsUnreachableCase } from '../assert/assert-is-unreachable';
import { Coordinate } from '../grid/coordinate';
import { DebugLogger } from '../logger/debug-logger';
import { Logger } from '../logger/logger';
import {
    AIErrorHandler, AIHitStrategy, UntouchedCoordinatesFinder,
} from '../player/ai-hit-strategy';
import { AiHitStrategyStateRecorder } from '../player/ai-hit-strategy-state-recorder';
import { NullAIHitStrategyStateRecorder } from '../player/null-ai-hit-strategy-state-recorder';
import { printTable } from '../utils/table-printer';
import { createOpponentTable } from './interactive-player/grid-printer';
import { Cell as OpponentCell } from './standard-opponent-grid';
import { StdAiHitStrategyStateRecorderLogger } from './std-ai-hit-strategy-state-recorder-logger';
import { AIVersion } from './std-ai-player-factory';
import { StdColumnIndex } from './std-column-index';
import { StdCoordinateNavigator } from './std-coordinate-navigator';
import { StdRowIndex } from './std-row-index';
import { Fleet } from '../ship/fleet';

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
    ).sort(StdCoordinateNavigator.createCoordinatesSorter());
};

const errorHandler: AIErrorHandler<StdColumnIndex, StdRowIndex, OpponentCell> = (error) => {
    console.log(error.message);

    console.log('The opponent grid state:');
    console.log(
        printTable(
            createOpponentTable(error.grid.getRows()),
        ),
    );

    const renderCoordinates = (map: Map<unknown, Coordinate<any, any>>) => map.valueSeq().map(toString).toArray();

    console.log('List of untouched coordinates found:');
    console.log(renderCoordinates(error.untouchedCoordinates));

    console.log(
        'Previous moves:',
        error.previousMoves
            .map(({ target, response }) => [target.toString(), response.valueOf()])
            .toArray(),
    );

    console.log(
        'Previous hits:',
        error.previousHits
            .map(toString)
            .toArray(),
    );

    console.log('Choice lists:');
    console.log(
        error.choicesList
            .map(({ strategy, coordinates }) => [strategy, renderCoordinates(coordinates)])
            .toArray(),
    );

    throw error;
};

export type StdAiHitStrategy = AIHitStrategy<StdColumnIndex, StdRowIndex, OpponentCell>;

export function createStdAIHitStrategy(
    fleet: Fleet,
    logger: Logger,
    debug: boolean,
    enableSmartTargeting: boolean,
    enableSmartScreening: boolean,
    enableShipSizeTracking: boolean,
): AIHitStrategy<StdColumnIndex, StdRowIndex, OpponentCell> {
    return new AIHitStrategy(
        fleet,
        StdCoordinateNavigator,
        findUntouchedCoordinates,
        errorHandler,
        createStateRecorder(debug, logger),
        new DebugLogger(debug, logger),
        enableSmartTargeting,
        enableSmartScreening,
        enableShipSizeTracking,
    );
}

function createStateRecorder(
    debug: boolean,
    logger: Logger,
): AiHitStrategyStateRecorder<StdColumnIndex, StdRowIndex, OpponentCell> {
    return debug
        ? new StdAiHitStrategyStateRecorderLogger(logger)
        : new NullAIHitStrategyStateRecorder();
}

export function createHitStrategy(
    fleet: Fleet, version: AIVersion,
    debug: boolean,
    logger: Logger,
): StdAiHitStrategy {
    switch (version) {
        case AIVersion.V1:
            return createStdAIHitStrategy(
                fleet,
                logger,
                debug,
                false,
                false,
                false,
            );

        case AIVersion.V2:
            return createStdAIHitStrategy(
                fleet,
                logger,
                debug,
                true,
                false,
                false,
            );

        case AIVersion.V3:
            return createStdAIHitStrategy(
                fleet,
                logger,
                debug,
                true,
                true,
                false,
            );

        case AIVersion.V4:
            return createStdAIHitStrategy(
                fleet,
                logger,
                debug,
                true,
                true,
                true,
            );
    }

    assertIsUnreachableCase(version);
}
