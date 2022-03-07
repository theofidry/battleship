import { expect } from 'chai';
import heredoc from 'tsheredoc';
import stringConsole from '../../src/utils/string-console';

describe('StdoutConsole', () => {
    it('returns values a string instead of printing it to the stdout/err', () => {
        expect(stringConsole.log('foo')).to.equal('foo\n');

        expect(stringConsole.table(['foo', 'bar'])).to.equal(
            heredoc(`
            ┌─────────┬────────┐
            │ (index) │ Values │
            ├─────────┼────────┤
            │    0    │ 'foo'  │
            │    1    │ 'bar'  │
            └─────────┴────────┘
            `),
        );
    });
});
