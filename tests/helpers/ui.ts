import { expect, type Page } from "@playwright/test";

const TOP_MENU_OF: Record<string, string> = {
  "Save network": "File",
  "My networks": "File",
  "Add device": "Topology",
  "Connect ports": "Topology",
  "Send a packet": "Simulation",
  "Tutorial mode": "Help",
};

/** Opens one of the top menus (File, Topology, Simulation, Help) unless it is already open. */
export async function openTopMenu(page: Page, menu: string) {
  const trigger = page.getByRole("button", { name: menu, exact: true });
  if ((await trigger.getAttribute("aria-expanded")) === "true") return;
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

/** Runs a top-menu action, opening the menu that contains it first. */
export async function menuAction(page: Page, name: string) {
  const menu = TOP_MENU_OF[name];
  if (!menu) throw new Error(`No top menu is registered for "${name}"`);
  await openTopMenu(page, menu);
  await page.getByRole("button", { name, exact: true }).click();
}

/** Adds a device without selecting it or opening its inspector. */
export async function addDevice(page: Page, kind: string) {
  await menuAction(page, "Add device");
  await page.getByRole("button", { name: `Add ${kind}`, exact: true }).click();
  await expect(page.getByRole("button", { name: "Toggle device dock", exact: true })).toBeEnabled();
}
/** Use the canvas keyboard alternative so floating inspectors and offscreen
 * nodes do not require pointer gestures in network-configuration fixtures. */
export async function selectDevice(page: Page, name: string) {
  // The worker's configuration projection remounts the form when it arrives.
  // Wait for it before selecting a device and editing its draft.
  await expect(page.getByRole("button", { name: "Toggle device dock", exact: true })).toBeEnabled();
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
    // The composer lives behind the Simulation menu's "Send a packet" action.
    await menuAction(page, "Send a packet");
    await expect(composer).toBeVisible();
    return;
  }
  if (!(await composer.getAttribute("open").then((v) => v !== null)))
    await composer.locator("summary").click();
}
