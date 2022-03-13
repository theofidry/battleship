import { assertIsUnreachableCase } from '../assert/assert-is-unreachable';

const TIME_FORMATS = [
    { formatInSeconds: 0, formattedString: '< 1 sec', timeDivisor: undefined },
    { formatInSeconds: 1, formattedString: '1 sec', timeDivisor: undefined },
    { formatInSeconds: 2, formattedString: 'secs', timeDivisor: 1 },
    { formatInSeconds: 60, formattedString: '1 min', timeDivisor: undefined },
    { formatInSeconds: 120, formattedString: 'mins', timeDivisor: 60 },
    { formatInSeconds: 3600, formattedString: '1 hr', timeDivisor: undefined },
    { formatInSeconds: 7200, formattedString: 'hrs', timeDivisor: 3600 },
    { formatInSeconds: 86400, formattedString: '1 day', timeDivisor: undefined },
    { formatInSeconds: 172800, formattedString: 'days', timeDivisor: 86400 },
] as const;

export function formatTime(timeInSeconds: number): string {
    for (const [index, { formatInSeconds, formattedString, timeDivisor }] of TIME_FORMATS.entries()) {
        if (timeInSeconds < formatInSeconds) {
            continue;
        }

        const isLastIndex = index === TIME_FORMATS.length - 1;
        const nextIndex = TIME_FORMATS[index + 1];

        if (undefined !== nextIndex && timeInSeconds < nextIndex.formatInSeconds
            || isLastIndex
        ) {
            if (undefined === timeDivisor) {
                return formattedString;
            }

            const result = Math.floor(timeInSeconds / timeDivisor);

            return `${result} ${formattedString}`;
        }
    }

    assertIsUnreachableCase(timeInSeconds as never);

    return '';
}
