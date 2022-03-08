import { expect } from 'chai';
import { Coordinate } from '../../../src/grid/coordinate';
import { RandomHitStrategy } from '../../../src/standard-grid/hit-strategy/random-hit-strategy';
import { StandardOpponentGrid } from '../../../src/standard-grid/standard-opponent-grid';
import { COLUMN_INDICES, StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { ROWS_INDICES, StdRowIndex } from '../../../src/standard-grid/std-row-index';

describe('RandomHitStrategy', () => {
    it('can provide a random coordinate', () => {
        const opponentGrid = new StandardOpponentGrid();

        const decide = () => RandomHitStrategy.decide(opponentGrid);

        expect(decide).to.not.throw();
    });

    it('provides a random coordinate for which no hit has been recorded yet', () => {
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

        const actual = RandomHitStrategy.decide(opponentGrid);

        expect(actual).to.eqls(expectedCoordinate);
    });
});
