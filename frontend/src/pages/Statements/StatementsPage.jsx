import { Calendar, Download, FileText, Filter, Printer, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CustomCalendar from '../../components/ui/Calendar/CustomCalendar';
import { formatCurrencyByPreference } from '../../utils/currency';
import { fromLocalYYYYMMDD, parseTransactionDate, toLocalYYYYMMDD } from '../../utils/date';
import { generateAccountStatementPDF, generateMiniStatementPDF } from '../../utils/pdfGenerator';
import { getTransactions } from '../../utils/transactions';
import '../../styles/pages/Statements.css';
import {
  buildAccountStatementPrintHtml,
  buildCsvContent,
  buildMiniStatement,
  buildMiniStatementPrintHtml,
  calculateTransactionTotals,
  filterAndSortTransactions,
  isTransferTransaction
} from './utils';

const Statements = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: toLocalYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    end: toLocalYYYYMMDD(new Date())
  });
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const txs = await getTransactions({ userId: user.id || user._id, fetchAll: true });
        setTransactions(Array.isArray(txs) ? txs : []);
      } catch (error) {
        
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [user]);

  const filteredTransactions = useMemo(() => filterAndSortTransactions({
    transactions,
    dateRange,
    filterType,
    searchTerm,
    sortBy,
    fromLocalYYYYMMDD
  }), [transactions, dateRange, filterType, searchTerm, sortBy]);

  const miniStatement = useMemo(() => buildMiniStatement(transactions, user), [transactions, user]);
  const totals = useMemo(() => calculateTransactionTotals(filteredTransactions), [filteredTransactions]);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);
  const toNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0);
  const getDescription = (transaction) => transaction.description || 'Transaction';
  const getRecipientLabel = (transaction) => {
    if (transaction.recipientName) return transaction.recipientName;
    if (transaction.recipientAccount) return transaction.recipientAccount;
    if (transaction.recipient?.name) return transaction.recipient.name;
    return transaction.recipient || '';
  };

  const formatDate = (value) => {
    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (transaction) => {
    if (isTransferTransaction(transaction)) return <FileText size={16} className="statements-icon-transfer" />;
    if (transaction.type === 'credit') return <TrendingUp size={16} className="statements-icon-credit" />;
    if (transaction.type === 'debit') return <TrendingDown size={16} className="statements-icon-debit" />;
    return <FileText size={16} />;
  };

  const printMiniStatement = () => {
    if (!miniStatement) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to print your statement.');
      return;
    }
    const statementHtml = buildMiniStatementPrintHtml({
      miniStatement,
      formatDate,
      formatCurrency
    });
    printWindow.document.write(statementHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadMiniStatement = async () => {
    if (!miniStatement) return;
    await generateMiniStatementPDF(
      miniStatement.transactions,
      { name: miniStatement.accountHolder, accountType: 'Savings' },
      miniStatement.accountNumber,
      new Date(miniStatement.period.from),
      new Date(miniStatement.period.to)
    );
  };

  const exportToCsv = () => {
    if (!filteredTransactions.length) {
      alert('No transactions to export for the selected period.');
      return;
    }
    if (filteredTransactions.length > 5000) {
      alert('Too many transactions to export at once. Please narrow the date range.');
      return;
    }
    const csvContent = buildCsvContent(filteredTransactions, (transaction) => parseTransactionDate(transaction, fromLocalYYYYMMDD));
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `statement_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const printAccountStatement = () => {
    if (!filteredTransactions.length) {
      alert('No transactions to print for the selected period.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to print your statement.');
      return;
    }
    const statementHtml = buildAccountStatementPrintHtml({
      user,
      dateRange,
      filteredTransactions,
      formatCurrency
    });
    printWindow.document.write(statementHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container statements-page">
      <div className="statements-header">
        <h1 className="statements-title">Account Statements</h1>
        <p className="statements-subtitle">View and download your transaction history and account statements</p>
      </div>

      <div className="card statements-block">
        <div className="statements-section-header statements-mini-header">
          <h3 className="statements-icon-title"><Receipt size={20} /> Mini Statement</h3>
          <div className="statements-actions-inline">
            <button
              onClick={printMiniStatement}
              className="btn btn-secondary statements-btn-gap-right"
              disabled={!miniStatement}
              title={miniStatement ? 'Print mini statement' : 'No transactions available'}
            >
              <Printer size={16} className="statements-btn-icon" />Print
            </button>
            <button
              onClick={downloadMiniStatement}
              className="btn btn-secondary"
              disabled={!miniStatement}
              title={miniStatement ? 'Download mini statement' : 'No transactions available'}
            >
              <Download size={16} className="statements-btn-icon" />Download
            </button>
          </div>
        </div>

        {miniStatement ? (
          <>
            <div className="statements-mini-grid">
              <div>
                <div className="statements-label">Account Holder</div>
                <div className="statements-strong">{miniStatement.accountHolder}</div>
              </div>
              <div>
                <div className="statements-label">Account Number</div>
                <div className="statements-strong">{miniStatement.accountNumber}</div>
              </div>
              <div>
                <div className="statements-label">Period</div>
                <div className="statements-strong">{formatDate(miniStatement.period.from)} - {formatDate(miniStatement.period.to)}</div>
              </div>
            </div>

            <div className="statements-summary-wrap">
              <h4 className="statements-summary-title">Summary</h4>
              <div className="statements-summary-grid">
                <div>
                  <div className="statements-label">Total Transactions</div>
                  <div className="statements-total-value">{miniStatement.summary.totalTransactions}</div>
                </div>
                <div>
                  <div className="statements-label">Credits</div>
                  <div className="statements-credit-value">{miniStatement.summary.credits} ({formatCurrency(miniStatement.summary.totalCredits)})</div>
                </div>
                <div>
                  <div className="statements-label">Debits</div>
                  <div className="statements-debit-value">{miniStatement.summary.debits} ({formatCurrency(miniStatement.summary.totalDebits)})</div>
                </div>
                <div>
                  <div className="statements-label">Net Change</div>
                  <div className={`statements-total-value ${miniStatement.summary.netChange >= 0 ? 'is-credit' : 'is-debit'}`}>
                    {formatCurrency(miniStatement.summary.netChange)}
                  </div>
                </div>
              </div>
            </div>

            <h4 className="statements-recent-title">Recent Transactions</h4>
            {miniStatement.transactions.length === 0 ? (
              <div className="statements-empty-note">No transactions found</div>
            ) : (
              <div className="transaction-list">
                {miniStatement.transactions.map((transaction, index) => (
                  <div key={index} className="transaction-item statements-item-row">
                    <div className="statements-item-main">
                      <div className="statements-item-icon-bg">{getTransactionIcon(transaction)}</div>
                      <div className="statements-item-content">
                        <div className="statements-item-title">{getDescription(transaction)}</div>
                        <div className="statements-item-meta">{formatDate(parseTransactionDate(transaction, fromLocalYYYYMMDD) || transaction.createdAt || transaction.timestamp)}</div>
                      </div>
                    </div>
                    <div className={`statements-item-amount ${transaction.type === 'credit' ? 'is-credit' : 'is-debit'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(toNumber(transaction.amount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="statements-empty-block">
            <Receipt size={48} className="statements-empty-icon" />
            <h3>Generate Your Mini Statement</h3>
            <p>Recent transactions summary will appear here.</p>
          </div>
        )}
      </div>

      <div className="dashboard-grid statements-stats-grid">
        <div className="stat-card">
          <div className="statements-stats-row">
            <div>
              <div className="stat-value">{filteredTransactions.length}</div>
              <div className="stat-label">Transactions</div>
            </div>
            <FileText size={32} className="statements-icon-transfer" />
          </div>
        </div>
        <div className="stat-card">
          <div className="statements-stats-row">
            <div>
              <div className="stat-value">{formatCurrency(totals.credits)}</div>
              <div className="stat-label">Total Credits</div>
            </div>
            <TrendingUp size={32} className="statements-icon-credit" />
          </div>
        </div>
        <div className="stat-card">
          <div className="statements-stats-row">
            <div>
              <div className="stat-value">{formatCurrency(totals.debits)}</div>
              <div className="stat-label">Total Debits</div>
            </div>
            <TrendingDown size={32} className="statements-icon-debit" />
          </div>
        </div>
        <div className="stat-card">
          <div className="statements-stats-row">
            <div>
              <div className={`stat-value ${totals.net >= 0 ? 'statements-credit-value' : 'statements-debit-value'}`}>{formatCurrency(totals.net)}</div>
              <div className="stat-label">Net Change</div>
            </div>
            {totals.net >= 0 ? <TrendingUp size={32} className="statements-icon-credit" /> : <TrendingDown size={32} className="statements-icon-debit" />}
          </div>
        </div>
      </div>

      <div className="card statements-block">
        <div className="statements-filter-row">
          <div className="statements-filter-title-row">
            <Calendar size={16} />
            <span className="statements-filter-title">Date Range:</span>
          </div>
          <div className="statements-date-input-wrap">
            <CustomCalendar
              value={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
              onChange={(date) => {
                const nextStart = date ? toLocalYYYYMMDD(date) : '';
                if (nextStart && dateRange.end && nextStart > dateRange.end) {
                  setDateRange({ start: nextStart, end: nextStart });
                  return;
                }
                setDateRange({ ...dateRange, start: nextStart });
              }}
              placeholder="Start date"
              maxDate={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
            />
          </div>
          <span>to</span>
          <div className="statements-date-input-wrap">
            <CustomCalendar
              value={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
              onChange={(date) => {
                const nextEnd = date ? toLocalYYYYMMDD(date) : '';
                if (nextEnd && dateRange.start && nextEnd < dateRange.start) {
                  setDateRange({ start: nextEnd, end: nextEnd });
                  return;
                }
                setDateRange({ ...dateRange, end: nextEnd });
              }}
              placeholder="End date"
              minDate={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
            />
          </div>
        </div>

        <div className="statements-filter-row">
          <div className="statements-filter-title-row">
            <Filter size={16} />
            <span className="statements-filter-title">Filter:</span>
          </div>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="form-input statements-select-220">
            <option value="all">All Types</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="transfer">Transfers</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="form-input statements-select-220">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
          <input type="text" placeholder="Search transactions..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="form-input statements-search-280" />
          <button onClick={exportToCsv} className="btn btn-secondary statements-inline-btn">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card statements-block">
        <div className="statements-section-header statements-history-header">
          <h3>Transaction History</h3>
          <div className="statements-actions-inline">
            <button
              className="btn btn-secondary statements-inline-btn"
              onClick={printAccountStatement}
              disabled={!filteredTransactions.length}
              title={filteredTransactions.length ? 'Print statement' : 'No transactions available'}
            >
              <Printer size={16} /> Print
            </button>
            <button
              className="btn btn-secondary statements-inline-btn"
              disabled={!filteredTransactions.length}
              title={filteredTransactions.length ? 'Download PDF' : 'No transactions available'}
              onClick={async () => {
                if (!filteredTransactions.length) return;
                await generateAccountStatementPDF(
                  filteredTransactions,
                  user,
                  user.accountNumber || '****1234',
                  dateRange.start ? new Date(dateRange.start) : new Date(),
                  dateRange.end ? new Date(dateRange.end) : new Date()
                );
              }}
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
        <div className="statements-count-note">Showing {filteredTransactions.length} of {transactions.length} transactions</div>

        {filteredTransactions.length === 0 ? (
          <div className="statements-empty-note">No transactions found for the selected period</div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.map((transaction, index) => (
              <div key={index} className="transaction-item statements-item-row">
                <div className="statements-item-main">
                  <div className="statements-item-icon-bg">{getTransactionIcon(transaction)}</div>
                  <div className="statements-item-content">
                    <div className="statements-item-title">{getDescription(transaction)}</div>
                    <div className="statements-item-meta">
                      {formatDate(parseTransactionDate(transaction, fromLocalYYYYMMDD) || transaction.createdAt)}
                      {isTransferTransaction(transaction) && getRecipientLabel(transaction) && ` | To: ${getRecipientLabel(transaction)}`}
                    </div>
                  </div>
                </div>
                <div className="statements-right-col">
                  <div className={`statements-item-amount ${isTransferTransaction(transaction) ? 'is-transfer' : transaction.type === 'credit' ? 'is-credit' : 'is-debit'}`}>
                    {isTransferTransaction(transaction) ? '' : transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(toNumber(transaction.amount))}
                    {isTransferTransaction(transaction) && <span className="statements-transfer-tag">(Transfer)</span>}
                  </div>
                  {transaction.balance !== undefined && transaction.balance !== null && (
                    <div className="statements-balance-note">Balance: {formatCurrency(transaction.balance)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Statements;
