import { expect, type Page } from "@playwright/test";

/** Open menu actions when the workspace uses its narrow-screen layout. */
export async function openMenu(page: Page) {
  const menu = page.locator(".workspace-menu");
  if ((await menu.count()) === 0) return;
  if ((await menu.getAttribute("data-open")) === "true") return;
  await page.getByRole("button", { name: "Toggle network menu" }).click();
  await expect(menu).toHaveAttribute("data-open", "true");
}

/** The floating menu covers part of the canvas and the inspector on a narrow
 * viewport. The app collapses it after an action; the tests do the same so
 * the canvas stays reachable. */
async function collapseMenu(page: Page) {
  const menu = page.locator(".workspace-menu");
  if ((await menu.count()) === 0) return;
  if ((await menu.getAttribute("data-open")) !== "true") return;
  if (await page.evaluate(() => matchMedia("(min-width: 70rem)").matches))
    return;
  await page.getByRole("button", { name: "Toggle network menu" }).click();
  await expect(menu).toHaveAttribute("data-open", "false");
}

/** Runs a workspace-menu action. The menu collapses on a narrow viewport, so
 * the action is only reachable once the menu has been opened. */
export async function menuAction(page: Page, name: string) {
  const action = page.getByRole("button", { name, exact: true });
  if ((await action.count()) === 0) {
    await openMenu(page);
  }
  await action.click();
}

export async function addDevice(page: Page, kind: string) {
  await openMenu(page);
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await page.getByRole("button", { name: `Add ${kind}`, exact: true }).click();
  await collapseMenu(page);
}
/** Use the canvas keyboard alternative so floating inspectors and offscreen
 * nodes do not require pointer gestures in network-configuration fixtures. */
export async function selectDevice(page: Page, name: string) {
  await collapseMenu(page);
  const node = page.getByRole("group", { name, exact: true });
  await node.focus();
  if (await node.locator("[data-device-node]").getAttribute("data-selected") !== "true") {
    await node.press("Enter");
  }
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
export async function configureHost(
  page: Page,
  name: string,
  ip: string,
  gateway = "",
) {
  await selectDevice(page, name);
  const address = page.getByLabel("IPv4 address", { exact: true });
  if (!(await address.isVisible())) await page.locator(".port-card > summary").first().click();
  await address.fill(ip);
  await page.getByLabel("Default gateway", { exact: true }).fill(gateway);
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
}
export async function connect(
  page: Page,
  from: string,
  fromPort: string,
  to: string,
  toPort: string,
) {
  await menuAction(page, "Connect ports");
  await selectDevice(page, from);
  await page
    .getByRole("button", { name: `Choose ${fromPort}`, exact: true })
    .click();
  await selectDevice(page, to);
  await page
    .getByRole("button", { name: `Choose ${toPort}`, exact: true })
    .click();
}
export async function buildRouted(page: Page) {
  await addDevice(page, "host");
  await addDevice(page, "switch");
  await addDevice(page, "router");
  await addDevice(page, "host");
  await configureHost(page, "Host 1", "192.168.1.10", "192.168.1.1");
  await configureHost(page, "Host 2", "192.168.2.10", "192.168.2.1");
  await selectDevice(page, "Router 1");
  await page
    .getByLabel("IPv4 address eth0", { exact: true })
    .fill("192.168.1.1");
  await page
    .getByLabel("IPv4 address eth1", { exact: true })
    .fill("192.168.2.1");
  await page
    .getByRole("button", { name: "Apply settings", exact: true })
    .click();
  await connect(page, "Host 1", "eth0", "Switch 1", "p1");
  await connect(page, "Switch 1", "p2", "Router 1", "eth0");
  await connect(page, "Router 1", "eth1", "Host 2", "eth0");
}
export async function finishOperation(page: Page) {
  for (let i = 0; i < 250; i++) {
    const region = page.locator("[data-sim-status]");
    await expect(region).toHaveAttribute("aria-busy", "false");
    const status = await region.getAttribute("data-sim-status");
    if (
      status === "completed" ||
      status === "failed" ||
      status === "resource-error"
    )
      return status;
    const before = Number(
      await page.getByRole("slider", { name: "Known events" }).inputValue(),
    );
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await region.getAttribute("data-sim-status")) !== "active" ||
          Number(
            await page
              .getByRole("slider", { name: "Known events" })
              .inputValue(),
          ) > before,
      )
      .toBe(true);
  }
  throw new Error("Operation did not finish within the test guard");
}

export async function openComposer(page: Page) {
  const composer = page.locator(".ping-composer");
  if ((await composer.count()) === 0) {
    // The composer lives behind the workspace menu's "Send a packet" action.
    await openMenu(page);
    await page.getByRole("button", { name: "Send a packet", exact: true }).click();
    await expect(composer).toBeVisible();
    return;
  }
  if (!(await composer.getAttribute("open").then((v) => v !== null)))
    await composer.locator("summary").click();
}
