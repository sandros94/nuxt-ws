/**
 * Forked from `@sandros94/lab`
 *
 * License: MIT
 * Source: https://github.com/sandros94/lab/blob/d6dfac09a7001278e4c8eabd035d18e844c60d6e/src/runtime/utils/array.ts
 */

/**
 * Merges two arrays while avoiding duplicates based on a predicate function.
 *
 * @template T - Type of the first array
 * @template U - Type of the second array
 * @param {T} a - First array
 * @param {U} b - Second array to merge into the first
 * @param {function(T[number], U[number]): boolean} predicate - Function to determine if two items are equal
 *                                                            - Defaults to strict equality (===)
 * @returns {Array<T[number] | U[number]>} A new array containing all items from the first array
 *                                         and non-duplicate items from the second array
 *
 * @example
 * // Basic usage with default predicate
 * merge([1, 2, 3], [2, 3, 4]) // returns [1, 2, 3, 4]
 *
 * @example
 * // With custom predicate for object arrays
 * merge(
 *   [{id: 1}, {id: 2}],
 *   [{id: 2}, {id: 3}],
 *   (a, b) => a.id === b.id
 * ) // returns [{id: 1}, {id: 2}, {id: 3}]
 */
export function merge<
  T extends Array<unknown> | ReadonlyArray<unknown>,
  U extends Array<unknown> | ReadonlyArray<unknown>,
>(
  a: T,
  b: U,
  predicate: (aN: T[number], bN: U[number]) => boolean = (a: T[number], b: U[number]) => a === b,
): Array<T[number] | U[number]> {
  const _a = [...a]
  b.forEach((bItem: U[number]) => (
    _a.some((aItem: T[number]) => predicate(aItem, bItem))
      ? null
      : _a.push(bItem)
  ))
  return _a
}
