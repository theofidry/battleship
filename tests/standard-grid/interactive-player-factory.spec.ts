import { expect } from 'chai';
import { Coordinate } from '../../src/grid/coordinate';
import { parseCoordinate } from '../../src/standard-grid/interactive-player-factory';
import { StdColumnIndex } from '../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../src/standard-grid/std-coordinate';
import { StdRowIndex } from '../../src/standard-grid/std-row-index';
import { expectError } from '../chai-assertions';

class ValidCoordinateSet {
    constructor(
        readonly title: string,
        readonly rawCoordinate: string,
        readonly expected: StdCoordinate,
    ) {
    }
}

function* provideValidCoordinates(): Generator<ValidCoordinateSet> {
    yield new ValidCoordinateSet(
        'top-left cell',
        'A1',
        new Coordinate(StdColumnIndex.A, StdRowIndex.Row1),
    );

    yield new ValidCoordinateSet(
        'bottom-right cell',
        'J10',
        new Coordinate(StdColumnIndex.J, StdRowIndex.Row10),
    );
}

class InvalidCoordinateSet {
    constructor(
        readonly title: string,
        readonly rawCoordinate: string,
        readonly expectedErrorMessage: string,
    ) {
    }
}

function* provideInvalidCoordinates(): Generator<InvalidCoordinateSet> {
    yield new InvalidCoordinateSet(
        'unknown column',
        'P1',
        'Could not parse the coordinate "P1". Expected a value following the format CR where C is one of the column "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" and R one of the row "1", "2", "3", "4", "5", "6", "7", "8", "9", "10".',
    );

    yield new InvalidCoordinateSet(
        'unknown row',
        'J0',
        'Could not parse the coordinate "J0". Expected a value following the format CR where C is one of the column "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" and R one of the row "1", "2", "3", "4", "5", "6", "7", "8", "9", "10".',
    );

    yield new InvalidCoordinateSet(
        'unknown coordinate',
        'foo',
        'Could not parse the coordinate "foo". Expected a value following the format CR where C is one of the column "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" and R one of the row "1", "2", "3", "4", "5", "6", "7", "8", "9", "10".',
    );
}

describe('coordinateParser', () => {
    for (const { title, rawCoordinate, expected } of provideValidCoordinates()) {
        it(`can parse coordinates: ${title}`, () => {
            expect(parseCoordinate(rawCoordinate)).to.eqls(expected);
        });
    }

    for (const { title, rawCoordinate, expectedErrorMessage } of provideInvalidCoordinates()) {
        it(`can parse coordinates: ${title}`, () => {
            const parse = () => parseCoordinate(rawCoordinate);

            expectError(
                'InvalidCoordinate',
                expectedErrorMessage,
                parse,
            );
        });
    }
});
