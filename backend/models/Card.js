const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const cardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    cardNumber: { type: String, required: true, unique: true },
    cardType: { type: String, enum: ['debit', 'credit'], required: true },
    cardBrand: { type: String, enum: ['visa', 'mastercard', 'rupay', 'amex'], required: true },
    cardName: { type: String, required: true, maxlength: 50 },
    expiryMonth: { type: Number, required: true, min: 1, max: 12 },
    expiryYear: { type: Number, required: true, min: new Date().getFullYear() },
    cvvEncrypted: { type: String, select: false },
    cvvIv: { type: String, select: false },
    cvvTag: { type: String, select: false },
    pin: { type: String, select: false },
    status: { type: String, enum: ['active', 'inactive', 'blocked', 'expired', 'lost', 'closed'], default: 'active' },
    statusRequest: {
        requestedStatus: { type: String, enum: ['active', 'inactive'], default: null },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        requestedAt: { type: Date, default: null },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null }
    },
    creditLimit: { type: Number, default: 0 },
    availableCredit: { type: Number, default: 0 },
    features: { contactless: { type: Boolean, default: true }, onlinePayments: { type: Boolean, default: true }, atmWithdrawals: { type: Boolean, default: true }, international: { type: Boolean, default: false }, rewards: { type: Boolean, default: false } },
    security: { onlineTransactions: { type: Boolean, default: true }, internationalTransactions: { type: Boolean, default: false }, contactlessLimit: { type: Number, default: 5000 }, dailyLimit: { type: Number, default: 50000 }, monthlyLimit: { type: Number, default: 200000 } },
    design: { color: { type: String, default: 'blue', enum: ['blue', 'black', 'gold', 'silver', 'red', 'green'] }, pattern: { type: String, default: 'solid' } }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

cardSchema.index({ userId: 1 }); cardSchema.index({ accountId: 1 }); cardSchema.index({ status: 1 });

cardSchema.virtual('maskedCardNumber').get(function () { return this.cardNumber ? '**** **** **** ' + this.cardNumber.slice(-4) : ''; });
cardSchema.virtual('expiryDate').get(function () { return `${String(this.expiryMonth).padStart(2, '0')}/${this.expiryYear}`; });
cardSchema.virtual('isExpired').get(function () { return new Date() > new Date(this.expiryYear, this.expiryMonth - 1); });
cardSchema.virtual('availableBalance').get(function () { return this.cardType === 'credit' ? this.availableCredit : 0; });

cardSchema.pre('save', function (next) {
    if (!this.cardNumber) {
        const p = this.cardBrand === 'visa' ? '4' : this.cardBrand === 'mastercard' ? '5' : this.cardBrand === 'amex' ? '3' : '6';
        let num = p;
        for (let i = 0; i < 15; i++) num += Math.floor(Math.random() * 10);
        this.cardNumber = num;
    }
    if (this.cardType === 'credit' && this.isNew) this.availableCredit = this.creditLimit;
    next();
});

cardSchema.methods.validatePin = async function (pin) {
    if (!this.pin) return false;
    return this.pin.startsWith('$2') ? bcrypt.compare(String(pin), this.pin) : this.pin === crypto.createHash('sha256').update(String(pin)).digest('hex');
};
cardSchema.methods.setPin = async function (pin) { this.pin = await bcrypt.hash(String(pin), 12); };

function getCvvKey() {
    const k = process.env.CVV_ENC_KEY;
    if (k && /^[0-9a-fA-F]{64}$/.test(k)) return Buffer.from(k, 'hex');
    if (k) try { return Buffer.from(k, 'base64'); } catch (_) {}
    if (!process.env.JWT_SECRET) throw new Error('CVV_ENC_KEY or JWT_SECRET must be configured');
    return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
}

cardSchema.methods.setCvv = function (cvv) {
    const key = getCvvKey(), iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(String(cvv), 'utf8'), cipher.final()]);
    this.cvvEncrypted = enc.toString('hex'); this.cvvIv = iv.toString('hex'); this.cvvTag = cipher.getAuthTag().toString('hex');
};

cardSchema.methods.getCvvPlain = function () {
    if (!this.cvvEncrypted || !this.cvvIv || !this.cvvTag) return null;
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', getCvvKey(), Buffer.from(this.cvvIv, 'hex'));
        decipher.setAuthTag(Buffer.from(this.cvvTag, 'hex'));
        return Buffer.concat([decipher.update(Buffer.from(this.cvvEncrypted, 'hex')), decipher.final()]).toString('utf8');
    } catch (_) { return null; }
};

cardSchema.methods.validateCvv = async function (cvv) { return this.getCvvPlain() === String(cvv); };
cardSchema.methods.canTransact = function (amount, type = 'online') {
    if (this.isExpired || this.status !== 'active' || amount > this.security.dailyLimit) return false;
    if (type === 'contactless' && amount > this.security.contactlessLimit) return false;
    if (this.cardType === 'credit' && amount > this.availableCredit) return false;
    return true;
};

cardSchema.statics.getUserCards = function (userId) { return this.find({ userId, status: { $ne: 'lost' } }).populate('accountId', 'accountNumber accountType balance').sort({ createdAt: -1 }); };
cardSchema.statics.findByCardNumber = function (cardNumber) { return this.findOne({ cardNumber }).populate('userId accountId'); };

module.exports = mongoose.model('Card', cardSchema);
