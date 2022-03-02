import { expect } from 'chai';
import { EnumHelper } from '../../src/utils/enum-helper';

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

        expect(EnumHelper.getNames(RegularEnum)).to.eqls(expectedNames);
        expect(EnumHelper.getValues(RegularEnum)).to.eqls(expectedValues);
        expect(EnumHelper.getNamesAndValues(RegularEnum)).to.eqls(expectedNamesAndValues);
    });

    it('can describe a string enum', () => {
        const expectedNames = ['RED', 'GREEN'];
        const expectedValues = ['red', 'green'];
        const expectedNamesAndValues = [
            { name: 'RED', value: 'red' },
            { name: 'GREEN', value: 'green' },
        ];

        expect(EnumHelper.getNames(StringEnum)).to.eqls(expectedNames);
        expect(EnumHelper.getValues(StringEnum)).to.eqls(expectedValues);
        expect(EnumHelper.getNamesAndValues(StringEnum)).to.eqls(expectedNamesAndValues);
    });

    it('can describe a mixed enum', () => {
        const expectedNames = ['RED', 'GREEN'];
        const expectedValues = [0, 'green'];
        const expectedNamesAndValues = [
            { name: 'RED', value: 0 },
            { name: 'GREEN', value: 'green' },
        ];

        expect(EnumHelper.getNames(MixedEnum)).to.eqls(expectedNames);
        expect(EnumHelper.getValues(MixedEnum)).to.eqls(expectedValues);
        expect(EnumHelper.getNamesAndValues(MixedEnum)).to.eqls(expectedNamesAndValues);
    });

    describe('takeByKeyOrElse', () => {
        it('regularEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(RegularEnum, 'RED', 'foo')).to.eqls(RegularEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(RegularEnum, 'unknown', 'foo')).to.eqls('foo');
        });

        it('stringEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(StringEnum, 'RED', 'foo')).to.eqls(StringEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(StringEnum, 'unknown', 'foo')).to.eqls('foo');
        });

        it('mixedEnum', () => {
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'RED', 'foo')).to.eqls(MixedEnum.RED);
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'unknown', 'foo')).to.eqls('foo');

            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'GREEN', 'foo')).to.eqls(MixedEnum.GREEN);
            expect(EnumHelper.takeByKeyOrElse(MixedEnum, 'unknown', 'foo')).to.eqls('foo');
        });
    });
});
