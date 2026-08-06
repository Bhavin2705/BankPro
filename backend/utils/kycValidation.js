const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[2-9]{1}[0-9]{11}$/;
const VOTER_ID_REGEX = /^[A-Z]{3}[0-9]{7}$/;

const VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const isValidVerhoeff = (value) => {
    const digits = String(value).split('').reverse().map(Number);
    let checksum = 0;
    for (let i = 0; i < digits.length; i += 1) {
        checksum = VERHOEFF_D[checksum][VERHOEFF_P[i % 8][digits[i]]];
    }
    return checksum === 0;
};

const hasObviousFakeDigitPattern = (value) => {
    const text = String(value);
    if (/^(\d)\1{11}$/.test(text)) return true;
    return '01234567890123456789'.includes(text) || '98765432109876543210'.includes(text);
};

const normalizeKycNumber = (idType, idNumber) => {
    const value = String(idNumber || '').trim();
    if (idType === 'pan' || idType === 'voter') return value.toUpperCase();
    return value;
};

const validateKycIdentity = (idType, idNumber) => {
    const normalizedType = String(idType || '').trim().toLowerCase();
    const normalizedNumber = normalizeKycNumber(normalizedType, idNumber);

    if (!['aadhaar', 'pan', 'voter'].includes(normalizedType)) {
        return { valid: false, error: 'ID type must be Aadhaar, PAN, or Voter ID' };
    }

    if (normalizedType === 'pan' && !PAN_REGEX.test(normalizedNumber)) {
        return { valid: false, error: 'PAN must match ABCDE1234F format' };
    }

    if (normalizedType === 'aadhaar') {
        if (!AADHAAR_REGEX.test(normalizedNumber)) {
            return { valid: false, error: 'Aadhaar must be 12 digits and cannot begin with 0 or 1' };
        }
        if (hasObviousFakeDigitPattern(normalizedNumber)) {
            return { valid: false, error: 'Aadhaar number cannot be repeated or sequential digits' };
        }
        if (!isValidVerhoeff(normalizedNumber)) {
            return { valid: false, error: 'Aadhaar number failed checksum verification' };
        }
    }

    if (normalizedType === 'voter' && !VOTER_ID_REGEX.test(normalizedNumber)) {
        return { valid: false, error: 'Voter ID must match ABC1234567 format' };
    }

    return { valid: true, idType: normalizedType, idNumber: normalizedNumber };
};

module.exports = {
    PAN_REGEX,
    AADHAAR_REGEX,
    VOTER_ID_REGEX,
    isValidVerhoeff,
    hasObviousFakeDigitPattern,
    normalizeKycNumber,
    validateKycIdentity
};
