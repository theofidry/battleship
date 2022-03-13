import { expect } from 'chai';
import { formatTime } from '../../src/utils/time-formatter';

function formatTimeProvider() {
    return [
        { value: 0, expected: '< 1 sec' },
        { value: 1, expected: '1 sec' },
        { value: 2, expected: '2 secs' },
        { value: 59, expected: '59 secs' },
        { value: 60, expected: '1 min' },
        { value: 61, expected: '1 min' },
        { value: 119, expected: '1 min' },
        { value: 120, expected: '2 mins' },
        { value: 121, expected: '2 mins' },
        { value: 3599, expected: '59 mins' },
        { value: 3600, expected: '1 hr' },
        { value: 7199, expected: '1 hr' },
        { value: 7200, expected: '2 hrs' },
        { value: 7201, expected: '2 hrs' },
        { value: 86399, expected: '23 hrs' },
        { value: 86400, expected: '1 day' },
        { value: 86401, expected: '1 day' },
        { value: 172799, expected: '1 day' },
        { value: 172800, expected: '2 days' },
        { value: 172801, expected: '2 days' },
    ];
}

describe('TimeFormatter', () => {
    for (const { value, expected } of formatTimeProvider()) {
        it(`can format time: ${value}`, () => {
           expect(formatTime(value)).to.equal(expected);
        });
    }
});
