import { assert, ErrorFactory } from '../assert/assert';
import { isNonNullObject } from '../assert/assert-is-non-null-object';
import { hasOwnProperty } from './has-own-property';

// In order to get all the nice type safety of type guards when switching on a
// union type, that union type needs to have a "discriminant property", which
// has a concrete and unique value defined for each of its composite types.
const JustTypeDiscriminant = Symbol('just_type');
const NothingTypeDiscriminant = Symbol('nothing_type');

type Just<T> = {
    readonly type: typeof JustTypeDiscriminant,
    readonly value: T,
};

function isJust<T>(value: unknown): value is Just<T> {
    return isNonNullObject(value)
        && hasOwnProperty(value, 'type')
        && JustTypeDiscriminant === value['type'];
}

function assertIsJust<T>(value: unknown, message?: ErrorFactory | string): asserts value is Just<T> {
    assert(isJust(value), message);
}

function justObject<T>(value: T): Just<T> {
    return {
        type: JustTypeDiscriminant,
        value,
    };
}

type Nothing = {
    readonly type: typeof NothingTypeDiscriminant,
};

function nothingObject(): Nothing {
    return {
        type: NothingTypeDiscriminant,
    };
}

type Maybe<T> = Just<T> | Nothing;

export class Optional<T> {
    constructor(private maybeValue: Maybe<T>) {
    }

    isPresent(): boolean {
        return isJust(this.maybeValue);
    }

    ifPresent(consumer: (v: T)=> unknown): Optional<T> {
        if (isJust(this.maybeValue)) {
            consumer(this.maybeValue.value);
        }

        return this;
    }

    filter(filter: (v: T)=> boolean): Optional<T> {
        return this.isPresent() && filter(this.getValue())
            ? this
            : new Optional(nothingObject());
    }

    map<U>(mapper: (v: T)=> U): Optional<U> {
        return new Optional(
            this.isPresent()
                ? justObject(mapper(this.getValue()))
                : nothingObject(),
        );
    }

    orElse<U>(defaultValue: U): T | U {
        return this.isPresent()
            ? this.getValue()
            : defaultValue;
    }

    orElseThrow(error: Error): T | never {
        if (!this.isPresent()) {
            throw error;
        }

        return this.getValue();
    }

    getValue(): T {
        assertIsJust(this.maybeValue, 'No value found.');

        return this.maybeValue.value;
    }
}

export function just<T>(value: T): Optional<T> {
    return new Optional(justObject(value));
}

export function nothing<T>(): Optional<T> {
    return new Optional(nothingObject());
}

export function nothingIfUndefined<T>(value: T | undefined): Optional<T> {
    return undefined === value ? nothing() : just(value);
}
