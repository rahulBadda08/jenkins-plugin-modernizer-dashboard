import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Dashboard Component Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center animate-fade-up border-accent-red/30">
          <div className="telemetry-icon-box mb-6 border-accent-red/30 text-accent-red">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <h2 className="text-accent-red mono text-lg font-bold mb-2">TELEMETRY_SIGNAL_LOST</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto mb-8">
            The data stream for this component has encountered a critical integrity violation. 
            The system orchestrator has isolated this segment to prevent core instability.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="tab-btn active border-accent-red/20 text-accent-red hover:bg-accent-red/10"
          >
            Attempt System Re-Sync
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
