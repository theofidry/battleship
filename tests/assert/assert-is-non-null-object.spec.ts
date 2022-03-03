import { expect } from 'chai';
import { assertIsNonNullObject } from '../../src/assert/assert-is-non-null-object';

describe('assertIsNonNullObject', () => {
    it('narrows the value type on success', () => {
        const value: object | null = {};

        assertIsNonNullObject(value);

        // noinspection UnnecessaryLocalVariableJS
        const objectValue: object = value;

        expect(objectValue).to.equal(value);
    });

    it('throws upon failure', () => {
        const value: object | null = null;

        const assert = () => assertIsNonNullObject(value);

        expect(assert).to.throw('false == true');
    });

    it('throws with a custom message upon failure', () => {
        const value: object | null = null;

        const assert = () => assertIsNonNullObject(value);

        expect(assert).to.throw('foo');
    });

    it('does not accept undefined', () => {
        const assert = () => assertIsNonNullObject(undefined);

        expect(assert).to.throw('false == true');
    });
});
