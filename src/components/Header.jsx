export default function Header({ onToggleTheme, theme }) {
  return (
    <header className="header">
      <h1 className="logo">Evenly</h1>
      <div className="header-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
