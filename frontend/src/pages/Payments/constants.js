export const billCategories = [
  'utilities',
  'internet',
  'phone',
  'insurance',
  'rent',
  'credit card',
  'loan',
  'other',
];

export const frequencyMap = {
  daily: { days: 1 },
  weekly: { days: 7 },
  'bi-weekly': { days: 14 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  'half-yearly': { months: 6 },
  yearly: { years: 1 },
};

export const getFrequencyLabel = (frequency) => {
  const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
  return labels[frequency] || frequency;
};

export const getMonthlyRecurringTotal = (payments) => payments
  .filter((p) => p.status === 'active')
  .reduce((sum, p) => {
    switch (p.frequency) {
      case 'daily':
        return sum + p.amount * 30;
      case 'weekly':
        return sum + p.amount * 4;
      case 'monthly':
        return sum + p.amount;
      case 'yearly':
        return sum + p.amount / 12;
      default:
        return sum + p.amount;
    }
  }, 0);