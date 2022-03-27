import { Option, OptionValues } from 'commander';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { AIVersion } from '../standard-grid/std-ai-player-factory';
import { EnumHelper } from '../utils/enum-helper';
import { hasOwnProperty } from '../utils/has-own-property';

export function createAIVersionOption(flags = '--ai <aiVersion>', description = 'AI version to use'): Option {
    const option = new Option(flags, description);

    return option
        .choices(getAIVersions())
        .default(AIVersion.V4);
}

function getAIVersions(): ReadonlyArray<string> {
    return EnumHelper
        .getValues(AIVersion)
        .map(toString);
}

export type AIVersionOption = {
    ai: AIVersion;
};

export function parseAIVersionOption(options: OptionValues): AIVersionOption {
    assert(hasOwnProperty(options, 'ai'));

    const ai = options['ai'];

    assert(EnumHelper.hasValue(AIVersion, ai));

    return { ai };
}

