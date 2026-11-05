import { Component, lazy, Suspense, type ReactNode } from "react";
import type { AppController } from "../../app/types";
const Scene = lazy(() =>
  import("./NetworkScene").then((m) => ({ default: m.NetworkScene })),
);
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: (cause: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Topology canvas failed", error);
    this.props.onFailure(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export class SceneRecovery extends Component<
  { controller: AppController },
  { failed: boolean; generation: number }
> {
  state = { failed: false, generation: 0 };
  fail = () => {
    void this.props.controller.dispatch({
      type: "simulation.play",
      enabled: false,
    });
    this.setState({ failed: true });
  };
  render() {
    return this.state.failed ? (
      <section
        className="network-stage scene-recovery"
        aria-label="Network topology workspace"
        role="alert"
      >
        <h2>The topology canvas needs to restart</h2>
        <p>
          The browser stopped drawing the network canvas. Your devices,
          settings and simulation history are preserved. Retry the view; if it
          happens again, reload the page or close other graphics-heavy tabs.
        </p>
        <button
          onClick={() =>
            this.setState((s) => ({
              failed: false,
              generation: s.generation + 1,
            }))
          }
        >
          Retry canvas
        </button>
      </section>
    ) : (
      <SceneBoundary key={this.state.generation} onFailure={this.fail}>
        <Suspense
          fallback={
            <section
              className="network-stage scene-recovery"
              aria-label="Loading network topology"
            >
              <p>Loading your topology canvas…</p>
            </section>
          }
        >
          <Scene controller={this.props.controller} onContextLost={this.fail} />
        </Suspense>
      </SceneBoundary>
    );
  }
}
