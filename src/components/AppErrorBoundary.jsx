import { Component } from 'react';

/**
 * Last-resort UI when a render error would otherwise blank #root (mobile white screen).
 * Plain markup so this still works if MUI/theme never mounted.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          padding: 24,
          maxWidth: 420,
          margin: '0 auto',
          textAlign: 'center',
          fontFamily: "Roboto, system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Evenly hit a snag</h1>
        <p style={{ color: '#555', lineHeight: 1.45 }}>
          Reload to get back to your groups. If this keeps happening on your phone, close the tab
          and reopen the site, or remove the Evenly home-screen icon and add it again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '10px 16px',
            border: 0,
            borderRadius: 12,
            background: '#178c95',
            color: '#fff',
            font: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
