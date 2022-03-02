import { expect } from 'chai';
import { assertIsNatural } from '../../src/assert/assert-is-natural';

describe('assertIsNatural', () => {
    it('narrows the value type on success', () => {
        const value: number | undefined = 10;

        assertIsNatural(value);

        // noinspection UnnecessaryLocalVariableJS
        const numberValue: number = value;

        expect(numberValue).to.equal(value);
    });

    it('throws upon failure', () => {
        const value: number | undefined = undefined;

        const assert = () => assertIsNatural(value);

        expect(assert).to.throw('false == true');
    });

    it('throws with a custom message upon failure', () => {
        const value: number | undefined = undefined;

        const assert = () => assertIsNatural(value, 'foo');

        expect(assert).to.throw('foo');
    });

    it('accepts 0', () => {
        const assert = () => assertIsNatural(0);

        expect(assert).to.not.throw;
    });

    it('does not accept negative integers', () => {
        const assert = () => assertIsNatural(-10);

        expect(assert).to.throw('false == true');
    });

    it('does not accept float values', () => {
        const assert = () => assertIsNatural(10.2);

        expect(assert).to.throw('false == true');
    });
});
