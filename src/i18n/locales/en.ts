/**
 * en — English source dictionary. This is the authoritative shape: every other
 * locale (`it`, `de`, `fa`) is typed as `Dictionary` (= `typeof en`), so a
 * missing or renamed key is a compile error. Keys are grouped by UI domain and
 * use professional construction / architecture terminology.
 *
 * Placeholders use `{name}` and are filled by `t(key, params)`. Add new keys
 * here first, then mirror them in the other locale files.
 */
export const en = {
  common: {
    close: "Close",
    add: "Add",
    remove: "Remove",
    loading: "Loading…",
  },

  language: {
    label: "Language",
  },

  auth: {
    appName: "Construct Editor",
    signInSubtitle: "Sign in to your projects.",
    registerSubtitle: "Create an account to save your projects.",
    email: "Email",
    password: "Password",
    passwordHint: "8–72 characters",
    createAccount: "Create account",
    signIn: "Sign in",
    haveAccount: "Already have an account?",
    noAccount: "No account yet?",
    createOne: "Create one",
  },

  workspace: {
    title: "Workspace",
    projects: "Projects",
    account: "Account",
    currentProject: "Current project",
    newProject: "New project",
    recent: "Recent",
    allProjects: "All projects",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    saveProject: "Save project",
    renameProject: "Rename project",
    deleteProject: "Delete project",
    loadFailed: "Failed to load projects.",
    empty: "No saved projects yet — create one and hit Save.",
    currentSuffix: "current",
    page: "page",
    pages: "pages",
    signedInAs: "Signed in as",
    logout: "Log out",
  },

  pages: {
    add: "Add page",
    delete: "Delete page",
  },

  subPages: {
    title: "Sub-pages",
    add: "Add sub-page",
    rename: "Rename sub-page",
    delete: "Delete sub-page",
    newFromTemplate: "New from template",
    templateTitle: "New sub-page from template",
  },

  tools: {
    select: "Select",
    pan: "Pan",
    wall: "Wall",
    arcWall: "Arc Wall",
    window: "Window",
    door: "Door",
    line: "Line",
    dashedLine: "Dashed Line",
    text: "Text",
    undo: "Undo",
    redo: "Redo",
    delete: "Delete selected",
    structure: "Structure",
    drawing: "Drawing",
    title: "Tools",
    navigation: "Navigation",
    actions: "Actions",
    view: "View",
  },

  settings: {
    title: "Settings",
    units: "Units",
    measurementReference: "Measurement reference",
    dimensions: "Dimensions",
    moveConnectedNodes: "Move connected nodes",
    together: "Together",
    separate: "Separate",
    wallThickness: "Wall thickness",
    wallHeight: "Wall height",
    defaultAssembly: "Default wall assembly",
    wallJoin: "Wall join",
    freeEnd: "Free end",
    thicknessAlign: "Thickness align",
    miterLimit: "Miter limit",
  },

  // Which wall face dimensions are referenced from.
  reference: {
    center: "Center",
    inner: "Inner",
    outer: "Outer",
  },

  // Which dimension system is drawn.
  dimensionDisplay: {
    segments: "Segments",
    chains: "Chains",
    both: "Both",
  },

  // How wall bodies resolve where they meet at a corner.
  joinStyle: {
    miter: "Miter",
    butt: "Butt",
    bevel: "Bevel",
    round: "Round",
  },

  // How a free (unconnected) wall end is closed.
  endCap: {
    butt: "Butt",
    round: "Round",
    square: "Square",
  },

  // Which faces align when joined walls differ in thickness.
  align: {
    left: "Left",
    center: "Center",
    right: "Right",
  },

  wall: {
    title: "Wall",
    actions: "Wall actions",
    properties: "Properties",
    layers: "Layers",
    length: "Length",
    angle: "Angle",
    thickness: "Thickness",
    height: "Height",
    offset: "Offset",
    curvature: "Curvature",
    alignDoors: "Align doors ({count})",
    swingSide: "Swing side",
    inward: "Inward",
    outward: "Outward",
    hingeSide: "Hinge side",
    left: "Left",
    right: "Right",
    noDoors: "No doors on this wall to align.",
  },

  // Wall faces — the two build-up sides of a wall.
  wallSides: {
    inner: "Inner face",
    outer: "Outer face",
  },

  // Per-side construction-layer table.
  wallLayers: {
    layer: "Layer",
    addLayer: "Layer",
    noLayers: "No layers.",
    removeLayer: "Remove layer",
    type: "Type",
    length: "Length",
    width: "Width",
    height: "Height",
    area: "Area",
  },

  // Composite assembly editor (ordered exterior → interior layer stack).
  wallAssembly: {
    exterior: "Exterior",
    interior: "Interior",
    function: "Function",
    core: "Core",
    thickness: "Thickness",
    addLayer: "Add layer",
    moveOut: "Move outward",
    moveIn: "Move inward",
    preset: "Preset",
    presetPlaceholder: "Apply preset…",
  },

  // BIM layer function / junction priority.
  layerFunction: {
    structure: "Structure",
    substrate: "Substrate",
    thermal: "Thermal insulation",
    finish1: "Finish",
    finish2: "Outer finish",
    membrane: "Membrane",
  },

  // Composite-wall preset names.
  assemblyPresets: {
    none: "Single layer",
    singleLeaf: "Plastered single leaf",
    insulatedBlock: "Insulated block",
    cavityWall: "Cavity wall",
    studPartition: "Stud partition",
  },

  // Construction materials a layer can be (storage keys stay English).
  materials: {
    concrete: "Concrete",
    block: "Block",
    stone: "Stone",
    insulation: "Insulation",
    plaster: "Plaster",
    drywall: "Drywall",
    wood: "Wood",
    tile: "Tile",
  },

  systems: {
    title: "Systems",
    tooltip: "Systems / layers",
    categories: {
      architectural: "Architectural",
      structural: "Structural",
      electrical: "Electrical",
      plumbing: "Plumbing",
      hvac: "HVAC",
      roof: "Roof",
      furniture: "Furniture",
      annotation: "Annotation",
    },
  },

  // Drawing-information / takeoff table.
  drawingInfo: {
    type: "Type",
    length: "Length",
    width: "Width",
    height: "Height",
    area: "Area",
    addLayer: "Layer",
    types: {
      wall: "Wall",
      window: "Window",
      door: "Door",
      line: "Line",
      "dashed-line": "Dashed Line",
      text: "Text",
      room: "Room",
    },
  },

  // Sub-page starter templates.
  templates: {
    plumbing: {
      name: "Plumbing",
      description: "Basic plumbing checklist and structure.",
    },
    electrical: {
      name: "Electrical",
      description: "Basic electrical checklist and structure.",
    },
  },
};
