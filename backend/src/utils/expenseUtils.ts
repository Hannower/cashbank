/**
 * Utility functions for fixed expenses and date calculations
 */

export function isFixedExpenseActiveInMonth(
  firstDueDate: Date | string,
  endDate: Date | string | null | undefined,
  targetMonth: number, // 1 to 12
  targetYear: number
): boolean {
  const start = new Date(firstDueDate);
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;

  // Expense has not started yet
  if (targetYear < startYear || (targetYear === startYear && targetMonth < startMonth)) {
    return false;
  }

  // If endDate is provided, retire the expense starting from the following month
  if (endDate) {
    const end = new Date(endDate);
    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth() + 1;

    if (targetYear > endYear || (targetYear === endYear && targetMonth > endMonth)) {
      return false;
    }
  }

  return true;
}
