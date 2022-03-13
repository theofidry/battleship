import * as fs from 'fs';

export function getCurrentRevision(): string {
    const revision = fs.readFileSync('.git/HEAD').toString().trim();

    return revision.indexOf(':') === -1
        ? revision
        : fs.readFileSync('.git/' + revision.substring(5)).toString().trim();
}
