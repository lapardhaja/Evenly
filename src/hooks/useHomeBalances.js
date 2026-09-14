import { useEffect, useState } from 'react';
import {
  pickHomeCurrency,
  loadHomeFxFactors,
  buildHomeBalanceSummary,
} from '../lib/homeBalances.js';

function readLocalSettled(groupId) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`evenly-settled-${groupId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useHomeBalances(groupsMap, userId) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [fxFailed, setFxFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const currency = pickHomeCurrency(groupsMap);
    setLoading(true);
    (async () => {
      const fx = await loadHomeFxFactors(groupsMap, currency);
      if (cancelled) return;
      const next = buildHomeBalanceSummary({
        groupsMap,
        userId,
        currency,
        factorsByGroup: fx.factorsByGroup,
        getLocalSettled: readLocalSettled,
      });
      setSummary(next);
      setFxFailed(Boolean(fx.failed?.length) || fx.ratesAvailable === false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupsMap, userId]);

  return { loading, summary, fxFailed };
}
