import { expect } from 'chai';
import { createFleet } from '../../../src/ship/fleet';
import {
    RandomPlacementStrategy,
} from '../../../src/standard-grid/placement-strategy/random-placement-strategy';

describe('RandomPlacementStrategy', () => {
    it('can place the fleet on a grid', () => {
        const fleet = createFleet();
        const expectedFilledCells = fleet.reduce(
            (partialSum, ship) => partialSum + ship.size,
            0,
        );

        const grid = RandomPlacementStrategy.place(fleet);

        const actualFilledCells = grid
            .getRows()
            .valueSeq()
            .flatMap((row) => row.valueSeq().toArray())
            .map((value) => Number(undefined !== value))
            .reduce(
                (partialSum, value) => partialSum + value,
                0,
            );

        expect(actualFilledCells).to.equal(expectedFilledCells);
    });

    it('does not arrange the grid the same way twice in a row', () => {
        const fleet = createFleet();

        const firstGrid = RandomPlacementStrategy.place(fleet);
        const secondGrid = RandomPlacementStrategy.place(fleet);

        expect(firstGrid).to.not.eqls(secondGrid);
    });
});
