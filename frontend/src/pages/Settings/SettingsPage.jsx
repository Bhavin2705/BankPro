import { useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import { api, API_BASE_URL } from '../../utils/api';
import AccountsTab from './components/AccountsTab';
import BankTab from './components/BankTab';
import PreferencesTab from './components/PreferencesTab';
import ProfileTab from './components/ProfileTab';
import SecurityTab from './components/SecurityTab';
import SessionsTab from './components/SessionsTab';
import SettingsTabs from './components/SettingsTabs';
import { getTranslation } from '../../utils/i18n';
import '../../styles/pages/Settings.css';
import {
  getInitialBankData,
  getInitialPreferencesData,
  getInitialProfileData
} from './utils';

const Settings = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState({
    profile: false, preferences: false, twoFactor: false, bank: false, accounts: false, sessions: false, bootstrap: false
  });
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [sessions, setSessions] = useState(null);
  const [profileData, setProfileData] = useState(getInitialProfileData(user));
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [profilePhotoVersion, setProfilePhotoVersion] = useState(0);
  const [kycStatus, setKycStatus] = useState(user?.kyc || { status: 'unverified' });
  const [kycForm, setKycForm] = useState({ idType: 'aadhaar', idNumber: '', documents: [] });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [bankData, setBankData] = useState(getInitialBankData(user));
  const [preferencesData, setPreferencesData] = useState(getInitialPreferencesData(user));
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.security?.twoFactorEnabled || false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setProfileData(getInitialProfileData(user));
    setProfilePhotoFile(null);
    setProfilePhotoPreview('');
    setProfilePhotoError(false);
    setProfilePhotoVersion(0);
    setKycStatus(user?.kyc || { status: 'unverified' });
    setKycForm({ idType: 'aadhaar', idNumber: '', documents: [] });
    setBankData(getInitialBankData(user));
    setPreferencesData(getInitialPreferencesData(user));
    setTwoFactorEnabled(user.security?.twoFactorEnabled || false);
  }, [user]);

  useEffect(() => {
    const loadSettingsData = async () => {
      setLoading((prev) => ({ ...prev, bootstrap: true }));

      try {
        const [settingsRes, accountsRes, sessionsRes] = await Promise.all([
          api.settings.getAll(),
          api.settings.getLinkedAccounts(),
          api.settings.getSessions()
        ]);

        if (settingsRes?.success && settingsRes?.data) {
          const settings = settingsRes.data;

          setProfileData((prev) => ({
            ...prev,
            name: settings.profile?.name ?? prev.name,
            email: settings.profile?.email ?? prev.email,
            phone: settings.profile?.phone ?? prev.phone,
            photoUrl: settings.profile?.photoUrl ?? prev.photoUrl,
            dateOfBirth: settings.profile?.dateOfBirth
              ? new Date(settings.profile.dateOfBirth).toISOString().slice(0, 10)
              : '',
            occupation: settings.profile?.occupation ?? prev.occupation,
            address: typeof settings.profile?.address === 'object'
              ? settings.profile.address?.street || ''
              : settings.profile?.address || ''
          }));
          setProfilePhotoError(false);
          if (settings.kyc) setKycStatus(settings.kyc);

          setBankData((prev) => ({
            ...prev,
            bankName: settings.bank?.bankName ?? prev.bankName,
            ifscCode: settings.bank?.ifscCode ?? prev.ifscCode,
            branchName: settings.bank?.branchName ?? prev.branchName
          }));

          setPreferencesData((prev) => ({
            ...prev,
            currency: settings.preferences?.currency ?? prev.currency,
            language: settings.preferences?.language ?? prev.language,
            theme: settings.preferences?.theme ?? prev.theme,
            notifications: {
              email: settings.preferences?.notifications?.email ?? prev.notifications.email,
              sms: settings.preferences?.notifications?.sms ?? prev.notifications.sms,
              push: settings.preferences?.notifications?.push ?? prev.notifications.push
            }
          }));

          setTwoFactorEnabled(settings.security?.twoFactorEnabled || false);
        }

        if (accountsRes?.success) setLinkedAccounts(accountsRes.data || []);
        if (sessionsRes?.success) setSessions(sessionsRes.data || null);
      } catch {
        setError('Failed to load settings. Please refresh.');
        showError('Failed to load settings. Please refresh.');
      } finally {
        setLoading((prev) => ({ ...prev, bootstrap: false }));
      }
    };

    loadSettingsData();
  }, []);

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target;
      if (target.type !== 'submit' && target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    return true;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading((prev) => ({ ...prev, profile: true }));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      showError('Please enter a valid email address');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!profileData.name || profileData.name.trim().length < 2 || !nameRegex.test(profileData.name.trim())) {
      showError('Please enter a valid full name');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (profileData.phone && !phoneRegex.test(profileData.phone.replace(/\D/g, ''))) {
      showError('Please enter a valid 10-digit phone number');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    if (profileData.dateOfBirth) {
      const dob = new Date(profileData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime())) {
        showError('Please select a valid date of birth');
        setLoading((prev) => ({ ...prev, profile: false }));
        return;
      }
      if (dob > today) {
        showError('Date of birth cannot be in the future');
        setLoading((prev) => ({ ...prev, profile: false }));
        return;
      }
    }

    if (profileData.occupation && profileData.occupation.trim().length > 50) {
      showError('Occupation must be 50 characters or less');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    if (profileData.address && profileData.address.trim().length > 120) {
      showError('Address must be 120 characters or less');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    try {
      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        occupation: profileData.occupation
      };

      if (profileData.dateOfBirth) {
        payload.dateOfBirth = profileData.dateOfBirth;
      }

      const result = await api.auth.updateDetails(payload);

      if (result.success) {
        onUserUpdate(result.data);
        showSuccess('Profile updated successfully!');
      } else {
        showError(result.error || 'Failed to update profile');
      }
    } catch (profileError) {
      console.error('Profile update error:', profileError);
      showError('Failed to update profile. Please try again.');
    }

    setLoading((prev) => ({ ...prev, profile: false }));
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading((prev) => ({ ...prev, preferences: true }));

    try {
      const result = await api.settings.updatePreferences(preferencesData);
      if (result.success) {
        onUserUpdate({
          ...user,
          preferences: result.data
        });
        showSuccess('Preferences updated successfully!');
      } else {
        showError(result.error || 'Failed to update preferences');
      }
    } catch (preferencesError) {
      console.error('Preferences update error:', preferencesError);
      showError('Failed to update preferences. Please try again.');
    }

    setLoading((prev) => ({ ...prev, preferences: false }));
  };

  const handleTwoFactorToggle = async () => {
    setLoading((prev) => ({ ...prev, twoFactor: true }));

    try {
      const result = await api.settings.updateTwoFactor({ enable: !twoFactorEnabled });
      if (result.success) {
        setTwoFactorEnabled(!twoFactorEnabled);
        showSuccess(`Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'} successfully!`);
      } else {
        showError(result.error || 'Failed to update two-factor settings');
      }
    } catch (twoFactorError) {
      console.error('Two-factor toggle error:', twoFactorError);
      showError('Failed to update two-factor settings. Please try again.');
    }

    setLoading((prev) => ({ ...prev, twoFactor: false }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankUpdate = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, bank: true }));

    try {
      const result = await api.auth.updateDetails({
        bankName: bankData.bankName,
        ifscCode: bankData.ifscCode,
        branchName: bankData.branchName
      });

      if (result?.success) {
        onUserUpdate(result.data);
        showSuccess('Bank details updated successfully!');
      } else {
        showError(result?.error || 'Failed to update bank details');
      }
    } catch (bankError) {
      console.error('Bank update error:', bankError);
      showError('Failed to update bank details. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, bank: false }));
    }
  };

  const refreshSessions = async (showToast = false) => {
    setLoading((prev) => ({ ...prev, sessions: true }));
    try {
      const result = await api.settings.getSessions();
      if (result?.success) {
        setSessions(result.data || null);
        if (showToast) showSuccess('Session data refreshed');
      } else if (showToast) {
        showError(result?.error || 'Failed to refresh session data');
      }
    } catch (sessionError) {
      console.error('Session refresh error:', sessionError);
      if (showToast) showError('Failed to refresh session data');
    } finally {
      setLoading((prev) => ({ ...prev, sessions: false }));
    }
  };

  const refreshLinkedAccounts = async (showToast = false) => {
    setLoading((prev) => ({ ...prev, accounts: true }));
    try {
      const result = await api.settings.getLinkedAccounts();
      if (result?.success) {
        setLinkedAccounts(result.data || []);
        if (showToast) showSuccess('Linked accounts refreshed');
      } else if (showToast) {
        showError(result?.error || 'Failed to refresh linked accounts');
      }
    } catch (accountsError) {
      console.error('Accounts refresh error:', accountsError);
      if (showToast) showError('Failed to refresh linked accounts');
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  };

  const handleCardStatusToggle = async (card) => {
    const cardId = card?._id || card?.id;
    const currentStatus = card?.status;
    if (!cardId) return;

    if (currentStatus === 'closed') {
      showError('Closed cards cannot be reopened');
      return;
    }

    if (currentStatus === 'blocked') {
      showError('This card is blocked by bank. Please contact bank support.');
      return;
    }
    if (currentStatus === 'lost' || currentStatus === 'expired') {
      showError('This card status cannot be changed.');
      return;
    }
    if (card?.statusRequest?.status === 'pending') {
      showError('A lock/unlock request is already pending review.');
      return;
    }

    setLoading((prev) => ({ ...prev, accounts: true }));

    try {
      const result = await api.cards.requestStatusChange(cardId);
      if (result?.success) {
        showSuccess(result.message || 'Request submitted. Bank will review your card status change.');
        await refreshLinkedAccounts(false);
      } else {
        showError(result?.error || 'Failed to submit card status request');
      }
    } catch (cardStatusError) {
      console.error('Card status update error:', cardStatusError);
      showError('Failed to submit card status request. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleKycChange = (field, value) => {
    setKycForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleKycDocuments = (files) => {
    const selected = Array.from(files || []).filter((file) => (
      file.type.startsWith('image/')
    ));
    setKycForm((prev) => ({ ...prev, documents: selected.slice(0, 3) }));
  };

  const submitKyc = async () => {
    if (kycSubmitting) return;
    if (!kycForm.documents.length) {
      showError('Please upload at least one document image');
      return;
    }
    setKycSubmitting(true);
    try {
      const result = await api.kyc.submit(kycForm);
      if (result?.success) {
        const nextStatus = result.data;
        setKycStatus(nextStatus);
        onUserUpdate({ ...user, kyc: nextStatus });
        showSuccess('Verification submitted successfully');
      } else {
        showError(result?.error || 'Failed to submit verification');
      }
    } catch (error) {
      console.error('KYC submit error:', error);
      showError(error.message || 'Failed to submit verification');
    } finally {
      setKycSubmitting(false);
    }
  };

  const detectLocation = async () => {
    if (locatingAddress) return;
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser');
      return;
    }
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords || {};
        if (latitude === undefined || longitude === undefined) {
          showError('Unable to read your location');
          setLocatingAddress(false);
          return;
        }
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }
        const data = await response.json();
        const address = data?.display_name || '';
        if (!address) {
          showError('Could not determine address from location');
        } else {
          setProfileData((prev) => ({ ...prev, address }));
          showSuccess('Address detected from your location');
        }
      } catch (error) {
        console.error('Location detect error:', error);
        showError('Unable to detect address. Please enter it manually.');
      } finally {
        setLocatingAddress(false);
      }
    }, (error) => {
      console.error('Geolocation error:', error);
      showError('Location permission denied or unavailable');
      setLocatingAddress(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    });
  };

  const getAbsolutePhotoUrl = (photoUrl, version) => {
    if (!photoUrl) return '';
    if (String(photoUrl).startsWith('blob:') || String(photoUrl).startsWith('data:')) {
      return photoUrl;
    }
    const hasQuery = String(photoUrl).includes('?');
    const suffix = version ? `${hasQuery ? '&' : '?'}v=${version}` : '';
    if (/^https?:\/\//i.test(photoUrl)) return `${photoUrl}${suffix}`;
    const base = API_BASE_URL.replace('/api', '');
    return `${base}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}${suffix}`;
  };

  const handleProfilePhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('Image is too large. Max size is 2MB.');
      return;
    }
    setProfilePhotoFile(file);
    setProfilePhotoError(false);
    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  const handleProfilePhotoUpload = async () => {
    if (!profilePhotoFile) {
      showError('Please select a photo first');
      return;
    }
    setProfilePhotoUploading(true);
    try {
      const result = await api.users.uploadProfilePhoto(profilePhotoFile);
      if (result?.success) {
        onUserUpdate(result.data);
        setProfileData((prev) => ({
          ...prev,
          photoUrl: result.data?.profile?.photoUrl || prev.photoUrl
        }));
        setProfilePhotoFile(null);
        setProfilePhotoPreview('');
        setProfilePhotoError(false);
        setProfilePhotoVersion(Date.now());
        showSuccess('Profile photo updated successfully!');
      } else {
        showError(result?.error || 'Failed to upload profile photo');
      }
    } catch (uploadError) {
      console.error('Profile photo upload error:', uploadError);
      setProfilePhotoError(true);
      showError(uploadError.message || 'Failed to upload profile photo');
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handlePreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setPreferencesData((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: checked
        }
      }));
      return;
    }

    if (name === 'theme') {
      document.documentElement.setAttribute('data-theme', value === 'dark' ? 'dark' : 'light');
    }

    setPreferencesData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetPreferences = () => {
    const initial = getInitialPreferencesData(user);
    setPreferencesData(initial);
    document.documentElement.setAttribute('data-theme', initial.theme === 'dark' ? 'dark' : 'light');
    showSuccess('Restored saved preferences');
  };

  const currentLang = preferencesData.language || user?.preferences?.language || 'en';

  return (
    <div className="container settings-page">
      <div className="settings-page-header">
        <h1 className="settings-page-title">{getTranslation('accountSettings', currentLang)}</h1>
        <p className="settings-page-subtitle">{getTranslation('manageAccountPreferences', currentLang)}</p>
      </div>

      <div className="card">
        <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} currentLang={currentLang} />

        {error && (
          <div className="error-message settings-flash">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message settings-flash">
            {message}
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            profileData={profileData}
            setProfileData={setProfileData}
            profilePhotoPreview={profilePhotoPreview}
            profilePhotoUploading={profilePhotoUploading}
            profilePhotoError={profilePhotoError}
            profilePhotoVersion={profilePhotoVersion}
            onProfilePhotoError={() => setProfilePhotoError(true)}
            onProfilePhotoSelect={handleProfilePhotoSelect}
            onProfilePhotoUpload={handleProfilePhotoUpload}
            getAbsolutePhotoUrl={getAbsolutePhotoUrl}
            kycStatus={kycStatus}
            kycForm={kycForm}
            onKycChange={handleKycChange}
            onKycDocuments={handleKycDocuments}
            onSubmitKyc={submitKyc}
            kycSubmitting={kycSubmitting}
            onDetectLocation={detectLocation}
            locatingAddress={locatingAddress}
            handleProfileChange={handleProfileChange}
            handleProfileUpdate={handleProfileUpdate}
            handleFormKeyDown={handleFormKeyDown}
          />
        )}
        {activeTab === 'bank' && (
          <BankTab
            user={user}
            bankData={bankData}
            handleFormKeyDown={handleFormKeyDown}
            handleBankChange={handleBankChange}
            handleBankUpdate={handleBankUpdate}
            loading={loading.bank}
          />
        )}
        {activeTab === 'preferences' && (
          <PreferencesTab
            preferencesData={preferencesData}
            handlePreferencesChange={handlePreferencesChange}
            handlePreferencesUpdate={handlePreferencesUpdate}
            handleResetPreferences={handleResetPreferences}
            loading={loading.preferences}
          />
        )}
        {activeTab === 'security' && (
          <SecurityTab
            loading={loading.twoFactor}
            twoFactorEnabled={twoFactorEnabled}
            handleTwoFactorToggle={handleTwoFactorToggle}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountsTab
            linkedAccounts={linkedAccounts}
            loading={loading.accounts || loading.bootstrap}
            onRefresh={refreshLinkedAccounts}
            onToggleCardStatus={handleCardStatusToggle}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            loading={loading.sessions || loading.bootstrap}
            onRefresh={refreshSessions}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;


