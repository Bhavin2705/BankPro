import { toLocalYYYYMMDD } from '../../utils/date';

const getAddressValue = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') return address.street || '';
  return '';
};

export const getInitialProfileData = (user) => ({
  name: user.name || '',
  email: user.email || '',
  phone: user.phone || '',
  photoUrl: user.profile?.photoUrl || '',
  address: getAddressValue(user.profile?.address),
  dateOfBirth: user.profile?.dateOfBirth ? toLocalYYYYMMDD(new Date(user.profile.dateOfBirth)) : '',
  occupation: user.profile?.occupation || ''
});

export const getInitialBankData = (user) => ({
  bankName: user.bankDetails?.bankName || 'BankPro',
  ifscCode: user.bankDetails?.ifscCode || 'BANK0001234',
  branchName: user.bankDetails?.branchName || ''
});

export const getInitialPreferencesData = (user) => ({
  currency: user.preferences?.currency || 'INR',
  language: user.preferences?.language || 'en',
  theme: user.preferences?.theme || 'light',
  notifications: {
    email: user.preferences?.notifications?.email !== false,
    sms: user.preferences?.notifications?.sms !== false,
    push: user.preferences?.notifications?.push !== false
  }
});

