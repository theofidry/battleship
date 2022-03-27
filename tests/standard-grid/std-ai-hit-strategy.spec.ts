import { expect } from 'chai';
import { List } from 'immutable';
import { flatten, toString } from 'lodash';
import { Done } from 'mocha';
import { Observable, of, switchMap } from 'rxjs';
import { assertIsNotUndefined } from '../../src/assert/assert-is-not-undefined';
import { HitResponse } from '../../src/communication/hit-response';
import { Coordinate } from '../../src/grid/coordinate';
import { NullLogger } from '../../src/logger/null-logger';
import { PreviousMove } from '../../src/player/hit-strategy';
import { createFleet } from '../../src/ship/fleet';
import { parseCoordinate } from '../../src/standard-grid/interactive-player/coordinate-parser';
import { StandardOpponentGrid } from '../../src/standard-grid/standard-opponent-grid';
import { createHitStrategy, StdAiHitStrategy } from '../../src/standard-grid/std-ai-hit-strategy';
import { AIVersion } from '../../src/standard-grid/std-ai-player-factory';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../src/standard-grid/std-coordinate';
import { StdCoordinateNavigator } from '../../src/standard-grid/std-coordinate-navigator';
import { STD_ROW_INDICES, StdRowIndex } from '../../src/standard-grid/std-row-index';
import { EnumHelper } from '../../src/utils/enum-helper';
import { rightValue } from '../utils/either-expectations';

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

type HitStrategySupport = Record<AIVersion, boolean>;

class HitChoicesSet {
    constructor(
        readonly title: string,
        readonly moves: ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>>,
        readonly hitStrategySupport: HitStrategySupport,
        readonly expectedStrategy: string,
        readonly sortedExpectedChoices: ReadonlyArray<string>,
    ) {
    }
}

function createMoves(response: HitResponse, ...coordinates: ReadonlyArray<string>): ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>> {
    return coordinates
        .map((coordinate) => {
            const parsedCoordinate = parseCoordinate(coordinate)
                .getOrThrow(new Error(`Invalid coordinate "${coordinate}".`));
            
            return { target: parsedCoordinate, response };
        });
}

function* provideHitChoices(): Generator<HitChoicesSet> {
    const startingV2 = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: true,
        [AIVersion.V3]: true,
        [AIVersion.V4]: true,
    };

    const onlyV2 = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: true,
        [AIVersion.V3]: false,
        [AIVersion.V4]: false,
    };

    const startingV3 = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: false,
        [AIVersion.V3]: true,
        [AIVersion.V4]: true,
    };

    const onlyV3 = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: false,
        [AIVersion.V3]: true,
        [AIVersion.V4]: false,
    };

    const startingV4 = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: false,
        [AIVersion.V3]: false,
        [AIVersion.V4]: true,
    };
    
    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
        ]),
        startingV2,
        'HitTargetSurroundings<C3>',
        [
            'C2',
            'B3',
            'D3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (second hit is a miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'C2'),
        ]),
        startingV2,
        'HitTargetSurroundings<C3>',
        [
            'B3',
            'D3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (third hit is a miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'C2'),
            createMoves(HitResponse.MISS, 'D3'),
        ]),
        startingV2,
        'HitTargetSurroundings<C3>',
        [
            'B3',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit (4th hit is a miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'C2'),
            createMoves(HitResponse.MISS, 'D3'),
            createMoves(HitResponse.MISS, 'B3'),
        ]),
        startingV2,
        'HitTargetSurroundings<C3>',
        [
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the aligned cells following the direction after a hit (second hit)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.HIT, 'C4'),
        ]),
        startingV2,
        'HitAlignedExtremumsHitTargets<VERTICAL:(C3,C4)>',
        [
            'C2',
            'C5',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (2nd hit – 3rd miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.HIT, 'C4'),
            createMoves(HitResponse.MISS, 'C2'),
        ]),
        startingV2,
        'HitAlignedExtremumsHitTargets<VERTICAL:(C3,C4)>',
        [
            'C5',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the aligned cells following the direction after a hit (second hit after a miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'B3'),
            createMoves(HitResponse.HIT, 'C4'),
        ]),
        startingV2,
        'HitAlignedExtremumsHitTargets<VERTICAL:(C3,C4)>',
        [
            'C2',
            'C5',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the aligned cells in-between alignments',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'B3'),
            createMoves(HitResponse.HIT, 'C5'),
        ]),
        startingV2,
        'HitAlignedGapsHitTargets<VERTICAL:(C3,C5)>',
        [
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells following the direction after a hit (second hit after two miss)',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'D3'),
            createMoves(HitResponse.MISS, 'E3'),
            createMoves(HitResponse.MISS, 'B3'),
        ]),
        startingV2,
        'HitTargetSurroundings<C3>',
        [
            'C2',
            'C4',
        ],
    );

    yield new HitChoicesSet(
        'resumes a random search after sinking the ship',
        flatten([
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.SUNK, 'B3'),
        ]),
        onlyV2,
        'NoFilter',
        getAllCellsExcept(['C3', 'B3']),
    );

    yield new HitChoicesSet(
        'picks the most efficient screen strategy after sinking a ship',
        flatten([
            createMoves(HitResponse.MISS, 'B1'),
            createMoves(HitResponse.MISS, 'B3'),
            createMoves(HitResponse.HIT, 'C1'),
            createMoves(HitResponse.SUNK, 'C2'),
        ]),
        onlyV3,
        'GridScreening<5>',
        [
            'D1',
            'I1',
            'H2',
            'G3',
            'A4',
            'F4',
            'E5',
            'J5',
            'D6',
            'I6',
            'C7',
            'H7',
            'B8',
            'G8',
            'A9',
            'F9',
            'E10',
            'J10',
        ],
    );

    yield new HitChoicesSet(
        'picks the most efficient screen strategy after sinking a ship',
        flatten([
            createMoves(HitResponse.MISS, 'B1'),
            createMoves(HitResponse.MISS, 'B3'),
            createMoves(HitResponse.HIT, 'C1'),
            createMoves(HitResponse.HIT, 'C2'),
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.HIT, 'C4'),
            createMoves(HitResponse.SUNK, 'C5'),
        ]),
        startingV4,
        'GridScreening<4>',
        [
            'G1',
            'D2',
            'H2',
            'A3',
            'E3',
            'I3',
            'B4',
            'F4',
            'J4',
            'G5',
            'D6',
            'H6',
            'A7',
            'E7',
            'I7',
            'B8',
            'F8',
            'J8',
            'C9',
            'G9',
            'D10',
            'H10',
        ],
    );

    yield new HitChoicesSet(
        'falls back on a different strategy: head tail failed, picks surrounding',
        flatten([
            createMoves(HitResponse.HIT, 'B3'),
            createMoves(HitResponse.HIT, 'C3'),
            createMoves(HitResponse.MISS, 'D3'),
            createMoves(HitResponse.MISS, 'A3'),
        ]),
        startingV2,
        'HitTargetSurroundings<B3>',
        [
            'B2',
            'B4',
        ],
    );

    // See AIHitStrategy::checkChoicesFound() for the explanation
    yield new HitChoicesSet(
        'falls back on a different strategy: v2 limitation falls back to no filter',
        flatten([
            createMoves(HitResponse.MISS, 'H8'),
            createMoves(HitResponse.MISS, 'H9'),
            createMoves(HitResponse.HIT, 'G7'),
            createMoves(HitResponse.HIT, 'F7'),
            createMoves(HitResponse.MISS, 'E7'),
            createMoves(HitResponse.HIT, 'F8'),
            createMoves(HitResponse.SUNK, 'F9'),
            createMoves(HitResponse.HIT, 'G10'),
            createMoves(HitResponse.MISS, 'H10'),
            createMoves(HitResponse.MISS, 'F10'),
            createMoves(HitResponse.HIT, 'G9'),
            createMoves(HitResponse.HIT, 'G8'),
        ]),
        onlyV2,
        'NoFilter',
        getAllCellsExcept([
            'E7',
            'F7',
            'G7',
            'F8',
            'G8',
            'H8',
            'F9',
            'G9',
            'H9',
            'F10',
            'G10',
            'H10',
        ]),
    );

    yield new HitChoicesSet(
        'anti-regression case (1)',
        flatten([
            createMoves(HitResponse.MISS, 'E3'),
            createMoves(HitResponse.HIT, 'I4'),
        ]),
        startingV2,
        'HitTargetSurroundings<I4>',
        [
            'I3',
            'H4',
            'J4',
            'I5',
        ],
    );

    yield new HitChoicesSet(
        'does not forget another potential target',
        flatten([
            createMoves(HitResponse.HIT, 'G7'),
            createMoves(HitResponse.MISS, 'H7'),
            createMoves(HitResponse.HIT, 'F7'),
            createMoves(HitResponse.MISS, 'E7'),
            createMoves(HitResponse.HIT, 'F8'),
            createMoves(HitResponse.HIT, 'F9'),
            createMoves(HitResponse.SUNK, 'F10'),
        ]),
        startingV4,
        'HitTargetSurroundings<G7>',
        [
            'G6',
            'G8',
        ],
    );

    yield new HitChoicesSet(
        'relies on the known max size to find elements (max size = 5)',
        flatten([
            createMoves(HitResponse.HIT, 'B2'),
            createMoves(HitResponse.HIT, 'B6'),
        ]),
        startingV4,
        'HitAlignedGapsHitTargets<VERTICAL:(B2,B6)>',
        [
            'B3',
            'B4',
            'B5',
        ],
    );

    yield new HitChoicesSet(
        'does not find any alignment if the distance exceeds max size',
        flatten([
            createMoves(HitResponse.HIT, 'B2'),
            createMoves(HitResponse.HIT, 'B7'),
        ]),
        startingV4,
        'HitTargetSurroundings<B2>',
        [
            'B1',
            'A2',
            'C2',
            'B3',
        ],
    );

    yield new HitChoicesSet(
        'it finds alignment based on the max size',
        flatten([
            createMoves(HitResponse.HIT, 'B2'),
            createMoves(HitResponse.HIT, 'B3'),
            createMoves(HitResponse.HIT, 'B4'),
            createMoves(HitResponse.HIT, 'B5'),
            createMoves(HitResponse.SUNK, 'B6'),
            createMoves(HitResponse.HIT, 'D2'),
            createMoves(HitResponse.HIT, 'D5'),
        ]),
        startingV4,
        'HitAlignedGapsHitTargets<VERTICAL:(D2,D5)>',
        [
            'D3',
            'D4',
        ],
    );

    yield new HitChoicesSet(
        'it does not find alignment if the distance exceeds max size (max size = 4)',
        flatten([
            createMoves(HitResponse.HIT, 'B2'),
            createMoves(HitResponse.HIT, 'B3'),
            createMoves(HitResponse.HIT, 'B4'),
            createMoves(HitResponse.HIT, 'B5'),
            createMoves(HitResponse.SUNK, 'B6'),
            createMoves(HitResponse.HIT, 'D2'),
            createMoves(HitResponse.HIT, 'D6'),
        ]),
        startingV4,
        'HitTargetSurroundings<D2>',
        [
            'D1',
            'C2',
            'E2',
            'D3',
        ],
    );
}

describe('HitStrategy V1 (minimal)', () => {
    it('can provide a random coordinate', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = createHitStrategy(
            createFleet(),
            AIVersion.V1,
            false,
            new NullLogger(),
        );

        strategy.decide(opponentGrid, undefined)
            .subscribe({
                next: () => done(),
                error: (error) => expect.fail(error, 'Did not expect to have an error.'),
            });
    });

    it('provides a random coordinate for which no hit has been recorded yet', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const expectedCoordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);
        const strategy = createHitStrategy(
            createFleet(),
            AIVersion.V1,
            false,
            new NullLogger(),
        );

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
                error: (error) => expect.fail(error, 'Did not expect to have an error.'),
            });
    });
});

describe('HitStrategy', () => {
    const versions = EnumHelper.getValues(AIVersion);

    for (const { title, moves, hitStrategySupport, expectedStrategy, sortedExpectedChoices } of provideHitChoices()) {

        for (const version of versions) {
            if (!hitStrategySupport[version]) {
                continue;
            }

            it(`can decide on a strategy: ${title} (AI ${version})`, (done) => {
                const opponentGrid = new StandardOpponentGrid();
                const strategy = createHitStrategy(
                    createFleet(),
                    version,
                    false,
                    new NullLogger(),
                );

                expectNextChoices(
                    strategy,
                    opponentGrid,
                    moves.map((value) => value),
                    expectedStrategy,
                    sortedExpectedChoices,
                    done,
                );
            });
        }
    }
});

function expectNextChoices(
    hitStrategy: StdAiHitStrategy,
    opponentGrid: StandardOpponentGrid,
    moves: Array<PreviousMove<StdColumnIndex, StdRowIndex>>,
    expectedStrategy: string,
    sortedExpectedChoices: ReadonlyArray<string>,
    done: Done,
): void {
    const expected = {
        strategy: expectedStrategy,
        coordinates: sortedExpectedChoices,
    };

    const lastPreviousMove = moves.pop();
    assertIsNotUndefined(lastPreviousMove);

    recordMoves(
            hitStrategy,
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

                const actual = hitStrategy
                    .findChoices(
                        opponentGrid,
                        lastPreviousMove,
                    );

                rightValue(
                    actual,
                    ({ strategy, coordinates }) => {
                        const normalizedChoices = {
                            strategy,
                            coordinates: coordinates.map(toString).valueSeq().toArray(),
                        };

                        expect(normalizedChoices).to.eqls(expected);

                        done();
                    },
                );
            },
            error: (error) => expect.fail(error, 'Did not expect to have an error.'),
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
