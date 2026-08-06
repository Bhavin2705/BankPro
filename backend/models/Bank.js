const mongoose = require('mongoose');

const BankSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    bankCode: { type: String, required: true, uppercase: true, trim: true },
    ifscPrefix: String,
    logo: String,
    description: { type: String, required: true }
}, { timestamps: true });

BankSchema.pre('validate', function (next) {
    const code = String(this.bankCode || this.ifscPrefix || '').trim().toUpperCase();
    if (code) { this.bankCode = code; this.ifscPrefix = code; }
    next();
});

module.exports = mongoose.model('Bank', BankSchema);
