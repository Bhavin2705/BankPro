import api from './api.js';

const inferCategoryFromTransaction = (tx) => {
  const rawCategory = (tx?.category || '').toString().trim().toLowerCase();
  const description = (tx?.description || '').toString().toLowerCase();

  if (
    rawCategory.includes('transfer')
    || tx?.type === 'transfer'
    || description.includes('transfer')
    || description.includes('self transfer')
  ) {
    return 'transfer';
  }

  if (
    rawCategory.includes('bill')
    || description.includes('bill')
    || description.includes('electricity')
    || description.includes('water')
    || description.includes('gas')
  ) {
    return 'bill_payment';
  }

  if (rawCategory.includes('card') || description.includes('card')) {
    return 'card_payment';
  }

  if (rawCategory) return rawCategory;

  if (tx?.type === 'credit') {
    return 'deposit';
  }

  if (tx?.type === 'debit') {
    return 'withdrawal';
  }

  return 'other';
};

export const getTransactions = async (params = {}) => {
  try {
    const { fetchAll, ...query } = params;
    const response = await api.transactions.getAll(query);
    if (!response.success) return [];
    const data = Array.isArray(response.data) ? response.data : [];
    const pagination = response.pagination;

    if (!fetchAll || !pagination || !pagination.pages || pagination.pages <= 1) {
      return data;
    }

    const pages = pagination.pages;
    const baseQuery = {
      ...query,
      limit: pagination.limit || query.limit || 20
    };
    const allResults = [...data];

    for (let page = 2; page <= pages; page += 1) {
      const pageResponse = await api.transactions.getAll({ ...baseQuery, page });
      if (!pageResponse?.success || !Array.isArray(pageResponse.data)) break;
      allResults.push(...pageResponse.data);
    }

    return allResults;
  } catch (error) {
    
    return [];
  }
};

export const addTransaction = async (transactionData) => {
  try {
    const response = await api.transactions.create(transactionData);
    return response.success ? response.data : null;
  } catch (error) {
    
    throw error;
  }
};

export const getTransactionById = async (id) => {
  try {
    const response = await api.transactions.getById(id);
    return response.success ? response.data : null;
  } catch (error) {
    
    return null;
  }
};

export const updateTransaction = async (id, transactionData) => {
  try {
    const response = await api.transactions.update(id, transactionData);
    return response.success ? response.data : null;
  } catch (error) {
    
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const response = await api.transactions.delete(id);
    return response.success;
  } catch (error) {
    
    throw error;
  }
};

export const getTransactionStats = async () => {
  try {
    const [statsResponse, allTransactions] = await Promise.all([
      api.transactions.getStats('all'),
      getTransactions({ fetchAll: true })
    ]);

    const backendStats = statsResponse.success ? statsResponse.data : {
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0,
      categories: []
    };

    const recentTransactions = Array.isArray(allTransactions) ? allTransactions : [];

    return {
      totalTransactions: backendStats.transactionCount || 0,
      monthlyIncome: backendStats.totalCredits || 0,
      monthlyExpenses: backendStats.totalDebits || 0,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type, // 'credit' or 'debit'
        date: tx.createdAt,
        category: inferCategoryFromTransaction(tx)
      }))
    };
  } catch (error) {
    
    return {
      totalTransactions: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      recentTransactions: []
    };
  }
};

export const getTransactionCategories = async () => {
  try {
    const response = await api.transactions.getCategories();
    return response.success ? response.data : [];
  } catch (error) {
    
    return [];
  }
};

export const transferMoney = async (transferData) => {
  try {
    const response = await api.transactions.transfer(transferData);
    return response;
  } catch (error) {
    
    throw error;
  }
};
