import { expect } from 'chai';
import { just, nothing } from '../../src/utils/optional';

describe('Optional', () => {
    const value = 'foo';

    describe('instantiation', () => {
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
    });

    describe('::filter()', () => {
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

    describe('::map()', () => {
        it('can map value', () => {
            const optional = just(value);
            const map = (_value: string) => 10;

            const mappedOptional = optional.map(map);

            expect(mappedOptional.isPresent()).to.equal(true);
            expect(mappedOptional.getValue()).to.equal(10);
            expect(optional.getValue()).to.equal(value);
        });

        it('can map on nothing', () => {
            const optional = nothing();
            const map = (_value: any) => 10;

            const mappedOptional = optional.map(map);

            expect(mappedOptional.isPresent()).to.equal(false);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('::ifPresent()', () => {
        it('can execute a side-effect', () => {
            let i = 0;

            const optional = just(value);
            const sideEffect = (_value: string) => i = _value.length;

            optional.ifPresent(sideEffect);

            expect(i).to.equal(3);
            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue()).to.equal(value);
        });

        it('can execute a side-effect on nothing', () => {
            let i = 0;

            const optional = nothing();
            const sideEffect = (_value: any) => i = 10;

            optional.ifPresent(sideEffect);

            expect(i).to.equal(0);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('::orElse()', () => {
        it('can take a value with default with value present', () => {
            const optional = just(value);

            const innerValue = optional.orElse(10);

            expect(innerValue).to.equal(value);
            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue()).to.equal(value);
        });

        it('can take a value with default with value missing', () => {
            const optional = nothing();

            const innerValue = optional.orElse(10);

            expect(innerValue).to.equal(10);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('inner optional', () => {
        it('can take another optional value', () => {
            const optional = just(just(value));

            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue().getValue()).to.equal(value);
        });

        it('can take another nothing value', () => {
            const optional = just(nothing());

            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue().isPresent()).to.equal(false);
        });
    });

    describe('::orElseThrow()', () => {
        it('does not throw if there is a value', () => {
            const optional = just(value);
            const error = new Error();

            const elseThrow = () => optional.orElseThrow(error);

            expect(elseThrow).to.not.throw;
        });

        it('throws if there is no value', () => {
            const optional = nothing();
            const error = new Error();

            // TODO: get value
            const elseThrow = () => optional.orElseThrow(error);

            expect(elseThrow).to.throw(error);
        });
    });
});
