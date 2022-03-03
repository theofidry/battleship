import { isNonNullObject } from '../assert/assert-is-non-null-object';
import { hasOwnProperty } from './has-own-property';
import assert = require('node:assert');

// In order to get all the nice type safety of type guards when switching on a
// union type, that union type needs to have a "discriminant property", which
// has a concrete and unique value defined for each of its composite types.
const JustTypeDiscriminant = Symbol('just_type');
const NothingTypeDiscriminant = Symbol('nothing_type');

type Just<T> = {
    type: typeof JustTypeDiscriminant,
    value: T,
};

function isJust<T>(value: unknown): value is Just<T> {
    return isNonNullObject(value)
        && hasOwnProperty(value, 'type')
        && JustTypeDiscriminant === value['type'];
}

function assertIsJust<T>(value: unknown, message?: string): asserts value is Just<T> {
    assert(isJust(value), message);
}

function justObject<T>(value: T): Just<T> {
    return {
        type: JustTypeDiscriminant,
        value,
    };
}

type Nothing = {
    type: typeof NothingTypeDiscriminant,
};

function nothingObject(): Nothing {
    return {
        type: NothingTypeDiscriminant,
    };
}

function isNothing(value: unknown): value is Nothing {
    return isNonNullObject(value)
        && hasOwnProperty(value, 'type')
        && NothingTypeDiscriminant === value['type'];
}

type Maybe<T> = Just<T> | Nothing;

export class Optional<R, T = Nothing | R> {
    constructor(private maybeValue: Maybe<R>) {
    }

    isPresent(): boolean {
        return isJust(this.maybeValue);
    }

    ifPresent(consumer: (v: R)=> unknown): void {
        if (isJust(this.maybeValue)) {
            consumer(this.maybeValue.value);
        }
    }

    filter(filter: (v: R)=> boolean): Optional<R> {
        return this.isPresent() && filter(this.getValue())
            ? this
            : new Optional(nothingObject());
    }

    map<U>(mapper: (v: R)=> U): Optional<Nothing | U> {
        return new Optional(
            this.isPresent()
                ? justObject(mapper(this.getValue()))
                : nothingObject(),
        );
    }

    orElse<U>(defaultValue: U): R | U {
        return this.isPresent()
            ? this.getValue()
            : defaultValue;
    }

    getValue(): R {
        assertIsJust(this.maybeValue, 'No value found.');

        return this.maybeValue.value;
    }
}

export function just<T>(value: T): Optional<T> {
    return new Optional(justObject(value));
}

export function nothing(): Optional<Nothing> {
    return new Optional(nothingObject());
}
