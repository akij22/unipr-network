# UniPRNetwork MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realizzare una web app didattica in inglese, utilizzabile da computer e smartphone, per costruire reti 3D e osservare progressivamente ping, DHCP e NAT/PAT.

**Architecture:** Il motore TypeScript deterministico gira in un Web Worker e produce eventi su richiesta. React presenta la proiezione dell’evento osservato; React Three Fiber visualizza la stessa proiezione senza eseguire protocolli. IndexedDB conserva configurazioni nominate e, separatamente, la cronologia temporanea con checkpoint.

**Tech Stack:** React 19.3.1, React DOM 19.3.1, TypeScript 7.0.2, Vite 8.3.5, plugin React 6.1.2, Three.js 0.186.1, React Three Fiber 9.8.2, Drei 10.7.9, idb 8.0.4; Vitest 5.0.5, fake-indexeddb 6.2.6 e Playwright Test 1.64.1. npm, lockfile versionato. Versioni verificate nel registry il 25 ottobre 2026; nessuna dipendenza installata durante la pianificazione.

**Spec:** [2026-10-25-uniprnetwork-mvp-design.md](../specs/2026-10-25-uniprnetwork-mvp-design.md), approvata dall’utente il 25 ottobre 2026.

## Global Constraints

Le seguenti righe sono riportate dalla specifica; ogni attività le eredita.

- «Visualizzazione realmente 3D, tema scuro predefinito e lingua inglese.»
- «Computer e smartphone devono consentire tutte le operazioni principali. Nessuna funzione essenziale dipende dall’hover.»
- «Una sola operazione simulata alla volta: un ping oppure una richiesta DHCP esplicita.»
- «DHCP e NAT integrati nei router, attivabili separatamente.»
- «NAT overload/PAT per condividere l’indirizzo esterno del router; NAT statico e port forwarding rinviati.»
- «Calcolo progressivo degli eventi: opzione B scelta dall’utente. Il totale definitivo dei passaggi è noto al termine dell’operazione.»
- «Nessun limite fisso al numero di apparati.»
- «Nessun backend per eseguire la simulazione.»
- «Le rotte /32 sono ammesse.»
- «Il motore supporta /31 sulle connessioni dirette fra due interfacce router; non come LAN DHCP.»
- «Un indirizzo ottenuto via DHCP è stato dinamico, non diventa configurazione statica nel file salvato.»
- «Questi sono requisiti da verificare nell’implementazione, non verifiche già superate dai mockup.»

Inoltre: niente React Flow, autenticazione, sincronizzazione, dipendenze runtime via CDN, traffico Internet reale o copie delle sequenze preparate dei mockup. Lease DHCP infiniti; niente relay/rinnovo automatico. PAT per ICMP, senza doppio NAT annidato. Le esclusioni complete della specifica restano vincolanti.

Per le attività frontend l’utente ha richiesto **Hallmark e UI/UX Pro Max**. Applicarle durante Task 6–12: Hallmark è in `/Users/achillerossi/.agents/skills/hallmark/SKILL.md`; UI/UX Pro Max è stata consultata dal progetto upstream `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`, con copia di riferimento in `/tmp/uniprnetwork-uiux-reference-20261024/.claude/skills/ui-ux-pro-max/SKILL.md`. Verificare la disponibilità della copia e risolvere un percorso cambiato prima dell’uso. Le linee guida non possono sostituire la direzione visiva già approvata o introdurre layout da landing page.

## Review Focus

1. Risposte worker in ritardo dopo modifica/reapertura: non devono applicare pacchetti o assegnazioni della vecchia rete — Task 5.
2. Avvio di una nuova operazione da un punto storico: deve essere impedito senza perdere la cronologia o usare cache future — Task 5 e Task 8.
3. Quota IndexedDB esaurita, record corrotto o upgrade bloccato da un’altra scheda: nessuna sovrascrittura o perdita silenziosa della configurazione — Task 5 e Task 11.
4. Tastiera virtuale, rotazione e pannelli su smartphone: input e controlli devono restare raggiungibili, e chiudere un pannello deve restituire il focus — Task 12.
5. Input IPv4 numericamente validi ma contestualmente ambigui: /31 su LAN DHCP, pool che invade indirizzi riservati e duplicati nella stessa rete non devono produrre un falso successo — Task 1, Task 4 e Task 9.

---

## Modalità di lavoro e tappe

Questo è un unico prodotto con contratti condivisi fra motore, cronologia e scena: si mantiene un solo piano. I moduli sono verificabili separatamente, ma non costituiscono prodotti indipendenti.

1. Task 1–5: dominio, ping eseguibile e cronologia progressiva, verificati senza grafica.
2. Task 6–8: prima sezione completa della web app — editor e ping reali in 3D, anche tramite touch. Punto di verifica anticipata dell’architettura.
3. Task 9–10: DHCP e PAT integrati nel motore e nell’interfaccia. Fanno parte dello stesso MVP.
4. Task 11–12: salvataggi, recupero degli errori e verifica finale su dispositivi reali.

La cartella contiene solo prototipi e documenti e non ha `.git`. All’esecuzione, rileggere `AGENTS.md` e verificare se è cambiato. Conservare tutto `docs/prototypes/`; creare manualmente lo scaffolding, senza generatori che possano sovrascrivere la cartella. Inizializzare Git locale se ancora assente, registrare il materiale esistente come baseline e usare il workflow di isolamento richiesto dalla skill di esecuzione. Nessun remoto o push è necessario. Ogni task termina con un commit dei soli file di sua competenza, se Git è disponibile; un’identità Git mancante va riportata senza inventarla.

### Strumenti e comandi

Ambiente rilevato: Node 26.11.1, npm 11.20.0. Requisito scelto: Node `>=22.12.0`, limitando l’esecuzione a una linea supportata da Vitest (22, 24 o >=26); non usare Node 23/25. Il piano non impone un downgrade della versione presente.

Il Task 1 crea gli script: `dev` → `vite --host 0.0.0.0`; `test` → `vitest run`; `test:watch` → `vitest`; `typecheck` → `tsc -b`; `build` → `vite build`; `test:e2e` → `playwright test`. `npm run test -- <file>` esegue il test mirato. Typecheck e build si eseguono separatamente; il criterio finale richiede entrambi.

Le dipendenze web usano gli abbinamenti React 19/Fiber 9 documentati ufficialmente. Dev dependencies aggiuntive: `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@types/three@0.186.0`; tipi Node compatibili con la linea locale, bloccati nel lockfile. Nessuna installazione con `--force` o `--legacy-peer-deps`: risolvere un eventuale conflitto prima di procedere. Il piano non richiede React Compiler o i peer opzionali del plugin React.

### File e responsabilità

Le cartelle elencate contengono soltanto i file assegnati nei task sottostanti.

- `src/domain/`: configurazione serializzabile, IPv4, porte, validazione; nessun import React/Three/DOM.
- `src/simulation/`: pacchetti, scheduler, protocolli e stato; nessun import React/Three/DOM.
- `src/runtime/`: sessione, cronologia e messaggi worker; il solo `simulation.worker.ts` dipende dal contesto Worker.
- `src/storage/`: database, journal e salvataggi nominati.
- `src/app/`: documento dell’editor, controller, selezione e montaggio React; nessuna regola di protocollo.
- `src/features/editor/`, `scene/`, `simulation/`, `learning/`, `services/`, `saved-networks/`: interazioni e viste del prodotto.
- `src/content/`: testi inglesi e riferimenti didattici tipizzati.
- `src/styles/`: token e layout adattivo.
- `tests/fixtures/`: configurazioni di test; `tests/helpers/`: esecuzione e interazioni condivise; `tests/e2e/`: percorsi utente su browser reale.
- `docs/verification/`: risultati riproducibili di compatibilità e prestazioni, senza affermare prove fisiche non effettuate.

### Contratti condivisi da definire nei task proprietari

Questa sezione fissa i nomi usati fra task; i dettagli privati non sono nuovi contratti pubblici.

**Task 1, `src/domain/types.ts`:** ID come stringhe; `DeviceKind = 'host' | 'router' | 'switch' | 'bridge' | 'hub'`; `IPv4Address = { ip: string; prefix: number }`; `PortRef = { deviceId: string; portId: string }`; `Port = { id: string; mac: string | null; address: IPv4Address | null }`. Solo host/router richiedono MAC e possono avere indirizzi. `Route = { id: string; destination: IPv4Address; nextHop: string | null; outPortId: string }`. `DhcpScope = { id: string; portId: string; enabled: boolean; first: string; last: string; gateway: string }`. `NatConfig = { enabled: boolean; insidePortIds: string[]; outsidePortId: string; sourceNetworks: IPv4Address[] }`.

`Device` è una union discriminata: host con una porta e `addressing: { mode: 'manual'; gateway: string | null } | { mode: 'dhcp' }`; router con porte, `routes: Route[]`, `dhcpScopes: DhcpScope[]`, `nat: NatConfig | null`; switch/bridge/hub con porte senza configurazione IPv4. Gli IPv4 manuali stanno in `Port.address`; un host DHCP ha `address: null` nel documento persistente. `NetworkConfig = { devices: Device[]; links: { id: string; ends: [PortRef, PortRef] }[] }`. Nomi e coordinate appartengono al documento di presentazione, non alle decisioni dei protocolli.

`Issue = { code: string; category: 'input' | 'model' | 'network' | 'resource'; deviceIds: string[]; linkIds: string[]; params: Record<string, string | number> }`. `Result<T> = { ok: true; value: T } | { ok: false; issue: Issue }`. I codici non sono testo da mostrare all’utente.

**Task 2/4, `src/simulation/types.ts`:** `Operation = { kind: 'ping'; sourceId: string; destination: string; ttl?: number; identifier?: number } | { kind: 'dhcp'; hostId: string }`. `ProtocolId = 'ethernet' | 'arp' | 'ipv4' | 'icmp' | 'udp' | 'dhcp' | 'nat'`. `NetworkState` raccoglie `clock`, `arp`, `mac`, `dhcpClients`, `dhcpLeases`, `nat`, messaggi pendenti, allocatori e coda: tutte le parti sono serializzabili e incluse nel ripristino. Le voci DHCP hanno `ip`, `prefix`, `gateway`, `clientMac`, `scopeId`, `leaseSeconds: 4294967295`; le voci NAT hanno indirizzi/identificatori interno ed esterno e `remoteIp`.

`SimEvent` ha `id`, `index` (a partire da 1), `time`, `causeId`, `kind`, `protocols`, `deviceIds`, `linkIds`, `before`, `after`, `changes`, `detail`. `before/after` sono frame tipizzati, non stringhe; `detail` è una union discriminata da `kind`. Nomi di eventi usati nei task: `operation.started`, `ethernet.forwarded`, `ethernet.flooded`, `arp.request`, `arp.reply`, `route.selected`, `ipv4.forwarded`, `icmp.echoReply`, `icmp.timeExceeded`, `icmp.unreachable`, `dhcp.discover`, `dhcp.offer`, `dhcp.request`, `dhcp.ack`, `nat.translated`, `operation.completed`, `operation.failed`. Estendere la union in modo esaustivo quando un fatto necessario richiede un altro evento.

`Simulator` espone `start(operation: Operation, operationId: string): Result<void>`, `advance(maxActions: number): AdvanceResult`, `snapshot(): NetworkState`, `cancel(): NetworkState`, `reset(): NetworkState`. `AdvanceResult = { kind: 'yield' } | { kind: 'event'; event: SimEvent; state: NetworkState } | { kind: 'done'; state: NetworkState }`. `start` pianifica ma non calcola tutta la sequenza. `cancel` ripristina l’inizio dell’operazione, `reset` lo stato pulito della configurazione corrente.

**Task 5, `src/runtime/messages.ts`:** `Projection = { revision: number; operationId: string | null; cursor: number; frontier: number; total: number | null; status: 'idle' | 'active' | 'completed' | 'failed' | 'resource-error'; event: SimEvent | null; state: NetworkState }`. Cursore 0 = stato iniziale; il punto massimo esplorato è `frontier`. `SessionCommand` è `{ type: 'load'; network: NetworkConfig } | { type: 'start'; operation: Operation } | { type: 'next' } | { type: 'seek'; index: number } | { type: 'cancel' } | { type: 'reset' }`. `WorkerRequest = { requestId: number; revision: number; operationId: string | null; command: SessionCommand }`; risposta con stessi identificatori e `Result<Projection>`. `load` e `reset` possono arrivare durante un’operazione; `start` richiede cursore al frontier e nessuna operazione attiva. Nessun comando Play nel motore: il controller richiede Next con backpressure.

**Task 6, `src/app/types.ts`:** `NetworkDocument = { schema: 1; id: string; name: string; network: NetworkConfig; layout: Record<string, { name: string; x: number; z: number }>; view: { cameraPosition: [number, number, number]; target: [number, number, number]; depth: 'ethernet' | 'ip' | 'full' } }`. `AppState` include `document`, `projection`, `selection: { kind: 'device' | 'link'; id: string } | null`, `tutorial: boolean`, `playing: boolean`, `busy: boolean`, `dirty: boolean`, `issue: Issue | null` e stato della creazione del collegamento. `AppController` espone `getSnapshot(): AppState`, `subscribe(listener: () => void): () => void`, `dispatch(action: AppAction): Promise<void>`, `dispose(): void`. Le azioni dei task successivi estendono la union in `src/app/actions.ts`; le firme indicate nei task sono vincolanti.

**Fixture condivise da creare con i test del Task 1:** Definire fixture pure `fixture(name: FixtureName): NetworkConfig`: `lan`, `routed`, `l2Loop`, `l3Ring`, `router31`, `duplicateIp`, `dhcp`, `dhcpNoServer`, `dhcpExhausted`, `dhcpMultipleServers`, `pat`, `doubleNat`. ID host `a`/`b`, router `r1`, switch `s1`; porte host `eth0`, router `eth0`/`eth1`, fabric `p1`/`p2` ecc. In `lan`, A/B sono `192.168.1.10`/`192.168.1.20`; in `routed`, B è `192.168.2.10` e il router ha `.1` in entrambe le /24. In `pat`, A/B sono `192.168.1.10`/`192.168.1.11`, router interno `.1`, esterno `203.0.113.1/24`, host `remote` a `203.0.113.10/24`. Le fixture DHCP derivano dalla LAN con scope `.100`–`.110` e client senza IPv4. Aggiungere `fanoutNetwork(hostCount: number): NetworkConfig`.

## Task 1: Dominio di rete e calcolo dei prefissi

**Files:** Create `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.domain.json`, `tsconfig.app.json`, `vite.config.ts`, `.gitignore`, `index.html`, `src/main.tsx`, `src/domain/types.ts`, `src/domain/ipv4.ts`, `src/domain/topology.ts`, `src/domain/configuration.ts`, `tests/fixtures/networks.ts`, `src/domain/ipv4.test.ts`, `src/domain/topology.test.ts`.

**Interfaces:** Consumes: specifica e contratti sopra. Produces: `parseIPv4(value: string): Result<number>` (unsigned); `analyzePrefix(ip: string, prefix: number, options?: { parentPrefix?: number; pointToPoint?: boolean }): Result<PrefixInfo>`; `PrefixInfo` con `network`, `broadcast: string | null`, `totalAddresses`, `usableHosts`, `networkBits`, `hostBits`, `subnetCount: number | null`; `validateConfiguration(config: NetworkConfig): Issue[]`; `connectPorts(config: NetworkConfig, from: PortRef, to: PortRef, linkId: string): Result<NetworkConfig>`.

- [ ] **Step 1 — Preparare il supporto ai test del dominio.** Creare manualmente manifest/configurazioni, installare solo le versioni fissate e scrivere i tipi del contratto. `src/main.tsx` monta una shell React minima in inglese. Il progetto dominio compila senza tipi DOM/React; i progetti app/worker verranno estesi nei task proprietari. Nessun generatore sulla cartella non vuota.
- [ ] **Step 2 — Scrivere test che falliscono sulle funzioni mancanti.** Testare gli assert seguenti, più porta occupata, auto-collegamento, ID inesistenti e vincolo bridge a due porte.

```ts
expect(analyzePrefix('192.168.1.10', 24, { parentPrefix: 16 })).toMatchObject({ ok: true, value: { totalAddresses: 256, usableHosts: 254, subnetCount: 256 } });
expect(analyzePrefix('10.0.0.0', 31, { pointToPoint: true })).toMatchObject({ ok: true, value: { usableHosts: 2, broadcast: null } });
expect(analyzePrefix('10.0.0.7', 32)).toMatchObject({ ok: true, value: { usableHosts: 1, broadcast: null } });
expect(parseIPv4('256.1.1.1').ok).toBe(false);
expect(parseIPv4('1e2.0.0.1').ok).toBe(false);
```

- [ ] **Step 3 — Eseguire il rosso.** `npm run test -- src/domain`: atteso fallimento per funzioni mancanti, non per toolchain rotta.
- [ ] **Step 4 — Implementare le funzioni.** IPv4 in aritmetica unsigned, conteggi senza overflow signed, /0 incluso; rifiutare maschere non contigue, prefissi fuori 0–32 e parent prefix più specifico. La validazione non blocca l’avvio solo perché mancano gateway o rotte. Nessun cap agli array degli apparati.
- [ ] **Step 5 — Verificare e registrare.** `npm run test -- src/domain`, `npm run typecheck`, `npm run build`: exit 0.

- [ ] **Step 6 — Commit.** Commit `feat: add network domain and IPv4 analysis` con i soli file del task.

## Task 2: Scheduler deterministico e contratti degli eventi

**Files:** Create `src/simulation/types.ts`, `src/simulation/scheduler.ts`, `src/simulation/state.ts`, `src/simulation/packets.ts`, `src/simulation/scheduler.test.ts`.

**Interfaces:** Consumes: `NetworkConfig`, `Operation` e contratti sopra. Produces: `createInitialState(config: NetworkConfig): NetworkState`; `applyChanges(state: NetworkState, changes: readonly StateChange[]): NetworkState`; `createScheduler(): Scheduler`; `Scheduler.enqueue(action: ScheduledAction): void`, `take(): ScheduledAction | null`, `snapshot(): ScheduledAction[]`; `ScheduledAction` con `id`, `at`, `sequence`, `causeId`, `type` e payload discriminato. Definisce `StateChange` come union tipizzata di variazioni per singola entità/voce di stato con valore precedente e successivo, non copie dell’intero `NetworkState`; include anche coda e allocatori quando cambiano. Definisce le union pacchetto/evento condivise, senza testo UI. Forwarding e storico applicano i cambiamenti attraverso la stessa funzione.

- [ ] **Step 1 — Scrivere il test rosso.** Ordinamento per tempo virtuale e poi sequence, serializzazione/ripristino, assenza di dipendenza da Date/performance e timeout finiti. Esempio, usando un helper locale `action(id, at, sequence)`:

```ts
queue.enqueue(action('later', 100, 0));
queue.enqueue(action('second', 0, 2));
queue.enqueue(action('first', 0, 1));
expect([queue.take()?.id, queue.take()?.id, queue.take()?.id]).toEqual(['first', 'second', 'later']);
expect(createInitialState(fixture('lan')).clock).toBe(0);
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/simulation/scheduler.test.ts`: fallimento sulle funzioni mancanti.
- [ ] **Step 3 — Implementare lo scheduler e lo stato iniziale.** Coda ordinata, allocatori deterministici nello stato, IPv4 manuali ricavati dalla configurazione e host DHCP inizialmente privi di assegnazione. Definire pacchetti Ethernet/ARP/IPv4/ICMP/UDP/DHCP con campi e checksum pertinenti. `applyChanges` restituisce stato aggiornato senza mutare quello precedente; un test applica i delta e recupera gli stessi valori dello snapshot atteso. Eventi discriminati consentono elaborazione esaustiva nei task successivi; nessun runtime React.
- [ ] **Step 4 — Verificare.** `npm run test -- src/simulation/scheduler.test.ts` e `npm run typecheck`: exit 0; due esecuzioni identiche producono la stessa coda.

- [ ] **Step 5 — Commit.** Commit `feat: add deterministic simulation scheduler`.

## Task 3: Ethernet, apprendimento e identificazione dei cicli L2

**Files:** Create `src/simulation/ethernet.ts`, `src/domain/l2-cycles.ts`, `src/simulation/ethernet.test.ts`, `src/domain/l2-cycles.test.ts`.

**Interfaces:** Consumes: `NetworkConfig`, `NetworkState`, `PortRef`, `EthernetFrame` dal Task 2. Produces: `forwardEthernet(config: NetworkConfig, state: NetworkState, ingress: PortRef, frame: EthernetFrame): ForwardResult`, dove `ForwardResult` contiene `egress: PortRef[]`, `learned: boolean`, `changes: StateChange[]`; `findL2Cycles(config: NetworkConfig): string[][]` restituisce gruppi di link ID da evidenziare.

- [ ] **Step 1 — Scrivere test rossi con frame costruiti nei test.** Broadcast/unicast sconosciuto escono da tutte le altre porte; lo switch impara dalla sorgente e poi usa la porta corretta; un hub non apprende. Lo stesso frame in due diramazioni conserva `rootId` e ottiene ID copia distinti.

```ts
expect(findL2Cycles(fixture('l2Loop')).flat()).not.toEqual([]);
expect(findL2Cycles(fixture('l3Ring'))).toEqual([]);
expect(hubResult.learned).toBe(false);
expect(switchKnownResult.egress).toEqual([{ deviceId: 's1', portId: 'p2' }]);
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/simulation/ethernet.test.ts src/domain/l2-cycles.test.ts`.
- [ ] **Step 3 — Implementare.** Bridge e switch condividono le regole di apprendimento; l’hub usa ripetizione. Cercare cicli sul grafo delle porte con adiacenze interne soltanto negli apparati L2; conservare l’identità dei cavi per rilevare anche collegamenti paralleli. Una porta router è un terminale L2 distinto dalle altre porte dello stesso router. Non bloccare un semplice anello di routing IPv4.
- [ ] **Step 4 — Verificare e registrare.** Stesso comando: tutti PASS; `npm run typecheck`: exit 0.

- [ ] **Step 5 — Commit.** Commit `feat: simulate Ethernet forwarding and detect layer two loops`.

## Task 4: Ping reale, ARP, routing e guasti di rete

**Files:** Create `src/simulation/arp.ts`, `src/simulation/ipv4.ts`, `src/simulation/icmp.ts`, `src/simulation/checksums.ts`, `src/simulation/engine.ts`, `src/simulation/engine.test.ts`, `tests/helpers/engine.ts`.

**Interfaces:** Consumes: Task 1–3. Produces: `createSimulator(config: NetworkConfig): Simulator`; `selectRoute(config: NetworkConfig, deviceId: string, destination: string): Result<RouteSelection>` con `RouteSelection = { routeId: string; outPortId: string; nextHop: string }`; `internetChecksum(bytes: Uint8Array): number`. Test helper `collectOperation(engine: Simulator, operation: Operation, operationId?: string): SimEvent[]` esegue fino a done con guardia di test di 10.000 eventi, mai un limite del prodotto.

- [ ] **Step 1 — Scrivere test rossi su risultati di rete.** Ping LAN e routed, cache riutilizzata, /31 diretto router-router, route /32/default e longest-prefix, ritorno senza rotta, TTL esaurito, gateway assente, ARP senza risposta, IPv4 duplicati. Fixture e assert devono controllare campi/causalità, non imporre il numero totale di eventi.

```ts
expect(first.some(e => e.kind === 'arp.request')).toBe(true);
expect(second.some(e => e.kind === 'arp.request')).toBe(false);
expect(routed.some(e => e.kind === 'ipv4.forwarded' && e.after[0].payload.kind === 'ipv4' && e.after[0].payload.ttl === 63)).toBe(true);
expect(ttlLoop.some(e => e.kind === 'icmp.timeExceeded')).toBe(true);
expect(duplicate.some(e => e.kind === 'operation.completed')).toBe(false);
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/simulation/engine.test.ts`.
- [ ] **Step 3 — Implementare il motore progressivo.** `start` verifica input/vincoli del modello e `findL2Cycles`, poi accoda l’inizio; gateway o rotta mancanti restano esiti della sequenza. `advance` esegue al massimo `maxActions` azioni interne e restituisce yield oppure un evento significativo. ARP: tre richieste al massimo, distanziate di 1.000 ms virtuali. Ping: TTL predefinito 64, identificatore iniziale 1 poi allocatore deterministico, una richiesta e una risposta. Se la coda è esaurita senza Echo Reply, registrare l’esito senza risposta; non aggiungere un timeout globale basato sulla lunghezza presunta del percorso. ICMP errori e relativi ritorni sono pacchetti; nessun errore ICMP in risposta a un altro errore ICMP. Aggiornare checksum e MAC per hop. Duplicati rilevati alla risoluzione/consegna non possono produrre un successo arbitrario.
- [ ] **Step 4 — Verificare.** `npm run test -- src/domain src/simulation`, `npm run typecheck`: exit 0. Un test controlla che `start()` non abbia già calcolato Echo Reply e che `advance(1)` possa cedere senza congelare il chiamante. Cancel torna allo snapshot iniziale, reset alle sole configurazioni statiche.

- [ ] **Step 5 — Commit.** Commit `feat: simulate progressive routed ping with ARP and ICMP errors`.

## Task 5: Cronologia ripristinabile, worker e backpressure

**Files:** Create `src/storage/database.ts`, `src/storage/journal.ts`, `src/runtime/history.ts`, `src/runtime/messages.ts`, `src/runtime/session.ts`, `src/runtime/simulation.worker.ts`, `src/runtime/client.ts`, `src/runtime/session.test.ts`, `src/runtime/history.test.ts`, `tests/helpers/memory-journal.ts`.

**Interfaces:** Consumes: `Simulator`, `NetworkState`, `SimEvent`. Produces: `openDatabase(): Promise<AppDatabase>` con store `documents`, `journalEvents`, `journalCheckpoints`; `Journal.append(operationId, event, checkpoint?): Promise<void>`, `read(operationId, from, to): Promise<JournalSlice>`, `clear(operationId): Promise<void>`; `createSession(config: NetworkConfig, revision: number, journal: Journal): Session` e `Session.handle(request: WorkerRequest): Promise<Result<Projection>>`; `createSimulationClient(worker: Worker): SimulationClient`, con `request(request: WorkerRequest): Promise<Result<Projection>>`, `dispose(): void`. I tipi dei parametri journal sono `string`, `SimEvent`, `NetworkState` e indici numerici; il checkpoint conserva il suo indice. `JournalSlice` include checkpoint antecedente e cambiamenti fino all’indice richiesto.

- [ ] **Step 1 — Scrivere test rossi.** Previous/seek restituiscono stato e pacchetti dello stesso evento; andare avanti nella cronologia non riesegue ARP; dopo completamento le cache restano disponibili per il prossimo ping; nuova operazione da storico rifiutata; cancel e reset distinti; rifiuto di doppio Next, risposta obsoleta e requestId duplicato. Forzare spill con cache di due eventi nel test.

```ts
expect(replayed.state).toEqual(original.state);
expect(historicalStart).toMatchObject({ ok: false, issue: { code: 'HISTORY_NOT_AT_FRONTIER' } });
expect(outdated).toMatchObject({ ok: false, issue: { code: 'STALE_REVISION' } });
expect(duringRun.total).toBeNull();
expect(afterDone.total).toBe(afterDone.frontier);
expect(quotaFailure.status).toBe('resource-error');
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/runtime`; errori su contratti ancora mancanti.
- [ ] **Step 3 — Implementare cronologia e sessione.** Checkpoint iniziale all’indice 0, poi ogni 50 eventi, ultimi 100 eventi caldi come valori iniziali modificabili; append atomico di evento/checkpoint prima di confermare l’avanzamento. Stato e proiezione restano coerenti se la scrittura fallisce. Accumulare anche i delta delle azioni interne che precedono l’evento: il ripristino usa `applyChanges` e comprende coda/allocatori. Niente snapshot completo per ogni evento. Journal freddo in IndexedDB, adapter memory soltanto nei test. Lo store `documents` viene creato già con keyPath `id` e indice univoco `normalName`; l’envelope contiene `id`, `name`, `normalName`, `updatedAt`, `schema` e `document: unknown`, che il Task 11 decodificherà. Nessun import anticipato di tipi app non ancora creati. Terminata un’operazione, un nuovo start conserva il suo stato finale ma elimina la vecchia cronologia; Cancel può ripristinare lo stato iniziale anche dopo la conclusione finché non parte un’altra operazione.
- [ ] **Step 4 — Collegare il worker.** Creazione via `new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' })`; richieste serializzate, riconoscimento di revision/operationId/requestId, cancellazione dei comandi obsoleti e non applicazione dei risultati in ritardo. Avanzare in porzioni da 128 azioni, cedendo al loop fra porzioni; un solo avanzamento logico in volo. Il client non aggiorna il documento autonomamente. `load` invalida la vecchia sessione; cambiare generazione interrompe anche un avanzamento non ancora concluso.
- [ ] **Step 5 — Verificare.** `npm run test -- src/runtime`, `npm run typecheck`, `npm run build`: exit 0. Test quota/transaction abort con fake-indexeddb; integrazione del worker reale sarà verificata dal Task 8.

- [ ] **Step 6 — Commit.** Commit `feat: add worker sessions and reversible simulation history`.

## Task 6: Editor utilizzabile con clic, touch e tastiera

**Files:** Create `src/app/types.ts`, `src/app/actions.ts`, `src/app/controller.ts`, `src/app/use-app.ts`, `src/app/App.tsx`, `src/features/editor/DeviceCatalog.tsx`, `src/features/editor/ConnectionBuilder.tsx`, `src/features/editor/DeviceInspector.tsx`, `src/features/editor/Tutorial.tsx`, `src/styles/tokens.css`, `src/styles/layout.css`, `src/app/controller.test.ts`, `tests/e2e/editor.spec.ts`, `playwright.config.ts`; Modify `src/main.tsx`.

**Interfaces:** Consumes: dominio, `createSimulationClient`; Produces: `createAppController(client: SimulationClient): AppController`, `useApp(controller: AppController): AppState`, `App({ controller }: { controller: AppController })`. Azioni: `{type:'device.add';kind:DeviceKind}`, `{type:'device.move';id:string;x:number;z:number}`, `{type:'device.rename';id:string;name:string}`, `{type:'device.remove';id:string}`, `{type:'config.apply';network:NetworkConfig}`, `{type:'selection.set';selection:AppState['selection']}`, `{type:'connection.start'}`, `{type:'connection.choosePort';port:PortRef}`, `{type:'connection.cancel'}`, `{type:'tutorial.set';enabled:boolean}`.

- [ ] **Step 1 — Scrivere test rossi del controller e del percorso utente.** Aggiunta di tutti i cinque apparati, MAC stabili, rename/move senza reset, modifica di indirizzo/cavo con incremento revisione e reset dinamico, tutorial senza assegnazioni nascoste. Esempio E2E dopo apertura di `Add device`:

```ts
await page.getByRole('button', { name: 'Add host', exact: true }).click();
await expect(page.getByRole('heading', { name: 'Host 1', exact: true })).toBeVisible();
await page.getByRole('switch', { name: 'Tutorial mode' }).click();
await expect(page.getByLabel('IPv4 address', { exact: true })).toHaveValue('');
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/app/controller.test.ts`; introdurre il webServer Playwright per `npm run dev` e verificare che `npm run test:e2e -- tests/e2e/editor.spec.ts` fallisca sui controlli mancanti. Installare i browser Playwright solo ora, all’esecuzione.
- [ ] **Step 3 — Implementare documento e interazioni.** Stato React tramite external store immutabile e `useSyncExternalStore`, niente libreria globale aggiuntiva. Host una porta, router due iniziali, bridge due, switch/hub quattro; aggiunta/rimozione esplicita di porte consentita dove previsto. Posizioni su griglia X/Z, coordinate regolabili anche da pulsanti. Form manuali host/router e rotte statiche; servizi DHCP/NAT saranno aggiunti dai Task 9/10. Flusso collegamenti a due porte, possibilità di annullare e indicazione della porta occupata; eliminazione porta/apparato elimina esplicitamente i cavi collegati e applica il reset. Draft distinti dall’applicazione effettiva.
- [ ] **Step 4 — Verificare.** Test controller ed editor: PASS; nessun controllo richiede hover. Testare tastiera e browser mobile emulato.

- [ ] **Step 5 — Commit.** Commit `feat: add accessible network editor and guided configuration`.

## Task 7: Scena 3D e selezione sincronizzata

**Files:** Create `src/features/scene/NetworkScene.tsx`, `src/features/scene/DeviceModel.tsx`, `src/features/scene/LinkModel.tsx`, `src/features/scene/PacketModel.tsx`, `src/features/scene/CameraControls.tsx`, `src/features/scene/scene-view.ts`, `src/features/scene/scene-view.test.ts`, `tests/e2e/scene.spec.ts`; Modify `src/app/App.tsx`, `src/styles/layout.css`.

**Interfaces:** Consumes: `AppController`, `NetworkDocument`, `Projection`. Produces: `NetworkScene({controller}: {controller: AppController})`; `buildSceneView(document: NetworkDocument, projection: Projection, selection: AppState['selection']): SceneView`, con apparati, cavi, copie dei messaggi, evidenziazioni e ID selezionabili. Aggiunge azione `{type:'view.set';view:NetworkDocument['view']}` senza reset di rete.

- [ ] **Step 1 — Scrivere test rossi della proiezione e selezione reale.** Proiezione storico/frontier, due copie broadcast entrambe ispezionabili, selezione mesh e equivalente elenco, cambio telecamera senza modifica della revisione.

```ts
expect(view.packets.map(p => p.rootId)).toEqual([broadcastId, broadcastId]);
expect(view.packets[0].id).not.toBe(view.packets[1].id);
expect(controller.getSnapshot().projection.revision).toBe(revisionBeforeOrbit);
await expect(page.getByRole('button', { name: 'Reset view', exact: true })).toBeVisible();
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/features/scene/scene-view.test.ts`; `npm run test:e2e -- tests/e2e/scene.spec.ts`.
- [ ] **Step 3 — Implementare la scena.** Canvas React Three Fiber con `frameloop="demand"`, OrbitControls/Drei, geometrie e materiali condivisi. Cinque modelli volumetrici distinguibili, porte coerenti, cavi nello spazio e copie dei frame animate sui link. Camera e stato rete indipendenti. Modalità esplicita Move separata da navigazione camera e selezione; controlli di posizione senza trascinamento. Etichette ridotte in base alla distanza, elenco HTML completo sempre disponibile. Rendering continuo solo durante animazione/interazione; niente CDN. Al cambio di scheda fermare Play e preservare il punto logico.
- [ ] **Step 4 — Verificare.** Test mirati e build: PASS. Nel browser collaborativo T3 controllare WebGL effettivo, orbit/zoom, picking mesh, cambio evento senza reset camera e touch; non basta una schermata o un canvas vuoto.

- [ ] **Step 5 — Commit.** Commit `feat: render editable network topology in three dimensions`.

## Task 8: Simulazione completa, spiegazioni e teoria interattiva

**Files:** Create `src/features/simulation/SimulationControls.tsx`, `src/features/simulation/EventSummary.tsx`, `src/features/simulation/PacketInspector.tsx`, `src/features/simulation/DeviceTables.tsx`, `src/features/learning/ProtocolDetails.tsx`, `src/features/learning/PrefixExplorer.tsx`, `src/content/events.en.ts`, `src/content/protocols.en.ts`, `src/content/issues.en.ts`, `src/content/present.ts`, `src/content/present.test.ts`, `tests/e2e/ping.spec.ts`; Modify `src/app/actions.ts`, `src/app/controller.ts`, `src/app/App.tsx`, `src/features/editor/DeviceInspector.tsx`, `src/styles/layout.css`.

**Interfaces:** Consumes: `Projection`, `SimEvent`, `Issue`, `analyzePrefix`, `AppController`. Produces: `presentEvent(event: SimEvent, document: NetworkDocument): EventPresentation` (`title`, `summary`, `protocolIds`, `detailRows`); `presentIssue(issue: Issue, document: NetworkDocument): string`. Azioni: `{type:'simulation.start';operation:Operation}`, `{type:'simulation.next'}`, `{type:'simulation.previous'}`, `{type:'simulation.seek';index:number}`, `{type:'simulation.play';enabled:boolean}`, `{type:'simulation.cancel'}`, `{type:'simulation.reset'}`. Tutti i pannelli ricevono controller e leggono la stessa projection.

- [ ] **Step 1 — Scrivere test rossi.** E2E costruisce una rete dall’editor, avvia ping col worker reale, mostra la rotta usata e attraversa ARP con Next/Previous. Il secondo ping riutilizza cache, Reset le svuota. New start da storico è disabilitato; Cancel ripristina inizio. Test contenuti: IP endpoints invariati senza NAT, ICMP mai etichettato L4, ARP non attivo su cache hit, box didattico per gateway assente.

```ts
expect(presentIssue(noGatewayIssue, doc)).toBe('Host A cannot reach a network outside its own subnet because no default gateway is configured.');
await expect(page.getByRole('button', { name: 'Start ping', exact: true })).toBeDisabled(); // durante vista storica
await expect(page.getByText(/simulation in progress/)).toBeVisible();
await expect(page.getByRole('progressbar')).toHaveCount(0); // niente percentuale globale inventata
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/content/present.test.ts`; `npm run test:e2e -- tests/e2e/ping.spec.ts`.
- [ ] **Step 3 — Implementare presentazione e controlli.** Play manda Next soltanto dopo risposta precedente e completamento dell’animazione; velocità visuale separata dal clock. Timer Play si annulla su Pause/hidden/edit/errore. Slider degli eventi noti con totale sconosciuto finché attivo. Controlli accanto alla scena e posizione persistente, non sotto una colonna lunga. Riga di routing effettiva, cache/MAC e confronto frame prima/dopo. Protocolli cliccabili, approfondimenti richiudibili, dettagli link su hover o selezione. Testi inglesi e fonti RFC della specifica. Esploratore prefissi con parent prefix esplicito e distinzione /31, /32 e conteggio indirizzi/host; modifica esplorativa non applicata alla rete senza conferma.
- [ ] **Step 4 — Verificare la prima sezione completa.** Suite di ping PASS su desktop e touch; `npm run test`, `npm run typecheck`, `npm run build`: exit 0. Controllo visivo browser T3 del routed ping reale e dell’errore gateway.

- [ ] **Step 5 — Commit.** Commit `feat: add progressive playback and contextual network explanations`.

## Task 9: DHCP esplicito sul router e sugli host

**Files:** Create `src/simulation/dhcp.ts`, `src/simulation/dhcp.test.ts`, `src/features/services/DhcpSettings.tsx`, `src/features/services/DhcpClient.tsx`, `tests/e2e/dhcp.spec.ts`; Modify `src/domain/configuration.ts`, `src/simulation/engine.ts`, `src/simulation/types.ts`, `src/features/editor/DeviceInspector.tsx`, `src/content/events.en.ts`, `src/content/protocols.en.ts`, `src/content/issues.en.ts`.

**Interfaces:** Consumes: `DhcpScope`, `Operation` kind dhcp, state/packet types del Task 2, API Simulator/worker senza nuove operazioni pubbliche. Produces: esecuzione del ramo DHCP di `start`; `DhcpSettings({controller,deviceId}: {controller:AppController;deviceId:string})` e `DhcpClient` con stessa firma. `validateConfiguration` ora controlla pool e modalità DHCP senza cambiare firma. Test helper `collectOperation` resta invariato.

- [ ] **Step 1 — Scrivere test rossi.** DORA/UDP/broadcast flag e destinazioni coerenti, ACK con lease infinito, due client con IP distinti, riuso per MAC, richiesta successiva esplicita, offerte multiple deterministiche, prenotazioni liberate, no server, pool esaurito, nessun relay. Un pool /31 LAN o che includa gateway/network/broadcast/manuali noti viene rifiutato con errore contestuale.

```ts
expect(dhcpEvents.filter(e => e.kind.startsWith('dhcp.')).map(e => e.kind)).toEqual(['dhcp.discover', 'dhcp.offer', 'dhcp.request', 'dhcp.ack']);
expect(lease.leaseSeconds).toBe(4294967295);
expect(clientA.ip).not.toBe(clientB.ip);
expect(configAfterSelectingAutomatic.devices[0].ports[0].address).toBeNull();
expect(hostStateBeforeExplicitRequest).toBeNull();
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/simulation/dhcp.test.ts`; `npm run test:e2e -- tests/e2e/dhcp.spec.ts`.
- [ ] **Step 3 — Implementare DHCP e configurazione.** Servizio per interfaccia router, intervallo e gateway, modalità host; nessuna assegnazione automatica quando si seleziona DHCP. La richiesta esplicita usa la stessa timeline; tre tentativi Discover con timeout di 1.000 ms virtuali e terminazione finita. Prima offerta per ordine scheduler; server non scelti liberano prenotazioni. Assenza di relay/renewal esposta nella teoria, lease infinito nei dati. Al primo evento della nuova richiesta eliminare la precedente assegnazione dinamica client; Cancel deve recuperarla. Selezionare Manual è una modifica applicata, non converte un lease in statico di nascosto.
- [ ] **Step 4 — Verificare.** Test DHCP e integrazione ping dopo DHCP: PASS. Previous prima dell’ACK rimuove l’indirizzo solo dalla proiezione osservata; Next lo ripristina senza nuova assegnazione.

- [ ] **Step 5 — Commit.** Commit `feat: add explicit DHCP acquisition and router service configuration`.

## Task 10: PAT per ICMP e tabella delle traduzioni

**Files:** Create `src/simulation/nat.ts`, `src/simulation/nat.test.ts`, `src/features/services/NatSettings.tsx`, `src/features/services/NatTable.tsx`, `tests/e2e/nat.spec.ts`; Modify `src/simulation/engine.ts`, `src/simulation/types.ts`, `src/domain/configuration.ts`, `src/features/editor/DeviceInspector.tsx`, `src/features/simulation/DeviceTables.tsx`, `src/content/events.en.ts`, `src/content/protocols.en.ts`, `src/content/issues.en.ts`.

**Interfaces:** Consumes: `NatConfig`, Simulator, ICMP/checksum e Projection. Produces: gestione PAT nel percorso IPv4; `NatSettings({controller,deviceId}: {controller:AppController;deviceId:string})` e `NatTable` con stessa firma. `SimEvent` kind `nat.translated` espone in detail `{direction:'outbound'|'inbound';bindingId:string}`; i frame prima/dopo contengono i valori reali. Nessuna nuova operazione UI.

- [ ] **Step 1 — Scrivere test rossi.** Due host con stesso identificatore originale 1 eseguono ping successivi verso la stessa destinazione; binding e risposte restano distinti. Riuso compatibile, checksum prima/dopo, Time Exceeded e Unreachable con header citato tradotto, rotte mancanti, risposta senza binding, disabilitazione servizio e doppio NAT non supportato.

```ts
expect(aBinding.outsideIp).toBe(bBinding.outsideIp);
expect(aBinding.outsideIdentifier).not.toBe(bBinding.outsideIdentifier);
expect(replyDestinationA).toBe('192.168.1.10');
expect(replyDestinationB).toBe('192.168.1.11');
expect(internetChecksum(translatedIpv4Header)).toBe(0);
expect(doubleNatResult).toMatchObject({ category: 'model', code: 'NESTED_NAT_UNSUPPORTED' });
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/simulation/nat.test.ts`; `npm run test:e2e -- tests/e2e/nat.spec.ts`.
- [ ] **Step 3 — Implementare.** Match reti sorgenti/interfacce inside/outside, allocazione deterministica del più piccolo identificatore esterno libero fra 1 e 65535, chiave comprendente IP interno/ID/destinatario e reverse lookup coerente. Esaurire gli identificatori disponibili produce un errore esplicito di risorsa, senza riusare un binding incompatibile. Traduzione indirizzi e identificatori ICMP, checksum IPv4/ICMP e pacchetto citato negli errori. Non aprire ingressi non sollecitati. Nessuna allocazione se manca una rotta necessaria. Le associazioni restano fino a Reset/config edit; Previous mostra lo stato precedente alla creazione. Form spiega inside/outside e consente DHCP e NAT contemporanei, senza legarli allo stesso toggle.
- [ ] **Step 4 — Verificare.** Test PAT, ping, DHCP e worker: PASS. E2E combina host configurati via DHCP e ping PAT verso l’host esterno simulato.

- [ ] **Step 5 — Commit.** Commit `feat: add ICMP PAT and reversible translation inspection`.

## Task 11: Reti nominate, riapertura e recupero degli errori di storage

**Files:** Create `src/storage/documents.ts`, `src/storage/documents.test.ts`, `src/features/saved-networks/SavedNetworks.tsx`, `src/features/saved-networks/SaveNetwork.tsx`, `tests/e2e/saves.spec.ts`; Modify `src/app/actions.ts`, `src/app/controller.ts`, `src/app/App.tsx`, `src/storage/database.ts`, `src/content/issues.en.ts`.

**Interfaces:** Consumes: `NetworkDocument`, database del Task 5, AppController. Produces: `createDocumentRepository(database: AppDatabase): DocumentRepository`; `list(): Promise<SavedNetworkSummary[]>`, `load(id: string): Promise<Result<NetworkDocument>>`, `save(document: NetworkDocument, overwriteId?: string): Promise<Result<string>>`; summary `{id:string;name:string;updatedAt:number}`. Azioni `{type:'document.save';name:string;overwriteId?:string}`, `{type:'document.open';id:string}`. `updatedAt` può usare tempo reale perché non entra nel motore.

- [ ] **Step 1 — Scrivere test rossi.** Round trip del documento, nomi vuoti, collisione nome senza overwrite, record/schema invalidi, database bloccato da altra scheda, quota esaurita e transaction abort. Non caricare un record con porte/cavi inesistenti. Riapertura conserva MAC/posizioni/servizi/rotte ma non cache, DHCP acquisito o binding NAT.

```ts
expect(loaded.network).toEqual(saved.network);
expect(reopened.projection.state.dhcpClients.a).toBeNull();
expect(reopened.projection.state.nat.r1).toEqual([]);
expect(conflictingSave).toMatchObject({ ok: false, issue: { code: 'SAVE_NAME_EXISTS' } });
expect(controller.getSnapshot().dirty).toBe(true); // scrittura fallita
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test -- src/storage/documents.test.ts`; `npm run test:e2e -- tests/e2e/saves.spec.ts`.
- [ ] **Step 3 — Implementare.** Schema versione 1, decodifica runtime senza cast cieco, transazioni atomiche, indice nome normalizzato trim/case-insensitive. Aggiornare la rete selezionata usa il suo ID; una rete diversa con nome esistente richiede overwrite esplicito. Mostrare che i dati appartengono a questo browser e non sono sincronizzati. Apertura valida prima di sostituire il documento corrente; in presenza di modifiche non salvate chiedere se salvarle/scartarle/annullare. Gestire `blocked`/`versionchange` chiudendo connessioni e mostrando Retry. Ripulire journal abbandonati senza toccare salvataggi nominati.
- [ ] **Step 4 — Verificare.** Suite storage ed E2E: PASS. Un errore di IndexedDB non cancella la rete aperta e non richiede di perdere la configurazione per riprovare.

- [ ] **Step 5 — Commit.** Commit `feat: persist named network configurations with recoverable storage errors`.

## Task 12: Parità smartphone, recupero WebGL e prestazioni misurate

**Files:** Create `src/features/scene/SceneRecovery.tsx`, `tests/e2e/adaptive.spec.ts`, `tests/e2e/recovery.spec.ts`, `tests/e2e/performance.spec.ts`, `docs/verification/device-matrix.md`, `docs/verification/performance.md`, `README.md`; Modify `src/styles/layout.css`, `src/styles/tokens.css`, `src/app/App.tsx`, `src/features/scene/NetworkScene.tsx`, `src/features/simulation/SimulationControls.tsx`, `playwright.config.ts`.

**Interfaces:** Consumes: tutti i contratti precedenti; non cambia l’interface del motore. Produces: `SceneRecovery({children}: {children:React.ReactNode})` per gestione perdita/ricreazione del contesto; test e report riproducibili con dispositivo/browser/versione, topologia e misure. README con installazione, comandi, funzionalità ed esclusioni.

Riferimento fisico computer rilevato durante la pianificazione: hardware identifier `Mac17,3`, macOS `27.0.1`; registrare versione del browser al momento della prova. Riferimenti smartphone proposti per la qualificazione: iPhone 13 con Safari e Pixel 7 con Chrome, usando le versioni effettivamente presenti e annotandole. La disponibilità di questi smartphone non è verificata: un eventuale modello sostitutivo va riportato come tale nel report, con le misure reali. I profili emulati non sono dispositivi fisici disponibili.

- [ ] **Step 1 — Scrivere i test rossi delle condizioni mancanti.** Viewport 320×568, 360×640, 390×844, 844×390, 1280×800; Playwright Chromium, Firefox e WebKit, touch dove supportato. Percorso completo editor→DHCP→ping PAT→Previous→salva→riapri, elenco apparati alternativo, operazioni solo tastiera, focus che rientra dal pannello, reduced-motion, cambio scheda, tastiera/visualViewport, errore WebGL e recupero. Esempi con box recuperati da `boundingBox()`:

```ts
expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(viewport.height);
expect(sceneBox.height).toBeGreaterThanOrEqual(160);
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
await expect(page.getByRole('button', { name: 'Retry 3D view', exact: true })).toBeVisible();
expect(documentAfterRecovery).toEqual(documentBeforeLoss);
```

- [ ] **Step 2 — Eseguire il rosso.** `npm run test:e2e -- tests/e2e/adaptive.spec.ts tests/e2e/recovery.spec.ts`. Isolare il fallimento di layout/recupero prima di modificare gli stili.
- [ ] **Step 3 — Implementare gli adattamenti.** Area di lavoro con altezza dinamica del viewport, safe area e pannelli richiudibili; 160 CSS px minimi utili della scena durante playback a viewport di riferimento; modalità input con tastiera virtuale che non richiede scena sempre visibile ma rende raggiungibili Apply/Cancel e ripristina il contesto. Target interattivi almeno 44×44 CSS px, nessun trap di focus, zoom/pan alternativi a gesti multipli. Nessun pannello copre permanentemente i controlli. Perdita WebGL preserva documento/proiezione, ferma animazioni e offre ricreazione reale del Canvas, senza fallback 2D mascherato.
- [ ] **Step 4 — Misurare e ottimizzare sulle reti crescenti.** Eseguire fixture di 10, 50, 100, 250 apparati e fan-out/history differenti, aumentando oltre se sostenibile; questi numeri non sono limiti dell’app. Registrare tempi di start/Next/seek, fps in orbit/animazione, numero di draw call, memoria dove disponibile e quota journal. Target 30 fps su hardware di riferimento; riscontro UI entro 100 ms e primo evento entro 500 ms sulla rete di riferimento a 50 apparati come obiettivi iniziali da misurare. Ridurre DPR/ombre/etichette e usare instancing dove le misure lo giustificano, mai cambiare il risultato della simulazione. Rilevare cancellazione durante fan-out senza congelare l’interfaccia. Test prestazionali separati dai normali E2E per non introdurre passaggi intermittenti legati alla macchina.
- [ ] **Step 5 — Verificare su dispositivi reali.** Inventariare computer disponibile e smartphone fisici, riportando modello, OS e browser effettivi. Provare Safari iOS e Chrome Android su hardware reale ove disponibile, oltre all’emulazione. Usare prima il browser collaborativo T3 per le verifiche locali; l’emulazione non dimostra prestazioni fisiche. Se manca un dispositivo, lasciare esplicitamente la riga non verificata e fornire il percorso riproducibile per la prova: non dichiarare completata quella copertura. Non inventare modelli disponibili né risultati.
- [ ] **Step 6 — Eseguire il controllo finale.** `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`: exit 0, senza test saltati che coprano criteri obbligatori. Rileggere i 14 criteri della specifica e collegarli a risultati verificati. Registrare limitazioni ancora aperte e svolgere la revisione finale richiesta dal metodo di esecuzione scelto.

- [ ] **Step 7 — Commit.** Commit `feat: ensure adaptive workflows and document measured device performance`.

## Copertura della specifica e verifica del piano

- Criterio 1: Task 1, 6, 7, 12; criterio 2: Task 3–5 e 8; criterio 3: Task 4 e 8.
- Criterio 4: Task 4; criterio 5: Task 3, 7, 8; criterio 6: Task 9.
- Criterio 7: Task 10; criterio 8: Task 5, 8–10; criterio 9: Task 5, 6, 8.
- Criterio 10: Task 4, 5, 8; criterio 11: Task 11; criterio 12: Task 6, 8–11.
- Criterio 13: Task 1 e 8; criterio 14: Task 7 e 12.

Controllo manuale richiesto prima dell’handoff: copertura di ogni sezione della specifica, firme e nomi coerenti fra task, proprietario di ogni file, test espliciti per le cinque condizioni di Review Focus e assenza di scaffolding creato durante questa pianificazione. Il piano è una sequenza di attività da eseguire: i checkbox vuoti e i comandi sopra non indicano verifiche già superate.

## Riferimenti degli strumenti

- [Vite](https://vite.dev/guide/) e [installazione React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/installation).
- [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), [emulazione](https://playwright.dev/docs/emulation) e [idb](https://github.com/jakearchibald/idb).
- Le versioni puntuali e i peer sono stati letti con `npm view`; la compatibilità d’installazione sarà verificata nel Task 1 senza forzature.

## Handoff

Il piano richiede lettura dell’utente e scelta del metodo di esecuzione: implementazione in questa sessione oppure implementazione tramite subagenti con revisione per attività. Suggerimento dell’assistente: esecuzione in questa sessione, perché i 12 task estendono contratti strettamente condivisi e una singola implementazione riduce il costo di trasferimento del contesto; revisione indipendente finale e verifiche intermedie restano necessarie. Non iniziare l’implementazione prima di questo handoff.
