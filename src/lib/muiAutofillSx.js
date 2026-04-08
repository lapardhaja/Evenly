/**
 * Chrome/Safari paint autofilled fields bright blue/yellow. Override to match MUI theme.
 * Use on TextField: sx={(theme) => ({ ...muiTextFieldAutofillSx(theme) })}
 */
export function muiTextFieldAutofillSx(theme) {
  const bg =
    theme.palette.mode === 'dark'
      ? (theme.palette.grey?.[900] ?? '#121212')
      : (theme.palette.background.paper ?? '#fff');
  const color = theme.palette.text.primary;
  const fill = {
    WebkitBoxShadow: `0 0 0 1000px ${bg} inset`,
    WebkitTextFillColor: color,
    caretColor: color,
  };
  return {
    '& .MuiOutlinedInput-input:-webkit-autofill': fill,
    '& .MuiOutlinedInput-input:-webkit-autofill:hover': fill,
    '& .MuiOutlinedInput-input:-webkit-autofill:focus': fill,
    '& .MuiOutlinedInput-input:-webkit-autofill:active': fill,
  };
}
