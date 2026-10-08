export const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface MonthItem {
  month: number; // 1 - 12
  year: number;
  label: string;
  yearLabel: string;
  isCurrent?: boolean;
  isCreation?: boolean;
}

export function getCreationDateDetails(createdAt?: string) {
  const now = new Date();
  let createdDate = now;
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      createdDate = parsed;
    }
  }
  return {
    startMonth: createdDate.getMonth() + 1,
    startYear: createdDate.getFullYear(),
  };
}

export function getCurrentMonthItem(): MonthItem {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return {
    month: m,
    year: y,
    label: MONTH_LABELS[m - 1],
    yearLabel: String(y),
    isCurrent: true,
  };
}

export function getInitialMonthItem(createdAt?: string): MonthItem {
  const current = getCurrentMonthItem();
  const { startMonth, startYear } = getCreationDateDetails(createdAt);

  if (current.year > startYear || (current.year === startYear && current.month >= startMonth)) {
    return current;
  }

  return {
    month: startMonth,
    year: startYear,
    label: MONTH_LABELS[startMonth - 1],
    yearLabel: String(startYear),
    isCreation: true,
  };
}
