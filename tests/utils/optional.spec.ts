import { expect } from 'chai';
import { just, nothing, Optional } from '../../src/utils/optional';

describe('Optional', () => {
    const value = 'foo';

    describe('instantiation', () => {
        it('can take a value', () => {
            const optional: Optional<string> = just(value);

            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue()).to.equal(value);
        });

        it('can create an optional which does not contain any value', () => {
            const optional: Optional<string> = nothing();

            const getValue = () => optional.getValue();

            expect(optional.isPresent()).to.equal(false);
            expect(getValue).to.throw('No value found.');
        });
    });

    describe('::filter()', () => {
        it('can filter values (value NOT filtered out)', () => {
            const optional: Optional<string> = just(value);
            const filter = (_value: unknown) => 'string' === typeof _value;

            const filteredOptional: Optional<string> = optional.filter(filter);

            expect(filteredOptional.isPresent()).to.equal(true);
            expect(filteredOptional.getValue()).to.equal(value);
            expect(optional.getValue()).to.equal(value);
        });

        it('can filter values (value filtered out)', () => {
            const optional: Optional<string> = just(value);
            const filter = (_value: unknown) => 'number' === typeof _value;

            const filteredOptional: Optional<string> = optional.filter(filter);

            expect(filteredOptional.isPresent()).to.equal(false);
            expect(optional.getValue()).to.equal(value);
        });

        it('can filter on nothing', () => {
            const optional: Optional<string> = nothing();
            const filter = (_value: unknown) => 'number' === typeof _value;

            const filteredOptional: Optional<string> = optional.filter(filter);

            expect(filteredOptional.isPresent()).to.equal(false);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('::map()', () => {
        it('can map value', () => {
            const optional: Optional<string> = just(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const map = (_value: string) => 10;

            const mappedOptional: Optional<number> = optional.map(map);

            expect(mappedOptional.isPresent()).to.equal(true);
            expect(mappedOptional.getValue()).to.equal(10);
            expect(optional.getValue()).to.equal(value);
        });

        it('can map on nothing', () => {
            const optional: Optional<string> = nothing();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const map = (_value: any) => 10;

            const mappedOptional: Optional<number> = optional.map(map);

            expect(mappedOptional.isPresent()).to.equal(false);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('::ifPresent()', () => {
        it('can execute a side-effect', () => {
            let i = 0;

            const optional: Optional<string> = just(value);
            const sideEffect = (_value: string) => i = _value.length;

            const newOptional: Optional<string> = optional.ifPresent(sideEffect);

            expect(i).to.equal(3);
            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue()).to.equal(value);
            expect(newOptional).to.equal(optional);
        });

        it('can execute a side-effect on nothing', () => {
            let i = 0;

            const optional: Optional<string> = nothing();
            const sideEffect = () => i = 10;

            const newOptional: Optional<string> = optional.ifPresent(sideEffect);

            expect(i).to.equal(0);
            expect(optional.isPresent()).to.equal(false);
            expect(newOptional).to.equal(optional);
        });
    });

    describe('::orElse()', () => {
        it('can take a value with default with value present', () => {
            const optional: Optional<string> = just(value);

            const innerValue: number | string = optional.orElse(10);

            expect(innerValue).to.equal(value);
            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue()).to.equal(value);
        });

        it('can take a value with default with value missing', () => {
            const optional: Optional<string> = nothing();

            const innerValue: number | string = optional.orElse(10);

            expect(innerValue).to.equal(10);
            expect(optional.isPresent()).to.equal(false);
        });
    });

    describe('inner optional', () => {
        it('can take another optional value', () => {
            const optional: Optional<Optional<string>> = just(just(value));

            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue().getValue()).to.equal(value);
        });

        it('can take another nothing value', () => {
            const optional: Optional<Optional<string>> = just(nothing());

            expect(optional.isPresent()).to.equal(true);
            expect(optional.getValue().isPresent()).to.equal(false);
        });
    });

    describe('::orElseThrow()', () => {
        it('does not throw if there is a value', () => {
            const optional: Optional<string> = just(value);
            const error = new Error();

            const elseThrow: string = optional.orElseThrow(error);

            expect(elseThrow).to.not.throw;
        });

        it('throws if there is no value', () => {
            const optional: Optional<string> = nothing();
            const error = new Error();

            const elseThrow: ()=> string = () => optional.orElseThrow(error);

            expect(elseThrow).to.throw(error);
        });
    });
});
