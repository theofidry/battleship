export function hasOwnProperty<
    ObjectType extends {},
    PropertyType extends PropertyKey,
>(
    object: ObjectType, propertyName: PropertyType,
): object is ObjectType & Record<PropertyType, unknown> {
    return Object.prototype.hasOwnProperty.call(object, propertyName);
}
