const { TOTP, NobleCryptoPlugin, ScureBase32Plugin } = require('otplib');

const totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin()
});

const generateTotpSecret = () => totp.generateSecret();

const generateTotpUri = (email, secret) => {
    return `otpauth://totp/BankPro:${encodeURIComponent(email)}?secret=${secret}&issuer=BankPro`;
};

const verifyTotpCode = async (token, secret) => {
    if (!token || !secret) return false;
    const cleanToken = String(token).trim();
    if (!/^\d{6}$/.test(cleanToken)) return false;
    try {
        const result = await totp.verify(cleanToken, { secret, epochTolerance: 1 });
        return Boolean(result?.valid);
    } catch {
        return false;
    }
};

module.exports = {
    generateTotpSecret,
    generateTotpUri,
    verifyTotpCode
};
