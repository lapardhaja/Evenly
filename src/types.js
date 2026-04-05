/**
 * @typedef {{ id: string, name: string }} Participant
 * @typedef {{ id: string, description: string, amount: number, paidById: string, splitMode: 'equal'|'custom'|'percent'|'units', splitParticipantIds: string[], customAmounts?: Record<string, number>, percents?: Record<string, number>, unitQuantities?: Record<string, number>, createdAt: string }} Expense
 * @typedef {{ id: string, name: string, participants: Participant[], expenses: Expense[], settled: { from: string, to: string, amount: number }[] }} Group
 * @typedef {{ groups: Group[], meName: string }} AppState
 */

export {};
