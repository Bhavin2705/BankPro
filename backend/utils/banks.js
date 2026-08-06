const popularBanks = [
    { id: 'sbi', name: 'State Bank of India', bankCode: 'SBIN', ifscPrefix: 'SBIN', description: 'Largest public sector bank in India' },
    { id: 'hdfc', name: 'HDFC Bank', bankCode: 'HDFC', ifscPrefix: 'HDFC', description: 'Leading private sector bank' },
    { id: 'icici', name: 'ICICI Bank', bankCode: 'ICIC', ifscPrefix: 'ICIC', description: 'International banking and financial services' },
    { id: 'axis', name: 'Axis Bank', bankCode: 'UTIB', ifscPrefix: 'UTIB', description: 'Modern banking solutions' },
    { id: 'pnb', name: 'Punjab National Bank', bankCode: 'PUNB', ifscPrefix: 'PUNB', description: 'Government-owned bank' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', bankCode: 'KKBK', ifscPrefix: 'KKBK', description: 'Innovative banking services' },
    { id: 'idbi', name: 'IDBI Bank', bankCode: 'IBKL', ifscPrefix: 'IBKL', description: 'Development banking institution' },
    { id: 'federal', name: 'Federal Bank', bankCode: 'FDRL', ifscPrefix: 'FDRL', description: 'Progressive banking solutions' },
    { id: 'indusind', name: 'IndusInd Bank', bankCode: 'INDB', ifscPrefix: 'INDB', description: 'Technology-driven banking' },
    { id: 'yes', name: 'Yes Bank', bankCode: 'YESB', ifscPrefix: 'YESB', description: 'Customer-centric banking' },
    { id: 'bandhan', name: 'Bandhan Bank', bankCode: 'BDBL', ifscPrefix: 'BDBL', description: 'Inclusive banking for all' }
];

const getBankById = id => popularBanks.find(b => b.id === id);
const getBankByIFSC = ifsc => popularBanks.find(b => (b.bankCode || b.ifscPrefix) === String(ifsc || '').slice(0, 4));
const getAllBanks = () => popularBanks;

const validateIFSC = (ifsc, bankId) => {
    const norm = String(ifsc || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}0[A-Z0-9]{6}$/.test(norm)) return false;
    const b = getBankById(bankId);
    return Boolean(b && norm.startsWith(b.bankCode || b.ifscPrefix));
};

const generateIFSCFromBankCode = bankCode => {
    const code = String(bankCode || '').trim().toUpperCase().slice(0, 4);
    return /^[A-Z0-9]{4}$/.test(code) ? `${code}0${Math.floor(100000 + Math.random() * 900000)}` : '';
};

module.exports = { popularBanks, getBankById, getBankByIFSC, getAllBanks, validateIFSC, generateIFSCFromBankCode };
