/**
 * de — German dictionary. Uses professional construction terminology
 * (e.g. "Gehrung" for a mitre join, "Tragwerk" for the structural discipline,
 * "Wandachse" / "Achse" for the centerline reference, "Schichten" for the
 * wall build-up).
 */
import type { Dictionary } from "../index";

export const de: Dictionary = {
  common: {
    close: "Schließen",
    add: "Hinzufügen",
    remove: "Entfernen",
    loading: "Laden…",
  },

  language: {
    label: "Sprache",
  },

  auth: {
    appName: "Construct Editor",
    signInSubtitle: "Melde dich bei deinen Projekten an.",
    registerSubtitle: "Erstelle ein Konto, um deine Projekte zu speichern.",
    email: "E-Mail",
    password: "Passwort",
    passwordHint: "8–72 Zeichen",
    createAccount: "Konto erstellen",
    signIn: "Anmelden",
    haveAccount: "Schon ein Konto?",
    noAccount: "Noch kein Konto?",
    createOne: "Erstelle eines",
  },

  workspace: {
    title: "Arbeitsbereich",
    projects: "Projekte",
    account: "Konto",
    currentProject: "Aktuelles Projekt",
    newProject: "Neues Projekt",
    recent: "Zuletzt",
    allProjects: "Alle Projekte",
    save: "Speichern",
    saving: "Speichern…",
    saved: "Gespeichert",
    saveProject: "Projekt speichern",
    renameProject: "Projekt umbenennen",
    deleteProject: "Projekt löschen",
    loadFailed: "Projekte konnten nicht geladen werden.",
    empty: "Noch keine Projekte — erstelle eines und speichere.",
    currentSuffix: "aktuell",
    page: "Seite",
    pages: "Seiten",
    signedInAs: "Angemeldet als",
    logout: "Abmelden",
  },

  pages: {
    add: "Seite hinzufügen",
    delete: "Seite löschen",
  },

  subPages: {
    title: "Unterseiten",
    add: "Unterseite hinzufügen",
    rename: "Unterseite umbenennen",
    delete: "Unterseite löschen",
    newFromTemplate: "Neu aus Vorlage",
    templateTitle: "Neue Unterseite aus Vorlage",
  },

  tools: {
    select: "Auswählen",
    pan: "Schwenken",
    wall: "Wand",
    arcWall: "Bogenwand",
    window: "Fenster",
    door: "Tür",
    line: "Linie",
    dashedLine: "Strichlinie",
    text: "Text",
    undo: "Rückgängig",
    redo: "Wiederholen",
    delete: "Auswahl löschen",
    structure: "Struktur",
    drawing: "Zeichnung",
    title: "Werkzeuge",
    navigation: "Navigation",
    actions: "Aktionen",
    view: "Ansicht",
  },

  settings: {
    title: "Einstellungen",
    units: "Einheiten",
    measurementReference: "Messbezug",
    dimensions: "Bemaßung",
    moveConnectedNodes: "Verbundene Knoten bewegen",
    together: "Zusammen",
    separate: "Getrennt",
    wallThickness: "Wandstärke",
    wallHeight: "Wandhöhe",
    wallJoin: "Wandverbindung",
    freeEnd: "Freies Ende",
    thicknessAlign: "Stärkenausrichtung",
    miterLimit: "Gehrungsgrenze",
  },

  reference: {
    center: "Achse",
    inner: "Innen",
    outer: "Außen",
  },

  dimensionDisplay: {
    segments: "Segmente",
    chains: "Ketten",
    both: "Beide",
  },

  joinStyle: {
    miter: "Gehrung",
    butt: "Stumpf",
    bevel: "Fase",
    round: "Rund",
  },

  endCap: {
    butt: "Stumpf",
    round: "Rund",
    square: "Quadratisch",
  },

  align: {
    left: "Links",
    center: "Mitte",
    right: "Rechts",
  },

  wall: {
    title: "Wand",
    actions: "Wandaktionen",
    properties: "Eigenschaften",
    layers: "Schichten",
    length: "Länge",
    angle: "Winkel",
    thickness: "Stärke",
    height: "Höhe",
    offset: "Versatz",
    curvature: "Krümmung",
    alignDoors: "Türen ausrichten ({count})",
    swingSide: "Öffnungsrichtung",
    inward: "Nach innen",
    outward: "Nach außen",
    hingeSide: "Anschlagseite",
    left: "Links",
    right: "Rechts",
    noDoors: "Keine Türen an dieser Wand zum Ausrichten.",
  },

  wallSides: {
    inner: "Innenseite",
    outer: "Außenseite",
  },

  wallLayers: {
    layer: "Schicht",
    addLayer: "Schicht",
    noLayers: "Keine Schichten.",
    removeLayer: "Schicht entfernen",
    type: "Typ",
    length: "Länge",
    width: "Breite",
    height: "Höhe",
    area: "Fläche",
  },

  wallAssembly: {
    exterior: "Außen",
    interior: "Innen",
    function: "Funktion",
    core: "Kern",
    thickness: "Stärke",
    addLayer: "Schicht hinzufügen",
    moveOut: "Nach außen",
    moveIn: "Nach innen",
    preset: "Wandaufbau",
    presetPlaceholder: "Aufbau anwenden…",
  },

  layerFunction: {
    structure: "Tragschicht",
    substrate: "Trägerschicht",
    thermal: "Wärmedämmung",
    finish1: "Deckschicht",
    finish2: "Außenputz",
    membrane: "Sperrschicht",
  },

  assemblyPresets: {
    singleLeaf: "Einschalig verputzt",
    insulatedBlock: "Gedämmtes Mauerwerk",
    cavityWall: "Zweischaliges Mauerwerk",
    studPartition: "Ständerwand",
  },

  materials: {
    concrete: "Beton",
    block: "Mauerstein",
    stone: "Stein",
    insulation: "Dämmung",
    plaster: "Putz",
    drywall: "Gipskarton",
    wood: "Holz",
    tile: "Fliese",
  },

  systems: {
    title: "Gewerke",
    tooltip: "Gewerke / Ebenen",
    categories: {
      architectural: "Architektur",
      structural: "Tragwerk",
      electrical: "Elektrik",
      plumbing: "Sanitär",
      hvac: "Klima/Lüftung",
      roof: "Dach",
      furniture: "Möblierung",
      annotation: "Beschriftung",
    },
  },

  drawingInfo: {
    type: "Typ",
    length: "Länge",
    width: "Breite",
    height: "Höhe",
    area: "Fläche",
    addLayer: "Schicht",
    types: {
      wall: "Wand",
      window: "Fenster",
      door: "Tür",
      line: "Linie",
      "dashed-line": "Strichlinie",
      text: "Text",
      room: "Raum",
    },
  },

  templates: {
    plumbing: {
      name: "Sanitär",
      description: "Grundlegende Sanitär-Checkliste und Struktur.",
    },
    electrical: {
      name: "Elektrik",
      description: "Grundlegende Elektro-Checkliste und Struktur.",
    },
  },
};
