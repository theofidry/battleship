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
import { createFleet } from '../../src/ship/fleet';
import { StandardOpponentGrid } from '../../src/standard-grid/standard-opponent-grid';
import { createHitStrategy, StdAiHitStrategy } from '../../src/standard-grid/std-ai-hit-strategy';
import { AIVersion } from '../../src/standard-grid/std-ai-player-factory';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../src/standard-grid/std-coordinate';
import { StdCoordinateNavigator } from '../../src/standard-grid/std-coordinate-navigator';
import { STD_ROW_INDICES, StdRowIndex } from '../../src/standard-grid/std-row-index';
import { EnumHelper } from '../../src/utils/enum-helper';

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

function* provideHitChoices(): Generator<HitChoicesSet> {
    const fromV2Support = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: true,
        [AIVersion.V3]: true,
        [AIVersion.V4]: true,
    };

    const onlyV2Support = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: true,
        [AIVersion.V3]: false,
        [AIVersion.V4]: true,
    };

    const fromV3Support = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: false,
        [AIVersion.V3]: true,
        [AIVersion.V4]: true,
    };

    const fromV4Support = {
        [AIVersion.V1]: false,
        [AIVersion.V2]: false,
        [AIVersion.V3]: false,
        [AIVersion.V4]: true,
    };

    yield new HitChoicesSet(
        'restrict the choice to the surrounding cells after a hit',
        [
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row3),
                response: HitResponse.HIT,
            },
        ],
        fromV2Support,
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
        fromV2Support,
        'HitTargetSurroundings<C3>',
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
        fromV2Support,
        'HitTargetSurroundings<C3>',
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
        fromV2Support,
        'HitTargetSurroundings<C3>',
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
        fromV2Support,
        'HitAlignedExtremumsHitTargets<VERTICAL,List [ "C3", "C4" ]>',
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
        fromV2Support,
        'HitAlignedExtremumsHitTargets<VERTICAL,List [ "C3", "C4" ]>',
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
        fromV2Support,
        'HitTargetSurroundings<C3>',
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
        fromV2Support,
        'HitTargetSurroundings<C3>',
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
        onlyV2Support,
        'NoFilter',
        getAllCellsExcept(['C3', 'B3']),
    );

    yield new HitChoicesSet(
        'picks the most efficient screen strategy after sinking a ship',
        [
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row1),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.B, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row1),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.C, StdRowIndex.Row2),
                response: HitResponse.SUNK,
            },
        ],
        fromV3Support,
        'GridScreening',
        [
            'D1',
            'F1',
            'H1',
            'J1',
            'A2',
            'E2',
            'G2',
            'I2',
            'D3',
            'F3',
            'H3',
            'J3',
            'A4',
            'C4',
            'E4',
            'G4',
            'I4',
            'B5',
            'D5',
            'F5',
            'H5',
            'J5',
            'A6',
            'C6',
            'E6',
            'G6',
            'I6',
            'B7',
            'D7',
            'F7',
            'H7',
            'J7',
            'A8',
            'C8',
            'E8',
            'G8',
            'I8',
            'B9',
            'D9',
            'F9',
            'H9',
            'J9',
            'A10',
            'C10',
            'E10',
            'G10',
            'I10',
        ],
    );

    yield new HitChoicesSet(
        'falls back on a different strategy: head tail failed, picks surrounding',
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
        fromV2Support,
        'HitTargetSurroundings<B3>',
        [
            'B2',
            'B4',
        ],
    );

    // See AIHitStrategy::checkChoicesFound() for the explanation
    yield new HitChoicesSet(
        'falls back on a different strategy: v2 limitation falls back to no filter',
        [
            {
                target: new Coordinate(StdColumnIndex.H, StdRowIndex.Row8),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.H, StdRowIndex.Row9),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.G, StdRowIndex.Row7),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row7),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.E, StdRowIndex.Row7),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row8),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row9),
                response: HitResponse.SUNK,
            },
            {
                target: new Coordinate(StdColumnIndex.G, StdRowIndex.Row10),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.H, StdRowIndex.Row10),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row10),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.G, StdRowIndex.Row9),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.G, StdRowIndex.Row8),
                response: HitResponse.HIT,
            },
        ],
        onlyV2Support,
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
        [
            {
                target: new Coordinate(StdColumnIndex.E, StdRowIndex.Row3),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.I, StdRowIndex.Row4),
                response: HitResponse.HIT,
            },
        ],
        fromV2Support,
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
        [
            {
                target: new Coordinate(StdColumnIndex.G, StdRowIndex.Row7),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.H, StdRowIndex.Row7),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row7),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.E, StdRowIndex.Row7),
                response: HitResponse.MISS,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row8),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row9),
                response: HitResponse.HIT,
            },
            {
                target: new Coordinate(StdColumnIndex.F, StdRowIndex.Row10),
                response: HitResponse.SUNK,
            },
        ],
        fromV4Support,
        'HitTargetSurroundings<G7>',
        [
            'G6',
            'G8',
        ],
    );
}

describe('HitStrategy V1 (minimal)', () => {
    it('can provide a random coordinate', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = createHitStrategy(createFleet(), AIVersion.V1);

        strategy.decide(opponentGrid, undefined)
            .subscribe({
                next: () => done(),
                error: () => fail('Did not expect to have an error.'),
            });
    });

    it('provides a random coordinate for which no hit has been recorded yet', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const expectedCoordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);
        const strategy = createHitStrategy(createFleet(), AIVersion.V1);

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

describe('HitStrategy', () => {
    const versions = EnumHelper.getValues(AIVersion);

    for (const { title, moves, hitStrategySupport, expectedStrategy, sortedExpectedChoices } of provideHitChoices()) {

        for (const version of versions) {
            if (!hitStrategySupport[version]) {
                continue;
            }

            it(`can decide on a strategy: ${title} (AI ${version})`, (done) => {
                const opponentGrid = new StandardOpponentGrid();
                const strategy = createHitStrategy(createFleet(), version);

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

                actual.fold(
                    (error) => fail(error),
                    ({ strategy, coordinates }) => {
                        const normalizedChoices = {
                            strategy,
                            coordinates: coordinates.map(toString).valueSeq().toArray(),
                        };

                        expect(normalizedChoices).to.eqls(expected);
                    }
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
