export const getVisibleTransactions = (transactions, activeTab) => {
  return transactions
    .filter((tx) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'deposit') return tx.type === 'credit';
      if (activeTab === 'withdraw') return tx.type === 'debit' && tx.category !== 'transfer';
      if (activeTab === 'transfer') {
        return tx.category === 'transfer' || tx.description?.toLowerCase().includes('transfer');
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || b.date || b.timestamp) - new Date(a.createdAt || a.date || a.timestamp));
};

export const getTabLabel = (tab) => {
  if (tab === 'all') return 'All';
  if (tab === 'deposit') return 'Deposits';
  if (tab === 'withdraw') return 'Withdrawals';
  return 'Transfers';
};
