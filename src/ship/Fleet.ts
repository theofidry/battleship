import {
    creatBattleship, createCarrier, createDestroyer, createPatrolBoat, createSubmarine, Ship,
} from '@app/ship/Ship';

export type Fleet = Ship[];

export function createFleet(): Fleet {
    return [
        createCarrier(),
        creatBattleship(),
        createDestroyer(),
        createSubmarine(),
        createPatrolBoat(),
    ];
}
