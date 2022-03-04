import { expect } from 'chai';
import { assertIsNotUndefined } from '../../src/assert/assert-is-not-undefined';

describe('assertIsNotUndefined', () => {
    it('narrows the value type on success', () => {
        const value: string | undefined = 'foo';

        assertIsNotUndefined(value);

        // noinspection UnnecessaryLocalVariableJS
        const stringValue: string = value;

        expect(stringValue).to.equal('foo');
    });

    it('throws upon failure', () => {
        const value: string | undefined = undefined;

        const assert = () => assertIsNotUndefined(value);

        expect(assert).to.throw('false == true');
    });

    it('throws with a custom message upon failure', () => {
        const value: string | undefined = undefined;

        const assert = () => assertIsNotUndefined(value, 'foo');

        expect(assert).to.throw('foo');
    });

    it('throws with a custom error upon failure', () => {
        const value: string | undefined = undefined;
        const error = new Error('foo');

        const assert = () => assertIsNotUndefined(value, error);

        expect(assert).to.throw(error);
    });
});
