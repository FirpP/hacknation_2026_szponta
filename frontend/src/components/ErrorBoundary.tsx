import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};
type State = {
  error: Error | null;
};

// Błąd renderowania pokazuje komunikat zamiast białego ekranu. Błędy w handlerach/zapytaniach tu nie trafiają.
class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="container">
        <h1 className="h1">Coś poszło nie tak</h1>
        <p className="error">{this.state.error.message}</p>
        <button className="button" onClick={() => window.location.reload()}>
          Odśwież stronę
        </button>
      </main>
    );
  }
}

export default ErrorBoundary;
