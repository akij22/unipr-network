import { Component, lazy, Suspense, type ReactNode } from "react";
import type { AppController } from "../../app/types";
const Scene = lazy(() =>
  import("./NetworkScene").then((m) => ({ default: m.NetworkScene })),
);
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("3D scene failed", error);
    this.props.onFailure();
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
        aria-label="3D network workspace"
        role="alert"
      >
        <h2>The 3D view needs to restart</h2>
        <p>
          The browser stopped drawing the network. Your devices, settings and
          simulation history are preserved. Retry the view; if it happens again,
          close other graphics-heavy tabs.
        </p>
        <button
          onClick={() =>
            this.setState((s) => ({
              failed: false,
              generation: s.generation + 1,
            }))
          }
        >
          Retry 3D view
        </button>
      </section>
    ) : (
      <SceneBoundary key={this.state.generation} onFailure={this.fail}>
        <Suspense
          fallback={
            <section
              className="network-stage scene-recovery"
              aria-label="Loading 3D network"
            >
              <p>Loading your 3D workspace…</p>
            </section>
          }
        >
          <Scene controller={this.props.controller} onContextLost={this.fail} />
        </Suspense>
      </SceneBoundary>
    );
  }
}
