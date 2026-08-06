import { formatCurrencyByPreference } from '../../utils/currency';

export const getCurrencyInfo = (code, popularCurrencies) =>
  popularCurrencies.find((currency) => currency.code === code) || { name: code, symbol: code };

export const formatCurrency = (amount, currencyCode) =>
  formatCurrencyByPreference(amount, null, { currency: currencyCode, convert: false });