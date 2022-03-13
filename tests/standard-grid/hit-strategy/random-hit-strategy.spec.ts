import { fail } from 'assert';
import { expect } from 'chai';
import { Coordinate } from '../../../src/grid/coordinate';
import { RandomHitStrategy } from '../../../src/standard-grid/hit-strategy/random-hit-strategy';
import { StandardOpponentGrid } from '../../../src/standard-grid/standard-opponent-grid';
import { StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { StdRowIndex } from '../../../src/standard-grid/std-row-index';
import { EnumHelper } from '../../../src/utils/enum-helper';

const COLUMN_INDICES = EnumHelper.getValues(StdColumnIndex);
const ROWS_INDICES = EnumHelper.getValues(StdRowIndex);

describe('RandomHitStrategy', () => {
    it('can provide a random coordinate', (done) => {
        const opponentGrid = new StandardOpponentGrid();

        RandomHitStrategy.decide(opponentGrid, undefined)
            .subscribe({
                next: () => done(),
                error: () => fail('Did not expect to have an error.'),
            });
    });

    it('provides a random coordinate for which no hit has been recorded yet', (done) => {
        const opponentGrid = new StandardOpponentGrid();
        const expectedCoordinate = new Coordinate(StdColumnIndex.A, StdRowIndex.Row1);

        // Fill all cells except one which is the one we expect to find afterwards.
        let i = 0;
        COLUMN_INDICES.forEach(
            (columnIndex) => ROWS_INDICES.forEach(
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

        RandomHitStrategy.decide(opponentGrid, undefined)
            .subscribe({
                next: (nextMove) => {
                    expect(nextMove).to.eqls(expectedCoordinate);

                    done();
                },
                error: () => fail('Did not expect to have an error.'),
            });
    });
});
