export const toLocalYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const fromLocalYYYYMMDD = (isoString) => {
    if (!isoString) return null;
    const parts = isoString.split('-');
    if (parts.length !== 3) return null;
    const [yyyy, mm, dd] = parts.map(p => parseInt(p, 10));
    return new Date(yyyy, mm - 1, dd);
};

export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'Invalid Date';
    }
};

export const formatTransactionDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const parseTransactionDate = (transaction) => {
    if (!transaction) return null;
    if (transaction.createdAt) {
        const parsed = new Date(transaction.createdAt);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (transaction.timestamp) {
        const parsed = new Date(transaction.timestamp);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (transaction.date && typeof transaction.date === 'string' && transaction.date.length === 10) {
        const parsed = fromLocalYYYYMMDD(transaction.date);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof transaction.date === 'string') {
        const parsed = new Date(transaction.date.length === 10 ? `${transaction.date}T00:00:00` : transaction.date);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

export default {
    toLocalYYYYMMDD,
    fromLocalYYYYMMDD,
    formatDate,
    formatTransactionDate,
    parseTransactionDate,
};
