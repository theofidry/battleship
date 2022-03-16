import { expect } from 'chai';
import { Either } from '../../src/utils/either';
import { just, nothing } from '../../src/utils/optional';

describe('Either', () => {
    it('::fold() flattens the value', () => {
        const eitherLeft: Either<string, number> = Either.left('foo');
        const eitherRight: Either<string, number> = Either.right(10);

        const fold = (either: Either<string, number>) => either.fold(
            (value: string) => value.toUpperCase(),
            (value: number) => String(-value),
        );

        expect(fold(eitherLeft)).to.equal('FOO');
        expect(fold(eitherRight)).to.equal('-10');
    });

    it('::map() maps the right value and leave the left unchanged', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        const mapper = (value: number) => value * 2;

        expect(eitherLeft.map(mapper)).to.eqls(eitherLeft);
        expect(eitherRight.map(mapper)).to.eqls(Either.right(14));
    });

    it('::mapBoth() maps the right and left value', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        const leftMapper = (value: number) => value * 2;
        const rightMapper = (value: number) => value * 3;

        expect(eitherLeft.mapBoth(leftMapper, rightMapper)).to.eqls(Either.left(6));
        expect(eitherRight.map(leftMapper, rightMapper)).to.eqls(Either.right(21));
    });

    it('::flatMap() maps the right value and leave the left unchanged', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        const mapper = (value: number): Either<number, number> => Either.right(value * 2);

        expect(eitherLeft.flatMap(mapper)).to.eqls(eitherLeft);
        expect(eitherRight.flatMap(mapper)).to.eqls(Either.right(14));
    });

    it('::swap() makes a left into a right and a right into a left', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        expect(eitherLeft.swap()).to.eqls(Either.right(3));
        expect(eitherRight.swap()).to.eqls(Either.left(7));
    });

    it('::toOptional() returns an optional of the right value', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        expect(eitherLeft.toOptional()).to.eqls(nothing());
        expect(eitherRight.toOptional()).to.eqls(just(7));
    });

    it('::getOrElse() gets the right value otherwise picks the default value (for the left)', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        expect(eitherLeft.getOrElse(-1)).to.equal(-1);
        expect(eitherRight.getOrElse(-1)).to.equal(7);
    });

    it('::getOrThrow() gets the right value otherwise throw the error (for the left)', () => {
        const eitherLeft: Either<number, number> = Either.left(3);
        const eitherRight: Either<number, number> = Either.right(7);

        const error = new Error('foo');

        expect(() => eitherLeft.getOrThrow(error)).to.throw(error);
        expect(eitherRight.getOrThrow(error)).to.equal(7);
    });
});
