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
    appName: "Mehdify",
    tagline: "Precision drawing, from sketch to takeoff.",
    taglineSub: "Draw walls, auto-detect rooms, model multi-layer assemblies, and export quantities — in 2D and 3D.",
    welcomeBack: "Welcome back",
    register: "Register",
    signInSubtitle: "Sign in to your projects.",
    registerSubtitle: "Create an account to save your projects.",
    email: "Email",
    password: "Password",
    passwordHint: "8–72 characters",
    togglePassword: "Show or hide password",
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

  admin: {
    title: "Admin panel",
    backToEditor: "Back to editor",
    pricing: "Pricing",
    pricingIntro:
      "Set the per-unit material and labour cost for each material. Managed here for now and don't affect end users yet.",
    sections: "Sections",
    layers: "Layers",
    layersIntro:
      "Curate reusable wall construction layers. They're managed here for now and don't affect end users yet.",
    layerName: "Layer name",
    material: "Material",
    thickness: "Thickness",
    addLayer: "Add layer",
    removeLayer: "Remove layer",
    noLayers: "No layers yet. Add one to start the catalog.",
    detailName: "Detail name",
    addDetail: "Add detail",
    removeDetail: "Remove detail",
    noDetails: "No details on this layer yet.",
    materials: "Materials",
    materialsIntro:
      "Define the materials that layers and details draw from — each with a colour and default thickness. Managed here for now and don't affect end users yet.",
    materialName: "Material name",
    color: "Color",
    unit: "Unit",
    addMaterial: "Add material",
    removeMaterial: "Remove material",
    noMaterials: "No materials yet. Add one to start the palette.",
    presets: "Presets",
    presetsIntro:
      "Bundle layers into reusable wall assemblies. They're managed here for now and don't affect end users yet.",
    presetName: "Preset name",
    elementType: "Element type",
    selectLayer: "Select a layer…",
    newPreset: "New preset",
    addPreset: "Add preset",
    removePreset: "Remove preset",
    noPresets: "No presets yet. Create one to bundle layers into an assembly.",
    materialCost: "Material cost",
    laborCost: "Labor cost",
    total: "Total",
    questions: "Questions",
    questionsIntro:
      "Author the questions that capture job conditions. Each answer can raise a flag that pricing rules act on. Managed here for now and don't affect end users yet.",
    questionText: "Question",
    addQuestion: "Add question",
    removeQuestion: "Remove question",
    noQuestions: "No questions yet. Add one to start capturing job conditions.",
    answerLabel: "Answer",
    flag: "Flag",
    addAnswer: "Add answer",
    removeAnswer: "Remove answer",
    noAnswers: "No answers on this question yet.",
    rules: "Pricing rules",
    rulesIntro:
      "Define modifiers that adjust the price when a question flag is raised. Managed here for now and don't affect end users yet.",
    ruleName: "Rule name",
    addRule: "Add rule",
    removeRule: "Remove rule",
    noRules: "No rules yet. Add one to adjust prices by job condition.",
    selectFlag: "Select a flag…",
    ruleTarget: "Target",
    ruleEffect: "Effect",
    ruleAmount: "Amount",
    estimate: "Estimate",
    estimateIntro:
      "Preview the live cost of an assembly: pick a preset, enter its measured quantities, answer the job questions, then read the material, labour and rule-adjusted totals. A sandbox — nothing here is saved or shown to end users.",
    selectPreset: "Select a preset…",
    area: "Area",
    length: "Length",
    count: "Count",
    quantity: "Qty",
    adjustments: "Adjustments",
    baseTotal: "Base total",
    grandTotal: "Estimate total",
    noEstimate: "Pick a preset to preview its estimate.",
    singleAssembly: "Single assembly",
    currentDrawing: "Current drawing",
    noShapes: "Draw walls or rooms to estimate the current plan.",
    pickAssemblies: "Pick an assembly per element type to cost the drawing.",
    alternatives: "Alternatives",
    cheapest: "Cheapest",
    rooms: "Rooms",
    defaults: "Defaults",
    missingAssemblies: "Missing assemblies",
  },

  roles: {
    user: "User",
    admin: "Admin",
    superAdmin: "Super-admin",
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
    chain: "Continuous",
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

  view: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit to view",
  },

  statusBar: {
    snap: "Snap",
  },

  // Mobile off-finger drawing readout (DrawingHud) — snap targets + locks.
  hud: {
    snapNode: "Node",
    snapMidpoint: "Midpoint",
    snapIntersection: "Intersection",
    snapEdge: "On wall",
    snapGrid: "Grid",
    lockHorizontal: "Horizontal",
    lockVertical: "Vertical",
    lockPerpendicular: "Perpendicular",
  },

  inspector: {
    empty: "Select an element to edit its properties.",
    noProps: "No editable properties for this element yet.",
  },

  settings: {
    title: "Settings",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    appearance: "Appearance",
    measurement: "Measurement & dimensions",
    wallDefaults: "Wall defaults",
    joins: "Wall joins",
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
    core: "Core",
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
    arcDimensions: "Arc dimensions",
    chord: "Chord",
    arcLength: "Arc length",
    depth: "Depth",
    alignDoors: "Align doors ({count})",
    swingSide: "Swing side",
    inward: "Inward",
    outward: "Outward",
    hingeSide: "Hinge side",
    left: "Left",
    right: "Right",
    noDoors: "No doors on this wall to align.",
    phase: "Phase",
    new: "New",
    existing: "Existing",
    costAssembly: "Cost assembly",
    noAssembly: "None",
  },

  // Selected-space (room) properties — floor + ceiling cost assemblies.
  space: {
    netArea: "Net floor area",
    netPerimeter: "Net perimeter",
    floorAssembly: "Floor assembly",
    ceilingAssembly: "Ceiling assembly",
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

  // Units of measure for estimation (stable ids; labels localized).
  units: {
    m2: "m²",
    m3: "m³",
    ml: "Linear m",
    each: "Piece",
    kg: "kg",
  },

  // Building elements an assembly (preset) can apply to.
  elementTypes: {
    wall: "Wall",
    floor: "Floor",
    ceiling: "Ceiling",
    roof: "Roof",
  },

  // What part of a cost a pricing rule adjusts.
  ruleTargets: {
    material: "Material",
    labor: "Labor",
    total: "Total",
  },

  // How a pricing rule adjusts its target.
  ruleEffects: {
    percent: "Percentage",
    fixed: "Fixed amount",
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
    existing: "Existing",
    types: {
      wall: "Wall",
      window: "Window",
      door: "Door",
      line: "Line",
      "dashed-line": "Dashed Line",
      text: "Text",
      room: "Room",
      space: "Space",
      floor: "Floor",
      ceiling: "Ceiling",
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
