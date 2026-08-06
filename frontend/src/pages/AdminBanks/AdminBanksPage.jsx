import { useNotification } from '../../components/providers/NotificationProvider';
import AddBankForm from './components/AddBankForm';
import BanksList from './components/BanksList';
import { useBanksManagement } from './hooks/useBanksManagement';
import '../../styles/pages/AdminBanks.css';

export default function AdminBanks() {
  const { showError, showSuccess } = useNotification();
  const {
    banks,
    newBank,
    setNewBank,
    editingBankId,
    editBank,
    setEditBank,
    isSavingEdit,
    handleAddBank,
    handleDeleteBank,
    startEditBank,
    cancelEditBank,
    saveEditBank
  } = useBanksManagement(showError, showSuccess);

  return (
    <div className="container admin-banks-page">
      <div className="admin-banks-header">
        <h1 className="admin-banks-title">Manage Banks</h1>
        <p className="admin-banks-subtitle">Add, review, and remove supported banks.</p>
      </div>

      <AddBankForm
        newBank={newBank}
        setNewBank={setNewBank}
        onAddBank={handleAddBank}
      />

      <BanksList
        banks={banks}
        editingBankId={editingBankId}
        editBank={editBank}
        setEditBank={setEditBank}
        isSavingEdit={isSavingEdit}
        onStartEdit={startEditBank}
        onCancelEdit={cancelEditBank}
        onSaveEdit={saveEditBank}
        onDeleteBank={handleDeleteBank}
      />
    </div>
  );
}


