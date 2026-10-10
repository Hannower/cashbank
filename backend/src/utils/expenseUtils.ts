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

export interface FixedExpenseAdjustmentData {
  startMonth: number;
  startYear: number;
  amount: number;
}

export interface FixedExpensePaymentData {
  month: number;
  year: number;
  amount: number | null;
  isPaid: boolean;
  paidAt?: Date | string | null;
}

export interface EffectiveExpenseResult {
  effectiveAmount: number;
  baseAmount: number;
  adjustedBaseAmount: number;
  hasCustomAmount: boolean;
  isEstimated: boolean;
  hasAdjustment: boolean;
  adjustmentDetails: {
    startMonth: number;
    startYear: number;
    amount: number;
  } | null;
}

export function calculateEffectiveFixedExpense(
  baseAmount: number,
  isVariable: boolean,
  adjustments: FixedExpenseAdjustmentData[] | undefined,
  payments: FixedExpensePaymentData[] | undefined,
  targetMonth: number,
  targetYear: number
): EffectiveExpenseResult {
  // 1. Check for active adjustment on or before target (targetYear, targetMonth)
  const sortedAdjustments = (adjustments || []).slice().sort((a, b) => {
    if (b.startYear !== a.startYear) return b.startYear - a.startYear;
    return b.startMonth - a.startMonth;
  });

  const activeAdjustment = sortedAdjustments.find(
    (adj) =>
      adj.startYear < targetYear ||
      (adj.startYear === targetYear && adj.startMonth <= targetMonth)
  );

  const adjustedBaseAmount = activeAdjustment ? activeAdjustment.amount : baseAmount;

  // 2. Check for current month payment / override
  const currentPayment = (payments || []).find(
    (p) => p.month === targetMonth && p.year === targetYear
  );

  const hasSpecificAmount =
    currentPayment?.amount !== null && currentPayment?.amount !== undefined;

  if (hasSpecificAmount) {
    return {
      effectiveAmount: currentPayment!.amount!,
      baseAmount,
      adjustedBaseAmount,
      hasCustomAmount: true,
      isEstimated: false,
      hasAdjustment: Boolean(activeAdjustment),
      adjustmentDetails: activeAdjustment
        ? {
            startMonth: activeAdjustment.startMonth,
            startYear: activeAdjustment.startYear,
            amount: activeAdjustment.amount,
          }
        : null,
    };
  }

  // 3. If variable expense and no specific amount for this month:
  // Calculate average of past payments with amount
  if (isVariable) {
    const pastPaymentsWithAmount = (payments || []).filter(
      (p) =>
        (p.year < targetYear || (p.year === targetYear && p.month < targetMonth)) &&
        p.amount !== null &&
        p.amount !== undefined &&
        p.amount > 0
    );

    if (pastPaymentsWithAmount.length > 0) {
      const sum = pastPaymentsWithAmount.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const avg = Math.round((sum / pastPaymentsWithAmount.length) * 100) / 100;
      return {
        effectiveAmount: avg,
        baseAmount,
        adjustedBaseAmount,
        hasCustomAmount: false,
        isEstimated: true,
        hasAdjustment: Boolean(activeAdjustment),
        adjustmentDetails: activeAdjustment
          ? {
              startMonth: activeAdjustment.startMonth,
              startYear: activeAdjustment.startYear,
              amount: activeAdjustment.amount,
            }
          : null,
      };
    }

    // If no past payments, use adjustedBaseAmount as estimated
    return {
      effectiveAmount: adjustedBaseAmount,
      baseAmount,
      adjustedBaseAmount,
      hasCustomAmount: false,
      isEstimated: true,
      hasAdjustment: Boolean(activeAdjustment),
      adjustmentDetails: activeAdjustment
        ? {
            startMonth: activeAdjustment.startMonth,
            startYear: activeAdjustment.startYear,
            amount: activeAdjustment.amount,
          }
        : null,
    };
  }

  // 4. Regular fixed expense
  return {
    effectiveAmount: adjustedBaseAmount,
    baseAmount,
    adjustedBaseAmount,
    hasCustomAmount: false,
    isEstimated: false,
    hasAdjustment: Boolean(activeAdjustment),
    adjustmentDetails: activeAdjustment
      ? {
          startMonth: activeAdjustment.startMonth,
          startYear: activeAdjustment.startYear,
          amount: activeAdjustment.amount,
        }
      : null,
  };
}
