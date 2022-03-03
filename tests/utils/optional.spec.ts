import { expect } from 'chai';
import { just, nothing } from '../../src/utils/optional';

describe('Optional', () => {
    const value = 'foo';

    it('can take a value', () => {
        const optional = just(value);

        expect(optional.isPresent()).to.equal(true);
        expect(optional.getValue()).to.equal(value);
    });

    it('can create an optional which does not contain any value', () => {
        const optional = nothing();

        const getValue = () => optional.getValue();

        expect(optional.isPresent()).to.equal(false);
        expect(getValue).to.throw('No value found.');
    });

    it('can filter values (value NOT filtered out)', () => {
        const optional = just(value);
        const filter = (_value: unknown) => 'string' === typeof value;

        const filteredOptional = optional.filter(filter);

        expect(filteredOptional.isPresent()).to.equal(true);
        expect(filteredOptional.getValue()).to.equal(value);
        expect(optional.getValue()).to.equal(value);
    });

    it('can filter values (value filtered out)', () => {
        const optional = just(value);
        const filter = (_value: unknown) => 'number' === typeof value;

        const filteredOptional = optional.filter(filter);

        expect(filteredOptional.isPresent()).to.equal(false);
        expect(optional.getValue()).to.equal(value);
    });

    it('can filter on nothing', () => {
        const optional = nothing();
        const filter = (_value: unknown) => 'number' === typeof value;

        const filteredOptional = optional.filter(filter);

        expect(filteredOptional.isPresent()).to.equal(false);
        expect(optional.isPresent()).to.equal(false);
    });
});
