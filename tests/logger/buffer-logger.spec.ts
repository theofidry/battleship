import { expect } from 'chai';
import { BufferLogger } from '../../src/logger/buffer-logger';

describe('BufferLogger', () => {
    it('keeps track of the logged records', () => {
        const logger = new BufferLogger();

        logger.log('foo', { a: 'a' });
        logger.log('bar');

        const expected = [
            { message: 'foo', optionalParams: [{ a: 'a'}] },
            { message: 'bar', optionalParams: [] },
        ];

        expect(logger.getRecords()).to.eqls(expected);
    });

    it('can clear the logged records', () => {
        const logger = new BufferLogger();

        logger.log('foo', { a: 'a' });
        logger.log('bar');

        logger.clear();

        expect(logger.getRecords()).to.eqls([]);
    });
});
