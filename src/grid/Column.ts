import { assertIsNatural } from '@app/assert/assertIsNatural';
import { assertIsNotUndefined } from '@app/assert/assertIsNotUndefined';
import { EnumHelper } from '@app/utils/enum-helper';
import * as _ from 'lodash';
import assert = require('node:assert');

export enum Column {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D',
    E = 'E',
    F = 'F',
    G = 'G',
    H = 'H',
    I = 'I',
    J = 'J',
}

const COLUMN_KEYS: Array<keyof typeof Column> = EnumHelper.getNames(Column);

export function selectRandomColumn(): Column {
    const randomColumn = _.sample(COLUMN_KEYS);
    assertIsNotUndefined(randomColumn);

    return Column[randomColumn];
}

export function getColumnRange(start: Column, length: number): Array<Column> {
    assertIsNatural(length, 'Expected length to be a natural');

    if (0 === length) {
        return [];
    }

    const columns = EnumHelper.getValues(Column);

    const startIndex = columns.findIndex((column) => column === start);
    assert(-1 !== startIndex);

    const subColumns = columns.slice(startIndex, startIndex + length);

    assert(
        subColumns.length === length,
        `Out of bond: last element found is "${subColumns[subColumns.length - 1]}"`,
    );

    return subColumns;
}
