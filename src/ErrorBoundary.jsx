import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("System Error Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff3333', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <h2>Oops! Layar Blank / Error.</h2>
          <p>Jika Anda melihat layar ini, tolong <strong>copy (salin)</strong> teks error di bawah ini dan berikan ke saya ya:</p>
          <hr style={{ margin: '1rem 0' }} />
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: '1rem', border: '1px solid #ddd' }}>
            {this.state.error && this.state.error.toString()}
            <br /><br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
