import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { ensureCurrencySelectOptions, normalizeCurrencyCode } from '../lib/currencies.js';

function optionForCode(options, code) {
  const c = normalizeCurrencyCode(code);
  return options.find((o) => o.code === c) || { code: c, label: `${c} — ${c}` };
}

/**
 * Searchable currency picker — list matches the live FX API (actively quoted currencies).
 */
export default function CurrencyAutocomplete({
  value,
  onChange,
  label = 'Currency',
  disabled = false,
  size = 'small',
  variant = 'outlined',
  fullWidth = true,
  sx,
  id,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ensureCurrencySelectOptions()
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const code = normalizeCurrencyCode(value);
  const selected = useMemo(() => optionForCode(options, code), [options, code]);

  return (
    <Autocomplete
      id={id}
      loading={loading}
      options={options}
      value={selected}
      onChange={(_, opt) => {
        onChange(normalizeCurrencyCode(opt?.code || 'USD'));
      }}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(a, b) => a.code === b.code}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts;
        return opts.filter(
          (o) =>
            o.code.toLowerCase().includes(q) ||
            o.label.toLowerCase().includes(q),
        );
      }}
      autoHighlight
      selectOnFocus
      handleHomeEndKeys
      disabled={disabled || loading}
      size={size}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant={variant}
          placeholder={loading ? 'Loading currencies…' : 'Search code or name'}
          inputProps={{
            ...params.inputProps,
            autoComplete: 'off',
          }}
        />
      )}
      ListboxProps={{ style: { maxHeight: 280 } }}
      fullWidth={fullWidth}
    />
  );
}
