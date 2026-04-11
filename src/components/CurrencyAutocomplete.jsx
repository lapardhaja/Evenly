import { useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { getCurrencySelectOptions, normalizeCurrencyCode } from '../lib/currencies.js';

function optionForCode(options, code) {
  const c = normalizeCurrencyCode(code);
  return options.find((o) => o.code === c) || { code: c, label: `${c} — ${c}` };
}

/**
 * Searchable currency picker (MUI Autocomplete).
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
  const options = useMemo(() => getCurrencySelectOptions(), []);
  const code = normalizeCurrencyCode(value);
  const selected = optionForCode(options, code);

  return (
    <Autocomplete
      id={id}
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
      disabled={disabled}
      size={size}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant={variant}
          placeholder="Search code or name"
          inputProps={{
            ...params.inputProps,
            autoComplete: 'off',
          }}
        />
      )}
      ListboxProps={{ style: { maxHeight: 280 } }}
    />
  );
}
