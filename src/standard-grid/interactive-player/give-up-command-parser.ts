import {
    CoordinateParser, interruptDiscriminant, InterruptError,
} from '../hit-strategy/interactive-hit-strategy';

export const parseGiveUpCommand: (innerParser: CoordinateParser)=> CoordinateParser = (innerParse) => {
    return (rawCoordinate) => {
        if (KNOWN_COMMANDS.includes(normalize(rawCoordinate))) {
            throw new GiveUp();
        }

        return innerParse(rawCoordinate);
    };
};

const KNOWN_COMMANDS = [
    'give up',
    'give-up',
    'gu',
    'stop',
];

function normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
}

class GiveUp extends Error implements InterruptError {
    readonly discriminant = interruptDiscriminant;

    constructor(message?: string) {
        super(message);

        this.name = 'GiveUp';
    }
}
