import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside React tree:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('rr_voice_app_v2');
      localStorage.removeItem('rr1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#EEF1F6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#101828'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #D5DBE6',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Rehearsal Room encountered a startup issue
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#5B6577', lineHeight: '1.5' }}>
              A script error occurred while rendering the interface. You can reset your session cache to reload cleanly:
            </p>
            {this.state.error && (
              <pre style={{
                background: '#F2F5FB',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                color: '#D92D20',
                marginBottom: '20px'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#FFB400',
                  color: '#241A00',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Reset Data & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'transparent',
                  color: '#101828',
                  border: '1px solid #D5DBE6',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
