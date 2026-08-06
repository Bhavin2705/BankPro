const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 50, validate: { validator: v => /^[A-Za-z ]+$/.test(v), message: 'Name can only contain alphabets and spaces' } },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, validate: { validator: e => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(e), message: 'Please enter a valid email' } },
    phone: { type: String, required: [true, 'Phone number is required'], validate: { validator: p => /^\d{10}$/.test(p), message: 'Please enter a valid 10-digit phone number' } },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false, validate: { validator: v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v), message: 'Password requirement not met' } },
    pin: { type: String, required: [true, 'PIN is required'], minlength: 4, maxlength: 6, select: false, validate: { validator: v => /^\d{4,6}$/.test(v), message: 'PIN must be 4 to 6 digits' } },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    accountNumber: { type: String, unique: true, required: true },
    bankDetails: {
        bankName: { type: String, required: true, default: 'BankPro' },
        ifscCode: { type: String, default: '' },
        branchName: { type: String, default: 'Main Branch' }
    },
    balance: { type: Number, default: 0, min: 0 },
    profile: { photoUrl: String, dateOfBirth: Date, address: { street: String, city: String, state: String, zipCode: String, country: String }, occupation: String, income: Number },
    kyc: {
        status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
        idType: { type: String, enum: ['aadhaar', 'pan', 'passport', 'driver_license', 'other'] },
        idNumberMasked: String, documentUrls: [String], submittedAt: Date, reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, rejectionReason: String
    },
    security: {
        isEmailVerified: { type: Boolean, default: false }, isPhoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false }, twoFactorSecret: String, twoFactorOtpHash: String, twoFactorOtpExpires: Date,
        loginAttempts: { type: Number, default: 0 }, lockUntil: Date, lastLogin: Date, passwordResetToken: String, passwordResetExpires: Date
    },
    preferences: {
        currency: { type: String, default: 'INR' }, language: { type: String, default: 'en' },
        notifications: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: true }, push: { type: Boolean, default: true } },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    firstLogin: { type: Boolean, default: true },
    clientData: {
        securityQuestions: { type: Object, default: {} }, loginHistory: { type: Array, default: [] },
        recurringPayments: { type: Array, default: [] }, budgets: { type: Array, default: [] },
        investments: { type: Array, default: [] }, goals: { type: Array, default: [] },
        exchangeCache: { key: { type: String, default: '' }, timestamp: { type: Number, default: 0 }, data: { type: Object, default: {} } }
    },
    tokens: [{ token: String, expiryTimestampMs: Number, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.index({ role: 1 });
userSchema.virtual('accountAge').get(function () { return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); });

userSchema.pre('validate', function (next) {
    if (!this.accountNumber) this.generateAccountNumber();
    next();
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(12));
    if (this.isModified('pin')) this.pin = await bcrypt.hash(this.pin, await bcrypt.genSalt(10));
    next();
});

userSchema.methods.comparePassword = function (candidate) { return this.password ? bcrypt.compare(candidate, this.password) : false; };
userSchema.methods.comparePin = function (candidate) { return this.pin ? bcrypt.compare(candidate, this.pin) : false; };
userSchema.methods.generateAccountNumber = function () {
    this.accountNumber = Date.now().toString().slice(-6) + Math.floor(10000 + Math.random() * 90000);
    return this.accountNumber;
};
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.security = this.security || {};
    this.security.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

userSchema.statics.findByEmailOrPhone = function (identifier) {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier)
        ? this.findOne({ email: identifier }) : this.find({ phone: identifier });
};

userSchema.statics.checkPhoneAccountLimit = async function (phone) {
    const count = await this.countDocuments({ phone });
    return { count, canRegister: count < 3, maxAllowed: 3 };
};

module.exports = mongoose.model('User', userSchema);
