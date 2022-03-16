// In order to get all the nice type safety of type guards when switching on a
// union type, that union type needs to have a "discriminant property", which
// has a concrete and unique value defined for each of its composite types.
import { isNonNullObject } from '../assert/assert-is-non-null-object';
import { hasOwnProperty } from './has-own-property';
import { just, nothing, Optional } from './optional';

const LeftTypeDiscriminant = Symbol('left_type');
const RightTypeDiscriminant = Symbol('right_type');

type Left<L> = {
    readonly type: typeof LeftTypeDiscriminant;
    readonly value: L;
};

function isLeft<T>(value: unknown): value is Left<T> {
    return isNonNullObject(value)
        && hasOwnProperty(value, 'type')
        && LeftTypeDiscriminant === value['type'];
}

function leftObject<T>(value: T): Left<T> {
    return {
        type: LeftTypeDiscriminant,
        value,
    };
}

type Right<R> = {
    readonly type: typeof RightTypeDiscriminant;
    readonly value: R;
};

function isRight<R>(value: unknown): value is Right<R> {
    return isNonNullObject(value)
        && hasOwnProperty(value, 'type')
        && RightTypeDiscriminant === value['type'];
}

function rightObject<R>(value: R): Right<R> {
    return {
        type: RightTypeDiscriminant,
        value,
    };
}

/**
 * Either represents a value of two possible types and is right biased.
 */
export class Either<L, R> {
    private constructor(
        private readonly value: Left<L> | Right<R>,
    ) {}

    fold<T>(
        onLeft: (left: L)=> T,
        onRight: (right: R)=> T,
    ): T {
        const sidedValue = this.value;

        return isLeft(sidedValue)
            ? onLeft(sidedValue.value)
            : onRight(sidedValue.value);
    }

    map<T>(mapper: (right: R)=> T): Either<L, T> {
        return this.flatMap(
            (_right) => Either.right(mapper(_right)),
        );
    }

    mapBoth<U, V>(
        leftMapper: (left: L)=> U,
        rightMapper: (right: R)=> V,
    ): Either<U, V> {
        return this
            .swap()
            .map(leftMapper)
            .swap()
            .map(rightMapper);
    }

    flatMap<T>(mapper: (right: R)=> Either<L, T>): Either<L, T> {
        return this.fold(
            (leftValue) => Either.left(leftValue),
            (rightValue) => mapper(rightValue),
        );
    }

    swap(): Either<R, L> {
        return this.fold(
            (leftValue) => Either.right(leftValue),
            (rightValue) => Either.left(rightValue),
        );
    }

    getOrElse(defaultValue: R): R {
        return this.fold(
            () => defaultValue,
            (value) => value,
        );
    }

    getOrThrow(error: Error): R {
        const throwError = () => {
            throw error;
        };

        return this.fold(
            () => throwError(),
            (rightValue) => rightValue,
        );
    }
    
    toOptional(): Optional<R> {
        return this.fold(
            () => nothing(),
            (rightValue) => just(rightValue),
        );
    }

    static left<L, R>(value: L): Either<L, R> {
        return new Either<L, R>(leftObject(value));
    }

    static right<L, R>(value: R): Either<L, R> {
        return new Either<L, R>(rightObject(value));
    }
}
