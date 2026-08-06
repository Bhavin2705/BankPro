import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clientData from '../../utils/clientData';
import debounce from '../../utils/debounce';
import { api } from '../../utils/api';
import DataStatus from '../../components/feedback/DataStatus';
import LoadingState from '../../components/feedback/LoadingState';
import { ConverterCard, KeyRates, PopularPairs } from './components';
import { MIN_REFRESH_INTERVAL, popularCurrencies, popularPairs } from './constants';
import { formatCurrency, getCurrencyInfo } from './utils';
import '../../styles/pages/Currency.css';

const CACHE_SECTION = 'exchangeCache';

const CurrencyExchangePage = () => {
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [useLiveData, setUseLiveData] = useState(true);
  const [conversion, setConversion] = useState({ fromCurrency: 'USD', toCurrency: 'EUR', amount: 1 });
  const [result, setResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  // isConverting: true while a rate-fetch is in-flight — blocks double-submit on the refresh path
  const [isConverting, setIsConverting] = useState(false);
  const isConvertingRef = useRef(false);

  const getCurrencyDetails = useCallback(
    (code) => getCurrencyInfo(code, popularCurrencies),
    [],
  );

  const formatCurrencyValue = useCallback(
    (amount, currencyCode) => formatCurrency(amount, currencyCode, popularCurrencies),
    [],
  );

  const readCachedRates = useCallback(async () => {
    const cached = await clientData.getSection(CACHE_SECTION);
    if (!cached?.rates || !cached?.timestamp) {
      return null;
    }

    return {
      rates: cached.rates,
      timestamp: cached.timestamp,
    };
  }, []);

  const fetchLiveRates = useCallback(async () => {
    const data = await api.exchange.getRates();
    if (!data?.success || !data?.rates) {
      throw new Error('Invalid exchange-rate response.');
    }

    const payload = {
      rates: data.rates,
      timestamp: Date.now(),
    };

    await clientData.setSection(CACHE_SECTION, payload).catch(() => {});
    return payload;
  }, []);

  const applyRates = useCallback((payload) => {
    setExchangeRates(payload.rates);
    setLastUpdated(new Date(payload.timestamp));
  }, []);

  const loadRates = useCallback(async (isRefresh = false) => {
    if (isConvertingRef.current) return; // block concurrent fetches safely without infinite loops
    isConvertingRef.current = true;
    setIsConverting(true);
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      let payload;
      if (useLiveData) {
        try {
          payload = await fetchLiveRates();
        } catch {
          payload = await readCachedRates();
          if (!payload) {
            throw new Error('Exchange rates are currently unavailable.');
          }
          setError('Showing cached rates. Live data is temporarily unavailable.');
        }
      } else {
        payload = await readCachedRates();
        if (!payload) {
          throw new Error('No cached rates available yet. Switch to Live and refresh once.');
        }
      }

      applyRates(payload);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load exchange rates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isConvertingRef.current = false;
      setIsConverting(false);
    }
  }, [applyRates, fetchLiveRates, readCachedRates, useLiveData]);

  const debouncedLoadRef = useRef(debounce((isRefresh) => loadRates(isRefresh), 250));

  useEffect(() => {
    debouncedLoadRef.current(false);
  }, [loadRates]);

  useEffect(() => {
    const fromRate = exchangeRates[conversion.fromCurrency];
    const toRate = exchangeRates[conversion.toCurrency];
    if (!fromRate || !toRate) return;

    const amount = parseFloat(conversion.amount) || 0;
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;
    const rate = toRate / fromRate;

    setResult({
      originalAmount: amount,
      convertedAmount,
      rate,
      fromCurrency: conversion.fromCurrency,
      toCurrency: conversion.toCurrency,
    });
  }, [exchangeRates, conversion]);

  const selectableCodes = useMemo(() => {
    const codesInRates = new Set(Object.keys(exchangeRates));
    const curated = popularCurrencies
      .map((currency) => currency.code)
      .filter((code) => codesInRates.has(code));

    if (curated.length > 0) return curated.slice(0, 10);
    return Object.keys(exchangeRates).sort().slice(0, 10);
  }, [exchangeRates]);

  useEffect(() => {
    if (selectableCodes.length === 0) return;
    setConversion((prev) => {
      const hasFrom = selectableCodes.includes(prev.fromCurrency);
      const hasTo = selectableCodes.includes(prev.toCurrency);
      if (hasFrom && hasTo) return prev;

      const fallbackFrom = selectableCodes[0];
      const fallbackTo = selectableCodes.find((code) => code !== fallbackFrom) || fallbackFrom;
      return {
        ...prev,
        fromCurrency: hasFrom ? prev.fromCurrency : fallbackFrom,
        toCurrency: hasTo ? prev.toCurrency : fallbackTo,
      };
    });
  }, [selectableCodes]);

  const handleToggleMode = () => {
    setUseLiveData((prev) => !prev);
  };

  const handleRefresh = () => {
    if (refreshDisabled || isConverting || isConvertingRef.current) return; // double-submit guard
    loadRates(true);
    setRefreshDisabled(true);
    setTimeout(() => setRefreshDisabled(false), MIN_REFRESH_INTERVAL);
  };

  const handleSwapCurrencies = () => {
    if (isConverting || isConvertingRef.current) return; // block swap while rates are in-flight to prevent stale-rate execution
    setConversion((prev) => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
    }));
  };

  const handleConversionChange = (updates) => {
    setConversion((prev) => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="container">
      <div className="currency-header">
        <h1 className="currency-title">Currency Exchange</h1>
        <p className="currency-subtitle">
          Convert between currencies using {useLiveData ? 'real-time' : 'stable'} exchange rates
          {useLiveData && ' (rates may fluctuate)'}
        </p>
      </div>

      {error && <div className="error-message currency-error">{error}</div>}

      <KeyRates popularCurrencies={popularCurrencies} exchangeRates={exchangeRates} />

      <ConverterCard
        conversion={conversion}
        exchangeRates={exchangeRates}
        selectableCodes={selectableCodes}
        useLiveData={useLiveData}
        result={result}
        refreshing={refreshing}
        refreshDisabled={refreshDisabled || isConverting}
        onToggleMode={handleToggleMode}
        onRefresh={handleRefresh}
        onSwapCurrencies={handleSwapCurrencies}
        onConversionChange={handleConversionChange}
        getCurrencyInfo={getCurrencyDetails}
        formatCurrency={formatCurrencyValue}
      />

      <PopularPairs popularPairs={popularPairs} exchangeRates={exchangeRates} getCurrencyInfo={getCurrencyDetails} />
      <DataStatus lastUpdated={lastUpdated} useLiveData={useLiveData} />
    </div>
  );
};

export default CurrencyExchangePage;

