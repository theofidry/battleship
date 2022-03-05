import { expect } from 'chai';
import { assertIsInteger } from '../../src/assert/assert-is-integer';

class InvalidIntegerSet {
    constructor(
        readonly title: string,
        readonly value: number,
    ) {
    }
}

describe('assertIsInteger', () => {
    it('narrows the value type on success', () => {
        const value: number | undefined = 10;

        assertIsInteger(value);

        // noinspection UnnecessaryLocalVariableJS
        const numberValue: number = value;

        expect(numberValue).to.equal(value);
    });

    it('accepts round floats', () => {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        const assert = () => assertIsInteger(10.);

        expect(assert).to.not.throw;
    });

    it('accepts min safe integer', () => {
        const assert = () => assertIsInteger(Number.MIN_SAFE_INTEGER);

        expect(assert).to.not.throw;
    });

    it('throws upon failure', () => {
        const value: number | undefined = undefined;

        const assert = () => assertIsInteger(value);

        expect(assert).to.throw('false == true');
    });

    it('throws with a custom message upon failure', () => {
        const value: number | undefined = undefined;

        const assert = () => assertIsInteger(value, 'foo');

        expect(assert).to.throw('foo');
    });

    it('throws with a custom error upon failure', () => {
        const value: number | undefined = undefined;
        const error = new Error('foo');

        const assert = () => assertIsInteger(value, error);

        expect(assert).to.throw(error);
    });

    for (const { title, value } of provideInvalidInteger()) {
        it(`does not accept invalid integers: ${title}`, () => {
            const assert = () => assertIsInteger(value);

            expect(assert).to.throw('false == true');
        });
    }
});

function* provideInvalidInteger(): Generator<InvalidIntegerSet> {
    yield new InvalidIntegerSet(
        'float value',
        10.2,
    );

    yield new InvalidIntegerSet(
        'infinity',
        Infinity,
    );

    yield new InvalidIntegerSet(
        'NaN',
        NaN,
    );

    yield new InvalidIntegerSet(
        'min number',
        Number.MIN_VALUE,
    );
}
