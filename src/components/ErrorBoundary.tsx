import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/ui/error-state";

/*
 * MASTER §6.22: a render crash inside one route shows the page-error state while
 * the header and footer stay. The boundary resets when the URL changes, so the
 * visitor can navigate away; "Try again" re-renders the same route.
 */

const CRASH = new ApiError({ kind: "unexpected", message: "This page hit a problem while loading. Please try again." });

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          error={CRASH}
          onRetry={() => this.setState({ error: null })}
          className="py-24"
        />
      );
    }
    return this.props.children;
  }
}

/** Error boundary that resets on navigation. */
export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return <Boundary resetKey={location.pathname}>{children}</Boundary>;
};
