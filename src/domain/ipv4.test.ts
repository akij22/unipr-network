import { describe, expect, it } from "vitest";
import { analyzePrefix, parseIPv4 } from "./ipv4";
describe("IPv4 prefix analysis", () => {
  it("splits the prefix and counts usable hosts and subnets", () => {
    expect(
      analyzePrefix("192.168.1.10", 24, { parentPrefix: 16 }),
    ).toMatchObject({
      ok: true,
      value: {
        network: "192.168.1.0",
        broadcast: "192.168.1.255",
        totalAddresses: 256,
        usableHosts: 254,
        subnetCount: 256,
      },
    });
  });
  it("handles point to point and host routes without subtracting two", () => {
    expect(analyzePrefix("10.0.0.0", 31, { pointToPoint: true })).toMatchObject(
      { ok: true, value: { usableHosts: 2, broadcast: null } },
    );
    expect(analyzePrefix("10.0.0.7", 32)).toMatchObject({
      ok: true,
      value: { usableHosts: 1, broadcast: null },
    });
  });
  it("uses unsigned arithmetic for /0", () =>
    expect(analyzePrefix("255.255.255.254", 0)).toMatchObject({
      ok: true,
      value: { network: "0.0.0.0", totalAddresses: 4294967296 },
    }));
  it.each([
    "256.1.1.1",
    "1e2.0.0.1",
    "1.2.3",
    "-1.0.0.1",
    "1.2.3.4.5",
    "01.2.3.4",
  ])("rejects ambiguous address %s", (value) =>
    expect(parseIPv4(value).ok).toBe(false),
  );
  it("rejects invalid prefix relationships", () => {
    expect(analyzePrefix("1.2.3.4", 33).ok).toBe(false);
    expect(analyzePrefix("1.2.3.4", 24, { parentPrefix: 25 }).ok).toBe(false);
  });
});
