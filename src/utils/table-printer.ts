const DOWN_RIGHT = '┌';
const LEFT_DOWN = '┐';
const UP_RIGHT = '└';
const LEFT_UP = '┘';

const VERTICAL = '│';
const HORIZONTAL = '─';

const VERTICAL_HORIZONTAL_DOWN = '┬';
const VERTICAL_HORIZONTAL_UP = '┴';

const VERTICAL_HORIZONTAL = '┼';

const VERTICAL_HORIZONTAL_RIGHT = '├';
const HORIZONTAL_LEFT_VERTICAL = '┤';

type Separator = {
    start: string;
    filler: string;
    separator: string;
    end: string;
};

const topSeparationLine: Separator = {
    start: DOWN_RIGHT,
    filler: HORIZONTAL,
    separator: VERTICAL_HORIZONTAL_DOWN,
    end: LEFT_DOWN,
};

const midSeparationLine: Separator = {
    start: VERTICAL_HORIZONTAL_RIGHT,
    filler: HORIZONTAL,
    separator: VERTICAL_HORIZONTAL,
    end: HORIZONTAL_LEFT_VERTICAL,
};

const endSeparationLine: Separator = {
    start: UP_RIGHT,
    filler: HORIZONTAL,
    separator: VERTICAL_HORIZONTAL_UP,
    end: LEFT_UP,
};

function isSeparator(row: ReadonlyArray<string> | Separator): row is Separator {
    return !Array.isArray(row);
}

const CELL_SIZE = 5;

function createRowsWithSeparators(
    rows: ReadonlyArray<ReadonlyArray<string>>,
): ReadonlyArray<ReadonlyArray<string> | Separator> {
    const rowsWithSeparators = [
        topSeparationLine,
        ...rows.flatMap((row) => [row, midSeparationLine]),
    ];

    rowsWithSeparators.pop();
    rowsWithSeparators.push(endSeparationLine);

    return rowsWithSeparators;
}

function renderRow(
    row: ReadonlyArray<string> | Separator,
    length: number,
): string {
    return isSeparator(row) ? renderSeparator(row, length) : renderStringRow(row);
}

function renderStringRow(row: ReadonlyArray<string>): string {
    return [
        VERTICAL,
        ...row.map(padCell).join(VERTICAL),
        VERTICAL,
    ].join('');
}

function padCell(value: string): string {
    let rightSide = true;

    while (value.length < CELL_SIZE) {
        if (rightSide) {
            value = value + ' ';
        } else {
            value = ' ' + value;
        }

        rightSide = !rightSide;
    }

    return value;
}

function renderSeparator({ start, end, filler, separator }: Separator, length: number): string {
    const row = new Array(length).fill(filler.repeat(CELL_SIZE));

    return [
        start,
        ...row.join(separator),
        end,
    ].join('');
}

export function printTable(rows: ReadonlyArray<ReadonlyArray<string>>): string {
    const firstRow = rows[0];

    if (undefined === firstRow) {
        return '';
    }

    const rowsLength = firstRow.length;
    const rowsWithSeparators = createRowsWithSeparators(rows);

    return rowsWithSeparators
        .map((row) => renderRow(row, rowsLength))
        .join('\n') + '\n';
}


