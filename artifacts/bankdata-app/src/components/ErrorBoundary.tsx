import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors anywhere in the tree and shows a recoverable
 * fallback instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-8 text-center bg-background">
        <div className="text-5xl">⚠️</div>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground">
            L'application a rencontré un problème inattendu.
          </p>
        </div>
        <button onClick={this.handleReload} className="btn-primary">
          Recharger
        </button>
      </div>
    );
  }
}
