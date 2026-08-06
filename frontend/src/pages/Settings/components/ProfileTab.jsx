import { Mail, MapPin, Phone, User } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';
import { toLocalYYYYMMDD } from '../../../utils/date';
import { getTranslation } from '../../../utils/i18n';

const ProfileTab = ({
  lang = 'en',
  user,
  profileData,
  setProfileData,
  profilePhotoPreview,
  profilePhotoUploading,
  profilePhotoError,
  profilePhotoVersion,
  onProfilePhotoError,
  onProfilePhotoSelect,
  onProfilePhotoUpload,
  getAbsolutePhotoUrl,
  kycStatus,
  kycForm,
  onKycChange,
  onKycDocuments,
  onSubmitKyc,
  kycSubmitting,
  onDetectLocation,
  locatingAddress,
  handleProfileChange,
  handleProfileUpdate,
  handleFormKeyDown
}) => (
  <div>
    <h3 className="settings-section-title">
      <User size={20} />
      {getTranslation('profileInformation', lang)}
    </h3>

    <div className="settings-avatar-row">
      <div className="settings-avatar">
        {(() => {
          const photoUrl = profilePhotoPreview || profileData.photoUrl || user.profile?.photoUrl;
          const resolvedUrl = photoUrl ? getAbsolutePhotoUrl(photoUrl, profilePhotoVersion) : '';
          const initials = (user.name || profileData.name || 'U')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('');

          return resolvedUrl && !profilePhotoError ? (
            <img
              src={resolvedUrl}
              alt="Profile"
              className="settings-avatar-img"
              onError={onProfilePhotoError}
            />
          ) : (
            <span className="settings-avatar-initials">{initials || 'U'}</span>
          );
        })()}
      </div>
      <div className="settings-avatar-actions">
        <input
          id="profile-photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="settings-file-input"
          onChange={(event) => onProfilePhotoSelect(event.target.files?.[0])}
        />
        <div className="settings-avatar-buttons">
          <label htmlFor="profile-photo-input" className="btn btn-secondary settings-avatar-btn">
            {profilePhotoUploading ? getTranslation('uploading', lang) : getTranslation('choosePhoto', lang)}
          </label>
        </div>
        <div className="settings-help-text">{getTranslation('photoSpecs', lang)}</div>
      </div>
    </div>

    <form onSubmit={handleProfileUpdate} onKeyDown={handleFormKeyDown}>
      <div className="settings-grid-300">
        <div className="form-group">
          <label className="form-label">{getTranslation('fullName', lang)}</label>
          <input
            type="text"
            name="name"
            className="form-input"
            value={profileData.name}
            onChange={handleProfileChange}
            maxLength={60}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('emailAddress', lang)}</label>
          <div className="settings-input-icon-wrap">
            <input
              type="email"
              name="email"
              className="form-input settings-input-icon-pad"
              value={profileData.email}
              onChange={handleProfileChange}
              required
            />
            <Mail size={18} className="settings-input-icon" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('phoneNumber', lang)}</label>
          <div className="settings-input-icon-wrap">
            <input
              type="tel"
              name="phone"
              className="form-input settings-input-icon-pad"
              value={profileData.phone}
              onChange={handleProfileChange}
              placeholder={getTranslation('phonePlaceholder', lang)}
              inputMode="tel"
              maxLength={18}
            />
            <Phone size={18} className="settings-input-icon" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('dateOfBirth', lang)}</label>
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <CustomCalendar
              value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null}
              onChange={(date) => {
                setProfileData({ ...profileData, dateOfBirth: date ? toLocalYYYYMMDD(date) : '' });
              }}
              placeholder={getTranslation('dobPlaceholder', lang)}
              maxDate={new Date()}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('occupation', lang)}</label>
          <input
            type="text"
            name="occupation"
            className="form-input"
            value={profileData.occupation}
            onChange={handleProfileChange}
            placeholder={getTranslation('occupationPlaceholder', lang)}
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('address', lang)}</label>
          <div className="settings-input-icon-wrap">
            <input
              type="text"
              name="address"
              className="form-input settings-input-icon-pad"
              value={profileData.address}
              onChange={handleProfileChange}
              placeholder={getTranslation('addressPlaceholder', lang)}
              maxLength={120}
            />
            <button
              type="button"
              className="settings-input-icon-btn"
              onClick={onDetectLocation}
              title={getTranslation('detectLocationTitle', lang)}
              disabled={locatingAddress}
            >
              <MapPin size={18} className="settings-input-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="form-group settings-top-gap">
        <label className="form-label">{getTranslation('accountNumber', lang)}</label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={user.accountNumber || getTranslation('notAssigned', lang)}
          disabled
        />
      </div>

      <button type="submit" className="btn btn-primary">
        {getTranslation('updateProfile', lang)}
      </button>
    </form>

    <div className="settings-kyc-card">
      <h3 className="settings-section-title settings-no-margin">
        <User size={20} />
        {getTranslation('verification', lang)}
      </h3>
      <p className="settings-kyc-subtitle">
        {getTranslation('verificationSubtitle', lang)}
      </p>
      <div className={`settings-kyc-status is-${kycStatus?.status || 'unverified'}`}>
        {getTranslation('statusLabel', lang)}: {kycStatus?.status || 'unverified'}
        {kycStatus?.rejectionReason && (
          <span className="settings-kyc-reason">{getTranslation('reasonLabel', lang)}: {kycStatus.rejectionReason}</span>
        )}
      </div>

      <div className="settings-kyc-grid">
        <div className="form-group">
          <label className="form-label">{getTranslation('idType', lang)}</label>
          <select
            className="form-input"
            value={kycForm.idType}
            onChange={(event) => onKycChange('idType', event.target.value)}
          >
            <option value="aadhaar">Aadhaar</option>
            <option value="pan">PAN</option>
            <option value="passport">Passport</option>
            <option value="driver_license">Driver License</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{getTranslation('idNumberOptional', lang)}</label>
          <input
            type="text"
            className="form-input"
            value={kycForm.idNumber}
            onChange={(event) => onKycChange('idNumber', event.target.value)}
            placeholder={getTranslation('enterIdNumber', lang)}
          />
        </div>
        <div className="form-group settings-kyc-upload">
          <label className="form-label">{getTranslation('uploadDocuments', lang)}</label>
          <div className="settings-kyc-upload-row">
            <label className="btn btn-secondary settings-kyc-upload-btn">
              {getTranslation('chooseFiles', lang)}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => onKycDocuments(event.target.files)}
                className="settings-kyc-file-input"
              />
            </label>
            <span className="settings-kyc-upload-text">
              {kycForm.documents.length ? `${kycForm.documents.length} ${getTranslation('filesSelected', lang)}` : getTranslation('noFilesSelected', lang)}
            </span>
          </div>
          {kycForm.documents.length > 0 && (
            <div className="settings-kyc-files">
              {kycForm.documents.map((file) => (
                <span key={file.name}>{file.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={onSubmitKyc}
        disabled={kycSubmitting || kycStatus?.status === 'pending'}
      >
        {kycSubmitting ? getTranslation('submitting', lang) : (kycStatus?.status === 'pending' ? getTranslation('verificationPending', lang) : getTranslation('submitVerification', lang))}
      </button>
    </div>
  </div>
);

export default ProfileTab;
