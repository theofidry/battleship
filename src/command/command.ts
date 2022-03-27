import { Argument, Command, Option, OptionValues } from 'commander';

export type ArgumentParser<Arguments> = (args: ReadonlyArray<any>)=> Arguments;
export type OptionParser<Options> = (options: OptionValues)=> Options;
export type Executer<Arguments, Options> = (args: Arguments, options: Options)=> Promise<void>;

type EmptyObject = {};
export const noopParser = (): EmptyObject => ({});

export function createCommand<Arguments, Options>(
    name: string,
    description: string,
    commandArguments: ReadonlyArray<Argument>,
    commandOptions: ReadonlyArray<Option>,
    parseArguments: ArgumentParser<Arguments>,
    parseOptions: OptionParser<Options>,
    execute: (args: Arguments, options: Options)=> Promise<void>,
): Command {
    const command = new Command(name);

    command.description(description);

    commandArguments.forEach((argument) => command.addArgument(argument));
    commandOptions.forEach((option) => command.addOption(option));

    command.action((...args) => {
        const parsedArguments = parseArguments(args);
        const parsedOptions = parseOptions(command.opts());

        return execute(parsedArguments, parsedOptions);
    });

    return command;
}
