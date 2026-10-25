import { useState } from "react";
import { analyzePrefix, formatIPv4, parseIPv4 } from "../../domain/ipv4";
export function PrefixExplorer({
  initialIp = "192.168.1.10",
  initialPrefix = 24,
}: {
  initialIp?: string;
  initialPrefix?: number;
}) {
  const [ip, setIp] = useState(initialIp || "192.168.1.10"),
    [prefix, setPrefix] = useState(initialPrefix),
    [parent, setParent] = useState(Math.min(initialPrefix, 16)),
    [point, setPoint] = useState(false),
    [page, setPage] = useState(0);
  const result = analyzePrefix(ip, prefix, {
      parentPrefix: parent,
      pointToPoint: point,
    }),
    info = result.ok ? result.value : null;
  return (
    <section className="prefix-explorer">
      <p className="muted small">
        Explore without changing the network. Apply interface settings
        separately.
      </p>
      <label>
        Explore IPv4
        <input
          value={ip}
          onChange={(e) => {
            setIp(e.target.value);
            setPage(0);
          }}
          inputMode="decimal"
        />
      </label>
      <div className="address-row">
        <label>
          Explore prefix
          <input
            type="number"
            min="0"
            max="32"
            value={prefix}
            onChange={(e) => {
              setPrefix(Number(e.target.value));
              setPage(0);
            }}
          />
        </label>
        <label>
          Parent prefix
          <input
            type="number"
            min="0"
            max={prefix}
            value={parent}
            onChange={(e) => {
              setParent(Number(e.target.value));
              setPage(0);
            }}
          />
        </label>
      </div>
      {prefix === 31 && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={point}
            onChange={(e) => setPoint(e.target.checked)}
          />
          Point-to-point link
        </label>
      )}
      {!info ? (
        <p role="alert">
          Enter a valid IPv4 address and prefixes. The parent prefix must be no
          more specific than the subnet.
        </p>
      ) : (
        <>
          <div
            className="bit-grid"
            aria-label={`${prefix} network bits and ${32 - prefix} host bits`}
          >
            {[...(info.networkBits + info.hostBits)].map((bit, i) => (
              <span key={i} className={i < prefix ? "network-bit" : "host-bit"}>
                {bit}
              </span>
            ))}
          </div>
          <div className="row small">
            <span>Blue: network prefix</span>
            <span>Amber: host portion</span>
          </div>
          <dl className="state-entries">
            <div>
              <dt>Network</dt>
              <dd>
                <code>
                  {info.network}/{prefix}
                </code>
              </dd>
            </div>
            <div>
              <dt>Broadcast</dt>
              <dd>
                <code>{info.broadcast ?? "Not applicable"}</code>
              </dd>
            </div>
            <div>
              <dt>Total addresses</dt>
              <dd>{info.totalAddresses.toLocaleString("en")}</dd>
            </div>
            <div>
              <dt>Usable hosts</dt>
              <dd>{info.usableHosts.toLocaleString("en")}</dd>
            </div>
            <div>
              <dt>Subnets in /{parent}</dt>
              <dd>{info.subnetCount?.toLocaleString("en")}</dd>
            </div>
          </dl>
          {prefix >= 31 && (
            <p className="small">
              {prefix === 32
                ? "A /32 identifies a single address."
                : "A /31 provides two usable endpoints only on a point-to-point link, not a DHCP LAN."}
            </p>
          )}
          <h3>Possible subnets</h3>
          <div className="subnet-list">
            {Array.from(
              { length: Math.min(8, (info.subnetCount ?? 1) - page * 8) },
              (_, i) => {
                const base = analyzePrefix(ip, parent);
                const first = base.ok ? parseIPv4(base.value.network) : null;
                return first?.ok ? (
                  <code key={i}>
                    {formatIPv4(
                      first.value + (page * 8 + i) * info.totalAddresses,
                    )}
                    /{prefix}
                  </code>
                ) : null;
              },
            )}
          </div>
          <div className="row">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous subnets
            </button>
            <button
              disabled={(page + 1) * 8 >= (info.subnetCount ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Next subnets
            </button>
          </div>
        </>
      )}
    </section>
  );
}
