import { Option } from 'commander';
import { toString } from 'lodash';
import { AIVersion } from '../standard-grid/std-ai-player-factory';
import { EnumHelper } from '../utils/enum-helper';

export function createAIVersionOption(flags = '--ai <aiVersion>', description = 'AI version to use'): Option {
    const option = new Option(flags, description);

    return option
        .choices(getAIVersions())
        .default(AIVersion.V2);
}

function getAIVersions(): ReadonlyArray<string> {
    return EnumHelper
        .getValues(AIVersion)
        .map(toString);
}
