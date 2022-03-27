import { expect } from 'chai';
import { OrderedSet } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { PositionedShip } from '../../src/ship/positioned-ship';
import { Ship } from '../../src/ship/ship';

class ShipToStringSet {
    constructor(
        readonly title: string,
        readonly ship: PositionedShip<'A', '1' | '2' | '3'>,
        readonly expected: string,
    ) {
    }
}

function* shipToStringProvider(): Generator<ShipToStringSet> {
    yield new ShipToStringSet(
        'intact ship',
        new PositionedShip(
            new Ship('IntactShip', 2),
            OrderedSet([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
            ]),

        ),
        'IntactShip:(A1, A2)=(0, 0)',
    );

    yield new ShipToStringSet(
        'damaged ship',
        (() => {
            const ship = new PositionedShip(
                new Ship('DamagedShip', 2),
                OrderedSet([
                    new Coordinate('A', '1'),
                    new Coordinate('A', '2'),
                ]),
            );

            ship.markAsHit(new Coordinate('A', '1'));

            return ship;
        })(),
        'DamagedShip:(A1, A2)=(1, 0)',
    );

    yield new ShipToStringSet(
        'sunk ship',
        (() => {
            const coordinates = [
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
            ];

            const ship = new PositionedShip(
                new Ship('SunkShip', 2),
                OrderedSet(coordinates),
            );

            coordinates.forEach((coordinate) => ship.markAsHit(coordinate));

            return ship;
        })(),
        'SunkShip:(A1, A2)=(1, 1)',
    );
}

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
        expect(positionedShip.isHit(new Coordinate('A', '1'))).to.equal(false);
        expect(positionedShip.isHit(new Coordinate('A', '2'))).to.equal(true);
        expect(positionedShip.isHit(new Coordinate('A', '3'))).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, false]);
    });

    it('can be hit twice on the same spot', () => {
        positionedShip.markAsHit(new Coordinate('A', '2'));
        positionedShip.markAsHit(new Coordinate('A', '2'));

        expect(positionedShip.isSunk()).to.equal(false);
        expect(positionedShip.isHit(new Coordinate('A', '1'))).to.equal(false);
        expect(positionedShip.isHit(new Coordinate('A', '2'))).to.equal(true);
        expect(positionedShip.isHit(new Coordinate('A', '3'))).to.equal(false);
        expect(positionedShip.getHits().toArray()).to.eqls([false, true, false]);
    });

    it('becomes sank as soon as all its sortedCoordinates have been hit', () => {
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
        expect(positionedShip.isHit(new Coordinate('A', '1'))).to.equal(true);
        expect(positionedShip.isHit(new Coordinate('A', '2'))).to.equal(true);
        expect(positionedShip.isHit(new Coordinate('A', '3'))).to.equal(true);
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

    it('cannot check if hit if the coordinate is unknown', () => {
        const smallPositionedShip: PositionedShip<'A', '1' | '2' | '3'> = new PositionedShip(
            new Ship('TestSmallShip', 2),
            OrderedSet([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
            ]),
        );

        const hit = () => smallPositionedShip.isHit(new Coordinate('A', '3'));

        expect(hit).to.throw('Unknown coordinate "A3". Expected one of "A1", "A2".');
    });

    for(const { title, ship: toStringShip, expected } of shipToStringProvider()) {
        it(`can be cast to string: ${title}`, () => {
            expect(toStringShip.toString()).to.equal(expected);
        });
    }
});
