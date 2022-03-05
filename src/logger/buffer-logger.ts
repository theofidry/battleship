import { Logger } from './logger';

export type Record = {
    message: any,
    optionalParams: any,
};

export class BufferLogger implements Logger {
    private records: Record[] = [];

    log(message?: any, ...optionalParams: any[]): void {
        this.records.push({ message, optionalParams });
    }

    clear(): void {
        this.records = [];
    }

    getRecords(): ReadonlyArray<Record> {
        return this.records;
    }
}
