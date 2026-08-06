import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

export function useBanksManagement(showError, showSuccess) {
  const [banks, setBanks] = useState([]);
  const [newBank, setNewBank] = useState({ bankName: '', bankCode: '', description: '' });
  const [editingBankId, setEditingBankId] = useState('');
  const [editBank, setEditBank] = useState({ bankName: '', bankCode: '', description: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await api.users.getBanks();
        if (res?.success) {
          setBanks(res.data);
        } else {
          showError('Failed to fetch banks');
        }
      } catch {
        showError('Error fetching banks');
      }
    };

    fetchBanks();
  }, [showError]);

  const handleAddBank = async () => {
    const bankName = String(newBank.bankName || '').trim();
    const bankCode = String(newBank.bankCode || '').trim().toUpperCase();
    const description = String(newBank.description || '').trim();

    if (!bankName || !bankCode || !description) {
      showError('Bank name, bank code, and description are required');
      return;
    }

    if (!/^[A-Z0-9]{2,20}$/.test(bankCode)) {
      showError('Bank code must be between 2 and 20 letters/numbers (e.g., SBIN)');
      return;
    }

    try {
      const res = await api.banks.addBank({
        name: bankName,
        bankCode,
        ifscPrefix: bankCode,
        description
      });
      if (res?.success) {
        setBanks((prevBanks) => [...prevBanks, res.data]);
        setNewBank({ bankName: '', bankCode: '', description: '' });
        showSuccess('Bank added successfully');
      } else {
        showError('Failed to add bank');
      }
    } catch {
      showError('Error adding bank');
    }
  };

  const handleDeleteBank = async (bankId) => {
    try {
      const res = await api.banks.deleteBank(bankId);
      if (res?.success) {
        setBanks((prevBanks) => prevBanks.filter((bank) => bank._id !== bankId));
        showSuccess('Bank deleted successfully');
      } else {
        showError('Failed to delete bank');
      }
    } catch {
      showError('Error deleting bank');
    }
  };

  const startEditBank = (bank) => {
    setEditingBankId(String(bank?._id || ''));
    setEditBank({
      bankName: String(bank?.bankName || bank?.name || '').trim(),
      bankCode: String(bank?.bankCode || bank?.ifscPrefix || '').trim().toUpperCase(),
      description: String(bank?.description || '').trim()
    });
  };

  const cancelEditBank = () => {
    setEditingBankId('');
    setEditBank({ bankName: '', bankCode: '', description: '' });
  };

  const saveEditBank = async () => {
    const bankName = String(editBank.bankName || '').trim();
    const bankCode = String(editBank.bankCode || '').trim().toUpperCase();
    const description = String(editBank.description || '').trim();

    if (!editingBankId) {
      showError('No bank selected for editing');
      return;
    }

    if (!bankName || !bankCode || !description) {
      showError('Bank name, bank code, and description are required');
      return;
    }

    if (!/^[A-Z0-9]{2,20}$/.test(bankCode)) {
      showError('Bank code must be between 2 and 20 letters/numbers (e.g., SBIN)');
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await api.banks.updateBank(editingBankId, {
        name: bankName,
        bankCode,
        ifscPrefix: bankCode,
        description
      });

      if (res?.success) {
        setBanks((prevBanks) => prevBanks.map((bank) => (
          bank._id === editingBankId ? res.data : bank
        )));
        showSuccess('Bank updated successfully');
        cancelEditBank();
      } else {
        showError('Failed to update bank');
      }
    } catch {
      showError('Error updating bank');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return {
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
  };
}
