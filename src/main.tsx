import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

type RuntimeErrorBoundaryState = {
  error: Error | null;
};

class RuntimeErrorBoundary extends React.Component<
  React.PropsWithChildren,
  RuntimeErrorBoundaryState
> {
  state: RuntimeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[HyperAI runtime] React render failure', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const message = this.state.error.message || 'Unknown React runtime error';
    return (
      <main
        data-runtime-error="true"
        style={{
          minHeight: '100vh',
          padding: '32px',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          background: '#f4f4f4',
          color: '#222',
        }}
      >
        <h1>HyperAI Runtime Error</h1>
        <p>Frontend authority failed during React render.</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
      </main>
    );
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('HyperAI bootstrap failed: #root element is missing');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </React.StrictMode>
);
