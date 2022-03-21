import { Logger } from './logger';

export class NullLogger implements Logger {
    log(message?: any, ...optionalParams: any[]): void {
        // Do nothing
    }
}
