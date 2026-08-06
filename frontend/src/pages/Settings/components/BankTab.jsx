import { Building2 } from 'lucide-react';
import { getTranslation } from '../../../utils/i18n';

const BankTab = ({ lang = 'en', user, bankData, handleFormKeyDown, handleBankChange, handleBankUpdate, loading }) => (
  <div>
    <h3 className="settings-section-title">
      <Building2 size={20} />
      {getTranslation('bankInformation', lang)}
    </h3>

    <form onKeyDown={handleFormKeyDown} onSubmit={handleBankUpdate}>
      <div className="settings-grid-300">
        <div className="form-group">
          <label className="form-label">{getTranslation('bank', lang)} Name</label>
          <input
            type="text"
            name="bankName"
            className="form-input"
            value={bankData.bankName}
            onChange={handleBankChange}
            placeholder="e.g. BankPro"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">IFSC Code</label>
          <input
            type="text"
            name="ifscCode"
            className="form-input"
            value={bankData.ifscCode}
            onChange={(e) => {
              handleBankChange({
                target: {
                  name: 'ifscCode',
                  value: e.target.value.toUpperCase()
                }
              });
            }}
            placeholder="e.g. SBIN0001234"
            maxLength={11}
            required
          />
          <small className="settings-help-text">
            {getTranslation('bankHelpText', lang)}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslation('branchName', lang)}</label>
          <input
            type="text"
            name="branchName"
            className="form-input"
            value={bankData.branchName}
            onChange={handleBankChange}
          />
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

      <div className="info-box">
        {getTranslation('bankImportantNote', lang)}
      </div>
      <button type="submit" className="btn btn-primary settings-top-gap" disabled={loading}>
        {loading ? getTranslation('saving', lang) : getTranslation('saveBankDetails', lang)}
      </button>
    </form>
  </div>
);

export default BankTab;
