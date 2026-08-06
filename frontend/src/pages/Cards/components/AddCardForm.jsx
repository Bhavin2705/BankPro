import { Eye, EyeOff } from 'lucide-react';

const AddCardForm = ({ formData, setFormData, showPin, setShowPin, handleSubmit, isSubmitting = false }) => (
  <div className="card cards-add-form">
    <h3 className="cards-section-title">Add New Card</h3>
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Card Type</label>
        <select
          name="cardType"
          className="form-input"
          value={formData.cardType}
          onChange={(e) => setFormData({ ...formData, cardType: e.target.value })}
          required
        >
          <option value="debit">Debit Card</option>
          <option value="credit">Credit Card</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Card Brand</label>
        <select
          name="cardBrand"
          className="form-input"
          value={formData.cardBrand || 'visa'}
          onChange={(e) => setFormData({ ...formData, cardBrand: e.target.value })}
        >
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="rupay">RuPay</option>
          <option value="amex">American Express</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Card Name</label>
        <input
          type="text"
          name="cardName"
          className="form-input"
          value={formData.cardName}
          onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
          placeholder="Enter card name"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Set 4-6 Digit PIN</label>
        <div className="cards-pin-input-wrap">
          <input
            type={showPin ? 'text' : 'password'}
            name="pin"
            className="form-input"
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })}
            placeholder="Enter 4-6 digit PIN"
            maxLength="6"
            inputMode="numeric"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="cards-pin-toggle-btn"
            title={showPin ? 'Hide PIN' : 'Show PIN'}
            disabled={isSubmitting}
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Card...' : 'Create Card'}
      </button>
    </form>
  </div>
);

export default AddCardForm;
