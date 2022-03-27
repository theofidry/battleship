import { expect } from 'chai';
import { isValueObject, List } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateAlignment } from '../../src/grid/coordinate-alignment';
import { ShipDirection } from '../../src/ship/ship-direction';
import { TestCoordinateAlignment } from './test-coordinates';

class EqualitySet {
    constructor(
        readonly title: string,
        readonly left: TestCoordinateAlignment,
        readonly right: TestCoordinateAlignment,
        readonly expected: boolean,
    ) {
    }
}

function* provideEqualitySets(): Generator<EqualitySet> {
    const alignment = new CoordinateAlignment(
        ShipDirection.HORIZONTAL,
        List([
            new Coordinate('A', '4'),
            new Coordinate('B', '4'),
        ]),
        List([]),
        undefined,
        undefined,
    );

    yield new EqualitySet(
        'same object',
        alignment,
        alignment,
        true,
    );

    yield new EqualitySet(
        'same sortedCoordinates but different references',
        alignment,
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        true,
    );

    yield new EqualitySet(
        'different sortedCoordinates',
        alignment,
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('A', '5'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        false,
    );
}

describe('Coordinate', () => {
    it('can be cast into a string', () => {
        const alignment = new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        const expected = 'HORIZONTAL:(A4,B4)';

        expect(alignment.toString()).to.equal(expected);
    });

    // This allows Immutable JS to correctly detect duplicates
    it('is an Immutable value object', () => {
        const alignment = new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(isValueObject(alignment)).to.equal(true);
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

    it('can tell if it contains a coordinate or not', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(alignment.contains(new Coordinate('A', '4'))).to.equal(true);
        expect(alignment.contains(new Coordinate('D', '4'))).to.equal(false);
    });
});
