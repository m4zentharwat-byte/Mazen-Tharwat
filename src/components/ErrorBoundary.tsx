import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected runtime error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let parsedError: Record<string, unknown> | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-red-800/60 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold tracking-tight">
                Security or Runtime Exception Intercepted
              </h1>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              The FinesseOne CX security layer intercepted an unhandled exception or zero-trust
              permission rejection.
            </p>
            {parsedError ? (
              <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-amber-300 overflow-x-auto">
                {JSON.stringify(parsedError, null, 2)}
              </pre>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-red-300 break-words">
                {this.state.errorMessage}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Workstation
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
