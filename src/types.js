/**
 * @typedef {{ id: string, name: string, unitPrice: number, quantity: number, allocations: Record<string, number> }} ReceiptLine
 * @typedef {{ id: string, name: string, venmo?: string }} Participant
 * @typedef {{ id: string, description: string, amount: number, paidById: string, splitMode: 'equal'|'custom'|'percent'|'units'|'receipt', splitParticipantIds: string[], customAmounts?: Record<string, number>, percents?: Record<string, number>, unitQuantities?: Record<string, number>, receiptLines?: ReceiptLine[], taxAmount?: number, tipAmount?: number, createdAt: string }} Expense
 * @typedef {{ id: string, name: string, participants: Participant[], expenses: Expense[], settled: { from: string, to: string, amount: number }[] }} Group
 * @typedef {{ groups: Group[], meName: string }} AppState
 */

export {};
