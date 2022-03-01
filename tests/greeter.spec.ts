import { expect } from 'chai';
import { greeter } from '../src/greeter';

describe('greeter', () => {
    it('can give a greeting', () => {
        expect(greeter()).equals('Hello World');
    });
});

