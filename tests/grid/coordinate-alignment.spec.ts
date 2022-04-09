import { expect } from 'chai';
import { isValueObject, List } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateAlignment } from '../../src/grid/coordinate-alignment';
import { ShipDirection } from '../../src/ship/ship-direction';
import { TestCoordinate, TestCoordinateAlignment } from './test-coordinates';

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

class NextExtremumRemoval {
    constructor(
        readonly title: string,
        readonly alignment: TestCoordinateAlignment,
        readonly extremum: TestCoordinate,
        readonly expected: TestCoordinateAlignment,
    ) {
    }
}

function* provideNextExtremumRemoval(): Generator<NextExtremumRemoval> {
    yield new NextExtremumRemoval(
        'no extremum',
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
        new Coordinate('A', '4'),
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
    );

    yield new NextExtremumRemoval(
        'remove next head',
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('D', '4'),
        ),
        new Coordinate('B', '4'),
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            new Coordinate('D', '4'),
        ),
    );

    yield new NextExtremumRemoval(
        'remove next tail',
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('D', '4'),
        ),
        new Coordinate('C', '4'),
        new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            undefined,
        ),
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

    it('describes its head & tail', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(alignment.head.toString()).to.equal('A4');
        expect(alignment.tail.toString()).to.equal('C4');
    });

    for (const { title, alignment, extremum, expected } of provideNextExtremumRemoval()) {
        it(`can remove an extremum: ${title}`, () => {
            const original = alignment.toString();

            const actual = alignment.removeNextExtremum(extremum);

            expect(actual).to.eqls(expected);
            expect(alignment.toString()).to.equal(original);
        });
    }
});
