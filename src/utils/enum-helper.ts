// Warning: does not work well against const enums
// See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums
export class EnumHelper {
    static getNamesAndValues<O extends Object>(enumObject: O) {
        return EnumHelper
            .getNames(enumObject)
            .map(name => ({ name, value: enumObject[name] }));
    }

    static getNames<O extends Object, K extends keyof O = keyof O>(enumObject: O): K[] {
        return Object
            .keys(enumObject)
            .filter(key => Number.isNaN(+key)) as K[];
    }

    static hasName<O extends Object, K extends keyof O = keyof O>(enumObject: O,
                                                                  enumKey: any): enumKey is keyof O {
        return Object
            .keys(enumObject)
            .includes(enumKey);
    }

    static getValues<O extends Object>(enumObject: O): Array<O[keyof O]> {
        return EnumHelper
            .getNames(enumObject)
            .map((key) => enumObject[key]);
    }

    static takeByKeyOrElse<O extends Object, T>(enumObject: O, enumKey: string | number,
                                                defaultValue: T): O[keyof O] | T {
        if (EnumHelper.hasName(enumObject, enumKey)) {
            return enumObject[enumKey];
        }

        return defaultValue;
    }

    /**
     * @deprecated TODO: removed its usage in favour of takeByKeyOrElse
     */
    static takeOrElse<T extends number>(e: any, value: T, defaultValue: T): T {
        return -1 === EnumHelper.getValues(e).indexOf(value) ? defaultValue : value;
    }
}
