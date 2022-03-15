export class Coordinate<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>{
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
        const string = this.toString();
        let hash = 0;

        for (let i = 0; i < string.length; i++) {
            hash = Math.imul(31, hash) + string.charCodeAt(i) | 0;
        }

        return hash;
    }

    toString(): string {
        return this.columnIndex.toString() + this.rowIndex.toString();
    }
}
