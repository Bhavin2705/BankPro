import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import api from '../../utils/api';
import ConfirmModal from '../../components/common/ConfirmModal';
import PinModal from '../../components/modals/PinModal';
import { AddCardForm, CardsList, CardsStats, VirtualCardModal } from './components';
import { formatCardNumber, generateCardNumber, generateExpiryDate } from './utils';
import '../../styles/pages/Cards.css';

const initialFormData = {
  cardType: 'debit',
  cardBrand: 'visa',
  cardName: '',
  pin: '',
};

const Cards = ({ user }) => {
  const getCardId = (card) => card?.id || card?._id || '';
  const { showError, showSuccess } = useNotification();
  const [cards, setCards] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [visibleCvvs, setVisibleCvvs] = useState(new Set());
  const [formData, setFormData] = useState(initialFormData);
  const [showPin, setShowPin] = useState(false);
  const [modal, setModal] = useState({ open: false });
  const [creatingCard, setCreatingCard] = useState(false);
  const [updatingCardId, setUpdatingCardId] = useState(null);
  const [closingCardId, setClosingCardId] = useState(null);
  const [showCvvPinModal, setShowCvvPinModal] = useState(false);
  const [cvvPin, setCvvPin] = useState('');
  const [cvvPinError, setCvvPinError] = useState('');
  const [cvvPinVerifying, setCvvPinVerifying] = useState(false);
  const [pendingCvvCardId, setPendingCvvCardId] = useState(null);
  const [virtualCardId, setVirtualCardId] = useState(null);

  const loadCards = async () => {
    try {
      const res = await api.cards.getAll();
      if (res?.success) {
        setCards(res.data || []);
      } else {
        setCards([]);
        showError(res?.error || 'Failed to load cards');
      }
    } catch (err) {
      
      setCards([]);
      showError(err.message || 'Failed to load cards');
    }
  };

  useEffect(() => {
    loadCards();
  }, [user?._id, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (creatingCard) return;

    if (!formData.cardName || formData.cardName.trim().length === 0) {
      showError('Card name is required');
      return;
    }

    if (!/^\d{4,6}$/.test(formData.pin)) {
      showError('PIN must be 4 to 6 digits');
      return;
    }

    const safeCardType = formData.cardType === 'credit' ? 'credit' : 'debit';
    const safeCardBrand = ['visa', 'mastercard', 'rupay', 'amex'].includes(formData.cardBrand) ? formData.cardBrand : (safeCardType === 'debit' ? 'visa' : 'mastercard');

    const newCard = {
      id: Date.now().toString(),
      cardNumber: generateCardNumber(),
      cardName: formData.cardName,
      expiryDate: generateExpiryDate(),
      cardType: safeCardType,
      cardBrand: safeCardBrand,
      pin: formData.pin,
      status: 'active',
    };

    try {
      setCreatingCard(true);
      const result = await api.cards.create(newCard);
      if (result.success) {
        await loadCards();
        setFormData(initialFormData);
        setShowAddForm(false);
      } else {
        showError(result.error || 'Failed to create card');
      }
    } catch (err) {
      
      showError(err.message || 'Create card failed');
    } finally {
      setCreatingCard(false);
    }
  };

  const toggleCardVisibility = (cardId) => {
    const updatedVisibleCards = new Set(visibleCards);
    if (updatedVisibleCards.has(cardId)) {
      updatedVisibleCards.delete(cardId);
    } else {
      updatedVisibleCards.add(cardId);
    }
    setVisibleCards(updatedVisibleCards);
  };

  const toggleCvvVisibility = (cardId) => {
    if (visibleCvvs.has(cardId)) {
      const updatedVisibleCvvs = new Set(visibleCvvs);
      updatedVisibleCvvs.delete(cardId);
      setVisibleCvvs(updatedVisibleCvvs);
      return;
    }

    setPendingCvvCardId(cardId);
    setShowCvvPinModal(true);
    setCvvPin('');
    setCvvPinError('');
  };

  const closeCvvPinModal = () => {
    setShowCvvPinModal(false);
    setCvvPin('');
    setCvvPinError('');
    setPendingCvvCardId(null);
  };

  const verifyCvvPin = async () => {
    if (!cvvPin.trim()) {
      setCvvPinError('Please enter your PIN');
      return;
    }

    try {
      setCvvPinVerifying(true);
      setCvvPinError('');
      const result = await api.cards.revealCvv(pendingCvvCardId, { pin: cvvPin });

      if (result?.success) {
        const revealedCvv = result?.data?.cvv;
        if (!revealedCvv) {
          setCvvPinError('Unable to reveal CVV. Please try again.');
          return;
        }

        setCards((prevCards) => (
          prevCards.map((card) => {
            const currentId = getCardId(card);
            if (currentId !== pendingCvvCardId) return card;
            return { ...card, cvv: revealedCvv };
          })
        ));

        const updatedVisibleCvvs = new Set(visibleCvvs);
        updatedVisibleCvvs.add(pendingCvvCardId);
        setVisibleCvvs(updatedVisibleCvvs);
        showSuccess('CVV revealed');
        closeCvvPinModal();
      } else {
        setCvvPinError(result?.error || 'Invalid PIN. Please try again.');
      }
    } catch (error) {
      setCvvPinError(error.message || 'PIN verification failed. Please try again.');
    } finally {
      setCvvPinVerifying(false);
    }
  };

  const toggleCardLock = async (cardId) => {
    if (updatingCardId) return;
    const card = cards.find((c) => getCardId(c) === cardId);
    if (!card) return;

    if (card.status === 'blocked') {
      showError('This card is blocked by bank. Please contact bank support.');
      return;
    }
    if (['lost', 'expired', 'closed'].includes(card.status)) {
      showError('This card status cannot be changed.');
      return;
    }

    if (card.statusRequest?.status === 'pending') {
      showError('A card status request is already pending bank review.');
      return;
    }

    try {
      setUpdatingCardId(cardId);
      const res = await api.cards.requestStatusChange(cardId);
      if (res.success) {
        showSuccess(res.message || 'Request submitted. Bank will review your card status request.');
        await loadCards();
      }
    } catch (err) {
      
      showError(err.message || 'Failed to submit card status request');
    } finally {
      setUpdatingCardId(null);
    }
  };

  const closeCard = (cardId, cardNumber) => {
    const last4 = cardNumber ? String(cardNumber).slice(-4) : '----';
    setModal({
      open: true,
      cardId,
      title: 'Close Card',
      message: `Are you sure you want to close the card ending with ${last4}? This will remove it from your cards list.`,
      confirmText: 'Close',
      cancelText: 'Cancel',
    });
  };

  const openVirtualCard = (cardId) => {
    setVisibleCvvs((prevVisibleCvvs) => {
      const updatedVisibleCvvs = new Set(prevVisibleCvvs);
      updatedVisibleCvvs.delete(cardId);
      return updatedVisibleCvvs;
    });
    setVirtualCardId(cardId);
  };

  const closeVirtualCard = () => {
    setVirtualCardId(null);
  };

  const hideCvvForCard = (cardId) => {
    setVisibleCvvs((prevVisibleCvvs) => {
      if (!prevVisibleCvvs.has(cardId)) return prevVisibleCvvs;
      const updatedVisibleCvvs = new Set(prevVisibleCvvs);
      updatedVisibleCvvs.delete(cardId);
      return updatedVisibleCvvs;
    });
  };

  const selectedVirtualCard = cards.find((card) => getCardId(card) === virtualCardId) || null;

  const handleModalConfirm = async () => {
    if (!modal.cardId) {
      setModal({ open: false });
      return;
    }

    try {
      setClosingCardId(modal.cardId);
      const res = await api.cards.updateStatus(modal.cardId, { status: 'closed' });
      if (res.success) {
        setModal({ open: false });
        await loadCards();
      } else {
        showError(res.error || 'Failed to close card');
        setModal({ open: false });
      }
    } catch (err) {
      
      showError(err.message || 'Failed to close card');
      setModal({ open: false });
    } finally {
      setClosingCardId(null);
    }
  };

  const handleModalCancel = () => {
    setModal({ open: false });
  };

  return (
    <div className="container cards-page cards-main-container">
      <div className="cards-header">
        <h1 className="cards-header-title">Card Management</h1>
        <p className="cards-header-subtitle">Manage your debit and credit cards</p>
      </div>

      <CardsStats cards={cards} />

      <div className="cards-add-wrap">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary cards-add-btn"
        >
          <Plus size={20} />
          {showAddForm ? 'Cancel' : 'Add New Card'}
        </button>
      </div>

      {showAddForm && (
        <AddCardForm
          formData={formData}
          setFormData={setFormData}
          showPin={showPin}
          setShowPin={setShowPin}
          handleSubmit={handleSubmit}
          isSubmitting={creatingCard}
        />
      )}

      <div className="card cards-list-card">
        <h3 className="cards-list-title">Your Cards</h3>
        <CardsList
          cards={cards}
          visibleCards={visibleCards}
          visibleCvvs={visibleCvvs}
          formatCardNumber={formatCardNumber}
          toggleCardVisibility={toggleCardVisibility}
          toggleCardLock={toggleCardLock}
          toggleCvvVisibility={toggleCvvVisibility}
          showVirtualCard={openVirtualCard}
          closeCard={closeCard}
          updatingCardId={updatingCardId}
          closingCardId={closingCardId}
        />
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onCancel={handleModalCancel}
        onConfirm={handleModalConfirm}
      />
      <PinModal
        show={showCvvPinModal}
        pin={cvvPin}
        pinError={cvvPinError}
        pinVerifying={cvvPinVerifying}
        setPin={setCvvPin}
        onCancel={closeCvvPinModal}
        onConfirm={verifyCvvPin}
      />
      <VirtualCardModal
        show={!!selectedVirtualCard}
        card={selectedVirtualCard}
        cardNumberVisible={selectedVirtualCard ? visibleCards.has(getCardId(selectedVirtualCard)) : false}
        cvvVisible={selectedVirtualCard ? visibleCvvs.has(getCardId(selectedVirtualCard)) : false}
        onToggleCardNumber={() => selectedVirtualCard && toggleCardVisibility(getCardId(selectedVirtualCard))}
        onToggleCvv={() => selectedVirtualCard && toggleCvvVisibility(getCardId(selectedVirtualCard))}
        onResetCvvVisibility={() => selectedVirtualCard && hideCvvForCard(getCardId(selectedVirtualCard))}
        onClose={closeVirtualCard}
      />
    </div>
  );
};

export default Cards;



