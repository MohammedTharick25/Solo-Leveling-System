import { Component } from "react";
import { Zap, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <Zap size={32} className="text-red-400" />
          </div>
          <p className="font-display text-xs text-red-400 tracking-[0.3em] uppercase mb-3">
            System Error
          </p>
          <h1 className="font-heading font-black text-2xl text-slate-100 mb-3">
            The System encountered an anomaly
          </h1>
          <p className="font-body text-sm text-slate-500 mb-4 leading-relaxed">
            An unexpected error occurred. The System has logged the incident.
          </p>
          {this.state.error && (
            <p className="font-mono text-xs text-red-500/70 bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-6 text-left break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <button
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="btn-ghost"
            >
              Return to Base
            </button>
          </div>
        </div>
      </div>
    );
  }
}
