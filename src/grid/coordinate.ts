import { ValueObject } from 'immutable';
import { hashString } from './string-hash-code';

export class Coordinate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements ValueObject {
    public constructor(
        public readonly columnIndex: ColumnIndex,
        public readonly rowIndex: RowIndex,
    ) {
    }

    equals(other: unknown): boolean {
        return other instanceof Coordinate
            && this.toString() === other.toString();
    }

    hashCode(): number {
        return hashString(this.toString());
    }

    toString(): string {
        return this.columnIndex.toString() + this.rowIndex.toString();
    }
}
