import { expect } from 'chai';
import { createCarrier, Ship } from '../../src/ship/ship';

describe('Ship', () => {
    it('can be instantiated', () => {
        const ship: Ship = createCarrier();

        expect(ship.toString()).to.equal('Carrier(5)');
    });
});
