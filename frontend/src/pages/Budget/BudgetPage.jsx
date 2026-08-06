import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { formatCurrencyByPreference } from '../../utils/currency';
import { getTransactions } from '../../utils/transactions';
import '../../styles/pages/Budget.css';

const Budget = ({ user }) => {
  const [budgets, setBudgets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    amount: '',
    period: 'monthly'
  });

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadBudgets();
    loadTransactions();
  }, [user?._id, user?.id]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.budgets.getAll();
      if (response.success) {
        setBudgets(response.data || []);
      }
    } catch (err) {
      
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const userTransactions = await getTransactions({ fetchAll: true });
      setTransactions(userTransactions);
    } catch (loadError) {
      
      setTransactions([]);
    }
  };

  const categories = [
    { name: 'food', label: 'Food & Dining' },
    { name: 'transport', label: 'Transportation' },
    { name: 'entertainment', label: 'Entertainment' },
    { name: 'shopping', label: 'Shopping' },
    { name: 'utilities', label: 'Utilities' },
    { name: 'rent', label: 'Rent' },
    { name: 'insurance', label: 'Insurance' },
    { name: 'healthcare', label: 'Healthcare' },
    { name: 'education', label: 'Education' },
    { name: 'savings', label: 'Savings' },
    { name: 'investment', label: 'Investment' },
    { name: 'debt_payment', label: 'Debt Payment' },
    { name: 'miscellaneous', label: 'Miscellaneous' },
    { name: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingId) {
        const response = await api.budgets.update(editingId, submitData);
        if (response.success) {
          setBudgets(budgets.map((b) => (b._id === editingId ? response.data : b)));
        }
      } else {
        const response = await api.budgets.create(submitData);
        if (response.success) {
          setBudgets([...budgets, response.data]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
    } catch (err) {
      
      setError('Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await api.budgets.delete(id);
      setBudgets(budgets.filter((b) => b._id !== id));
    } catch (err) {
      
      setError('Failed to delete budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingId(budget._id);
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period
    });
    setShowForm(true);
  };

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const normalizeCategory = (value) => {
    if (!value) return '';
    const normalized = String(value).toLowerCase();
    if (normalized === 'transportation') return 'transport';
    return normalized;
  };

  const getCategoryExpenses = (category) => {
    const normalizedCategory = normalizeCategory(category);
    const categoryTransactions = transactions.filter((t) =>
      t.type === 'debit' && normalizeCategory(t.category) === normalizedCategory
    );
    return categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryLabel = (category) => {
    const normalized = normalizeCategory(category);
    const cat = categories.find((c) => c.name === normalized);
    return cat ? cat.label : category;
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
  };

  return (
    <div className="container budget-page">
      <div className="budget-header">
        <div>
          <h1 className="budget-title">Budget Overview</h1>
          <p className="budget-subtitle">Track your spending against your budgets</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
            setShowForm(true);
          }}
          className="btn btn-primary budget-new-btn"
        >
          <Plus size={18} />
          New Budget
        </button>
      </div>

      {error && <div className="budget-error">{error}</div>}

      {loading ? (
        <div className="budget-loading">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="card budget-empty-card">
          <p className="budget-empty-text">No budgets yet. Create one to get started!</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary budget-create-btn">
            <Plus size={18} />
            Create Budget
          </button>
        </div>
      ) : (
        <div className="dashboard-grid budget-grid">
          {budgets.map((budget) => {
            const spent = getCategoryExpenses(budget.category);
            const remaining = budget.amount - spent;
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const normalizedCategory = normalizeCategory(budget.category) || 'default';

            return (
              <div key={budget._id} className="card budget-card">
                <div className="budget-card-header">
                  <div>
                    <h3 className={`budget-card-title budget-cat-${normalizedCategory}`}>{budget.name}</h3>
                    <p className="budget-card-meta">{getCategoryLabel(budget.category)} - {budget.period}</p>
                  </div>
                  <div className="budget-card-actions">
                    <button onClick={() => handleEdit(budget)} className="btn btn-secondary budget-card-action-btn" aria-label="Edit budget">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(budget._id)} className="btn btn-secondary budget-card-action-btn budget-card-delete-btn" aria-label="Delete budget">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="budget-progress-wrap">
                  <div className="budget-progress-meta">
                    <span>Spent: {formatCurrency(spent)}</span>
                    <span>Budget: {formatCurrency(budget.amount)}</span>
                  </div>
                  <progress className={`budget-progress budget-cat-${normalizedCategory} ${percentage > 100 ? 'is-over' : ''}`} max="100" value={Math.min(percentage, 100)} />
                  <div className="budget-progress-used">{percentage.toFixed(1)}% used</div>
                </div>

                <div className={`budget-remaining ${remaining < 0 ? 'is-over' : 'is-safe'}`}>
                  {remaining < 0 ? 'Over budget' : 'Remaining'}: {formatCurrency(Math.abs(remaining))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="budget-modal-overlay">
          <div className="card budget-modal-card">
            <h3 className="budget-modal-title">{editingId ? 'Edit Budget' : 'Create Budget'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Budget Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Groceries"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Period</label>
                <select
                  className="form-input"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="budget-modal-actions">
                <button type="submit" className="btn btn-primary budget-modal-btn">
                  {editingId ? 'Update' : 'Create'} Budget
                </button>
                <button type="button" onClick={resetForm} className="btn btn-secondary budget-modal-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
