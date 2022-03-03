import { expect } from 'chai';
import { hasOwnProperty } from '../../src/utils/has-own-property';

const NoSuchProperty = Symbol('NoSuchProperty');

function accessProperty(value: object, propertyName: string): unknown | typeof NoSuchProperty {
    if (hasOwnProperty(value, propertyName)) {
        return value[propertyName];
    }

    return NoSuchProperty;
}

describe('hasOwnProperty', () => {
    it('allows to access a property in a type-safe manner', () => {
        const value = {
            foo: 'bar',
        };

        const foo = accessProperty(value, 'foo');
        const noProp = accessProperty(value, 'unknownProp');

        expect(foo).to.equal('bar');
        expect(noProp).to.equal(NoSuchProperty);
    });
});
