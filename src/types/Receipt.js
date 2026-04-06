/**
 * @typedef {{ id: string, name: string, cost: number, quantity: number }} ReceiptItem
 * @typedef {{ id: string, name: string, paid?: boolean }} Person
 * @typedef {{
 *   id: string,
 *   title: string,
 *   date: number,
 *   locked: boolean,
 *   items: Record<string, ReceiptItem>,
 *   people: Record<string, Person>,
 *   personToItemQuantityMap: Record<string, Record<string, number>>,
 *   itemToPersonQuantityMap: Record<string, Record<string, number>>,
 *   taxCost: number,
 *   tipCost: number,
 * }} ReceiptEntity
 */

export {};
