import { expect } from 'chai';
import { Either } from '../../src/utils/either';
import { expectError } from '../chai-assertions';

type ChaiAssert<T> = (value: T, message?: string)=> void;

export function rightValue<L, R>(
    either: Either<L, R>,
    assert: ChaiAssert<R>,
): void {
    either.fold(
        (left) => expect.fail(left, 'Did not expect to be called.'),
        (right) => assert(right),
    );
}

export function leftValue<L, R>(either: Either<L, R>, assert: ChaiAssert<L>): void {
    either.fold(
        (left) => assert(left),
        (right) => expect.fail(right, 'Did not expect to be called.'),
    );
}

export function expectLeftValueError<L extends Error, R>(
    expectedErrorName: string,
    expectedErrorMessage: string,
    either: Either<L, R>,
): void {
    leftValue(
        either,
        (error) => expectError(
            expectedErrorName,
            expectedErrorMessage,
            () => {
                throw error;
            },
        ),
    );
}
