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
    appName: "Mehdify",
    tagline: "ترسیم دقیق، از طرح اولیه تا برآورد متره.",
    taglineSub: "دیوار بکشید، فضاها را خودکار تشخیص دهید، دیوارهای چندلایه را مدل کنید و مقادیر را خروجی بگیرید — در دو و سه‌بعدی.",
    welcomeBack: "خوش آمدید",
    register: "ثبت‌نام",
    signInSubtitle: "به پروژه‌های خود وارد شوید.",
    registerSubtitle: "برای ذخیره پروژه‌ها حساب بسازید.",
    email: "ایمیل",
    password: "گذرواژه",
    passwordHint: "۸–۷۲ نویسه",
    togglePassword: "نمایش یا پنهان‌کردن گذرواژه",
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

  admin: {
    title: "پنل مدیریت",
    backToEditor: "بازگشت به ویرایشگر",
    pricing: "قیمت‌گذاری",
    pricingIntro:
      "هزینهٔ واحدِ مصالح و دستمزد را برای هر مصالح تعیین کنید. فعلاً اینجا مدیریت می‌شوند و هنوز روی کاربران نهایی تأثیری ندارند.",
    sections: "بخش‌ها",
    layers: "لایه‌ها",
    layersIntro:
      "لایه‌های ساختاری دیوار قابل‌استفاده مجدد را مدیریت کنید. فعلاً فقط اینجا مدیریت می‌شوند و هنوز روی کاربران نهایی تأثیری ندارند.",
    layerName: "نام لایه",
    material: "مصالح",
    thickness: "ضخامت",
    addLayer: "افزودن لایه",
    removeLayer: "حذف لایه",
    noLayers: "هنوز لایه‌ای وجود ندارد. برای شروع فهرست یکی اضافه کنید.",
    detailName: "نام جزئیات",
    addDetail: "افزودن جزئیات",
    removeDetail: "حذف جزئیات",
    noDetails: "هنوز جزئیاتی برای این لایه وجود ندارد.",
    materials: "مصالح",
    materialsIntro:
      "مصالحی را که لایه‌ها و جزئیات از آن استفاده می‌کنند تعریف کنید — هرکدام با رنگ و ضخامت پیش‌فرض. فعلاً اینجا مدیریت می‌شوند و هنوز روی کاربران نهایی تأثیری ندارند.",
    materialName: "نام مصالح",
    color: "رنگ",
    unit: "واحد",
    addMaterial: "افزودن مصالح",
    removeMaterial: "حذف مصالح",
    noMaterials: "هنوز مصالحی وجود ندارد. برای شروع پالت یکی اضافه کنید.",
    presets: "لایه‌بندی‌ها",
    presetsIntro:
      "لایه‌ها را در لایه‌بندی‌های دیوار قابل‌استفاده مجدد گروه‌بندی کنید. فعلاً فقط اینجا مدیریت می‌شوند و هنوز روی کاربران نهایی تأثیری ندارند.",
    presetName: "نام لایه‌بندی",
    elementType: "نوع المان",
    selectLayer: "یک لایه انتخاب کنید…",
    newPreset: "لایه‌بندی جدید",
    addPreset: "افزودن لایه‌بندی",
    removePreset: "حذف لایه‌بندی",
    noPresets: "هنوز لایه‌بندی‌ای وجود ندارد. برای گروه‌بندی لایه‌ها در یک مجموعه، یکی بسازید.",
    materialCost: "هزینهٔ مصالح",
    laborCost: "هزینهٔ دستمزد",
    total: "مجموع",
    questions: "پرسش‌ها",
    questionsIntro:
      "پرسش‌هایی را تعریف کنید که شرایط کارگاه را ثبت می‌کنند. هر پاسخ می‌تواند نشانه‌ای را فعال کند که قواعد قیمت‌گذاری بر اساس آن عمل می‌کنند. فعلاً اینجا مدیریت می‌شوند و هنوز روی کاربران نهایی تأثیری ندارند.",
    questionText: "پرسش",
    addQuestion: "افزودن پرسش",
    removeQuestion: "حذف پرسش",
    noQuestions: "هنوز پرسشی وجود ندارد. برای ثبت شرایط کارگاه یکی اضافه کنید.",
    answerLabel: "پاسخ",
    flag: "نشانه",
    addAnswer: "افزودن پاسخ",
    removeAnswer: "حذف پاسخ",
    noAnswers: "هنوز پاسخی برای این پرسش وجود ندارد.",
  },

  roles: {
    user: "کاربر",
    admin: "مدیر",
    superAdmin: "ابرمدیر",
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

  view: {
    zoomIn: "بزرگ‌نمایی",
    zoomOut: "کوچک‌نمایی",
    fit: "اندازه به نما",
  },

  statusBar: {
    snap: "گیرش",
  },

  inspector: {
    empty: "برای ویرایش ویژگی‌ها، عنصری را انتخاب کنید.",
    noProps: "هنوز ویژگی قابل‌ویرایشی برای این عنصر وجود ندارد.",
  },

  settings: {
    title: "تنظیمات",
    theme: "پوسته",
    themeDark: "تیره",
    themeLight: "روشن",
    appearance: "ظاهر",
    measurement: "اندازه‌ها و اندازه‌گذاری",
    wallDefaults: "پیش‌فرض‌های دیوار",
    joins: "اتصالات دیوار",
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
    arcDimensions: "ابعاد قوس",
    chord: "وتر",
    arcLength: "طول قوس",
    depth: "خیز",
    alignDoors: "ترازِ درها ({count})",
    swingSide: "جهت بازشو",
    inward: "به داخل",
    outward: "به بیرون",
    hingeSide: "سمت لولا",
    left: "چپ",
    right: "راست",
    noDoors: "دری روی این دیوار برای ترازبندی نیست.",
    phase: "فاز اجرا",
    new: "نوساز",
    existing: "موجود",
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

  units: {
    m2: "مترمربع",
    m3: "مترمکعب",
    ml: "مترطول",
    each: "عدد",
    kg: "کیلوگرم",
  },

  elementTypes: {
    wall: "دیوار",
    floor: "کف",
    ceiling: "سقف",
    roof: "بام",
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
    existing: "موجود",
    types: {
      wall: "دیوار",
      window: "پنجره",
      door: "در",
      line: "خط",
      "dashed-line": "خط‌چین",
      text: "متن",
      room: "اتاق",
      space: "فضا",
      floor: "کف",
      ceiling: "سقف",
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
