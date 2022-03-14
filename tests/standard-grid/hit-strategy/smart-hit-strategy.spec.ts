import { fail } from 'assert';
import { expect } from 'chai';
import { List } from 'immutable';
import { toString } from 'lodash';
import { Done } from 'mocha';
import { Observable, switchMap } from 'rxjs';
import { assertIsNotUndefined } from '../../../src/assert/assert-is-not-undefined';
import { HitResponse } from '../../../src/communication/hit-response';
import { Coordinate } from '../../../src/grid/coordinate';
import { PreviousMove } from '../../../src/player/hit-strategy';
import {
    getSurroundingCoordinates, getSurroundingCoordinatesFollowingDirection, SmartHitStrategy,
} from '../../../src/standard-grid/hit-strategy/smart-hit-strategy';
import { StandardOpponentGrid } from '../../../src/standard-grid/standard-opponent-grid';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../../src/standard-grid/std-coordinate';
import { STD_ROW_INDICES, StdRowIndex } from '../../../src/standard-grid/std-row-index';

describe('SmartHitStrategy components', () => {
   it('can get the coordinates surrounding the given one', () => {
       const coordinate = new Coordinate(StdColumnIndex.C, StdRowIndex.Row5);

       const expected = [
           'B5',
           'D5',
           'C4',
           'C6',
       ];

       const actual = getSurroundingCoordinates(coordinate).map(toString);

       expect(actual).to.eqls(expected);
   });

   it('can get the coordinates surrounding the given one and accounts for the grid borders', () => {
       const coordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);

       const expected = [
           'B1',
           'A2',
       ];

       const actual = getSurroundingCoordinates(coordinate).map(toString);

       expect(actual).to.eqls(expected);
   });

   it('can get the coordinates surrounding the given one following a direction (vertical)', () => {
        const coordinates = List([
            new Coordinate(StdColumnIndex.C, StdRowIndex.Row5),
            new Coordinate(StdColumnIndex.C, StdRowIndex.Row6),
        ]);

        const expected = [
            'C4',
            'C7',
        ];

        const actual = getSurroundingCoordinatesFollowingDirection(coordinates).map(toString);

        expect(actual).to.eqls(expected);
    });

   it('can get the coordinates surrounding the given one following a direction (vertical with border)', () => {
        const coordinates = List([
            new Coordinate(StdColumnIndex.A, StdRowIndex.Row1),
            new Coordinate(StdColumnIndex.A, StdRowIndex.Row2),
        ]);

        const expected = [
            'A3',
        ];

        const actual = getSurroundingCoordinatesFollowingDirection(coordinates).map(toString);

        expect(actual).to.eqls(expected);
    });

   it('can get the coordinates surrounding the given one following a direction (horizontal)', () => {
        const coordinates = List([
            new Coordinate(StdColumnIndex.C, StdRowIndex.Row5),
            new Coordinate(StdColumnIndex.D, StdRowIndex.Row5),
        ]);

        const expected = [
            'B5',
            'E5',
        ];

        const actual = getSurroundingCoordinatesFollowingDirection(coordinates).map(toString);

        expect(actual).to.eqls(expected);
    });

   it('can get the coordinates surrounding the given one following a direction (horizontal with border)', () => {
        const coordinates = List([
            new Coordinate(StdColumnIndex.A, StdRowIndex.Row1),
            new Coordinate(StdColumnIndex.B, StdRowIndex.Row1),
        ]);

        const expected = [
            'C1',
        ];

        const actual = getSurroundingCoordinatesFollowingDirection(coordinates).map(toString);

        expect(actual).to.eqls(expected);
    });
});

describe('SmartHitStrategy', () => {
    it('can provide a random coordinate', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = new SmartHitStrategy();

        strategy.decide(opponentGrid, undefined)
            .subscribe({
                next: () => done(),
                error: () => fail('Did not expect to have an error.'),
            });
    });

    it('provides a random coordinate for which no hit has been recorded yet', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const expectedCoordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);
        const strategy = new SmartHitStrategy();

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

    it('restrict the choice to the surrounding cells after a hit', () => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = new SmartHitStrategy();

        const previousMove = new Coordinate(StdColumnIndex.C, StdRowIndex.Row3);
        const previousResponse = HitResponse.HIT;

        opponentGrid.markAsHit(previousMove);

        const expectedChoices = [
            'C2',
            'D3',
            'B3',
            'C4',
        ];

        const actual = strategy
            .findChoices(
                opponentGrid,
                { target: previousMove, response: previousResponse},
            )
            .map(toString);

        expect(actual).to.eqls(expectedChoices);
    });

    it('restrict the choice to the surrounding cells following the direction after a hit (second hit)', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = new SmartHitStrategy();

        expectNextChoices(
            strategy,
            opponentGrid,
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
            done,
        );
    });
});

function expectNextChoices(
    strategy: SmartHitStrategy,
    opponentGrid: StandardOpponentGrid,
    moves: Array<PreviousMove<StdColumnIndex, StdRowIndex>>,
    expectedChoices: ReadonlyArray<string>,
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
            next: (nextMove) => {
                if (lastPreviousMove.response === HitResponse.MISS) {
                    opponentGrid.markAsMissed(lastPreviousMove.target);
                } else {
                    opponentGrid.markAsHit(lastPreviousMove.target);
                }

                const actual = strategy
                    .findChoices(
                        opponentGrid,
                        lastPreviousMove,
                    )
                    .map(toString);

                expect(expectedChoices).to.eqls(actual);

                done();
            },
            error: () => fail('Did not expect to have an error.'),
        });
}

function recordMoves(
    strategy: SmartHitStrategy,
    opponentGrid: StandardOpponentGrid,
    moves: ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>>,
): Observable<StdCoordinate> {
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
