import { expect, it } from "vitest";
import { fixture } from "../../tests/fixtures/networks";
import { findL2Cycles } from "./l2-cycles";
it("detects parallel L2 links and reports actual cable IDs", () =>
  expect(findL2Cycles(fixture("l2Loop")).flat().sort()).toEqual(["l1", "l2"]));
it("does not confuse routed rings with Ethernet loops", () =>
  expect(findL2Cycles(fixture("l3Ring"))).toEqual([]));
