/**
 * it — Italian dictionary. Uses professional building / architecture
 * terminology (e.g. "stratigrafia" for wall build-up layers, "quartabuono"
 * for a mitre join, "mezzeria" for the centerline reference).
 */
import type { Dictionary } from "../index";

export const it: Dictionary = {
  common: {
    close: "Chiudi",
    add: "Aggiungi",
    remove: "Rimuovi",
    loading: "Caricamento…",
  },

  language: {
    label: "Lingua",
  },

  auth: {
    appName: "Construct Editor",
    signInSubtitle: "Accedi ai tuoi progetti.",
    registerSubtitle: "Crea un account per salvare i tuoi progetti.",
    email: "Email",
    password: "Password",
    passwordHint: "8–72 caratteri",
    createAccount: "Crea account",
    signIn: "Accedi",
    haveAccount: "Hai già un account?",
    noAccount: "Non hai un account?",
    createOne: "Creane uno",
  },

  workspace: {
    title: "Area di lavoro",
    projects: "Progetti",
    account: "Account",
    currentProject: "Progetto corrente",
    newProject: "Nuovo progetto",
    recent: "Recenti",
    allProjects: "Tutti i progetti",
    save: "Salva",
    saving: "Salvataggio…",
    saved: "Salvato",
    saveProject: "Salva progetto",
    renameProject: "Rinomina progetto",
    deleteProject: "Elimina progetto",
    loadFailed: "Caricamento progetti non riuscito.",
    empty: "Nessun progetto salvato — creane uno e premi Salva.",
    currentSuffix: "corrente",
    page: "pagina",
    pages: "pagine",
    signedInAs: "Accesso come",
    logout: "Esci",
  },

  admin: {
    title: "Pannello di amministrazione",
    backToEditor: "Torna all'editor",
    pricing: "Listino prezzi",
    pricingContent: "questo è il contenuto prezzi dell'amministratore",
  },

  pages: {
    add: "Aggiungi pagina",
    delete: "Elimina pagina",
  },

  subPages: {
    title: "Sotto-pagine",
    add: "Aggiungi sotto-pagina",
    rename: "Rinomina sotto-pagina",
    delete: "Elimina sotto-pagina",
    newFromTemplate: "Nuovo da modello",
    templateTitle: "Nuova sotto-pagina da modello",
  },

  tools: {
    select: "Seleziona",
    pan: "Sposta vista",
    wall: "Parete",
    arcWall: "Parete curva",
    window: "Finestra",
    door: "Porta",
    line: "Linea",
    dashedLine: "Linea tratteggiata",
    text: "Testo",
    undo: "Annulla",
    redo: "Ripristina",
    delete: "Elimina selezione",
    structure: "Struttura",
    drawing: "Disegno",
    title: "Strumenti",
    navigation: "Navigazione",
    actions: "Azioni",
    view: "Vista",
  },

  settings: {
    title: "Impostazioni",
    units: "Unità",
    measurementReference: "Riferimento di misura",
    dimensions: "Quote",
    moveConnectedNodes: "Sposta nodi connessi",
    together: "Insieme",
    separate: "Separati",
    wallThickness: "Spessore parete",
    wallHeight: "Altezza parete",
    defaultAssembly: "Stratigrafia predefinita",
    wallJoin: "Giunzione parete",
    freeEnd: "Estremità libera",
    thicknessAlign: "Allineamento spessore",
    miterLimit: "Limite quartabuono",
  },

  reference: {
    center: "Mezzeria",
    inner: "Interno",
    outer: "Esterno",
    core: "Nucleo",
  },

  dimensionDisplay: {
    segments: "Segmenti",
    chains: "Catene",
    both: "Entrambi",
  },

  joinStyle: {
    miter: "Quartabuono",
    butt: "Di testa",
    bevel: "Smusso",
    round: "Arrotondato",
  },

  endCap: {
    butt: "Piatto",
    round: "Arrotondato",
    square: "Quadrato",
  },

  align: {
    left: "Sinistra",
    center: "Centro",
    right: "Destra",
  },

  wall: {
    title: "Parete",
    actions: "Azioni parete",
    properties: "Proprietà",
    layers: "Stratigrafia",
    length: "Lunghezza",
    angle: "Angolo",
    thickness: "Spessore",
    height: "Altezza",
    offset: "Scostamento",
    curvature: "Curvatura",
    arcDimensions: "Quote arco",
    chord: "Corda",
    arcLength: "Lunghezza arco",
    depth: "Freccia",
    alignDoors: "Allinea porte ({count})",
    swingSide: "Verso di apertura",
    inward: "Interno",
    outward: "Esterno",
    hingeSide: "Lato cerniera",
    left: "Sinistra",
    right: "Destra",
    noDoors: "Nessuna porta da allineare su questa parete.",
    phase: "Fase",
    new: "Nuovo",
    existing: "Esistente",
  },

  wallSides: {
    inner: "Faccia interna",
    outer: "Faccia esterna",
  },

  wallLayers: {
    layer: "Strato",
    addLayer: "Strato",
    noLayers: "Nessuno strato.",
    removeLayer: "Rimuovi strato",
    type: "Tipo",
    length: "Lunghezza",
    width: "Larghezza",
    height: "Altezza",
    area: "Area",
  },

  wallAssembly: {
    exterior: "Esterno",
    interior: "Interno",
    function: "Funzione",
    core: "Nucleo",
    thickness: "Spessore",
    addLayer: "Aggiungi strato",
    moveOut: "Verso l'esterno",
    moveIn: "Verso l'interno",
    preset: "Stratigrafia",
    presetPlaceholder: "Applica stratigrafia…",
  },

  layerFunction: {
    structure: "Struttura",
    substrate: "Supporto",
    thermal: "Isolamento termico",
    finish1: "Finitura",
    finish2: "Finitura esterna",
    membrane: "Membrana",
  },

  assemblyPresets: {
    none: "Strato singolo",
    singleLeaf: "Muratura intonacata",
    insulatedBlock: "Blocco isolato",
    cavityWall: "Muro a cassa vuota",
    studPartition: "Parete a telaio",
  },

  materials: {
    concrete: "Calcestruzzo",
    block: "Blocco",
    stone: "Pietra",
    insulation: "Isolante",
    plaster: "Intonaco",
    drywall: "Cartongesso",
    wood: "Legno",
    tile: "Piastrella",
  },

  systems: {
    title: "Discipline",
    tooltip: "Discipline / livelli",
    categories: {
      architectural: "Architettonico",
      structural: "Strutturale",
      electrical: "Elettrico",
      plumbing: "Idraulico",
      hvac: "Climatizzazione",
      roof: "Copertura",
      furniture: "Arredo",
      annotation: "Annotazioni",
    },
  },

  drawingInfo: {
    type: "Tipo",
    length: "Lunghezza",
    width: "Larghezza",
    height: "Altezza",
    area: "Area",
    addLayer: "Strato",
    existing: "Esistente",
    types: {
      wall: "Parete",
      window: "Finestra",
      door: "Porta",
      line: "Linea",
      "dashed-line": "Linea tratteggiata",
      text: "Testo",
      room: "Locale",
      space: "Spazio",
      floor: "Pavimento",
      ceiling: "Soffitto",
    },
  },

  templates: {
    plumbing: {
      name: "Idraulico",
      description: "Checklist e struttura idraulica di base.",
    },
    electrical: {
      name: "Elettrico",
      description: "Checklist e struttura elettrica di base.",
    },
  },
};
