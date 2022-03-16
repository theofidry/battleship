import { fail } from 'assert';
import { expect } from 'chai';
import { List } from 'immutable';
import { toString } from 'lodash';
import { Done } from 'mocha';
import { Observable, of, switchMap } from 'rxjs';
import { assertIsNotUndefined } from '../../src/assert/assert-is-not-undefined';
import { HitResponse } from '../../src/communication/hit-response';
import { Coordinate } from '../../src/grid/coordinate';
import { PreviousMove } from '../../src/player/hit-strategy';
import { StandardOpponentGrid } from '../../src/standard-grid/standard-opponent-grid';
import {
    createStdAIHitStrategy, StdAiHitStrategy,
} from '../../src/standard-grid/std-ai-hit-strategy';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../src/standard-grid/std-coordinate';
import { StdCoordinateNavigator } from '../../src/standard-grid/std-coordinate-navigator';
import { STD_ROW_INDICES, StdRowIndex } from '../../src/standard-grid/std-row-index';

const createMinimalHitStrategy = () => createStdAIHitStrategy(false);
const createHitStrategyWithSmartTargeting = () => createStdAIHitStrategy(true);

const allCells = List(STD_COLUMN_INDICES)
    .flatMap((columnIndex) => STD_ROW_INDICES
        .map((rowIndex) => new Coordinate(columnIndex, rowIndex)),
    )
    .sort(StdCoordinateNavigator.createCoordinatesSorter())
    .map(toString);

function getAllCellsExcept (excludedCoordinates: ReadonlyArray<string>): ReadonlyArray<string> {
    return allCells
        .filter((cell) => !excludedCoordinates.includes(cell))
        .toArray();
}

class HitChoicesSet {
    constructor(
        readonly title: string,
        readonly moves: ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>>,
        readonly sortedExpectedChoices: ReadonlyArray<string>,
    ) {
    }
}

function* provideHitChoices(): Generator<HitChoicesSet> {
    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
        ],
        [
            'C2',
            'B3',
            'D3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (second hit is a miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row2),
                response: HitResponse.MISS,
            },
        ],
        [
            'B3',
            'D3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (third hit is a miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row2),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.D, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
        ],
        [
            'B3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (4th hit is a miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row2),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.D, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
        ],
        [
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (second hit)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row4),
                response: HitResponse.HIT,
            },
        ],
        [
            'C2',
            'C5',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (2nd hit – 3rd miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row4),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row2),
                response: HitResponse.MISS,
            },
        ],
        [
            'C5',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (second hit after a miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row4),
                response: HitResponse.HIT,
            },
        ],
        [
            'C2',
            'D3',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (second hit after two miss)',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.D, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row4),
                response: HitResponse.HIT,
            },
        ],
        [
            'C2',
        ],
    );

    yield new HitChoicesSet(
        'resumes a random search after sinking the ship',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.SUNK,
            },
        ],
        getAllCellsExcept(['C3', 'B3']),
    );

    yield new HitChoicesSet(
        'falls back on a different strategy',
        [
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.D, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.A, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
        ],
        [
            'B2',
            'B4',
        ],
    );
}

describe('minimal HitStrategy', () => {
    it('can provide a random coordinate', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = createMinimalHitStrategy();

        strategy.decide(opponentGrid, undefined)
            .subscribe({
                next: () => done(),
                error: () => fail('Did not expect to have an error.'),
            });
    });

    it('provides a random coordinate for which no hit has been recorded yet', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const expectedCoordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);
        const strategy = createMinimalHitStrategy();

        // Fill all cells except one which is the one we expect to find afterwards.
        let i = 0;
        STD_COLUMN_INDICES.forEach(
            (columnIndex) => STD_ROW_INDICES.forEach(
                (rowIndex) => {
                    const coordinate = new Coordinate(columnIndex, rowIndex);

                    if (expectedCoordinate.toString() === coordinate.toString()) {
                        return;
                    }

                    i++;

                    if (i%2 === 0) {
                        opponentGrid.markAsMissed(coordinate);
                    } else {
                        opponentGrid.markAsHit(coordinate);
                    }
                }
            )
        );

        strategy.decide(opponentGrid, undefined)
            .subscribe({
                next: (nextMove) => {
                    expect(nextMove).to.eqls(expectedCoordinate);

                    done();
                },
                error: () => fail('Did not expect to have an error.'),
            });
    });
});

describe('HitStrategy with smart targeting', () => {
    for (const { title, moves, sortedExpectedChoices } of provideHitChoices()) {
        it(title, (done) => {
            const opponentGrid = new StandardOpponentGrid();
            const strategy = createHitStrategyWithSmartTargeting();

            expectNextChoices(
                strategy,
                opponentGrid,
                moves.map((value) => value),
                sortedExpectedChoices,
                done,
            );
        });
    }
});

function expectNextChoices(
    strategy: StdAiHitStrategy,
    opponentGrid: StandardOpponentGrid,
    moves: Array<PreviousMove<StdColumnIndex, StdRowIndex>>,
    sortedExpectedChoices: ReadonlyArray<string>,
    done: Done,
): void {
    const lastPreviousMove = moves.pop();
    assertIsNotUndefined(lastPreviousMove);

    recordMoves(
            strategy,
            opponentGrid,
            moves,
        )
        .subscribe({
            next: () => {
                if (lastPreviousMove.response === HitResponse.MISS) {
                    opponentGrid.markAsMissed(lastPreviousMove.target);
                } else {
                    opponentGrid.markAsHit(lastPreviousMove.target);
                }

                const actual = strategy
                    .findChoices(
                        opponentGrid,
                        lastPreviousMove,
                    );

                actual.fold(
                    (error) => fail(error),
                    (sortedChoices) => expect(
                        sortedChoices.map(toString),
                    ).to.eqls(sortedExpectedChoices),
                );

                done();
            },
            error: () => fail('Did not expect to have an error.'),
        });
}

function recordMoves(
    strategy: StdAiHitStrategy,
    opponentGrid: StandardOpponentGrid,
    moves: ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>>,
): Observable<unknown> {
    if (moves.length === 0) {
        return of(undefined);
    }

    const nextMove$ = moves.reduce(
        (previous$, previousMove) => {
            if (undefined === previous$) {
                if (previousMove.response === HitResponse.MISS) {
                    opponentGrid.markAsMissed(previousMove.target);
                } else {
                    opponentGrid.markAsHit(previousMove.target);
                }

                return strategy.decide(opponentGrid, previousMove);
            }

            return previous$.pipe(
                switchMap(() => {
                    if (previousMove.response === HitResponse.MISS) {
                        opponentGrid.markAsMissed(previousMove.target);
                    } else {
                        opponentGrid.markAsHit(previousMove.target);
                    }

                    return strategy.decide(opponentGrid, previousMove);
                })
            );
        },
        undefined as Observable<StdCoordinate> | undefined,
    );

    assertIsNotUndefined(nextMove$);

    return nextMove$;
}
