import { expect } from 'chai';
import { isValueObject, List } from 'immutable';
import { cloneDeep } from 'lodash';
import { Coordinate } from '../../../src/grid/coordinate';
import { completeAlignment } from '../../../src/grid/coordinate-alignment';
import {
    createOpponentShip, isNotFoundShip, isSunkShip, isUnverifiedSunkShip, NotFoundShip,
    OpponentShipStatus, Ship, SunkShip, UnverifiedSunkShip,
} from '../../../src/player/ai/opponent-ship';
import { Ship as ShipModel } from '../../../src/ship/ship';
import { ShipDirection } from '../../../src/ship/ship-direction';
import {
    TestColumnIndex, TestCoordinate, testCoordinateNavigator, TestRowIndex,
} from '../../grid/test-coordinates';

type TestShip = Ship<TestColumnIndex, TestRowIndex>;

const alignment = completeAlignment(
    {
        direction: ShipDirection.HORIZONTAL,
        coordinates: List([
            new Coordinate('A', '2'),
            new Coordinate('B', '2'),
            new Coordinate('C', '2'),
            new Coordinate('D', '2'),
        ]),
    },
    testCoordinateNavigator,
);
const anotherAlignment = completeAlignment(
    {
        direction: ShipDirection.HORIZONTAL,
        coordinates: List([
            new Coordinate('A', '3'),
            new Coordinate('B', '3'),
            new Coordinate('C', '3'),
            new Coordinate('D', '3'),
        ]),
    },
    testCoordinateNavigator,
);

class EqualitySet {
    constructor(
        readonly title: string,
        readonly left: TestShip,
        readonly right: TestShip,
        readonly expected: boolean,
    ) {
    }
}

function* provideEqualitySets(): Generator<EqualitySet> {
    const ship = createOpponentShip<TestColumnIndex, TestRowIndex>(
        new ShipModel('Destroyer', 4),
    );

    yield new EqualitySet(
        'same object',
        ship,
        ship,
        true,
    );

    yield new EqualitySet(
        'same ship but different references',
        ship,
        createOpponentShip(
            new ShipModel('Destroyer', 4),
        ),
        true,
    );

    yield new EqualitySet(
        'same ship but different references & with alignment',
        ship.markAsUnverifiedSunk(alignment),
        createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Destroyer', 4),
        ).markAsUnverifiedSunk(alignment),
        true,
    );

    yield new EqualitySet(
        'different name',
        ship,
        createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Submarine', 4),
        ),
        false,
    );

    yield new EqualitySet(
        'different size',
        ship,
        createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Destroyer', 5),
        ),
        false,
    );

    yield new EqualitySet(
        'different status',
        ship.markAsUnverifiedSunk(alignment),
        createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Submarine', 4),
        ).markAsSunk(alignment),
        false,
    );

    yield new EqualitySet(
        'same status different alignment',
        ship.markAsUnverifiedSunk(alignment),
        createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Submarine', 4),
        ).markAsUnverifiedSunk(anotherAlignment),
        false,
    );
}

describe('OpponentShip', () => {
    it('can be instantiated', () => {
        const ship: TestShip = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        );

        expect(ship.status).to.equal(OpponentShipStatus.NOT_FOUND);
        expect(ship.alignment).to.equal(undefined);
        expect(ship.toString()).to.equal('Battleship(4,NOT_FOUND,undefined)');

        expect(isNotFoundShip(ship)).to.equal(true);
        expect(isUnverifiedSunkShip(ship)).to.equal(false);
        expect(isSunkShip(ship)).to.equal(false);
    });

    it('can transition from not found -> unverified sunk', () => {
        const notFoundShip: NotFoundShip<TestColumnIndex, TestRowIndex> = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        );
        const original = cloneDeep(notFoundShip);

        const unverifiedSunkShip: UnverifiedSunkShip<TestColumnIndex, TestRowIndex> = notFoundShip.markAsUnverifiedSunk(alignment);

        expect(notFoundShip).to.eqls(original);

        expect(unverifiedSunkShip.status).to.equal(OpponentShipStatus.NON_VERIFIED_SUNK);
        expect(unverifiedSunkShip.alignment).to.equal(alignment);
        expect(unverifiedSunkShip.toString()).to.equal('Battleship(4,NON_VERIFIED_SUNK,HORIZONTAL:(A2,B2,C2,D2))');

        expect(isNotFoundShip(unverifiedSunkShip)).to.equal(false);
        expect(isUnverifiedSunkShip(unverifiedSunkShip)).to.equal(true);
        expect(isSunkShip(unverifiedSunkShip)).to.equal(false);
    });

    it('can transition from not found -> sunk', () => {
        const notFoundShip: NotFoundShip<TestColumnIndex, TestRowIndex> = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        );
        const original = cloneDeep(notFoundShip);

        const sunkShip: SunkShip<TestColumnIndex, TestRowIndex> = notFoundShip.markAsSunk(alignment);

        expect(notFoundShip).to.eqls(original);

        expect(sunkShip.status).to.equal(OpponentShipStatus.SUNK);
        expect(sunkShip.alignment).to.equal(alignment);
        expect(sunkShip.toString()).to.equal('Battleship(4,SUNK,HORIZONTAL:(A2,B2,C2,D2))');

        expect(isNotFoundShip(sunkShip)).to.equal(false);
        expect(isUnverifiedSunkShip(sunkShip)).to.equal(false);
        expect(isSunkShip(sunkShip)).to.equal(true);
    });

    it('can transition from unverified sunk -> not found', () => {
        const unverifiedSunkShip: UnverifiedSunkShip<TestColumnIndex, TestRowIndex> = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        ).markAsUnverifiedSunk(anotherAlignment);
        const original = cloneDeep(unverifiedSunkShip);

        const notFoundShip: NotFoundShip<TestColumnIndex, TestRowIndex> = unverifiedSunkShip.markAsNotFound();

        expect(unverifiedSunkShip).to.eqls(original);

        expect(notFoundShip.status).to.equal(OpponentShipStatus.NOT_FOUND);
        expect(notFoundShip.alignment).to.equal(undefined);
        expect(notFoundShip.toString()).to.equal('Battleship(4,NOT_FOUND,undefined)');

        expect(isNotFoundShip(notFoundShip)).to.equal(true);
        expect(isUnverifiedSunkShip(notFoundShip)).to.equal(false);
        expect(isSunkShip(notFoundShip)).to.equal(false);
    });

    it('can transition from unverified sunk -> sunk', () => {
        const unverifiedSunkShip: UnverifiedSunkShip<TestColumnIndex, TestRowIndex> = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        ).markAsUnverifiedSunk(anotherAlignment);
        const original = cloneDeep(unverifiedSunkShip);

        const sunkShip: SunkShip<TestColumnIndex, TestRowIndex> = unverifiedSunkShip.markAsSunk(alignment);

        expect(unverifiedSunkShip).to.eqls(original);

        expect(sunkShip.status).to.equal(OpponentShipStatus.SUNK);
        expect(sunkShip.alignment).to.equal(alignment);
        expect(sunkShip.toString()).to.equal('Battleship(4,SUNK,HORIZONTAL:(A2,B2,C2,D2))');

        expect(isNotFoundShip(sunkShip)).to.equal(false);
        expect(isUnverifiedSunkShip(sunkShip)).to.equal(false);
        expect(isSunkShip(sunkShip)).to.equal(true);
    });

    // This allows Immutable JS to correctly detect duplicates
    it('is an Immutable value object', () => {
        const ship: TestShip = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        );

        expect(isValueObject(ship)).to.equal(true);
    });

    for (const { title, left, right, expected } of provideEqualitySets()) {
        it(title, () => {
            expect(left.equals(right)).to.equal(expected);

            if (expected) {
                expect(left.hashCode()).to.equal(right.hashCode());
            } else {
                expect(left.hashCode()).to.not.equal(right.hashCode());
            }
        });
    }
});
