// The chai framework offers an API to register custom plugins & functions.
// However, the underlying code is quite hard to deal with, hence it is much
// easier (although a bit less elegant for the user) to expose a custom function
// composing chai native assertions.
import { expect } from 'chai';

export function expectError(
    expectedErrorName: string,
    expectedErrorMessage: string,
    createError: ()=> unknown,
): void {
    expect(createError).to.throw(expectedErrorMessage);

    let thrownError: unknown;

    try {
        createError();
    } catch (error) {
        thrownError = error;
    }

    expect(thrownError).to.be.instanceof(Error);
    expect((thrownError as Error).name).to.equal(expectedErrorName);
}
