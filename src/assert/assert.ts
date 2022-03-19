import nodeAssert from 'assert';

export type ErrorFactory = ()=> Error | string;

function isErrorFactory(value: Error | ErrorFactory | string | undefined): value is ErrorFactory {
    return value instanceof Function;
}

export function assert(value: unknown, message?: Error | ErrorFactory | string): asserts value {
    if (true === value) {
        return;
    }

    if (isErrorFactory(message)) {
        message = message();
    }

    return nodeAssert.equal(value, true, message);
}
