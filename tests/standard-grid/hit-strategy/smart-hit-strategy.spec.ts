import { fail } from 'assert';
import { expect } from 'chai';
import { Observable, switchMap } from 'rxjs';
import { assertIsNotUndefined } from '../../../src/assert/assert-is-not-undefined';
import { HitResponse } from '../../../src/communication/hit-response';
import { Coordinate } from '../../../src/grid/coordinate';
import { PreviousMove } from '../../../src/player/hit-strategy';
import { SmartHitStrategy } from '../../../src/standard-grid/hit-strategy/smart-hit-strategy';
import { StandardOpponentGrid } from '../../../src/standard-grid/standard-opponent-grid';
import { STD_COLUMN_INDICES, StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../../src/standard-grid/std-coordinate';
import { STD_ROW_INDICES, StdRowIndex } from '../../../src/standard-grid/std-row-index';

const mapToString = (value: any) => value.toString();

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

    it('it hits the most probably coordinates after a hit (first hit)', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = new SmartHitStrategy();

        const previousMove = new Coordinate(StdColumnIndex.C, StdRowIndex.Row3);
        const previousResponse = HitResponse.HIT;

        opponentGrid.markAsHit(previousMove);

        const expectedNextMoves = [
            'C2',
            'D3',
            'C4',
            'B3',
        ];

        const nextMove$ = strategy.decide(
            opponentGrid,
            { target: previousMove, response: previousResponse},
        );

        nextMove$.subscribe({
                next: (nextMove) => {
                    expect(expectedNextMoves).to.include(nextMove.toString());

                    done();
                },
                error: () => fail('Did not expect to have an error.'),
            });
    });

    it('it hits the most probably coordinates after a hit (second hit)', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const strategy = new SmartHitStrategy();

        const nextMove$ = recordMoves(
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
        );

        const expectedNextMoves = [
            'C2',
            'C5',
        ];

        nextMove$.subscribe({
                next: (nextMove) => {
                    expect(expectedNextMoves).to.include(nextMove.toString());

                    done();
                },
                error: () => fail('Did not expect to have an error.'),
            });
    });
});

function recordMoves(strategy: SmartHitStrategy,grid: StandardOpponentGrid, moves: ReadonlyArray<PreviousMove<StdColumnIndex, StdRowIndex>>): Observable<StdCoordinate> {
    const nextMove$ = moves.reduce(
        (previous$, previousMove) => {
            if (undefined === previous$) {
                if (previousMove.response === HitResponse.MISS) {
                    grid.markAsMissed(previousMove.target);
                } else {
                    grid.markAsHit(previousMove.target);
                }

                return strategy.decide(grid, previousMove);
            }

            return previous$.pipe(
                switchMap(() => {
                    if (previousMove.response === HitResponse.MISS) {
                        grid.markAsMissed(previousMove.target);
                    } else {
                        grid.markAsHit(previousMove.target);
                    }

                    return strategy.decide(grid, previousMove);
                })
            );
        },
        undefined as Observable<StdCoordinate> | undefined,
    );

    assertIsNotUndefined(nextMove$);

    return nextMove$;
}
