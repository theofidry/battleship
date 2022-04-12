import { expect } from 'chai';
import { List } from 'immutable';
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
    TestColumnIndex, testCoordinateNavigator, TestRowIndex,
} from '../../grid/test-coordinates';

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

describe('OpponentShip', () => {
    it('can be instantiated', () => {
        const ship: Ship<TestColumnIndex, TestRowIndex> = createOpponentShip<TestColumnIndex, TestRowIndex>(
            new ShipModel('Battleship', 4),
        );

        expect(ship.status).to.equal(OpponentShipStatus.NOT_FOUND);
        expect(ship.alignment).to.equal(undefined);
        expect(ship.toString()).to.equal('Battleship(NOT_FOUND,undefined)');

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

        expect(unverifiedSunkShip.status).to.equal(OpponentShipStatus.UNVERIFIED_SUNK);
        expect(unverifiedSunkShip.alignment).to.equal(alignment);
        expect(unverifiedSunkShip.toString()).to.equal('Battleship(UNVERIFIED_SUNK,HORIZONTAL:(A2,B2,C2,D2))');

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
        expect(sunkShip.toString()).to.equal('Battleship(SUNK,HORIZONTAL:(A2,B2,C2,D2))');

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
        expect(notFoundShip.toString()).to.equal('Battleship(NOT_FOUND,undefined)');

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
        expect(sunkShip.toString()).to.equal('Battleship(SUNK,HORIZONTAL:(A2,B2,C2,D2))');

        expect(isNotFoundShip(sunkShip)).to.equal(false);
        expect(isUnverifiedSunkShip(sunkShip)).to.equal(false);
        expect(isSunkShip(sunkShip)).to.equal(true);
    });
});
