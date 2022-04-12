import { ShipSize } from './ship-size';

export class Ship {
    constructor(
        public readonly name: string,
        public readonly size: ShipSize,
    ) {
    }

    toString(): string {
        return `${this.name.replace(' ', '')}(${this.size})`;
    }
}

export function createCarrier(): Ship {
    return new Ship(
        'Carrier',
        5,
    );
}

export function creatBattleship(): Ship {
    return new Ship(
        'Battleship',
        4,
    );
}

export function createDestroyer(): Ship {
    return new Ship(
        'Destroyer',
        3,
    );
}

export function createSubmarine(): Ship {
    return new Ship(
        'Submarine',
        3,
    );
}

export function createPatrolBoat(): Ship {
    return new Ship(
        'Patrol Boat',
        2,
    );
}
