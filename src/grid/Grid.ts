import { assertIsUnreachable } from '@app/assert/assertIsUnreachable';
import { ShotResponse } from '@app/communications/ShotResponse';
import { Cell } from '@app/grid/Cell';
import { Column, getColumnRange } from '@app/grid/Column';
import { Coordinate } from '@app/grid/Coordinate';
import { LineNumber } from '@app/grid/LineNumber';
import { PlayerShip } from '@app/player/PlayerShip';
import { ShipDirection } from '@app/ship/ShipDirection';
import { EnumHelper } from '@app/utils/enum-helper';
import assert = require('node:assert');

type Line = Record<Column, Cell>;

export type Lines = Record<LineNumber, Line>;

export function createEmptyLine(): Line {
    const line: Partial<Line> = {};

    EnumHelper
        .getValues(Column)
        .forEach((column) => line[column] = Cell.EMPTY);

    assertIsCompleteLine(line);

    return line;
}

function assertIsCompleteLine(line: Partial<Line>): asserts line is Line {
    EnumHelper
        .getValues(Column)
        .forEach((column) => assert(line.hasOwnProperty(column)));
}

export function createEmptyLines(): Lines {
    const lines: Partial<Lines> = {};

    EnumHelper
        .getValues(LineNumber)
        .forEach((lineNumber) => lines[lineNumber] = createEmptyLine());

    assertIsCompleteLines(lines);

    return lines;
}

function assertIsCompleteLines(lines: Partial<Lines>): asserts lines is Lines {
    EnumHelper
        .getValues(LineNumber)
        .forEach((lineNumber) => assert(lines.hasOwnProperty(lineNumber)));
}

export class Grid {
    constructor(
        private readonly lines: Lines = createEmptyLines(),
    ) {
    }

    placeShip(playerShip: PlayerShip): void {
        switch (playerShip.position.direction) {
            case ShipDirection.HORIZONTAL:
                return this.placeShipHorizontally(playerShip);

            case ShipDirection.VERTICAL:
                return this.placeShipVertically(playerShip);
        }

        assertIsUnreachable(playerShip.position.direction);
    }

    recordHit(coordinate: Coordinate): ShotResponse {
        return ShotResponse.MISS;
    }

    getLines(): Readonly<Lines> {
        return this.lines;
    }

    private placeShipVertically(playerShip: PlayerShip): void {
        const column = playerShip.position.origin.column;
        const startLineNumber = playerShip.position.origin.line;
        const endLineNumber = startLineNumber + playerShip.ship.size - 1;

        for (let currentLineNumber = startLineNumber; currentLineNumber <= endLineNumber; currentLineNumber++) {
            this.lines[currentLineNumber][column] = Cell.FULL;
        }
    }

    private placeShipHorizontally(playerShip: PlayerShip): void {
        const lineNumber = playerShip.position.origin.line;
        const columns = getColumnRange(
            playerShip.position.origin.column,
            playerShip.ship.size,
        );

        for (const currentColumn of columns) {
            this.lines[lineNumber][currentColumn] = Cell.FULL;
        }
    }
}
