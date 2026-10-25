import type { Issue } from "../domain/types";
import type { NetworkDocument } from "../app/types";
export function presentIssue(
  problem: Issue,
  document: NetworkDocument,
): string {
  const name = document.layout[problem.deviceIds[0]]?.name ?? "This device",
    ip = problem.params.ip ?? "the next hop";
  const messages: Record<string, string> = {
    SAVE_NAME_REQUIRED:
      "Enter a name so you can recognize this configuration in My networks.",
    SAVE_NAME_EXISTS: `A saved network already uses the name ${problem.params.name ?? "you entered"}. Choose another name or explicitly overwrite that configuration.`,
    SAVE_OVERWRITE_REQUIRED:
      "This configuration is already saved. Confirm that you want to overwrite it before replacing its contents.",
    SAVE_NOT_FOUND:
      "This saved network is no longer available. Refresh My networks and choose an existing configuration.",
    SAVE_DATA_INVALID:
      "This saved configuration contains invalid network settings or missing devices and ports. Your current network has been kept. Open another configuration.",
    SAVE_VERSION_UNSUPPORTED:
      "This saved network uses a format this version cannot read. Keep the saved data and open another compatible configuration.",
    SAVE_STORAGE_FAILED:
      problem.params.reason === "quota"
        ? "Browser storage is full. Your open configuration has been kept. Free device storage or allow more storage for this site, then retry saving."
        : `The browser could not ${problem.params.action === "list" ? "list your saved networks" : problem.params.action === "open" ? "read this saved network" : "save this configuration"}. Your open network has been kept. Allow local storage for this site and retry.`,
    UNSAVED_CHANGES:
      "Your current network has unsaved changes. Save it, or explicitly discard those changes, before opening another configuration.",
    INVALID_NAT_CONFIG:
      "Choose different internal and external interfaces with configured IPv4 addresses, and enter at least one source network in IPv4/prefix form. NAT translates only traffic matching these networks.",
    NAT_NO_BINDING:
      "The returning packet has no matching NAT translation. Check that the request and reply use the same router and that its translation is still available.",
    NESTED_NAT_UNSUPPORTED:
      "This packet would need translation at a second NAT router. Nested NAT is outside this lab’s current model. Use one NAT router for this communication.",
    NAT_IDENTIFIERS_EXHAUSTED:
      "This router has no free ICMP identifier for another translation. Reset network state to clear the translation table, then try again.",
    NAT_NOT_CONFIGURED:
      "Address translation is not configured on this router. Enable NAT and choose its internal and external interfaces.",
    INVALID_DHCP_POOL: `The DHCP range on ${problem.params.port ?? "this interface"} must stay inside its LAN subnet and exclude the network, broadcast, gateway and configured interface addresses. Use a LAN prefix of /30 or shorter.`,
    DHCP_NOT_SELECTED:
      "Select Automatic (DHCP) on this host and apply its settings before requesting a network configuration.",
    DHCP_NO_SERVER:
      "The host broadcast its request, but no DHCP server answered on this Ethernet network. Enable DHCP on a connected router interface and check the cables.",
    DHCP_NO_ACK:
      "The host selected an offer but received no confirmation. Check that the selected DHCP server is reachable on this Ethernet network.",
    DHCP_POOL_EXHAUSTED:
      "The DHCP server has no available address in its pool. Expand the range or reset learned network state to clear existing leases.",
    INVALID_IPV4:
      "Enter four decimal numbers from 0 to 255, separated by dots. For example, 192.168.1.10.",
    INVALID_PREFIX:
      "The prefix must be a whole number from 0 to 32. A parent prefix cannot be more specific than its subnet.",
    INVALID_GATEWAY: "Enter a valid IPv4 address for the default gateway.",
    INVALID_ROUTE:
      "Check the route destination, prefix, next-hop address and outgoing interface.",
    INVALID_MAC:
      "Each host and router interface needs a unique, valid MAC address.",
    PORT_COUNT:
      "Hosts use one Ethernet port and bridges use two. Keep that number of ports for this device.",
    PORT_OCCUPIED:
      "That port already has a cable. Choose another port or disconnect the existing cable.",
    PORT_NOT_FOUND:
      "That port is no longer available. Select a device and choose an existing port.",
    SELF_CONNECTION:
      "A cable must connect two different devices. Select a port on another device.",
    DUPLICATE_ID:
      "Two elements have the same identity. Reopen a valid saved network or create the element again.",
    DUPLICATE_PORT:
      "Port names must be unique within a device. Choose a different port name.",
    INVALID_LINK:
      "A cable points to an unavailable or occupied port. Disconnect it and choose two available ports.",
    NO_ADDRESS: `${name} has no IPv4 address. Apply a manual address or explicitly request a configuration using DHCP.`,
    NO_GATEWAY: `${name} cannot reach a network outside its own subnet because no default gateway is configured.`,
    GATEWAY_OUTSIDE_SUBNET: `${name} cannot reach its next hop on this link. Check the gateway address and the interface prefix.`,
    NO_ROUTE: `${name} has no route to the destination network. Connect that network or add a route with a reachable next hop.`,
    ARP_NO_REPLY: `${name} asked for the MAC address of ${ip}, but no device answered. Check the address, cable and subnet on this link.`,
    NO_REPLY:
      "No reply reached the source. Inspect the last packet and check that the destination has a route back.",
    TTL_EXCEEDED:
      "The packet ran out of hops before reaching its destination. Check the routing tables for a circular path.",
    DESTINATION_UNREACHABLE:
      "A device could not deliver the packet. Inspect its outgoing link and route to the destination.",
    DUPLICATE_IPV4: `More than one device on this Ethernet network uses ${ip}. Assign a different address to one of them before trying again.`,
    L2_LOOP:
      "This network contains an Ethernet loop. Broadcast frames could keep circulating. Remove one of the highlighted connections to continue.",
    INVALID_PING:
      "Enter a valid IPv4 destination. The hop limit must be a whole number between 1 and 255.",
    HISTORY_NOT_AT_FRONTIER:
      "You are viewing an earlier event. Return to the latest event, or cancel this operation, before starting another.",
    HISTORY_OUT_OF_RANGE:
      "That event is not available yet. Choose a step that has already been generated.",
    OPERATION_ACTIVE:
      "An operation is already active. Finish or cancel it before starting another.",
    OPERATION_BUSY:
      "The next event is still being prepared. Wait for it to finish before advancing again.",
    HISTORY_STORAGE_FAILED:
      "The simulation could not store its next event. Your network is still available. Free browser storage, then cancel or reset the operation and try again.",
    WORKER_STORAGE_FAILED:
      "The simulator could not open local browser storage. Allow this site to store data, then reload. Your open configuration can still be edited.",
    WORKER_FAILURE:
      "The simulator stopped responding. Your open configuration has been kept. Save your network, then reload the page to restart the simulator.",
    WORKER_CLOSED:
      "The simulator has been closed. Reload the page to start it again.",
    STALE_REVISION:
      "The network changed while an event was being prepared. Start a new operation with the current configuration.",
    STALE_REQUEST:
      "An older command was ignored. Use the current simulation controls to continue.",
    STALE_OPERATION:
      "This response belongs to an earlier operation. Use the current simulation controls.",
    STALE_RESPONSE:
      "An outdated response was ignored because the network changed. Start again with the current configuration.",
  };
  return (
    messages[problem.code] ??
    (problem.category === "network"
      ? `${name} could not complete this communication. Inspect the latest event and the configured addresses and routes.`
      : "This action could not be completed. Your open network has been kept. Retry the action, or save the configuration before reloading.")
  );
}
