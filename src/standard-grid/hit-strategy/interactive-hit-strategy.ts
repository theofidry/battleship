import * as readline from 'readline';
import { bindCallback, Observable } from 'rxjs';

export function askTurn(): Observable<unknown> {
    return bindCallback(askTurnNode)();
}

export const askTurnNode = (
    callback: (answer: string)=> void
) => {
    const readlineInterface = readline.createInterface(
        process.stdin,
        process.stdout,
        undefined,
        true,
    );

    readlineInterface.question('Target: ', (answer) => {
        readlineInterface.close();

        return callback(answer);
    });
};
