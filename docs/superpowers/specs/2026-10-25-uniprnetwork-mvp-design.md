# UniPRNetwork — specifica dell’MVP

Data: 25 ottobre 2026. Stato: revisione del builder completata; approvata dall’utente il 25 ottobre 2026, incluse le semplificazioni proposte.

Il documento è in italiano per la discussione del progetto; tutta l’applicazione, inclusi tutorial, errori e contenuti didattici, sarà in inglese.

## 1. Intento e stato attuale

UniPRNetwork aiuta chi studia Reti di Calcolatori a osservare operazioni normalmente invisibili: scelta del prossimo salto, incapsulamento, indirizzi MAC per collegamento, routing, assegnazione DHCP e traduzione NAT. L’obiettivo è capire cause ed effetti costruendo e modificando reti. Non è un emulatore di apparati commerciali né una replica di Cisco Packet Tracer.

Esistono mockup HTML in `docs/prototypes/`. `dark-network-lab.html` contiene una scena Three.js realmente 3D e sequenze preparate. Non esistono ancora un’app React, un editor libero o un motore che esegua i protocolli. Il codice del mockup è materiale di riferimento, non la base architetturale da espandere. La cartella di lavoro non è attualmente un repository Git.

## 2. Decisioni concordate

- Editor libero con host, router, switch, bridge e hub. Visualizzazione realmente 3D, tema scuro predefinito e lingua inglese.
- Collegamenti tramite selezioni successive: apparato e porta di partenza, poi apparato e porta di destinazione. La stessa operazione funziona con clic e tocchi.
- Computer e smartphone devono consentire tutte le operazioni principali. Nessuna funzione essenziale dipende dall’hover.
- Guida interattiva per configurare i parametri essenziali di un apparato; modalità Tutorial attivabile e disattivabile.
- Una sola operazione simulata alla volta: un ping oppure una richiesta DHCP esplicita.
- Play/Pause, Next e Previous; spiegazione breve di ogni evento significativo, approfondimenti facoltativi e protocolli effettivamente coinvolti cliccabili.
- Controlli della simulazione raggiungibili senza dover abbandonare la vista della rete.
- Cache ARP e informazioni apprese dagli switch conservate tra operazioni. Comando `Reset network state` senza cancellare la configurazione.
- Modificare parametri o collegamenti interrompe la simulazione e richiede un nuovo avvio. La telecamera mantiene la posizione.
- Topologie con cicli di livello 2 costruibili, ma simulazione bloccata con spiegazione ed evidenziazione dei collegamenti coinvolti.
- DHCP e NAT integrati nei router, attivabili separatamente. DHCP non parte selezionando la configurazione automatica: serve un’azione esplicita dell’utente.
- NAT overload/PAT per condividere l’indirizzo esterno del router; NAT statico e port forwarding rinviati.
- Reti salvabili con un nome e riapribili da un menu. Nessun login o signup nella prima versione.
- Calcolo progressivo degli eventi: opzione B scelta dall’utente. Il totale definitivo dei passaggi è noto al termine dell’operazione.

Richiesta dell’utente: nessun limite agli apparati, salvo necessità prestazionali motivabili. Proposta tecnica di questa specifica: nessun limite numerico prefissato, con capacità effettiva verificata anche su smartphone. Non equivale a una capacità fisicamente illimitata.

## 3. Approcci considerati e scelta

**A — Sequenza completa all’avvio.** Il motore deriva dalla rete tutti gli eventi prima della riproduzione. Semplifica conteggio totale e navigazione; richiede di calcolare e conservare subito l’intera sequenza.

**B — Sequenza progressiva, scelto dall’utente.** Il motore produce gli eventi su richiesta e conserva la cronologia. Consente di iniziare senza attendere il calcolo completo e distribuisce il lavoro; richiede gestione esplicita di cronologia, ripristino e totale inizialmente sconosciuto.

Entrambi eseguono regole di rete. Le sequenze predefinite dei mockup non sono un terzo approccio di produzione. La scelta B è motivata dal supporto agli smartphone e dalle dimensioni variabili delle reti.

## 4. Perimetro didattico e semplificazioni proposte

Questa sezione precisa il significato implementabile delle funzionalità. Le semplificazioni qui sotto sono proposte dell’assistente da verificare approvando la specifica.

### Apparati e collegamenti

Tutti i collegamenti dell’MVP sono Ethernet cablata. Gli host hanno una porta. Router e switch possono aggiungere porte; il bridge ha due porte per rendere leggibile il confronto con lo switch. L’hub può aggiungere porte. Ogni porta può avere un solo cavo. Una seconda connessione richiede una porta libera. Le quantità iniziali e la forma dei modelli restano al builder.

Gli identificatori di apparati e porte sono stabili; i MAC delle interfacce Ethernet pertinenti sono univoci e assegnati automaticamente. Bridge e switch apprendono dai MAC sorgenti; inoltrano unicast conosciuti e diffondono broadcast/unicast sconosciuti sulle altre porte. L’hub ripete sulle altre porte senza apprendere indirizzi. Non si simulano collisioni, tempi elettrici, velocità del mezzo, VLAN, STP, Wi-Fi o CLI commerciali.

La costruzione avviene su un piano navigabile all’interno della scena 3D; gli apparati sono modelli volumetrici, con telecamera orbitabile. La quota libera degli apparati non è una funzione dell’MVP. Lo spostamento grafico e i nomi non alterano il funzionamento della rete.

### IPv4, routing e ping

Configurazione manuale di IPv4, prefisso e gateway sugli host; IPv4/prefisso per interfaccia sui router; rotte direttamente connesse, statiche e di default. La scelta usa il prefisso corrispondente più specifico. A parità: direttamente connessa prima di statica, poi ordine stabile dichiarato nell’interfaccia; niente multipath o routing dinamico. Le rotte /32 sono ammesse. La validazione degli endpoint manuali esclude indirizzi di rete e broadcast per prefissi fino a /30; /31 è riservato ai collegamenti diretti router-router, non agli host o alle LAN commutate. Le rotte /32 restano ammesse.

Il ping è una singola Echo Request e relativa Echo Reply, verso un indirizzo IPv4 esplicito. Sono osservabili ARP, next hop, inoltro Ethernet, cambio di MAC e decremento TTL. Sono previsti ICMP Destination Unreachable e Time Exceeded per i casi modellati, compresa la loro eventuale impossibilità di tornare alla sorgente. ICMP è contenuto di livello rete, non trasporto. Non si implementano DNS, TCP, ping periodico, frammentazione o traffico arbitrario. I pacchetti generati restano sotto l’MTU.

I cicli di routing IPv4 sono distinti dai cicli Ethernet: non sono vietati in quanto tali e il TTL può esaurirsi. La verifica dei cicli di livello 2 considera i collegamenti e la connettività interna di switch/bridge/hub; non considera un router come un ponte fra le sue interfacce. Si verifica l’intera topologia e si segnalano i cicli trovati prima dell’avvio.

### DHCP

Il router offre un servizio per ciascuna interfaccia abilitata: intervallo IPv4 distribuibile, prefisso ricavato dall’interfaccia e gateway configurabile, predefinito sull’indirizzo del router. L’intervallo deve appartenere alla rete servita ed escludere gli indirizzi riservati/configurati noti. Un host seleziona `Manual` oppure `Automatic (DHCP)` e usa `Request network configuration` per iniziare.

Sono modellati Discover, Offer, Request e ACK, UDP 68/67, allocazione distinta per client e riuso delle assegnazioni. Il client MVP richiede risposte broadcast durante l’acquisizione iniziale: la scelta deve essere coerente nei campi e nei messaggi mostrati. Le offerte provvisorie sono prenotate e rilasciate a fine tentativo; più server nello stesso dominio sono gestiti scegliendo la prima offerta secondo l’ordine deterministico degli eventi e mostrando le altre come non selezionate.

Proposta di semplificazione: lease senza scadenza nell’MVP, dichiarati come tali nell’interfaccia e codificati coerentemente, senza rinnovo automatico, relay, prenotazioni manuali per MAC o opzioni DNS. Una nuova richiesta esplicita elimina la vecchia configurazione dinamica del client all’inizio del tentativo e cerca una nuova assegnazione; il server può offrire nuovamente lo stesso indirizzo al client noto. DHCP non attraversa i router senza relay. Le prenotazioni e le occupazioni di indirizzo sono locali al dominio Ethernet: LAN isolate possono riutilizzare gli stessi indirizzi privati. Un indirizzo duplicato di un server DHCP partecipante nello stesso dominio produce un errore di rete prima di completare l’assegnazione. Server assente, nessuna offerta utilizzabile e pool esaurito hanno esiti distinti e spiegazioni proprie.

### NAT overload/PAT

Il router distingue interfacce interne ed esterna e abilita la traduzione per le reti sorgenti selezionate, usando il proprio indirizzo IPv4 esterno. La destinazione è nella rete simulata: non si inviano pacchetti verso Internet reale.

L’MVP traduce il traffico ICMP Echo generato dal ping. Il multiplexing usa l’identificatore ICMP, non porte TCP/UDP inventate. Tabella e confronto prima/dopo mostrano indirizzo interno, identificatore originale, indirizzo esterno, identificatore tradotto e destinatario. Il ritorno usa l’associazione corretta. Vanno aggiornati i checksum pertinenti, inclusi i riferimenti ai pacchetti citati negli errori ICMP supportati. La traduzione non sostituisce una rotta mancante. La configurazione deve permettere di indicare esplicitamente quali reti interne tradurre; nessun hairpin o ingresso non sollecitato.

Le associazioni restano osservabili tra ping e vengono riutilizzate se compatibili, fino al reset o alla modifica della configurazione; questa assenza di aging è dichiarata. NAT di UDP/TCP generale, NAT statico, port forwarding e doppio NAT annidato sono fuori perimetro. Una configurazione che richiede doppio NAT riceve una spiegazione di funzionalità non supportata, non un finto risultato di rete.

### Esplorazione teorica

Ogni evento fornisce una spiegazione breve, il motivo dell’azione, il punto della rete e i protocolli realmente coinvolti. Un approfondimento può mostrare pacchetto prima/dopo, riga della tabella usata e collegamenti alla teoria. ARP non è indicato come attivo quando si usa una cache valida.

Il progetto iniziale richiede anche esplorazione grafica di subnetting e incapsulamento. Proposta per soddisfarla nell’MVP: esploratore compatto del prefisso integrato alla configurazione IPv4, con bit rete/host, indirizzo di rete, broadcast quando applicabile, totale indirizzi, host utilizzabili e suddivisione rispetto a un prefisso padre esplicito. /31 punto-punto e /32 sono spiegati separatamente; non si applica indiscriminatamente la formula “totale meno due”. Il motore supporta /31 sulle connessioni dirette fra due interfacce router; non come LAN DHCP. Le viste Ethernet, IPv4, ARP, ICMP e UDP/DHCP spiegano i campi del pacchetto selezionato. Non serve un corso separato o un percorso didattico con account.

## 5. Modello degli eventi, tempo e navigazione

Un evento corrisponde a un fatto didatticamente significativo, non a ogni istruzione del programma. Contiene ID, ordine, tempo simulato, causa, apparati/porte/collegamenti coinvolti, messaggi di rete, cambiamenti di stato e riferimento al contenuto didattico. Una diffusione può avere più copie: devono essere ispezionabili e riconducibili allo stesso messaggio. Non si finge un solo percorso per un broadcast.

Il tempo è virtuale e deterministico; la velocità dell’animazione non cambia le decisioni dei protocolli. Pausa, approfondimenti e cambio di scheda non fanno scadere timeout. ARP e DHCP hanno tentativi/timeout finiti, espliciti e testabili; i valori sono una scelta del builder da documentare. Le scadenze che servono a risolvere un tentativo avanzano con il motore, senza attendere secondi reali.

`Next` riproduce l’evento successivo già conosciuto oppure chiede al motore di produrlo. `Previous` ripristina la proiezione completa dell’evento precedente, incluse cache, tabelle, configurazioni DHCP e traduzioni NAT, non soltanto il cubo del pacchetto. Ripercorrere eventi già calcolati non esegue nuovamente i protocolli.

Si distinguono il punto osservato nella cronologia e l’ultimo punto generato dal motore. Tutti i pannelli e la scena mostrano esclusivamente lo stato del punto osservato. Non si può iniziare una nuova operazione da un punto storico: si torna all’ultimo evento oppure si annulla quella corrente. `Cancel operation` riporta lo stato di rete a quello iniziale dell’operazione e ne elimina la cronologia. Il risultato di un’operazione conclusa diventa la base della successiva. Per tornare alla cronologia di un’operazione conclusa si resta sulla relativa vista prima di avviarne un’altra; l’MVP non archivia tutte le operazioni precedenti.

Play genera progressivamente solo quando raggiunge l’ultimo evento disponibile. La barra consente di raggiungere gli eventi noti e non presenta una percentuale globale inventata. Mostra ad esempio `Step 8 · simulation in progress`; al termine può mostrare `Step 8 of 14`. Nessun comando deve sovrapporre due operazioni.

## 6. Configurazione, reset ed errori

Le modifiche ai parametri di rete e ai cavi sono applicate esplicitamente. Dopo l’applicazione, si interrompe l’operazione, si elimina la cronologia e, come scelta dell’assistente per coerenza, si ricrea lo stato dinamico dell’intera rete. Telecamera, posizioni e impostazioni visive restano invariate. Spostare un apparato, rinominarlo o leggere la teoria non effettua il reset.

`Reset network state` elimina cache ARP, tabelle MAC apprese, assegnazioni DHCP server/client, associazioni NAT, pacchetti pendenti e cronologia. Rimangono configurazione statica, modalità DHCP degli host, pool DHCP, regole NAT, rotte statiche, apparati, cavi e posizioni. Gli host DHCP tornano senza indirizzo: devono richiederlo esplicitamente.

Si distinguono input non interpretabili, vincoli del modello e guasti di comunicazione. Sintassi IPv4 errata e porte occupate si spiegano durante la configurazione. I cicli L2 impediscono l’avvio con evidenziazione dei collegamenti. Mancanza di gateway, rotta o risposta ARP/DHCP deve invece produrre il relativo tentativo e il punto di fallimento nella sequenza. Non basta un validatore che impedisce ogni rete sbagliata.

Il box di errore è in inglese, contestuale, leggibile senza gergo di programmazione e con un’indicazione utile per correggere la rete, senza modificarla automaticamente. Esempio: `Host A cannot reach a network outside its own subnet because no default gateway is configured.` Duplicati IPv4 sono segnalati come conflitti di rete; l’esatto evento di rilevamento è lasciato al builder, ma non si può dichiarare successo assegnando arbitrariamente il ruolo di destinatario a uno dei duplicati.

## 7. Interfaccia adattiva e tutorial

La direzione visiva è quella del mockup scuro 3D approvato: rete centrale, stato dell’evento, controlli vicini alla rete, ispezione dell’apparato, confronto dei campi e accesso ai protocolli. I mockup desktop non impongono la stessa disposizione su smartphone.

Su smartphone i pannelli sono selettivi e richiudibili; durante l’avanzamento restano contemporaneamente visibili una porzione utile della scena e i comandi. Ogni dettaglio hover ha un equivalente tap/selezione. I gesti per navigare la telecamera devono essere distinti da selezione e spostamento di apparati. Controlli alternativi consentono di aggiungere, posizionare e collegare senza richiedere trascinamenti precisi o gesti multipli obbligatori. Un elenco accessibile permette di selezionare apparati e collegamenti anche quando le etichette 3D vengono ridotte.

Il tutorial accompagna la configurazione: indirizzo/prefisso/gateway o modalità DHCP per host; interfacce e servizi per router; porte e funzione dell’apparato per switch/bridge/hub. Non chiede un IP gestionale a un hub. Attivarlo non corregge né assegna parametri in modo nascosto; disattivarlo conserva il lavoro. I suggerimenti e i controlli restano accessibili da tastiera, con focus visibile, testi oltre al colore, target touch adeguati e riduzione delle animazioni. Aprire un pannello non deve far perdere il controllo della simulazione.

## 8. Salvataggi

Proposta dell’assistente: IndexedDB locale con schema versionato, senza backend o account. Salvataggio esplicito con nome non vuoto, elenco delle reti, riapertura e aggiornamento della rete corrente. Un nome già usato non sovrascrive silenziosamente un’altra rete. Errori di scrittura e dati incompatibili hanno un messaggio utilizzabile.

Si salvano topologia, identificatori/MAC, posizioni, configurazioni manuali, modalità DHCP, pool, rotte, regole NAT e preferenze di vista. Non si salvano pacchetti in volo, cronologia o stato appreso: riaprire inizializza una rete pulita. Un indirizzo ottenuto via DHCP è stato dinamico, non diventa configurazione statica nel file salvato. Preferenze Tutorial/tema possono essere locali all’app. I salvataggi rimangono nel browser utilizzato e non sono sincronizzati fra computer e smartphone. Import/export e collaborazione non sono richiesti dall’MVP.

## 9. Architettura proposta

Scelte dell’assistente da approvare insieme al documento: React + TypeScript, Vite, Three.js tramite React Three Fiber; niente React Flow. Motore TypeScript indipendente da React e Three.js, eseguito in un Web Worker nel browser. Nessun backend per eseguire la simulazione. Le versioni precise e la gestione dello stato React saranno scelte nel piano, verificandone la compatibilità.

Il modulo di dominio definisce topologia, configurazione e stato di rete. Il modulo motore nasconde scheduler, protocolli e ordinamento dietro una piccola interface: inizializzare una rete, iniziare un’operazione, avanzare, leggere uno stato storico e annullare/reset. Il modulo di presentazione traduce fatti tipizzati in testi e riferimenti didattici. Il modulo scena visualizza la proiezione fornita, senza decidere rotte o modificare cache. Il modulo persistenza gestisce salvataggi e cronologia temporanea tramite IndexedDB.

Il worker è l’unico autore dello stato di esecuzione. I comandi e le risposte includono revisione della configurazione, ID operazione e ordine: una risposta appartenente a una rete precedente viene ignorata. Ordine di schedulazione e identificatori allocati sono deterministici. Cancellazione e cambio di rete devono essere processabili anche durante un broadcast molto ampio: il lavoro viene diviso in porzioni finite.

La cronologia usa cambiamenti di stato e checkpoint periodici, evitando una copia completa della rete per ogni evento. Il worker conserva una finestra in memoria; eventi e checkpoint meno recenti possono essere scaricati in IndexedDB e ricaricati per Previous/seek. Non si tronca silenziosamente la cronologia. Se memoria o quota non permettono di proseguire, l’operazione si ferma con un messaggio che distingue un limite dell’app da un errore di rete; la configurazione rimane salvabile. Il journal temporaneo è separato dai salvataggi nominati e viene rimosso quando l’operazione è scartata.

## 10. Prestazioni e compatibilità

Nessun limite fisso al numero di apparati. Rendering su richiesta quando la scena è ferma, geometrie/materiali condivisi, riuso di modelli ripetuti, dettaglio ed etichette adattivi. La riduzione della qualità grafica non cambia protocolli o risultati. Le animazioni sono illustrative, non una misura della latenza reale.

Il piano deve identificare almeno un computer e uno smartphone fisico di riferimento e registrare browser/hardware. Verifica iniziale proposta su Safari iOS, Chrome Android e browser desktop correnti, con layout da 360 CSS px e orientamento orizzontale/verticale. Si provano anche viewport più strette per evitare trappole di navigazione. Target iniziale dell’assistente: scena navigabile ad almeno 30 fps sui dispositivi di riferimento e riscontro immediato dei comandi, distinguendo riscontro visivo da completamento del calcolo. Sono obiettivi da misurare, non risultati già ottenuti.

Le prove crescono per numero di apparati, cavi, fan-out e cronologia. Il conteggio apparati da solo non misura il costo. Un eventuale limite futuro richiede risultati riproducibili e una decisione esplicita. Il caricamento di modelli e librerie di produzione usa dipendenze distribuite con l’app, non gli import CDN del mockup. WebGL indisponibile o perso richiede un errore recuperabile senza perdere la configurazione; non si sostituisce silenziosamente la rete 3D con un diagramma 2D. L’installazione offline/PWA non è un requisito di questa versione.

## 11. Criteri di accettazione

1. Da rete vuota, computer e smartphone permettono aggiunta, configurazione, posizionamento e collegamento di tutti e cinque i tipi di apparati, senza hover o drag obbligatori.
2. Un ping nella stessa subnet mostra ARP a cache vuota, apprendimento MAC e risposta. Il secondo usa le informazioni apprese; Reset ripristina il comportamento iniziale.
3. Un ping fra due subnet mostra il gateway, la rotta selezionata, MAC diversi sui collegamenti e TTL decrementato; endpoint IPv4 invariati in assenza di NAT.
4. Una topologia con più router dimostra selezione del prefisso più specifico, rotta di default, risposta tramite il percorso di ritorno e fallimento in assenza di una rotta necessaria. Un ciclo L3 termina per TTL.
5. Hub, bridge e switch mostrano comportamenti distinguibili di diffusione/apprendimento. I broadcast possono avere rami ispezionabili. Un ciclo L2 blocca l’avvio senza confonderlo con un ciclo di routing.
6. Selezionare DHCP non assegna nulla. La richiesta esplicita produce i quattro messaggi con UDP e assegna IP/prefisso/gateway. Due client ricevono indirizzi distinti. Server assente, pool esaurito e offerte concorrenti producono gli esiti definiti.
7. Due host interni, con ping successivi anche usando lo stesso identificatore ICMP originario, condividono l’indirizzo esterno senza scambiare i destinatari delle risposte. Tabella, indirizzi, identificatori e checksum concordano; un errore ICMP supportato attraversa NAT coerentemente.
8. Previous e Next ripristinano tutti i pannelli e i rami del pacchetto, anche attraverso eventi DHCP/NAT e checkpoint scaricati su disco. Replay non duplica assegnazioni o traduzioni. Non si inizia un’operazione da uno stato storico.
9. Modificare una rete in pausa o in esecuzione invalida la vecchia sequenza, scarta risposte worker obsolete e mantiene la telecamera. Reset e Cancel hanno gli effetti distinti descritti.
10. Il totale rimane sconosciuto finché il motore non ha concluso; la barra non promette una percentuale totale prima di allora. La produzione degli eventi è realmente progressiva.
11. Salvataggio e riapertura conservano configurazione e identità, ripartono senza stato appreso e gestiscono errori di storage senza perdere silenziosamente modifiche.
12. Spiegazioni, tutorial e box d’errore sono interamente in inglese. Un problema di rete è spiegato nel suo contesto, non come stack trace o codice interno.
13. Esplorazione del prefisso e del pacchetto aggiorna bit, conteggi e campi in modo coerente, incluse le eccezioni /31 e /32; non altera la rete senza applicazione esplicita.
14. Telecamera, approfondimenti e navigazione funzionano su touch e mouse. I comandi restano utilizzabili mentre la rete è visibile. Le prove reali di prestazioni e recupero WebGL/storage documentano i limiti osservati.

Questi sono requisiti da verificare nell’implementazione, non verifiche già superate dai mockup.

## 12. Libertà del builder e prossima fase

Restano al builder: struttura dei file, librerie accessorie compatibili, modelli 3D e numero iniziale di porte, gesti dettagliati, layout dei pannelli mobili, ordine delle tappe del tutorial, testi estesi e fonti didattiche, intervalli di checkpoint, dimensione delle porzioni di lavoro, timeout finiti e strumenti di test. Le scelte devono rispettare le invarianti e comparire nel piano quando influiscono sui criteri di accettazione.

Prima dell’implementazione serve l’approvazione di questa specifica, incluse le proposte evidenziate. Il passo successivo sarà un piano di implementazione verificabile. Nessuno scaffolding, installazione di dipendenze o codice di produzione è autorizzato dal solo completamento di questa bozza.

## 13. Riferimenti tecnici

Le RFC sono riferimenti per il sottoinsieme modellato, non una dichiarazione di conformità completa. Le scelte didattiche e le esclusioni sono quelle esplicite sopra.

- [ARP — RFC 826](https://www.rfc-editor.org/info/rfc826/).
- [IPv4 — RFC 791](https://www.rfc-editor.org/info/rfc791/) e [ICMP — RFC 792](https://www.rfc-editor.org/info/rfc792/).
- [Router IPv4 — RFC 1812](https://www.rfc-editor.org/info/rfc1812/), in particolare scelta della rotta e TTL.
- [DHCP — RFC 2131](https://www.rfc-editor.org/info/rfc2131/), acquisizione e durata infinita del lease; [opzioni DHCP — RFC 2132](https://www.rfc-editor.org/info/rfc2132/).
- [Traditional NAT — RFC 3022](https://www.rfc-editor.org/info/rfc3022/), traduzioni NAPT e identificatori ICMP.
- [Prefissi /31 punto-punto — RFC 3021](https://www.rfc-editor.org/info/rfc3021/).
- [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction), [prestazioni](https://r3f.docs.pmnd.rs/advanced/scaling-performance) e [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
