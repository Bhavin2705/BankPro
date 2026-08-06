import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyByPreference } from '../../utils/currency';
import api from '../../utils/api';
import { addTransaction } from '../../utils/transactions';
import BillsTab from './components/BillsTab';
import RecurringTab from './components/RecurringTab';
import {
  billCategories,
  frequencyMap,
  getFrequencyLabel,
  getMonthlyRecurringTotal,
} from './constants';
import { formatDate } from '../../utils/date';
import { getNextDueDate } from './utils';
import { useNotification } from '../../components/providers/NotificationProvider';
import '../../styles/pages/Payments.css';

const INITIAL_BILL_FORM_DATA = {
  name: '',
  amount: '',
  dueDate: '',
  category: 'utilities',
};

const INITIAL_RECURRING_FORM_DATA = {
  recipientName: '',
  recipientAccount: '',
  recipientPhone: '',
  amount: '',
  frequency: 'monthly',
  description: '',
  startDate: '',
};

const Payments = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('bills');

  const { showError: showBillError, showSuccess: showRecurringSuccess } = useNotification();
  const showRecurringError = showBillError;

  const [bills, setBills] = useState([]);
  const [showBillForm, setShowBillForm] = useState(false);
  const [billFormData, setBillFormData] = useState(INITIAL_BILL_FORM_DATA);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [billBalanceWarning, setBillBalanceWarning] = useState('');

  const [recurringPayments, setRecurringPayments] = useState([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringFormData, setRecurringFormData] = useState(INITIAL_RECURRING_FORM_DATA);
  const [balanceWarning, setBalanceWarning] = useState('');
  const [submittingRecurring, setSubmittingRecurring] = useState(false);
  const [updatingRecurringId, setUpdatingRecurringId] = useState(null);
  const [deletingRecurringId, setDeletingRecurringId] = useState(null);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const loadBills = useCallback(async () => {
    try {
      const res = await api.bills.getAll();
      setBills(res.success ? res.data : []);
    } catch {
      setBills([]);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [user?._id, user?.id, loadBills]);

  const handleBillChange = (e) => {
    const { name, value } = e.target;
    setBillFormData({ ...billFormData, [name]: value });
    if (name === 'amount') {
      const amount = parseFloat(value) || 0;
      if (amount > 0 && amount > user.balance) {
        setBillBalanceWarning(`INSUFFICIENT BALANCE: Amount (${formatCurrency(amount)}) exceeds your balance (${formatCurrency(user.balance)})`);
      } else {
        setBillBalanceWarning('');
      }
    }
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    if (submittingBill) return;
    // Lock immediately before any async work — prevents double-submit race
    setSubmittingBill(true);

    try {
      const amount = parseFloat(billFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        showBillError('Please enter a valid amount greater than 0');
        return;
      }

      if (!billFormData.dueDate) {
        showBillError('Due date is required');
        return;
      }

      if (amount > user.balance) {
        showBillError('Insufficient balance for bill payment');
        return;
      }

      // Do NOT send status — backend always creates bills as 'pending'
      const billPayload = {
        name: billFormData.name,
        type: billFormData.category,
        amount,
        dueDate: billFormData.dueDate,
        billNumber: `BILL-${Date.now()}`,
        accountNumber: user.accountNumber || 'N/A',
        description: `Bill Payment: ${billFormData.name} (${billFormData.category})`
      };

      let billRes;
      try {
        billRes = await api.bills.create(billPayload);
      } catch {
        showBillError('Failed to create bill');
        return;
      }

      try {
        const payRes = await api.bills.pay(billRes?.data?._id, { amount });
        if (!payRes?.success) {
          throw new Error(payRes?.message || 'Bill payment failed');
        }
        const nextBalance = typeof payRes?.data?.transaction?.balance === 'number'
          ? payRes.data.transaction.balance
          : user.balance - amount;
        onUserUpdate({ ...user, balance: nextBalance });
        await loadBills();
        setShowBillForm(false);
        setBillFormData(INITIAL_BILL_FORM_DATA);
        setBillBalanceWarning('');
      } catch (err) {
        showBillError(err.message || 'Error processing bill payment');
        if (billRes?.data?._id) {
          try {
            await api.bills.delete(billRes.data._id);
          } catch {
            // rollback best-effort
          }
        }
      }
    } finally {
      setSubmittingBill(false);
    }
  };

  const getUserBalance = useCallback(() => user?.balance || 0, [user]);

  const loadRecurringPayments = useCallback(async () => {
    try {
      const res = await api.recurring.getAll();
      setRecurringPayments(res.success ? res.data : []);
    } catch {
      setRecurringPayments([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRecurringPayments();
    }
  }, [user, loadRecurringPayments]);

  const handleRecurringAmountChange = (e) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setRecurringFormData({ ...recurringFormData, amount: e.target.value });

    if (newAmount > 0 && newAmount > user.balance) {
      setBalanceWarning(`INSUFFICIENT BALANCE: Amount (${formatCurrency(newAmount)}) exceeds your balance (${formatCurrency(user.balance)})`);
      return;
    }

    if (newAmount > 0 && newAmount > user.balance * 0.8) {
      setBalanceWarning(`HIGH AMOUNT: This is ${Math.round((newAmount / user.balance) * 100)}% of your current balance`);
      return;
    }

    setBalanceWarning('');
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    if (submittingRecurring) return;
    // Lock immediately — closes the double-submit window before any validation
    setSubmittingRecurring(true);

    try {
      const amount = parseFloat(recurringFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        showRecurringError('Amount must be greater than 0');
        return;
      }
      if (!recurringFormData.startDate) {
        showRecurringError('Start date is required');
        return;
      }
      if (amount > getUserBalance()) {
        showRecurringError('Insufficient balance for recurring payment');
        return;
      }
      if (!recurringFormData.recipientName.trim()) {
        showRecurringError('Recipient name is required');
        return;
      }
      if (!recurringFormData.recipientAccount.trim() && !recurringFormData.recipientPhone.trim()) {
        showRecurringError('Enter recipient account number or phone number');
        return;
      }

      const { startDate, nextDueDate } = getNextDueDate(
        recurringFormData.startDate,
        recurringFormData.frequency,
        frequencyMap,
      );

      const recurringPayload = {
        name: recurringFormData.recipientName,
        beneficiaryName: recurringFormData.recipientName,
        toAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone,
        fromAccount: user._id,
        amount,
        frequency: recurringFormData.frequency,
        description: recurringFormData.description || 'Recurring payment',
        type: 'other',
        startDate,
        nextDueDate,
        status: 'active',
      };

      let createdRecurringId = null;
      try {
        const recurringRes = await api.recurring.create(recurringPayload);
        if (!recurringRes?.success || !recurringRes?.data?._id) {
          showRecurringError('Failed to create recurring payment');
          return;
        }
        createdRecurringId = recurringRes.data._id;
      } catch {
        showRecurringError('Failed to create recurring payment');
        return;
      }

      try {
        const transactionResult = await addTransaction({
          type: 'debit',
          amount,
          description: `Recurring Payment: ${recurringFormData.recipientName}`,
          category: 'bill_payment',
          transferType: 'external',
          recipientName: recurringFormData.recipientName,
          recipientAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone,
        });
        if (!transactionResult) throw new Error('Transaction was not created');
        const nextBalance = typeof transactionResult?.balance === 'number'
          ? transactionResult.balance
          : user.balance - amount;
        onUserUpdate({ ...user, balance: nextBalance });
        showRecurringSuccess('Recurring payment created successfully! First payment deducted from your account.');
      } catch (err) {
        if (createdRecurringId) {
          try { await api.recurring.delete(createdRecurringId); } catch { /* rollback best-effort */ }
        }
        showRecurringError('Recurring payment was not saved because first payment failed.');
        return;
      }

      setRecurringFormData(INITIAL_RECURRING_FORM_DATA);
      setBalanceWarning('');
      setShowRecurringForm(false);
      await loadRecurringPayments();
    } finally {
      setSubmittingRecurring(false);
    }
  };


  const deleteRecurringPayment = async (paymentId) => {
    if (deletingRecurringId) return;
    try {
      setDeletingRecurringId(paymentId);
      await api.recurring.delete(paymentId);
      showRecurringSuccess('Recurring payment deleted successfully!');
      await loadRecurringPayments();
    } catch {
      showRecurringError('Failed to delete recurring payment');
    } finally {
      setDeletingRecurringId(null);
    }
  };

  const toggleRecurringStatus = async (paymentId) => {
    if (updatingRecurringId) return;
    const payment = recurringPayments.find((p) => p._id === paymentId);
    if (!payment) return;

    const newStatus = payment.status === 'active' ? 'paused' : 'active';

    try {
      setUpdatingRecurringId(paymentId);
      await api.recurring.update(paymentId, { status: newStatus });
      showRecurringSuccess(`Recurring payment ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`);
      await loadRecurringPayments();
    } catch {
      showRecurringError('Failed to update recurring payment');
    } finally {
      setUpdatingRecurringId(null);
    }
  };

  const monthlyTotal = getMonthlyRecurringTotal(recurringPayments);

  return (
    <div className="container">
      <div className="payments-tabs">
        <button className={activeTab === 'bills' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('bills')}>One-time Bills</button>
        <button className={activeTab === 'recurring' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('recurring')}>Recurring Payments</button>
      </div>

      {activeTab === 'bills' && (
        <BillsTab
          bills={bills}
          showBillForm={showBillForm}
          setShowBillForm={setShowBillForm}
          billFormData={billFormData}
          setBillFormData={setBillFormData}
          handleBillSubmit={handleBillSubmit}
          handleBillChange={handleBillChange}
          billCategories={billCategories}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          submittingBill={submittingBill}
          billBalanceWarning={billBalanceWarning}
        />
      )}

      {activeTab === 'recurring' && (
        <RecurringTab
          recurringPayments={recurringPayments}
          showRecurringForm={showRecurringForm}
          setShowRecurringForm={setShowRecurringForm}
          recurringFormData={recurringFormData}
          setRecurringFormData={setRecurringFormData}
          handleRecurringAmountChange={handleRecurringAmountChange}
          handleRecurringSubmit={handleRecurringSubmit}
          toggleRecurringStatus={toggleRecurringStatus}
          deleteRecurringPayment={deleteRecurringPayment}
          balanceWarning={balanceWarning}
          formatCurrency={formatCurrency}
          getFrequencyLabel={getFrequencyLabel}
          monthlyTotal={monthlyTotal}
          submittingRecurring={submittingRecurring}
          updatingRecurringId={updatingRecurringId}
          deletingRecurringId={deletingRecurringId}
        />
      )}
    </div>
  );
};

export default Payments;

