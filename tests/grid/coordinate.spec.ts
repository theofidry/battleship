import { expect } from 'chai';
import { isValueObject } from 'immutable';
import { Coordinate } from '../../src/grid/coordinate';
import { TestCoordinate } from './test-coordinates';

class EqualitySet {
    constructor(
        readonly title: string,
        readonly left: TestCoordinate,
        readonly right: TestCoordinate,
        readonly expected: boolean,
    ) {
    }
}

function* provideEqualitySets(): Generator<EqualitySet> {
    const coordinate = new Coordinate('A', '4');

    yield new EqualitySet(
        'same object',
        coordinate,
        coordinate,
        true,
    );

    yield new EqualitySet(
        'same coordinates but different references',
        coordinate,
        new Coordinate('A', '4'),
        true,
    );

    yield new EqualitySet(
        'different coordinates',
        coordinate,
        new Coordinate('A', '5'),
        false,
    );
}

describe('Coordinate', () => {
    it('can be cast into a string', () => {
        const coordinate = new Coordinate('A', 4);
        const expected = 'A4';

        expect(coordinate.toString()).to.equal(expected);
    });

    // This allows Immutable JS to correctly detect duplicates
    it('is an Immutable value object', () => {
        const coordinate = new Coordinate('A', 4);

        expect(isValueObject(coordinate)).to.equal(true);
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
