import { Column } from '@app/grid/Column';

type Line = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
];

type Lines = Record<Column, Line>;

function createLine(): Line {
    return [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
    ];
}

export class Grid {
    constructor(
        private readonly lines: Lines = {
            A: createLine(),
            B: createLine(),
            C: createLine(),
            D: createLine(),
            E: createLine(),
            F: createLine(),
            G: createLine(),
            H: createLine(),
            I: createLine(),
            J: createLine(),
        },
    ) {
    }
}
