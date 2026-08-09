import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import { api } from '../../utils/api';
import { getNonAdminUsers } from '../../utils/auth';
import { formatCurrencyByPreference } from '../../utils/currency';
import { addTransaction, getTransactions } from '../../utils/transactions';
import {
  ActionFormModal,
  BalanceCard,
  TransactionsHeader,
  TransactionsList,
  TransactionsTabs,
} from './components';
import { getVisibleTransactions } from './utils';
import '../../styles/pages/Transactions.css';

const INITIAL_FORM_DATA = { amount: '', description: '' };
const INITIAL_TRANSFER_DATA = {
  transferMethod: 'phone',
  recipientPhone: '',
  recipientAccount: '',
  selfTransfer: false,
  selfRecipientAccount: '',
  recipientName: '',
  recipientBank: { id: 'bankpro', name: 'BankPro' },
  description: '',
};

const getCardIdentifier = (card) => card?.id || card?._id || '';
const isValidCardId = (cardId) => typeof cardId === 'string' && /^[a-f\d]{24}$/i.test(cardId);
const createClientRequestId = () => (
  globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
);

export default function Transactions({ user, onUserUpdate }) {
  const { showError, showSuccess } = useNotification();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState('deposit');

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [transferData, setTransferData] = useState(INITIAL_TRANSFER_DATA);
  const [banks, setBanks] = useState([]);
  const [selfAccounts, setSelfAccounts] = useState([]);
  const [showBankSelector, setShowBankSelector] = useState(false);

  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [pin, setPin] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [processingText, setProcessingText] = useState('');

  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');

  const loadCards = useCallback(async () => {
    try {
      const res = await api.cards.getAll();
      if (res && res.success) {
        const nextCards = res.data || [];
        setCards(nextCards);
        if (nextCards.length > 0) {
          const preferredCard = nextCards.find((card) => card.status === 'active') || nextCards[0];
          setSelectedCardId(getCardIdentifier(preferredCard));
        } else {
          setSelectedCardId('');
        }
      }
    } catch (error) {
      
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const txs = await getTransactions({ fetchAll: true });
      setTransactions(txs || []);
    } catch (err) {
      showError('Failed to load transactions');
      
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadTransactions();
    loadCards();
  }, [loadTransactions, loadCards]);

  useEffect(() => {
    setPin('');
    setPinError('');
  }, [actionType]);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const res = await api.users.getBanks();
        if (res?.success) setBanks(res.data || []);
      } catch (error) {
        showError('Failed to load banks');
        
      }
    };
    loadBanks();
  }, [showError]);

  useEffect(() => {
    const loadSelfAccounts = async () => {
      try {
        const response = await api.users.getSelfTransferAccounts();
        if (response?.success && Array.isArray(response.data)) {
          setSelfAccounts(response.data);
        } else {
          setSelfAccounts([]);
        }
      } catch (selfAccountsError) {
        console.debug('Failed to load self transfer accounts:', selfAccountsError?.message || 'unknown error');
        setSelfAccounts([]);
      }
    };

    if (user?._id || user?.id) {
      loadSelfAccounts();
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    const loadRecipients = async () => {
      try {
        const recipients = await getNonAdminUsers();
        if (Array.isArray(recipients)) {
          // recipients are loaded for transfer validation flow
        }
      } catch (loadRecipientsError) {
        console.debug('Failed to load recipients:', loadRecipientsError?.message || 'unknown error');
      }
    };
    if (user) loadRecipients();
  }, [user]);

  const resetForms = () => {
    setShowActionForm(false);
    setFormData(INITIAL_FORM_DATA);
    setTransferData(INITIAL_TRANSFER_DATA);
    setShowBankSelector(false);
    setPin('');
    setPinError('');
    setIsSubmittingAction(false);
    setProcessingText('');
  };

  const handleDepositOrWithdrawConfirmed = async (transaction) => {
    try {
      const payload = {
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        clientRequestId: transaction.clientRequestId || createClientRequestId(),
        ...(isValidCardId(transaction.cardId) ? { cardId: transaction.cardId } : {}),
      };

      const result = await addTransaction(payload);
      if (!result) throw new Error('No result returned from transaction');

      const isDeposit = transaction.type === 'credit';
      showSuccess(isDeposit ? 'Deposit successful!' : 'Withdrawal successful!');

      const serverBalance = typeof result?.balance === 'number' ? result.balance : null;
      const newBalance = serverBalance !== null
        ? serverBalance
        : isDeposit
          ? user.balance + transaction.amount
          : user.balance - transaction.amount;

      onUserUpdate({ ...user, balance: newBalance });
      await loadTransactions();

      sessionStorage.setItem('pinRequiredForTransactions', 'true');
      resetForms();
      return true;
    } catch (err) {
      
      showError(err.message || 'Operation failed. Please try again.');
      return false;
    }
  };

  const handleTransferConfirmed = async (transaction) => {
    try {
      const result = await api.transactions.transfer(transaction.payload);
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      const successMsg = result.data?.message || 'Transfer completed!';
      showSuccess(successMsg);

      const serverBalance = typeof result.data?.transaction?.balance === 'number'
        ? result.data.transaction.balance
        : null;
      const fee = result.data?.processingFee || 0;
      const newBalance = serverBalance !== null
        ? serverBalance
        : user.balance - transaction.amount - fee;
      onUserUpdate({ ...user, balance: newBalance });

      await loadTransactions();
      resetForms();
      return true;
    } catch (err) {
      
      showError(err.message || 'Transfer failed. Please try again.');
      return false;
    }
  };

  const processPendingTransaction = async (transactionToProcess = pendingTransaction) => {
    if (!transactionToProcess) {
      return false;
    }

    if (transactionToProcess.type === 'credit' || transactionToProcess.type === 'debit') {
      return handleDepositOrWithdrawConfirmed(transactionToProcess);
    }

    if (transactionToProcess.type === 'transfer') {
      return handleTransferConfirmed(transactionToProcess);
    }

    return false;
  };

  const verifyPin = async (transactionToProcess = null) => {
    if (pinVerifying || isSubmittingAction) return;
    if (!pin.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    try {
      setPinVerifying(true);
      setIsSubmittingAction(true);
      setPinError('');
      const result = await api.users.verifyPin(pin);

      if (result && result.success) {
        const transactionSuccess = await processPendingTransaction(transactionToProcess || pendingTransaction);

        if (transactionSuccess) {
          resetForms();
          setPendingTransaction(null);
          setPin('');
        }
      } else {
        setPinError(result?.error || 'Invalid PIN. Please try again.');
      }
    } catch (error) {
      setPinError(error.message || 'PIN verification failed. Please try again.');
    } finally {
      setPinVerifying(false);
    }
  };

  const handleDepositOrWithdraw = async () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount greater than 0');
      return;
    }

    const isDeposit = actionType === 'deposit';
    const selectedCard = cards.find((card) => getCardIdentifier(card) === selectedCardId) || null;

    if (!isDeposit && amount > user.balance) {
      showError('Insufficient balance');
      return;
    }
    // Card is optional — if one is selected it will be validated by the backend.
    // Withdrawal without a card proceeds as a plain balance debit.

    if (!pin.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    try {
      setPinError('');
      const result = await api.users.verifyPin(pin);

      if (result && result.success) {
        const transactionData = {
          type: isDeposit ? 'credit' : 'debit',
          amount,
          description: formData.description.trim() || (isDeposit ? 'Cash Deposit' : 'Cash Withdrawal'),
          category: isDeposit ? 'deposit' : 'withdrawal',
          clientRequestId: createClientRequestId(),
          cardId: selectedCardId || '',
        };

        const transactionSuccess = await handleDepositOrWithdrawConfirmed(transactionData);
        if (transactionSuccess) {
          resetForms();
        }
      } else {
        setPinError(result?.error || 'Invalid PIN. Please try again.');
      }
    } catch (error) {
      setPinError(error.message || 'PIN verification failed. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingAction || pinVerifying) return;

    if (!pin.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    if (actionType === 'transfer') {
      const amount = parseFloat(transferData.amount || formData.amount);
      if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount');
        return;
      }
      if (amount > user.balance) {
        showError('Insufficient balance');
        return;
      }

      const isExternal = (transferData.recipientBank?.id || 'bankpro') !== 'bankpro';

      if (isExternal && !transferData.recipientName) {
        showError('Recipient name is required for external transfers');
        return;
      }

      const payload = {
        amount,
        description: (transferData.description || formData.description).trim() || 'Money transfer',
        clientRequestId: createClientRequestId(),
      };

      if (transferData.selfTransfer) {
        const selectedSelfAccount = transferData.selfRecipientAccount || transferData.recipientAccount;
        if (!selectedSelfAccount) {
          showError('Select one of your own accounts for self transfer');
          return;
        }
        if (selectedSelfAccount === user.accountNumber) {
          showError('Select a different account for self transfer');
          return;
        }
        payload.recipientAccount = selectedSelfAccount;
      } else if (transferData.transferMethod === 'phone') {
        if (!transferData.recipientPhone || !/^\d{10}$/.test(transferData.recipientPhone)) {
          showError('Enter a valid 10-digit phone number');
          return;
        }
        payload.recipientPhone = transferData.recipientPhone;
      } else {
        if (!transferData.recipientAccount) {
          showError('Enter a valid account number');
          return;
        }
        if (transferData.recipientAccount === user.accountNumber) {
          showError('Cannot transfer to the same account');
          return;
        }
        payload.recipientAccount = transferData.recipientAccount;
      }

      if (isExternal) {
        payload.recipientName = transferData.recipientName;
        payload.recipientBank = {
          bankName: transferData.recipientBank?.name || 'External Bank',
          branchName: transferData.recipientBank?.branchName || '',
        };
      }

      try {
        setIsSubmittingAction(true);
        setProcessingText('Transferring...');
        const nextPendingTransaction = {
          type: 'transfer',
          amount,
          payload
        };
        setPendingTransaction(nextPendingTransaction);
        setPinError('');
        await verifyPin(nextPendingTransaction);
      } finally {
        setIsSubmittingAction(false);
        setProcessingText('');
      }
      return;
    }

    try {
      setIsSubmittingAction(true);
      setProcessingText(actionType === 'deposit' ? 'Depositing...' : 'Withdrawing...');
      await handleDepositOrWithdraw();
    } finally {
      setIsSubmittingAction(false);
      setProcessingText('');
    }
  };

  const formatCurrency = (amount) => formatCurrencyByPreference(amount || 0, user);
  const visibleTransactions = getVisibleTransactions(transactions, activeTab);
  const handleNewAction = () => {
    const tabToAction = {
      deposit: 'deposit',
      withdraw: 'withdraw',
      transfer: 'transfer'
    };

    setActionType(tabToAction[activeTab] || 'deposit');
    setShowActionForm(true);
  };

  return (
    <div className="container transactions-page">
      <TransactionsHeader onNewAction={handleNewAction} />
      <BalanceCard balance={formatCurrency(user.balance)} />
      <TransactionsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <TransactionsList loading={loading} transactions={visibleTransactions} formatCurrency={formatCurrency} />

      <ActionFormModal
        show={showActionForm}
        actionType={actionType}
        onActionTypeChange={setActionType}
        onClose={resetForms}
        onSubmit={handleSubmit}
        isProcessing={isSubmittingAction}
        processingText={processingText}
        pinVerifying={pinVerifying}
        pinError={pinError}
        pin={pin}
        setPin={setPin}
        formData={formData}
        setFormData={setFormData}
        transferData={transferData}
        setTransferData={setTransferData}
        selfAccounts={selfAccounts}
        currentAccountNumber={user.accountNumber}
        banks={banks}
        showBankSelector={showBankSelector}
        setShowBankSelector={setShowBankSelector}
        cards={cards}
        selectedCardId={selectedCardId}
        setSelectedCardId={setSelectedCardId}
      />

    </div>
  );
}




