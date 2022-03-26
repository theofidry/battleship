import { Logger } from './logger';
import { NullLogger } from './null-logger';

export class DebugLogger implements Logger {
    private readonly logger: Logger;

    constructor(
        debug: boolean,
        innerLogger: Logger,
    ) {
        this.logger = debug ? innerLogger : new NullLogger();
    }

    log(message?: any, ...optionalParams: any[]) {
        this.logger.log(message, ...optionalParams);
    }
}
