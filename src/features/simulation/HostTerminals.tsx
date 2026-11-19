import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AppController, AppState } from "../../app/types";
import { useApp } from "../../app/use-app";
import { presentIssue } from "../../content/issues.en";
import { parseIPv4 } from "../../domain/ipv4";
import { addressOf } from "../../simulation/ipv4";

type Entry = { command: string; output: string };
const noEntries: Entry[] = [];
const help = [
  "help          Show available commands",
  "ipconfig      Show this host’s IPv4 configuration",
  "ping <IPv4>   Start a simulated ICMP echo request",
  "clear         Clear this terminal",
].join("\n");

function hostConfiguration(state: AppState, hostId: string) {
  const host = state.document.network.devices.find((device) => device.id === hostId);
  if (host?.kind !== "host") return "This host was removed. Select another PC on the canvas.";
  const observed = state.runtimeReady ? state.projection.state : undefined;
  const dynamic = host.addressing.mode === "dhcp";
  const gateway = host.addressing.mode === "manual"
    ? host.addressing.gateway
    : observed?.dhcpClients[host.id]?.gateway;
  const interfaces = host.ports.map((port) => {
    const address = addressOf(host, port, observed);
    return `${port.id}: ${address ? `${address.ip}/${address.prefix}` : "No IPv4 address"}`;
  });
  return [
    ...interfaces,
    `Addressing: ${dynamic ? "Automatic (DHCP)" : "Manual"}`,
    `Default gateway: ${gateway ?? "None"}`,
    dynamic && !observed ? "DHCP state is unavailable. Wait for the simulation to load." : null,
  ].filter(Boolean).join("\n");
}

function HostPrompt({ name }: { name: string }) {
  return (
    <span className="terminal-prompt">
      <span>{name}</span><span>:</span><span>~</span>$
    </span>
  );
}

function TerminalIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="13" height="12" rx="2" />
      <path d="m4 5 2.5 2.5L4 10m4.5 0H12" />
    </svg>
  );
}

export function HostTerminals({ controller, hostId, expanded, onExpandedChange }: {
  controller: AppController;
  hostId: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const state = useApp(controller);
  const bodyId = useId();
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [transcripts, setTranscripts] = useState(() => new Map<string, Entry[]>());
  const log = useRef<HTMLDivElement>(null);
  const entries = (hostId ? transcripts.get(hostId) : undefined) ?? noEntries;
  const hostName = hostId ? state.document.layout[hostId]?.name ?? hostId : null;

  useEffect(() => {
    const hosts = new Set(state.document.network.devices
      .filter((device) => device.kind === "host")
      .map((device) => device.id));
    setTranscripts((previous) => {
      const remaining = new Map([...previous].filter(([id]) => hosts.has(id)));
      return remaining.size === previous.size ? previous : remaining;
    });
  }, [state.document.network.devices]);

  useEffect(() => {
    if (expanded && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [entries, expanded, hostId]);

  useEffect(() => {
    if (expanded) closeButton.current?.focus({ preventScroll: true });
  }, [expanded]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hostId) return;
    const input = event.currentTarget.elements.namedItem("command");
    if (!(input instanceof HTMLInputElement)) return;
    const command = input.value.trim();
    if (!command) return;
    input.value = "";
    const [name, ...args] = command.toLowerCase().split(/\s+/);
    const append = (output: string) => setTranscripts((previous) =>
      new Map(previous).set(hostId, [...(previous.get(hostId) ?? noEntries), { command, output }]),
    );

    if (name === "clear" && !args.length) {
      setTranscripts((previous) => new Map(previous).set(hostId, []));
    } else if (name === "help" && !args.length) {
      append(help);
    } else if (name === "ipconfig" && !args.length) {
      append(hostConfiguration(controller.getSnapshot(), hostId));
    } else if (name === "ping") {
      const [destination] = args;
      if (args.length !== 1 || !parseIPv4(destination).ok) {
        append("Enter ping followed by a destination IPv4 address, for example ping 192.168.1.10.");
        return;
      }
      const before = controller.getSnapshot();
      if (before.busy) {
        append("Wait for the current action to finish, then retry the ping.");
        return;
      }
      if (before.runtimeReady && before.projection.status === "active") {
        append("Finish or cancel the current simulation before starting another ping.");
        return;
      }
      if (before.runtimeReady && before.projection.cursor !== before.projection.frontier) {
        append("Return to the latest generated step before starting a ping.");
        return;
      }
      await controller.dispatch({
        type: "simulation.start",
        operation: { kind: "ping", sourceId: hostId, destination },
      });
      const after = controller.getSnapshot();
      if (after.viewEpoch !== before.viewEpoch ||
          !after.document.network.devices.some((device) => device.id === hostId)) return;
      if (after.projection.operationId !== before.projection.operationId && after.projection.status === "active") {
        append(`Ping to ${destination} started. Use Next or Play to follow the simulation.`);
      } else {
        append(after.issue
          ? presentIssue(after.issue, after.document)
          : "Ping did not start. Check the topology and try again.");
      }
    } else {
      append("Command not recognized. Enter help to see available commands.");
    }
  }

  return (
    <>
      <section id={bodyId} className="host-terminals" aria-label="Terminals" hidden={!expanded}>
        <header className="terminal-bar">
          <div className="terminal-tab">
            <span className="terminal-tab-name" title={hostName ?? undefined}>
              {hostName ? `${hostName} — CLI` : "Terminals"}
            </span>
            <button
              ref={closeButton}
              type="button"
              aria-label="Close terminal"
              title="Close terminal"
              onClick={() => {
                onExpandedChange(false);
                launcher.current?.focus({ preventScroll: true });
              }}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="m3 3 8 8m0-8-8 8" />
              </svg>
            </button>
          </div>
        </header>
        <div className="terminal-body">
          {hostName ? (
            <>
              <div ref={log} className="terminal-log" role="log" aria-label={`${hostName} terminal output`} tabIndex={0}>
                {entries.length === 0 && <p>Enter <code>help</code> to see available commands.</p>}
                {entries.map(({ command, output }, index) => (
                  <div className="terminal-entry" key={index}>
                    <div className="terminal-command"><HostPrompt name={hostName} />{" "}<span className="terminal-verb">{command.split(/\s/, 1)[0]}</span>{command.replace(/^\S+/, "")}</div>
                    <div>{output}</div>
                  </div>
                ))}
              </div>
              <form className="terminal-form" key={hostId} onSubmit={submit}>
                <label htmlFor={`${bodyId}-command`} title={hostName}><HostPrompt name={hostName} /></label>
                <input
                  id={`${bodyId}-command`}
                  aria-label={`${hostName} terminal command`}
                  name="command"
                  autoComplete="off"
                  enterKeyHint="go"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </form>
            </>
          ) : (
            <p className="terminal-empty">
              {state.document.network.devices.some((device) => device.kind === "host")
                ? "Select a PC on the canvas to use its terminal."
                : "Add a host to use its terminal."}
            </p>
          )}
        </div>
      </section>
      <div className="terminal-status">
        <button
          ref={launcher}
          type="button"
          aria-label="Open terminal"
          title="Open terminal"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => {
            if (expanded) closeButton.current?.focus({ preventScroll: true });
            else onExpandedChange(true);
          }}
        >
          <TerminalIcon />
        </button>
      </div>
    </>
  );
}
