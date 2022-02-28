import { expect } from 'chai';
import { EnumHelper } from '@app/utils/enum-helper';

enum RegularEnum {
    RED,
    GREEN,
}

enum StringEnum {
    RED = 'red',
    GREEN = 'green',
}

enum MixedEnum {
    RED,
    GREEN = 'green',
}

describe('EnumHelper', () => {
    it('can describe a regular enum', () => {
        const expectedNames = ['RED', 'GREEN'];
        const expectedValues = [0, 1];
        const expectedNamesAndValues = [
            { name: 'RED', value: 0 },
            { name: 'GREEN', value: 1 },
        ];

        expect(EnumHelper.getNames(RegularEnum)).toEqual(expectedNames as any);
        expect(EnumHelper.getValues(RegularEnum)).toEqual(expectedValues as any);
        expect(EnumHelper.getNamesAndValues(RegularEnum)).toEqual(expectedNamesAndValues as any);
    });

    it('can describe a string enum', () => {
        const expectedNames = ['RED', 'GREEN'];
        const expectedValues = ['red', 'green'];
        const expectedNamesAndValues = [
            { name: 'RED', value: 'red' },
            { name: 'GREEN', value: 'green' },
        ];

        expect(EnumHelper.getNames(StringEnum)).toEqual(expectedNames as any);
        expect(EnumHelper.getValues(StringEnum)).toEqual(expectedValues as any);
        expect(EnumHelper.getNamesAndValues(StringEnum)).toEqual(expectedNamesAndValues as any);
    });

    it('can describe a mixed enum', () => {
        const expectedNames = ['RED', 'GREEN'];
        const expectedValues = [0, 'green'];
        const expectedNamesAndValues = [
            { name: 'RED', value: 0 },
            { name: 'GREEN', value: 'green' },
        ];

        expect(EnumHelper.getNames(MixedEnum)).toEqual(expectedNames as any);
        expect(EnumHelper.getValues(MixedEnum)).toEqual(expectedValues as any);
        expect(EnumHelper.getNamesAndValues(MixedEnum)).toEqual(expectedNamesAndValues as any);
    });

    describe('takeByKeyOrElse', () => {
        it('regularEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(RegularEnum, 'RED', 'foo')).toEqual(RegularEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(RegularEnum, 'unknown', 'foo')).toEqual('foo');
        });

        it('stringEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(StringEnum, 'RED', 'foo')).toEqual(StringEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(StringEnum, 'unknown', 'foo')).toEqual('foo');
        });

        it('mixedEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'RED', 'foo')).toEqual(MixedEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'unknown', 'foo')).toEqual('foo');

            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'GREEN', 'foo')).toEqual(MixedEnum.GREEN);
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'unknown', 'foo')).toEqual('foo');
        });
    });
});
