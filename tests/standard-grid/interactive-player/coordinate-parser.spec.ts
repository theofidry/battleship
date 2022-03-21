import { expect } from 'chai';
import { Coordinate } from '../../../src/grid/coordinate';
import { parseCoordinate } from '../../../src/standard-grid/interactive-player/coordinate-parser';
import { StdColumnIndex } from '../../../src/standard-grid/std-column-index';
import { StdCoordinate } from '../../../src/standard-grid/std-coordinate';
import { StdRowIndex } from '../../../src/standard-grid/std-row-index';
import { expectError } from '../../chai-assertions';

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
        'unknown column (one letter)',
        'P1',
        'Could not parse the coordinate "P1". Expected column to be one of "A", "B", "C", "D", "E", "F", "G", "H", "I", "J". Got "P".',
    );
    yield new InvalidCoordinateSet(
        'unknown column (two letters)',
        'PP1',
        'Could not parse the coordinate "PP1". Expected column to be one of "A", "B", "C", "D", "E", "F", "G", "H", "I", "J". Got "PP".',
    );

    yield new InvalidCoordinateSet(
        'unknown row (lower)',
        'J0',
        'Could not parse the coordinate "J0". Expected row to be one of "1", "2", "3", "4", "5", "6", "7", "8", "9", "10". Got "0".',
    );

    yield new InvalidCoordinateSet(
        'unknown row (higher)',
        'J11',
        'Could not parse the coordinate "J11". Expected row to be one of "1", "2", "3", "4", "5", "6", "7", "8", "9", "10". Got "11".',
    );

    yield new InvalidCoordinateSet(
        'unknown coordinate',
        'foo',
        'Could not parse the coordinate "foo". Expected a value following the format CR where C is one of the column "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" and R one of the row "1", "2", "3", "4", "5", "6", "7", "8", "9", "10".',
    );
}

describe('coordinateParser', () => {
    const unexpectedError = new Error('unexpected error');

    for (const { title, rawCoordinate, expected } of provideValidCoordinates()) {
        it(`can parse coordinates: ${title}`, () => {
            const actual = parseCoordinate(rawCoordinate).getOrThrow(unexpectedError);

            expect(actual).to.eqls(expected);
        });
    }

    for (const { title, rawCoordinate, expectedErrorMessage } of provideInvalidCoordinates()) {
        it(`can parse coordinates: ${title}`, () => {
            const parse = () => {
                const error = parseCoordinate(rawCoordinate).swap().getOrThrow(unexpectedError);

                throw error;
            };

            expectError(
                'InvalidCoordinate',
                expectedErrorMessage,
                parse,
            );
        });
    }
});
