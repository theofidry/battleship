import {
    creatBattleship, createCarrier, createDestroyer, createPatrolBoat, createSubmarine, Ship,
} from './ship';

export type Fleet = ReadonlyArray<Ship>;

export function createFleet(): Fleet {
    return [
        createCarrier(),
        creatBattleship(),
        createDestroyer(),
        createSubmarine(),
        createPatrolBoat(),
    ];
}
