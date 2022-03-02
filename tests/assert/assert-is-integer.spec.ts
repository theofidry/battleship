import { expect } from 'chai';
import { assertIsInteger } from '../../src/assert/assert-is-integer';

describe('assertIsInteger', () => {
    it('narrows the value type on success', () => {
        const value: number | undefined = 10;

        assertIsInteger(value);

        // noinspection UnnecessaryLocalVariableJS
        const numberValue: number = value;

        expect(numberValue).to.equal(value);
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

    it('does not accept float values', () => {
        const assert = () => assertIsInteger(10.2);

        expect(assert).to.throw('false == true');
    });
});
