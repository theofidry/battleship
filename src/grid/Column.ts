import { assertNotUndefined } from '@app/assert/notUndefined';
import { EnumHelper } from '@app/utils/enum-helper';
import * as _ from 'lodash';

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
    assertNotUndefined(randomColumn);

    return Column[randomColumn];
}
