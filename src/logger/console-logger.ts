import { Logger } from './logger';

export class ConsoleLogger implements Logger {
    log(message?: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
    }
}
