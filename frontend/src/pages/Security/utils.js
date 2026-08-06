export const SECURITY_QUESTIONS = [
  "What was your first pet's name?",
  'What city were you born in?',
  'What was your first car?',
  "What is your mother's maiden name?"
];

export const INITIAL_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export const INITIAL_PIN_FORM = {
  currentPin: '',
  newPin: '',
  confirmPin: ''
};

export const INITIAL_ACCOUNT_PIN_FORM = {
  currentPin: '',
  newPin: '',
  confirmPin: ''
};

export const INITIAL_SECURITY_QUESTIONS_FORM = {
  question1: '',
  answer1: '',
  question2: '',
  answer2: ''
};

export const validatePasswordForm = (passwordForm) => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    return 'New passwords do not match';
  }

  if (passwordForm.newPassword.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  if (!strongPassword.test(passwordForm.newPassword)) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }

  return '';
};

export const validatePinForm = ({ selectedCardId, cards, pinForm }) => {
  if (!selectedCardId) {
    return 'Please select a card to change its PIN.';
  }

  const targetCard = cards.find((card) => String(card._id || card.id) === selectedCardId);
  if (targetCard && targetCard.status !== 'active') {
    return 'The selected card is not active. Activate the card before changing its PIN.';
  }

  if (!/^\d{4,6}$/.test(pinForm.newPin)) {
    return 'PIN must be 4 to 6 digits';
  }

  if (pinForm.newPin !== pinForm.confirmPin) {
    return 'New PINs do not match';
  }

  return '';
};

export const validateAccountPinForm = (accountPinForm) => {
  if (!/^\d{4,6}$/.test(accountPinForm.currentPin)) {
    return 'Current account PIN must be 4 to 6 digits';
  }

  if (!/^\d{4,6}$/.test(accountPinForm.newPin)) {
    return 'New account PIN must be 4 to 6 digits';
  }

  if (accountPinForm.newPin !== accountPinForm.confirmPin) {
    return 'New account PINs do not match';
  }

  if (accountPinForm.currentPin === accountPinForm.newPin) {
    return 'New account PIN must be different from current PIN';
  }

  return '';
};

export const getRecentLoginHistory = (clientDataState) => {
  const history = clientDataState.loginHistory || [];
  return history.slice(-10);
};
