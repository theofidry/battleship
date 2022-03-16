import { AdjacentIndexFinder, IndexSorter } from '../grid/coordinate-navigator';

export function createFindPreviousIndex<Index extends PropertyKey>(sortedIndices: ReadonlyArray<Index>): AdjacentIndexFinder<Index> {
    return (index) => {
        const currentPosition = sortedIndices.findIndex((candidate) => candidate === index);

        return sortedIndices[currentPosition - 1];
    };
}

export function createFindNextIndex<Index extends PropertyKey>(sortedIndices: ReadonlyArray<Index>): AdjacentIndexFinder<Index> {
    return (index) => {
        const currentPosition = sortedIndices.findIndex((candidate) => candidate === index);

        return sortedIndices[currentPosition + 1];
    };
}

export function createIndexSorter<Index extends PropertyKey>(sortedIndices: ReadonlyArray<Index>): IndexSorter<Index> {
    return (left, right) => {
        const leftPosition = sortedIndices.findIndex((candidate) => candidate === left);
        const rightPosition = sortedIndices.findIndex((candidate) => candidate === right);

        return leftPosition - rightPosition;
    };
}
