import { expect } from 'chai';
import { BufferLogger } from '../../src/logger/buffer-logger';
import { DebugLogger } from '../../src/logger/debug-logger';

describe('DebugLogger', () => {
    it('logs if debug is true', () => {
        const innerLogger = new BufferLogger();
        const logger = new DebugLogger(true, innerLogger);

        logger.log('foo', { a: 'a' });
        logger.log('bar');

        const expected = [
            { message: 'foo', optionalParams: [{ a: 'a'}] },
            { message: 'bar', optionalParams: [] },
        ];

        expect(innerLogger.getRecords()).to.eqls(expected);
    });

    it('does not log if debug is false', () => {
        const innerLogger = new BufferLogger();
        const logger = new DebugLogger(false, innerLogger);

        logger.log('foo', { a: 'a' });
        logger.log('bar');

        expect(innerLogger.getRecords()).to.eqls([]);
    });
});
