import { Activity, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatTransactionDate } from '../../../utils/date';

const EMAIL_LIKE_TEXT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getTransactionLabel = (tx) => {
  const description = (tx?.description || '').trim();
  if (tx?.category === 'transfer' && EMAIL_LIKE_TEXT.test(description)) {
    return 'Self transfer';
  }
  return description || 'Transaction';
};

export default function TransactionsList({ loading, transactions, formatCurrency }) {
  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Activity size={64} className="opacity-40 mb-4 mx-auto" />
        <p>No transactions found in this category.</p>
      </div>
    );
  }

  return (
    <div className="transactions-list space-y-4">
      {transactions.map((tx) => (
        <div
          key={tx._id || tx.id}
          className="transactions-list-item flex items-center gap-4 p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
        >
          <div
            className={`transactions-list-icon p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}
          >
            {tx.type === 'credit' ? (
              <ArrowDownLeft className="text-green-600" />
            ) : (
              <ArrowUpRight className="text-red-600" />
            )}
          </div>
          <div className="transactions-list-main flex-1">
            <div className="transactions-list-description font-medium text-gray-800">{getTransactionLabel(tx)}</div>
            <div className="transactions-list-meta text-sm text-gray-500">
              {formatTransactionDate(tx.createdAt || tx.date)}
              {tx.category && ` - ${tx.category}`}
            </div>
          </div>
          <div
            className={`transactions-list-amount font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}
          >
            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
