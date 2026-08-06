import { Mail, MapPin, Phone, User } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';
import { toLocalYYYYMMDD } from '../../../utils/date';

const ProfileTab = ({
  user,
  profileData,
  setProfileData,
  profilePhotoPreview,
  profilePhotoUploading,
  profilePhotoError,
  profilePhotoVersion,
  onProfilePhotoError,
  onProfilePhotoSelect,
  getAbsolutePhotoUrl,
  kycStatus,
  kycForm,
  onKycTypeChange,
  onKycNumberChange,
  onKycNumberBeforeInput,
  onKycNumberPaste,
  onKycDocuments,
  onSubmitKyc,
  kycSubmitting,
  kycInput,
  onDetectLocation,
  locatingAddress,
  handleProfileChange,
  handleProfileUpdate,
  handleFormKeyDown
}) => (
  <div>
    <h3 className="settings-section-title">
      <User size={20} />
      Profile Information
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
            {profilePhotoUploading ? 'Uploading...' : 'Choose Photo'}
          </label>
        </div>
        <div className="settings-help-text">JPEG, PNG or WEBP. Max 2MB.</div>
      </div>
    </div>

    <form onSubmit={handleProfileUpdate} onKeyDown={handleFormKeyDown}>
      <div className="settings-grid-300">
        <div className="form-group">
          <label className="form-label">Full Name</label>
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
          <label className="form-label">Email Address</label>
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
          <label className="form-label">Phone Number</label>
          <div className="settings-input-icon-wrap">
            <input
              type="tel"
              name="phone"
              className="form-input settings-input-icon-pad"
              value={profileData.phone}
              onChange={handleProfileChange}
              placeholder="Enter phone number (e.g. +91 9876543210)"
              inputMode="tel"
              maxLength={18}
            />
            <Phone size={18} className="settings-input-icon" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth</label>
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
              placeholder="Select date of birth (DD/MM/YYYY)"
              maxDate={new Date()}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Occupation</label>
          <input
            type="text"
            name="occupation"
            className="form-input"
            value={profileData.occupation}
            onChange={handleProfileChange}
            placeholder="Enter your occupation"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <div className="settings-input-icon-wrap">
            <input
              type="text"
              name="address"
              className="form-input settings-input-icon-pad"
              value={profileData.address}
              onChange={handleProfileChange}
              placeholder="Enter your address"
              maxLength={120}
            />
            <button
              type="button"
              className="settings-input-icon-btn"
              onClick={onDetectLocation}
              title="Detect my location"
              disabled={locatingAddress}
            >
              <MapPin size={18} className="settings-input-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="form-group settings-top-gap">
        <label className="form-label">Account Number</label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={user.accountNumber || 'Not assigned'}
          disabled
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Update Profile
      </button>
    </form>

    <div className="settings-kyc-card">
      <h3 className="settings-section-title settings-no-margin">
        <User size={20} />
        KYC Verification
      </h3>
      <p className="settings-kyc-subtitle">
        Submit your Aadhaar, PAN, or Voter ID for account verification.
      </p>
      <div className={`settings-kyc-status is-${kycStatus?.status || 'unverified'}`}>
        Status: {kycStatus?.status || 'unverified'}
        {kycStatus?.rejectionReason && (
          <span className="settings-kyc-reason">Reason: {kycStatus.rejectionReason}</span>
        )}
      </div>

      <div className="settings-kyc-grid">
        <div className="form-group">
          <label className="form-label">ID Type</label>
          <select
            className="form-input"
            value={kycForm.idType}
            onChange={(event) => onKycTypeChange(event.target.value)}
          >
            <option value="aadhaar">Aadhaar</option>
            <option value="pan">PAN</option>
            <option value="voter">Voter ID</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">ID Number</label>
          <input
            type="text"
            className="form-input"
            value={kycForm.idNumber}
            onBeforeInput={onKycNumberBeforeInput}
            onPaste={onKycNumberPaste}
            onChange={(event) => onKycNumberChange(event.target.value)}
            placeholder={kycInput.placeholder}
            inputMode={kycInput.inputMode}
            maxLength={kycInput.maxLength}
            pattern={kycInput.pattern}
            required
          />
          <small className="settings-help-text">{kycInput.helpText}</small>
        </div>
        <div className="form-group settings-kyc-upload">
          <label className="form-label">Upload Documents</label>
          <div className="settings-kyc-upload-row">
            <label className="btn btn-secondary settings-kyc-upload-btn">
              Choose Files
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => onKycDocuments(event.target.files)}
                className="settings-kyc-file-input"
              />
            </label>
            <span className="settings-kyc-upload-text">
              {kycForm.documents.length ? `${kycForm.documents.length} file(s) selected` : 'No files selected'}
            </span>
          </div>
          {kycForm.documents.length > 0 && (
            <div className="settings-kyc-files">
              {kycForm.documents.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
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
        {kycSubmitting ? 'Submitting...' : (kycStatus?.status === 'pending' ? 'Verification Pending' : 'Submit Verification')}
      </button>
    </div>
  </div>
);

export default ProfileTab;
