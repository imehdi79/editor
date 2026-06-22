/**
 * fa — Persian (Farsi) dictionary, right-to-left. Uses professional Persian
 * construction / architecture terminology (e.g. «پخ» for a bevel/chamfer,
 * «سازه» for the structural discipline, «محور» for the centerline reference,
 * «اریب» for a mitre join).
 */
import type { Dictionary } from "../index";

export const fa: Dictionary = {
  common: {
    close: "بستن",
    add: "افزودن",
    remove: "حذف",
    loading: "در حال بارگذاری…",
  },

  language: {
    label: "زبان",
  },

  auth: {
    appName: "Construct Editor",
    signInSubtitle: "به پروژه‌های خود وارد شوید.",
    registerSubtitle: "برای ذخیره پروژه‌ها حساب بسازید.",
    email: "ایمیل",
    password: "گذرواژه",
    passwordHint: "۸–۷۲ نویسه",
    createAccount: "ایجاد حساب",
    signIn: "ورود",
    haveAccount: "حساب دارید؟",
    noAccount: "هنوز حساب ندارید؟",
    createOne: "ایجاد کنید",
  },

  workspace: {
    title: "میز کار",
    projects: "پروژه‌ها",
    account: "حساب",
    currentProject: "پروژه جاری",
    newProject: "پروژه جدید",
    recent: "اخیر",
    allProjects: "همه پروژه‌ها",
    save: "ذخیره",
    saving: "در حال ذخیره…",
    saved: "ذخیره شد",
    saveProject: "ذخیره پروژه",
    renameProject: "تغییر نام پروژه",
    deleteProject: "حذف پروژه",
    loadFailed: "بارگذاری پروژه‌ها ناموفق بود.",
    empty: "هنوز پروژه‌ای ذخیره نشده — یکی بسازید و ذخیره کنید.",
    currentSuffix: "جاری",
    page: "صفحه",
    pages: "صفحه",
    signedInAs: "ورود به‌عنوان",
    logout: "خروج",
  },

  pages: {
    add: "افزودن صفحه",
    delete: "حذف صفحه",
  },

  subPages: {
    title: "زیرصفحه‌ها",
    add: "افزودن زیرصفحه",
    rename: "تغییر نام زیرصفحه",
    delete: "حذف زیرصفحه",
    newFromTemplate: "جدید از الگو",
    templateTitle: "زیرصفحه جدید از الگو",
  },

  tools: {
    select: "انتخاب",
    pan: "جابجایی نما",
    wall: "دیوار",
    arcWall: "دیوار قوسی",
    window: "پنجره",
    door: "در",
    line: "خط",
    dashedLine: "خط‌چین",
    text: "متن",
    undo: "واگرد",
    redo: "ازنو",
    delete: "حذف انتخاب",
    structure: "سازه",
    drawing: "ترسیم",
    title: "ابزارها",
    navigation: "ناوبری",
    actions: "کنش‌ها",
    view: "نمایش",
  },

  settings: {
    title: "تنظیمات",
    units: "واحدها",
    measurementReference: "مرجع اندازه‌گیری",
    dimensions: "اندازه‌گذاری",
    moveConnectedNodes: "جابجایی گره‌های متصل",
    together: "باهم",
    separate: "جدا",
    wallThickness: "ضخامت دیوار",
    wallHeight: "ارتفاع دیوار",
    defaultAssembly: "لایه‌بندی پیش‌فرض",
    wallJoin: "اتصال دیوار",
    freeEnd: "انتهای آزاد",
    thicknessAlign: "تراز ضخامت",
    miterLimit: "حد اریب",
  },

  reference: {
    center: "محور",
    inner: "داخلی",
    outer: "خارجی",
    core: "هسته",
  },

  dimensionDisplay: {
    segments: "قطعات",
    chains: "زنجیره",
    both: "هر دو",
  },

  joinStyle: {
    miter: "اریب",
    butt: "تخت",
    bevel: "پخ",
    round: "گرد",
  },

  endCap: {
    butt: "تخت",
    round: "گرد",
    square: "مربعی",
  },

  align: {
    left: "چپ",
    center: "وسط",
    right: "راست",
  },

  wall: {
    title: "دیوار",
    actions: "عملیات دیوار",
    properties: "ویژگی‌ها",
    layers: "لایه‌ها",
    length: "طول",
    angle: "زاویه",
    thickness: "ضخامت",
    height: "ارتفاع",
    offset: "انحراف",
    curvature: "انحنا",
    alignDoors: "ترازِ درها ({count})",
    swingSide: "جهت بازشو",
    inward: "به داخل",
    outward: "به بیرون",
    hingeSide: "سمت لولا",
    left: "چپ",
    right: "راست",
    noDoors: "دری روی این دیوار برای ترازبندی نیست.",
  },

  wallSides: {
    inner: "وجه داخلی",
    outer: "وجه خارجی",
  },

  wallLayers: {
    layer: "لایه",
    addLayer: "لایه",
    noLayers: "بدون لایه.",
    removeLayer: "حذف لایه",
    type: "نوع",
    length: "طول",
    width: "عرض",
    height: "ارتفاع",
    area: "مساحت",
  },

  wallAssembly: {
    exterior: "بیرونی",
    interior: "داخلی",
    function: "عملکرد",
    core: "هسته",
    thickness: "ضخامت",
    addLayer: "افزودن لایه",
    moveOut: "به بیرون",
    moveIn: "به داخل",
    preset: "لایه‌بندی",
    presetPlaceholder: "اعمال لایه‌بندی…",
  },

  layerFunction: {
    structure: "سازه‌ای",
    substrate: "زیرسازی",
    thermal: "عایق حرارتی",
    finish1: "نازک‌کاری",
    finish2: "نازک‌کاری بیرونی",
    membrane: "غشاء",
  },

  assemblyPresets: {
    none: "تک‌لایه",
    singleLeaf: "تک‌جداره اندودشده",
    insulatedBlock: "بلوک عایق‌دار",
    cavityWall: "دیوار دوجداره",
    studPartition: "دیوار قاب‌بندی",
  },

  materials: {
    concrete: "بتن",
    block: "بلوک",
    stone: "سنگ",
    insulation: "عایق",
    plaster: "گچ",
    drywall: "دیوار خشک",
    wood: "چوب",
    tile: "کاشی",
  },

  systems: {
    title: "سیستم‌ها",
    tooltip: "سیستم‌ها / لایه‌ها",
    categories: {
      architectural: "معماری",
      structural: "سازه",
      electrical: "برق",
      plumbing: "لوله‌کشی",
      hvac: "تهویه مطبوع",
      roof: "بام",
      furniture: "مبلمان",
      annotation: "حاشیه‌نویسی",
    },
  },

  drawingInfo: {
    type: "نوع",
    length: "طول",
    width: "عرض",
    height: "ارتفاع",
    area: "مساحت",
    addLayer: "لایه",
    types: {
      wall: "دیوار",
      window: "پنجره",
      door: "در",
      line: "خط",
      "dashed-line": "خط‌چین",
      text: "متن",
      room: "اتاق",
    },
  },

  templates: {
    plumbing: {
      name: "لوله‌کشی",
      description: "چک‌لیست و ساختار پایه لوله‌کشی.",
    },
    electrical: {
      name: "برق",
      description: "چک‌لیست و ساختار پایه برق.",
    },
  },
};
