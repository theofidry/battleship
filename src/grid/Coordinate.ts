import { Column } from '@app/grid/Column';
import { LineNumber } from '@app/grid/LineNumber';

export class Coordinate {
    public constructor(
        public readonly column: Column,
        public readonly line: LineNumber,
    ) {
    }
}
