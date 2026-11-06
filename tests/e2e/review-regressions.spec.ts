import { expect, test } from "@playwright/test";
import {
  addDevice,
  configureHost,
  menuAction,
  openComposer,
  openMenu,
  selectDevice,
  finishOperation,
} from "../helpers/ui";
import type { WorkerRequest } from "../../src/runtime/messages";
test("cancels while an advancement response is pending and ignores its late arrival", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const gate = {
      hold: false,
      held: [] as (() => void)[],
      release() {
        this.hold = false;
        this.held.splice(0).forEach((deliver) => deliver());
      },
    };
    Object.assign(window, { __advanceGate: gate });
    window.Worker = new Proxy(window.Worker, {
      construct(Target, args) {
        const worker: Worker = Reflect.construct(Target, args),
          ids = new Set<number>(),
          post = worker.postMessage.bind(worker);
        worker.postMessage = (message: WorkerRequest) => {
          if (message.command.type === "next") ids.add(message.requestId);
          post(message);
        };
        Object.defineProperty(worker, "onmessage", {
          set(listener: ((event: MessageEvent) => void) | null) {
            if (listener)
              worker.addEventListener("message", (event) => {
                const deliver = () => listener.call(worker, event);
                if (gate.hold && ids.has(event.data.requestId))
                  gate.held.push(deliver);
                else deliver();
              });
          },
        });
        return worker;
      },
    });
  });
  await page.goto("/");
  await addDevice(page, "host");
  await configureHost(page, "Host 1", "10.0.0.1");
  await openComposer(page);
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.2");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  await page.evaluate(() => {
    (
      window as typeof window & { __advanceGate: { hold: boolean } }
    ).__advanceGate.hold = true;
  });
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __advanceGate: { held: unknown[] } })
            .__advanceGate.held.length,
      ),
    )
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Cancel operation", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Cancel operation", exact: true })
    .click();
  await expect(page.locator("[data-sim-status]")).toHaveAttribute(
    "data-sim-status",
    "idle",
  );
  await page.evaluate(() =>
    (
      window as typeof window & { __advanceGate: { release: () => void } }
    ).__advanceGate.release(),
  );
  await expect(page.getByRole("slider", { name: "Known events" })).toHaveValue(
    "0",
  );
  await expect(page.locator("[data-sim-status]")).toHaveAttribute(
    "data-sim-status",
    "idle",
  );
});
test("uses the visible remaining source after the selected host is removed", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await addDevice(page, "host");
  await configureHost(page, "Host 1", "10.0.0.1");
  await openComposer(page);
  await page.getByLabel("Source host", { exact: true }).selectOption("host-2");
  await page.locator(".ping-composer summary").click();
  await selectDevice(page, "Host 2");
  await page
    .getByText("Position and removal", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByText("Position and removal", { exact: true }).click();
  await page
    .getByRole("button", { name: "Remove device", exact: true })
    .click();
  await openComposer(page);
  await expect(page.getByLabel("Source host", { exact: true })).toHaveValue(
    "host-1",
  );
  await page.getByLabel("Destination IPv4", { exact: true }).fill("10.0.0.1");
  await page.getByRole("button", { name: "Start ping", exact: true }).click();
  expect(await finishOperation(page)).toBe("completed");
});
test("keeps unsaved work accessible when saved summary metadata is corrupt", async ({
  page,
}) => {
  await page.goto("/");
  await addDevice(page, "host");
  await page.evaluate(async () => {
    const modulePath = "/src/storage/database.ts",
      { openDatabase } = await import(modulePath),
      db = await openDatabase();
    await db.put("documents", {
      id: "broken",
      name: { oops: "broken" },
      normalName: "broken",
      updatedAt: 0,
      schema: 1,
      document: {},
    });
    db.close();
  });
  await menuAction(page, "My networks");
  await expect(
    page
      .getByRole("dialog", { name: "Saved networks", exact: true })
      .getByRole("alert"),
  ).toContainText("saved network");
  await page
    .getByRole("button", { name: "Close networks", exact: true })
    .click();
  await expect(page.locator('.react-flow__node[aria-label="Host 1"]')).toBeVisible();
  await openMenu(page);
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeEnabled();
});
test("restores the saved canvas pose when reopening without resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await addDevice(page, "host");
  // Pan the canvas so the saved pose differs from the default fit.
  const pane = page.locator(".react-flow__pane");
  const box = await pane.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.5 + 140, box!.y + box!.height * 0.5 + 60, { steps: 10 });
  await page.mouse.up();
  // Wheel zoom differs the pose further from the default fit; zoom lives on
  // the canvas gesture now.
  await page.mouse.wheel(0, -120);
  await expect
    .poll(async () => {
      const transform = await page
        .locator(".react-flow__viewport")
        .getAttribute("style");
      return transform;
    })
    .not.toContain("translate(0px, 0px)");
  const saved = await page
    .locator(".react-flow__viewport")
    .getAttribute("style");
  await menuAction(page, "Save network");
  await page.getByLabel("Network name", { exact: true }).fill("Canvas pose");
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Save network", exact: true }),
  ).not.toBeVisible();
  for (let i = 0; i < 5; i++)
    await page.mouse.wheel(0, -120);
  await menuAction(page, "My networks");
  await page
    .getByRole("button", { name: "Open Canvas pose", exact: true })
    .click();
  await expect
    .poll(async () => {
      const now = await page
        .locator(".react-flow__viewport")
        .getAttribute("style");
      return now;
    })
    .toBe(saved);
});
