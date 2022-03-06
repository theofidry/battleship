import { expect } from 'chai';
import { OrderedSet } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { PositionedShip } from '../../src/ship/positioned-ship';
import { Ship } from '../../src/ship/ship';

describe('PositionedShip', () => {
    const ship = new Ship('TestShip', 3);
    let positionedShip: PositionedShip<'A', '1' | '2' | '3'>;

    beforeEach(
        () => positionedShip = new PositionedShip(
            ship,
            OrderedSet([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
                new Coordinate('A', '3'),
            ]),
        ),
    );

    it('instantiation', () => {
        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, false, false]);
    });

    it('can be hit', () => {
        positionedShip.markAsHit(new Coordinate('A', '2'));

        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, false]);
    });

    it('can be hit twice on the same spot', () => {
        positionedShip.markAsHit(new Coordinate('A', '2'));
        positionedShip.markAsHit(new Coordinate('A', '2'));

        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, false]);
    });

    it('becomes sank as soon as all its coordinates have been hit', () => {
        // Sanity check
        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, false, false]);

        positionedShip.markAsHit(new Coordinate('A', '2'));

        // Sanity check
        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, false]);

        positionedShip.markAsHit(new Coordinate('A', '3'));

        // Sanity check
        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, true]);

        positionedShip.markAsHit(new Coordinate('A', '1'));

        expect(positionedShip.isSunk()).to.equal(true);
        expect(positionedShip.getHits().toArray()).to.eqls([true, true, true]);
    });

    it('cannot be hit if the coordinate is unknown', () => {
        const smallPositionedShip: PositionedShip<'A', '1' | '2' | '3'> = new PositionedShip(
            new Ship('TestSmallShip', 2),
            OrderedSet([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
            ]),
        );

        const hit = () => smallPositionedShip.markAsHit(new Coordinate('A', '3'));

        expect(hit).to.throw('Unknown coordinate "A3". Expected one of "A1", "A2".');
    });
});
