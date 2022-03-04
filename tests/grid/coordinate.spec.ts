import { expect } from 'chai';
import { Coordinate } from '../../src/grid/coordinate';

describe('Coordinate', () => {
    it('can be cast into a string', () => {
        const coordinate = new Coordinate('A', 4);
        const expected = 'A4';

        expect(coordinate.toString()).to.equal(expected);
    });
});
