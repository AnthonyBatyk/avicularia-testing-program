document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const localStorage = window.KBJVStorage.storage;

  // The auto-saving sort controls must update the unsaved-form baseline only
  // after their storage transaction commits successfully.
  let markModalCommitted = () => {};
  // v129: unified unsaved-field guard for all editable modal dialogs.
  // A backdrop tap, Escape or Cancel cannot silently lose edits.
  (function installUnsavedModalGuard(){
    const snapshots=new WeakMap();
    const activeStates=new WeakMap();
    const controls=modal=>Array.from(modal.querySelectorAll("input,textarea,select"))
      .filter(el=>el.type!=="hidden"&&el.type!=="button"&&el.type!=="submit"&&el.id!=="delete-product-search");
    const fingerprint=modal=>JSON.stringify(controls(modal).map(el=>[
      el.id||el.name||"",el.type==="checkbox"||el.type==="radio"?el.checked:el.type==="file"?Array.from(el.files||[]).map(f=>f.name+":"+f.size).join("|"):el.value
    ]));
    const captureOpen=modal=>{
      if(modal.classList.contains("active"))snapshots.set(modal,{fingerprint:fingerprint(modal),touched:false});
      else snapshots.delete(modal);
    };
    markModalCommitted=modal=>{
      if(modal?.classList.contains("active"))snapshots.set(modal,{fingerprint:fingerprint(modal),touched:false});
    };
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type!=="attributes"||record.attributeName!=="class")continue;
        const modal=record.target,active=modal.classList.contains("active");
        if(active!==activeStates.get(modal)){activeStates.set(modal,active);captureOpen(modal);}
      }
    });
    document.querySelectorAll(".product-modal").forEach(modal=>{
      observer.observe(modal,{attributes:true,attributeFilter:["class"]});
      activeStates.set(modal,modal.classList.contains("active"));
      if(modal.classList.contains("active"))captureOpen(modal);
    });
    document.addEventListener("focusin",event=>{
      const modal=event.target.closest?.(".product-modal.active");
      if(modal&&!snapshots.has(modal))captureOpen(modal);
    },true);
    document.addEventListener("beforeinput",event=>{
      const modal=event.target.closest?.(".product-modal.active");
      if(modal&&!snapshots.has(modal))captureOpen(modal);
    },true);
    document.addEventListener("input",event=>{
      const modal=event.target.closest?.(".product-modal.active");
      if(!modal)return;
      const state=snapshots.get(modal);
      if(state)state.touched=true;
    },true);
    document.addEventListener("change",event=>{
      const modal=event.target.closest?.(".product-modal.active");
      if(!modal)return;
      const state=snapshots.get(modal);
      if(state)state.touched=true;
    },true);
    function confirmExit(modal){
      const state=snapshots.get(modal);
      if(!state||!state.touched||state.fingerprint===fingerprint(modal))return true;
      return window.confirm("У вас є незбережені зміни.\n\nВийти без збереження? Натисніть «Скасувати», щоб продовжити редагування.");
    }
    document.addEventListener("click",event=>{
      const modal=event.target.closest?.(".product-modal.active");
      if(!modal)return;
      const clickedBackdrop=event.target===modal;
      const cancelButton=event.target.closest?.("button");
      const clickedCancel=cancelButton&&(
        /(?:cancel|close|back)$/.test(cancelButton.id||"")||cancelButton.classList.contains("product-action-cancel")
        || /^(скасувати|закрити|назад)$/i.test(cancelButton.textContent.trim())
      );
      if(!(clickedBackdrop||clickedCancel))return;
      if(!confirmExit(modal)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      const modals=Array.from(document.querySelectorAll(".product-modal.active"));
      const modal=modals[modals.length-1];
      if(modal&&!confirmExit(modal)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
  })();


  const AUTH_API_URL = "https://avicularia-api-testing.anthonybatyk.workers.dev";
  const SITE_VERSION = "v277";
  const EXPECTED_WORKER_VERSION = 110;
  const RELEASE_MANIFEST_URL = new URL("release.json",document.baseURI).href;
  const AUTH_LOCAL_KEY = "avicularia_testing_auth_session";
  const AUTH_SESSION_KEY = "avicularia_testing_auth_session_temp";
  const LEGACY_STORAGE_KEYS = {
    PRODUCTS_KEY:"avicularia_testing_products", CALCULATOR_KEY:"avicularia_testing_calculator", ARCHIVE_KEY:"avicularia_testing_archive", ACTIVE_TAB_KEY:"avicularia_testing_active_tab",
    CALCULATOR_DRAFT_KEY:"avicularia_testing_calculator_draft", SORT_KEY:"avicularia_testing_product_sort", SORT_SCHEMA_KEY:"avicularia_testing_product_sort_v26",
    RANDOM_SORT_SEED_KEY:"avicularia_testing_product_random_seed", CATEGORY_ORDER_KEY:"avicularia_testing_category_order", CONSOLE_KEY:"avicularia_testing_console",
    EXPORT_VERSION_KEY:"avicularia_testing_export_version", DATABASE_UPDATED_KEY:"avicularia_testing_database_updated_at", EXPORT_FINGERPRINT_KEY:"avicularia_testing_export_fingerprint",
    DAILY_GOAL_KEY:"avicularia_testing_daily_goal", LAST_EXPORT_KEY:"avicularia_testing_last_export_at", LAST_IMPORT_KEY:"avicularia_testing_last_import_at", UNDO_KEY:"avicularia_testing_undo_snapshot",
    STATS_TO_TODAY_KEY:"avicularia_testing_stats_to_today", SITE_DATA_VISIBLE_KEY:"avicularia_testing_site_data_visible", ARCHIVE_NOTE_KEY:"avicularia_testing_archive_note", ARCHIVE_NOTE_VISIBLE_KEY:"avicularia_testing_archive_note_visible", STATS_GOAL_VISIBLE_KEY:"avicularia_testing_stats_goal_visible"
  };

  let PRODUCTS_KEY=LEGACY_STORAGE_KEYS.PRODUCTS_KEY, CALCULATOR_KEY=LEGACY_STORAGE_KEYS.CALCULATOR_KEY, ARCHIVE_KEY=LEGACY_STORAGE_KEYS.ARCHIVE_KEY;
  let ACTIVE_TAB_KEY=LEGACY_STORAGE_KEYS.ACTIVE_TAB_KEY, CALCULATOR_DRAFT_KEY=LEGACY_STORAGE_KEYS.CALCULATOR_DRAFT_KEY, SORT_KEY=LEGACY_STORAGE_KEYS.SORT_KEY;
  let SORT_SCHEMA_KEY=LEGACY_STORAGE_KEYS.SORT_SCHEMA_KEY, RANDOM_SORT_SEED_KEY=LEGACY_STORAGE_KEYS.RANDOM_SORT_SEED_KEY, CATEGORY_ORDER_KEY=LEGACY_STORAGE_KEYS.CATEGORY_ORDER_KEY;
  let CONSOLE_KEY=LEGACY_STORAGE_KEYS.CONSOLE_KEY, EXPORT_VERSION_KEY=LEGACY_STORAGE_KEYS.EXPORT_VERSION_KEY, DATABASE_UPDATED_KEY=LEGACY_STORAGE_KEYS.DATABASE_UPDATED_KEY;
  let EXPORT_FINGERPRINT_KEY=LEGACY_STORAGE_KEYS.EXPORT_FINGERPRINT_KEY, DAILY_GOAL_KEY=LEGACY_STORAGE_KEYS.DAILY_GOAL_KEY, LAST_EXPORT_KEY=LEGACY_STORAGE_KEYS.LAST_EXPORT_KEY;
  let LAST_IMPORT_KEY=LEGACY_STORAGE_KEYS.LAST_IMPORT_KEY, UNDO_KEY=LEGACY_STORAGE_KEYS.UNDO_KEY, STATS_TO_TODAY_KEY=LEGACY_STORAGE_KEYS.STATS_TO_TODAY_KEY, SITE_DATA_VISIBLE_KEY=LEGACY_STORAGE_KEYS.SITE_DATA_VISIBLE_KEY;
  let ARCHIVE_NOTE_KEY=LEGACY_STORAGE_KEYS.ARCHIVE_NOTE_KEY, ARCHIVE_NOTE_VISIBLE_KEY=LEGACY_STORAGE_KEYS.ARCHIVE_NOTE_VISIBLE_KEY, STATS_GOAL_VISIBLE_KEY=LEGACY_STORAGE_KEYS.STATS_GOAL_VISIBLE_KEY;
  let PROFILE_KEY="avicularia_testing_profile", CUSTOM_CATEGORIES_KEY="avicularia_testing_custom_categories", DELETED_DEFAULT_CATEGORIES_KEY="avicularia_testing_deleted_default_categories", DEPARTMENTS_ENABLED_KEY="avicularia_testing_departments_enabled", CALC_QUICK_PRESETS_KEY="avicularia_testing_calc_quick_presets", AUDIT_QUEUE_KEY="avicularia_testing_audit_queue";
  let SYNC_LOCAL_UPDATED_KEY="avicularia_testing_sync_local_updated_at", SYNC_REVISION_KEY="avicularia_testing_sync_revision", SYNC_DIRTY_KEY="avicularia_testing_sync_dirty", SYNC_LAST_AT_KEY="avicularia_testing_sync_last_at";

  let authUser=null, authToken="", authRemembered=false, appInitialized=false;

  function applyUserStorageNamespace(userId){
    // Reset integrity flags from the unauthenticated legacy namespace or a
    // different account. Each account is checked again under its own keys.
    corruptLocalDataKeys.clear();
    const prefix=`avicularia_testing_user_${String(userId)}_`;
    PRODUCTS_KEY=prefix+"products"; CALCULATOR_KEY=prefix+"calculator"; ARCHIVE_KEY=prefix+"archive"; ACTIVE_TAB_KEY=prefix+"active_tab";
    CALCULATOR_DRAFT_KEY=prefix+"calculator_draft"; SORT_KEY=prefix+"product_sort"; SORT_SCHEMA_KEY=prefix+"product_sort_v26";
    RANDOM_SORT_SEED_KEY=prefix+"product_random_seed"; CATEGORY_ORDER_KEY=prefix+"category_order"; CONSOLE_KEY=prefix+"console";
    EXPORT_VERSION_KEY=prefix+"export_version"; DATABASE_UPDATED_KEY=prefix+"database_updated_at"; EXPORT_FINGERPRINT_KEY=prefix+"export_fingerprint";
    DAILY_GOAL_KEY=prefix+"daily_goal"; LAST_EXPORT_KEY=prefix+"last_export_at"; LAST_IMPORT_KEY=prefix+"last_import_at"; UNDO_KEY=prefix+"undo_snapshot";
    STATS_TO_TODAY_KEY=prefix+"stats_to_today"; SITE_DATA_VISIBLE_KEY=prefix+"site_data_visible"; ARCHIVE_NOTE_KEY=prefix+"archive_note"; ARCHIVE_NOTE_VISIBLE_KEY=prefix+"archive_note_visible"; STATS_GOAL_VISIBLE_KEY=prefix+"stats_goal_visible";
    PROFILE_KEY=prefix+"profile"; CUSTOM_CATEGORIES_KEY=prefix+"custom_categories"; DELETED_DEFAULT_CATEGORIES_KEY=prefix+"deleted_default_categories"; DEPARTMENTS_ENABLED_KEY=prefix+"departments_enabled"; CALC_QUICK_PRESETS_KEY=prefix+"calc_quick_presets"; AUDIT_QUEUE_KEY=prefix+"audit_queue";
    SYNC_LOCAL_UPDATED_KEY=prefix+"sync_local_updated_at"; SYNC_REVISION_KEY=prefix+"sync_revision"; SYNC_DIRTY_KEY=prefix+"sync_dirty"; SYNC_LAST_AT_KEY=prefix+"sync_last_at";
  }

  async function migrateLegacyDataToAdmin(user){
    // Старі неіменовані localStorage-дані належать лише первинному власнику сайту.
    if(!user||!user.is_owner)return;
    const marker=`avicularia_testing_legacy_migrated_v47_${user.id}`;
    if(localStorage.getItem(marker)==="1")return;
    const pairs=[
      [LEGACY_STORAGE_KEYS.PRODUCTS_KEY,PRODUCTS_KEY],[LEGACY_STORAGE_KEYS.CALCULATOR_KEY,CALCULATOR_KEY],[LEGACY_STORAGE_KEYS.ARCHIVE_KEY,ARCHIVE_KEY],
      [LEGACY_STORAGE_KEYS.ACTIVE_TAB_KEY,ACTIVE_TAB_KEY],[LEGACY_STORAGE_KEYS.CALCULATOR_DRAFT_KEY,CALCULATOR_DRAFT_KEY],[LEGACY_STORAGE_KEYS.SORT_KEY,SORT_KEY],
      [LEGACY_STORAGE_KEYS.SORT_SCHEMA_KEY,SORT_SCHEMA_KEY],[LEGACY_STORAGE_KEYS.RANDOM_SORT_SEED_KEY,RANDOM_SORT_SEED_KEY],[LEGACY_STORAGE_KEYS.CATEGORY_ORDER_KEY,CATEGORY_ORDER_KEY],
      [LEGACY_STORAGE_KEYS.CONSOLE_KEY,CONSOLE_KEY],[LEGACY_STORAGE_KEYS.EXPORT_VERSION_KEY,EXPORT_VERSION_KEY],[LEGACY_STORAGE_KEYS.DATABASE_UPDATED_KEY,DATABASE_UPDATED_KEY],
      [LEGACY_STORAGE_KEYS.EXPORT_FINGERPRINT_KEY,EXPORT_FINGERPRINT_KEY],[LEGACY_STORAGE_KEYS.DAILY_GOAL_KEY,DAILY_GOAL_KEY],[LEGACY_STORAGE_KEYS.LAST_EXPORT_KEY,LAST_EXPORT_KEY],
      [LEGACY_STORAGE_KEYS.LAST_IMPORT_KEY,LAST_IMPORT_KEY],[LEGACY_STORAGE_KEYS.UNDO_KEY,UNDO_KEY],[LEGACY_STORAGE_KEYS.STATS_TO_TODAY_KEY,STATS_TO_TODAY_KEY],[LEGACY_STORAGE_KEYS.SITE_DATA_VISIBLE_KEY,SITE_DATA_VISIBLE_KEY],[LEGACY_STORAGE_KEYS.ARCHIVE_NOTE_KEY,ARCHIVE_NOTE_KEY],[LEGACY_STORAGE_KEYS.ARCHIVE_NOTE_VISIBLE_KEY,ARCHIVE_NOTE_VISIBLE_KEY],[LEGACY_STORAGE_KEYS.STATS_GOAL_VISIBLE_KEY,STATS_GOAL_VISIBLE_KEY]
    ];
    beginStorageTransaction("Міграція старих локальних даних");
    pairs.forEach(([legacyKey,userKey])=>{if(localStorage.getItem(userKey)===null){const value=localStorage.getItem(legacyKey);if(value!==null)safeStorageSet(userKey,value,{critical:true});}});
    if(!finishStorageTransaction()){console.warn("Legacy storage migration was rolled back safely.");return;}
    await window.KBJVStorage.whenIdle();
    safeStorageSet(marker,"1",{critical:true});
  }

  let products = [];
  let calculatorItems = [];
  let archiveItems = [];
  let selectedProduct = null;
  let editingProduct = null;
  let draggedCard = null;
  let reorderMode = false;
  let reorderChanged = false;
  let pendingProductOrder = null;
  let productOrderOriginal = null;
  let archiveEditingId = null;
  let archiveOriginalText = null;
  let archiveEditingButton = null;
  let archiveCompositionSourceButton = null;
  let archiveCommentEditingId = null;
  let archiveCommentOriginal = "";
  let archiveDayTypeOriginal = "";
  let archiveCommentEditingButton = null;
  let currentSort = "categories";
  const VALID_SORT_MODES=new Set(["categories","oldest","newest","list","random","initial","manual"]);
  let sortTarget = "blocks";
  let pendingCategoryOrder = null;
  let departmentsEnabled = false; // v241: restored category controls; the saved setting is loaded per user
  let profileData = {display_name:"",full_name:"",birth_date:"",weight:"",height:"",weight_updated_at:"",height_updated_at:"",avatar:""};
  let calculatorQuickPresets = [];
  let consoleItems = [];
  let draggedCalcIndex = null;
  let calculatorReorderMode = false;
  let calculatorReorderChanged = false;
  let dailyGoal = {enabled:false,kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0};
  let dailyGoalSettingsOpen = false;
  let pendingExport = null;
  let exportScope = "all";
  let pendingImport = null;
  let importScope = "all";

  const $ = id => document.getElementById(id);
  const tabs = document.querySelectorAll(".app > .tabs:not(.utilities-tabs) > .tab[data-tab]");
  const pages = document.querySelectorAll(".page");
  const utilitiesOpen = $("utilities-open"), utilitiesBack = $("utilities-back"), utilitiesTools = $("utilities-tools"), utilitiesTraining = $("utilities-training"), utilitiesConsole = $("utilities-console");
  // v162: discreet, user-switchable fixed controls that target the actual scrolling surface:
  // the document for ordinary pages, or the active modal's own scrollable
  // box/list for long dialogs. No data, credentials or audit entries touched.
  const quickScrollControls=$("quick-scroll-controls");
  const mainAppNode=$("main-app");
  const quickScrollUp=$("quick-scroll-up"), quickScrollDown=$("quick-scroll-down");
  const quickScrollToggle=$("system-quick-scroll-toggle"), quickScrollState=$("system-quick-scroll-value");
  const quickScrollSettingsToggle=$("system-quick-scroll-settings-toggle"),quickScrollSettings=$("system-quick-scroll-settings");
  let quickScrollSettingsExpanded=false;
  const quickScrollPosition=$("system-quick-scroll-position"), quickScrollPositionLabel=$("system-quick-scroll-position-label");
  const quickScrollHeightLabel=$("system-quick-scroll-height-label"),quickScrollHeightValue=$("system-quick-scroll-height-value"),quickScrollHeightHint=$("system-quick-scroll-hint");
  const quickScrollHeightChange=$("system-quick-scroll-height-change"),quickScrollHeightModal=$("quick-scroll-height-modal");
  const quickScrollWidthLabel=$("system-quick-scroll-width-label"),quickScrollWidthValue=$("system-quick-scroll-width-value"),quickScrollWidthChange=$("system-quick-scroll-width-change");
  const quickScrollWidthModal=$("quick-scroll-width-modal"),quickScrollWidthInput=$("system-quick-scroll-width"),quickScrollWidthSave=$("system-quick-scroll-width-save"),quickScrollWidthClose=$("system-quick-scroll-width-close");
  const quickScrollSizeLabel=$("system-quick-scroll-size-label"),quickScrollSizeValue=$("system-quick-scroll-size-value"),quickScrollSizeChange=$("system-quick-scroll-size-change");
  const quickScrollSizeModal=$("quick-scroll-size-modal"),quickScrollSizeWidth=$("system-quick-scroll-size-width"),quickScrollSizeHeight=$("system-quick-scroll-size-height"),quickScrollSizeSave=$("system-quick-scroll-size-save"),quickScrollSizeClose=$("system-quick-scroll-size-close");
  const quickScrollSizeReset=$("system-quick-scroll-size-reset");
  const quickScrollHeightInput=$("system-quick-scroll-height"),quickScrollHeightSave=$("system-quick-scroll-height-save"),quickScrollHeightClose=$("system-quick-scroll-height-close");
  let quickScrollFrame=0, quickScrollFlashTimer=0, quickScrollMotionFrame=0;
  // Freeze the toggle label until the full success/error animation ends.
  // Otherwise the next action text overwrites the active result prematurely.
  let quickScrollToggleFeedbackActive=false,quickScrollToggleFeedbackTimer=0;
  let quickScrollPositionFeedbackActive=false,quickScrollPositionFeedbackTimer=0;
  // Device-only per-account preference: deliberately excluded from KBJV backup/D1 sync.
  const quickScrollPreferenceKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_quick_scroll_enabled_v162`:null;
  const quickScrollEnabled=()=>{
    const key=quickScrollPreferenceKey();
    return !key||localStorage.getItem(key)!=="0";
  };
  // Per-account, device-only preference. Missing/invalid means left side.
  const quickScrollSideKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_quick_scroll_side_v166`:null;
  const quickScrollSide=()=>{
    const key=quickScrollSideKey();
    return key&&localStorage.getItem(key)==="right"?"right":"left";
  };
  const quickScrollHeightKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_quick_scroll_height_v170`:null;
  const parseQuickScrollPercent=value=>{
    const raw=String(value??"").trim().replace(",",".");
    if(!/^(?:100(?:\.0)?|\d{1,2}(?:\.\d)?)$/.test(raw))return null;
    const n=Number(raw);
    return Number.isFinite(n)&&n>=0&&n<=100?Math.round(n*10)/10:null;
  };
  const formatQuickScrollPercent=n=>Number.isInteger(n)?String(n):n.toFixed(1).replace(".",",");
  const isQuickScrollPercent=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100&&Math.abs(n*10-Math.round(n*10))<1e-8;
  const normalizeQuickScrollHeight=value=>parseQuickScrollPercent(value)??50;
  const quickScrollHeight=()=>{
    const key=quickScrollHeightKey();return normalizeQuickScrollHeight(key?localStorage.getItem(key)??50:50);
  };
  const quickScrollWidthKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_quick_scroll_width_percent_v178`:null;
  const quickScrollSizeKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_quick_scroll_dimensions_v178`:null;
  const normalizeQuickScrollWidth=value=>parseQuickScrollPercent(value)??2.5;
  const quickScrollWidth=()=>{const key=quickScrollWidthKey();return normalizeQuickScrollWidth(key?(localStorage.getItem(key)??2.5):2.5);};
  const normalizeQuickScrollSize=value=>{
    if(!value||typeof value!=="object")return {width_px:7,height_px:31};
    const width=Number(value.width_px),height=Number(value.height_px);
    return {width_px:Number.isInteger(width)&&width>=4&&width<=14?width:7,
      height_px:Number.isInteger(height)&&height>=18&&height<=48?height:31};
  };
  const quickScrollSize=()=>{
    const key=quickScrollSizeKey();let stored=null;
    try{stored=JSON.parse(key?(localStorage.getItem(key)||"null"):"null");}catch(_){}
    return normalizeQuickScrollSize(stored);
  };
  const quickScrollProfilePrefs=()=>({enabled:quickScrollEnabled(),side:quickScrollSide(),height_percent:quickScrollHeight(),
    width_percent:quickScrollWidth(),size:quickScrollSize()});
  const isValidQuickScrollProfilePrefs=value=>value&&typeof value==="object"&&!Array.isArray(value)&&
    typeof value.enabled==="boolean"&&["left","right"].includes(value.side)&&
    isQuickScrollPercent(value.height_percent)&&
    (value.width_percent===undefined||(isQuickScrollPercent(value.width_percent)))&&
    (value.size===undefined||(value.size&&typeof value.size==="object"&&!Array.isArray(value.size)&&
      Number.isInteger(value.size.width_px)&&value.size.width_px>=4&&value.size.width_px<=14&&
      Number.isInteger(value.size.height_px)&&value.size.height_px>=18&&value.size.height_px<=48));
  const writeQuickScrollProfilePrefs=(value,{onlyIfUnset=false}={})=>{
    if(!isValidQuickScrollProfilePrefs(value))return false;
    const pairs=[[quickScrollPreferenceKey(),value.enabled?"1":"0"],[quickScrollSideKey(),value.side],[quickScrollHeightKey(),String(value.height_percent)]];
    if(value.width_percent!==undefined)pairs.push([quickScrollWidthKey(),String(value.width_percent)]);
    if(value.size!==undefined)pairs.push([quickScrollSizeKey(),JSON.stringify(value.size)]);
    for(const [key,text] of pairs){if(key&&(!onlyIfUnset||localStorage.getItem(key)===null)){
      if(!safeStorageSet(key,text,{critical:true}))return false;
    }}
    return true;
  };
  const isScrollableVertically=node=>{
    if(!(node instanceof HTMLElement))return false;
    const style=getComputedStyle(node);
    if(style.display==="none"||style.visibility==="hidden")return false;
    if(!/^(auto|scroll)$/.test(style.overflowY))return false;
    return node.scrollHeight>node.clientHeight+4 && node.clientHeight>0;
  };
  const openScrollModal=()=>{
    const active=[...document.querySelectorAll(".product-modal.active")];
    if(!active.length)return null;
    return active.findLast?.(node=>node.classList.contains("modal-topmost"))||
      active.filter(node=>node.classList.contains("modal-topmost")).pop()||active[active.length-1];
  };
  const modalScrollSurfaces=modal=>{
    if(!modal)return [];
    const box=modal.querySelector(".product-modal-box");
    if(!box)return [];
    // The container may scroll together with a nested list (admin details,
    // selectors, long utility lists). Include both to reach the true end.
    return [box,...box.querySelectorAll("*")].filter(isScrollableVertically);
  };
  // The compact/large modal decision stays tied to the layout viewport so
  // opening an iPhone keyboard cannot reclassify an existing dialog.
  const quickScrollLayoutHeight=()=>Math.max(1,
    document.documentElement.clientHeight||window.innerHeight||0);
  // v195: percentages follow the *visible* viewport (including its offset when
  // iOS pans it for the software keyboard). Never store transient pixels:
  // the per-user 0–100% settings and bar dimensions remain unchanged.
  const quickScrollVisibleViewport=()=>{
    const viewport=window.visualViewport;
    const fallbackWidth=document.documentElement.clientWidth||window.innerWidth||1;
    const fallbackHeight=window.innerHeight||document.documentElement.clientHeight||1;
    return {width:Math.max(1,viewport?.width||fallbackWidth),
      height:Math.max(1,viewport?.height||fallbackHeight),
      left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0};
  };
  const showQuickScrollInModal=modal=>{
    if(!modal)return true;
    // Sorting is a compact dialog, even on shorter phones. The delete-product
    // dialog is a full workflow and retains the controls as explicitly requested.
    if(modal.id==="sort-products-modal")return false;
    if(modal.id==="delete-product-modal")return true;
    const box=modal.querySelector(".product-modal-box");
    if(!box)return false;
    // Small dialogs do not need fixed navigation bars. For tall dialogs, use
    // their real scroll surface rather than the keyboard-reduced viewport.
    const surfaces=modalScrollSurfaces(modal);
    if(!surfaces.length)return false;
    const viewport=quickScrollLayoutHeight();
    const boxHeight=box.getBoundingClientRect().height;
    return boxHeight>=viewport*.62||box.scrollHeight>=viewport*.80;
  };
  const syncQuickScroll=()=>{
    if(!quickScrollControls)return;
    const signedIn=!document.body.classList.contains("auth-active")&&
      !!mainAppNode&&!mainAppNode.hidden;
    const modal=signedIn?openScrollModal():null;
    const enabled=quickScrollEnabled();
    const side=quickScrollSide();
    quickScrollControls.dataset.side=side;
    const height=quickScrollHeight();
    quickScrollControls.style.setProperty("--av-scroll-height-percent",`${height}%`);
    const widthPct=quickScrollWidth(),size=quickScrollSize();
    // 0 = chosen side, 50 = screen center, 100 = opposite side
    // The 28px minimum hit target remains independent of the visible capsule.
    const hitWidth=Math.max(28,size.width_px+14);
    const {width:viewportWidth,height:viewportHeight,left:viewportLeft,top:viewportTop}=quickScrollVisibleViewport();
    const horizontalTravel=Math.max(0,viewportWidth-size.width_px);
    // Position the VISIBLE capsule, not the wider invisible hit area.
    // 0% touches the chosen edge; 50% centers; 100% touches the opposite edge.
    const fromChosenEdge=horizontalTravel*(widthPct/100);
    const visualOffset=(hitWidth-size.width_px)/2;
    const fromLeft=viewportLeft+(side==="left"?fromChosenEdge:horizontalTravel-fromChosenEdge)-visualOffset;
    quickScrollControls.style.setProperty("--av-scroll-left",`${fromLeft.toFixed(2)}px`);
    quickScrollControls.style.setProperty("--av-scroll-touch-width",`${hitWidth}px`);
    // The first visible bar touches the top at 100%; the second touches the bottom at 0%.
    const hitHeight=Math.max(42,size.height_px+10);
    const totalHeight=hitHeight*2+2;
    const verticalInset=(hitHeight-size.height_px)/2;
    const minTop=-verticalInset;
    const maxTop=Math.max(minTop,viewportHeight-totalHeight+verticalInset);
    const topPx=viewportTop+maxTop+(minTop-maxTop)*(height/100);
    quickScrollControls.style.setProperty("--av-scroll-top",`${topPx.toFixed(2)}px`);
    quickScrollControls.style.setProperty("--av-scroll-bar-width",`${size.width_px}px`);
    quickScrollControls.style.setProperty("--av-scroll-bar-height",`${size.height_px}px`);
    quickScrollControls.style.setProperty("--av-scroll-touch-height",`${Math.max(42,size.height_px+10)}px`);
    if(quickScrollWidthValue)quickScrollWidthValue.textContent=`${formatQuickScrollPercent(widthPct)}%`;
    if(quickScrollWidthLabel)quickScrollWidthLabel.hidden=!enabled;
    if(quickScrollWidthChange)quickScrollWidthChange.hidden=!enabled;
    if(quickScrollSizeValue)quickScrollSizeValue.textContent=`${size.width_px} × ${size.height_px} px`;
    if(quickScrollSizeLabel)quickScrollSizeLabel.hidden=!enabled;
    if(quickScrollSizeChange)quickScrollSizeChange.hidden=!enabled;
    if(quickScrollHeightValue)quickScrollHeightValue.textContent=`${formatQuickScrollPercent(height)}%`;
    if(quickScrollHeightInput && document.activeElement!==quickScrollHeightInput)quickScrollHeightInput.value=formatQuickScrollPercent(height);
    if(quickScrollHeightLabel)quickScrollHeightLabel.hidden=!enabled;
    if(quickScrollHeightHint)quickScrollHeightHint.hidden=!enabled;
    if(quickScrollHeightChange)quickScrollHeightChange.hidden=!enabled;
    if(quickScrollPositionLabel){
      quickScrollPositionLabel.textContent=`Позиція — ${side==="right"?"Праворуч":"Ліворуч"}`;
      quickScrollPositionLabel.hidden=!enabled;
    }
    if(quickScrollPosition){
      quickScrollPosition.hidden=!enabled;
      if(!quickScrollPositionFeedbackActive){
        quickScrollPosition.textContent="Змінити позицію";
        quickScrollPosition.dataset.originalText="Змінити позицію";
      }
      quickScrollPosition.setAttribute("aria-label",`Змінити позицію швидкої прокрутки. Зараз ${side==="right"?"праворуч":"ліворуч"}; натисніть, щоб перемістити ${side==="right"?"ліворуч":"праворуч"}.`);
    }
    if(quickScrollSettings){quickScrollSettings.hidden=!(enabled&&quickScrollSettingsExpanded);}
    if(quickScrollSettingsToggle){
      quickScrollSettingsToggle.hidden=!enabled;
      quickScrollSettingsToggle.setAttribute("aria-expanded",String(enabled&&quickScrollSettingsExpanded));
      quickScrollSettingsToggle.dataset.originalText=quickScrollSettingsExpanded?"Сховати налаштування":"Показати налаштування";
      if(!quickScrollSettingsToggle.classList.contains("button-status-success")&&!quickScrollSettingsToggle.classList.contains("button-status-error"))
        quickScrollSettingsToggle.textContent=quickScrollSettingsToggle.dataset.originalText;
    }
    if(quickScrollState)quickScrollState.textContent=enabled?"Увімкнено":"Вимкнено";
    if(quickScrollToggle){
      if(!quickScrollToggleFeedbackActive){
        quickScrollToggle.textContent=enabled?"Вимкнути":"Увімкнути";
        quickScrollToggle.dataset.originalText=enabled?"Вимкнути":"Увімкнути";
      }
      quickScrollToggle.setAttribute("aria-pressed",String(enabled));
    }
    const visible=signedIn&&enabled&&!document.body.classList.contains("stats-fullscreen-active")&&
      showQuickScrollInModal(modal);
    quickScrollControls.hidden=!visible;
    quickScrollControls.setAttribute("aria-hidden",String(!visible));
    if(!visible)quickScrollControls.removeAttribute("data-direction");
    // A button at its own destination is genuinely disabled, not just
    // visually unhighlighted. The opposite direction stays available.
    // Wait for an in-flight animation to finish before updating edge states.
    if(!quickScrollMotionFrame){
      const targets=visible?(modal?modalScrollSurfaces(modal):
        [document.scrollingElement||document.documentElement]):[];
      if(quickScrollUp)quickScrollUp.disabled=!visible||!targets.some(node=>canQuickScroll("up",node));
      if(quickScrollDown)quickScrollDown.disabled=!visible||!targets.some(node=>canQuickScroll("down",node));
    }
  };
  const scheduleQuickScrollSync=()=>{
    if(quickScrollFrame)return;
    quickScrollFrame=requestAnimationFrame(()=>{
      quickScrollFrame=0;
      syncQuickScroll();
    });
  };
  const flashQuickScroll=direction=>{
    if(!quickScrollControls)return;
    clearTimeout(quickScrollFlashTimer);
    quickScrollControls.dataset.direction=direction;
    quickScrollFlashTimer=setTimeout(()=>{
      quickScrollControls.removeAttribute("data-direction");
    },660);
  };
  // Keep both controls' disabled states in sync with manual scrolling,
  // including scrolling inside a dialog. rAF coalesces frequent events.
  document.addEventListener("scroll",scheduleQuickScrollSync,true);
  // A successful scroll down locks that destination. Late console entries,
  // Safari scroll anchoring and re-layouts must not make a repeated tap active.
  // Release only after real upward input (or a successful Up-button scroll).
  const quickScrollBottomSettled=new WeakMap();
  const QUICK_SCROLL_EDGE_PX=6;
  const QUICK_SCROLL_UNLOCK_PX=14;
  let quickScrollManualInputUntil=0;
  const markQuickScrollManualInput=event=>{
    // Touching a quick-scroll button is NOT manual scrolling of the page.
    if(event.target?.closest?.("#quick-scroll-controls"))return;
    quickScrollManualInputUntil=performance.now()+1600;
  };
  document.addEventListener("touchstart",markQuickScrollManualInput,{capture:true,passive:true});
  document.addEventListener("wheel",markQuickScrollManualInput,{capture:true,passive:true});
  document.addEventListener("pointerdown",markQuickScrollManualInput,{capture:true,passive:true});
  document.addEventListener("keydown",event=>{
    if(["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(event.key))
      markQuickScrollManualInput(event);
  },true);
  document.addEventListener("scroll",event=>{
    if(performance.now()>quickScrollManualInputUntil)return;
    const node=event.target===document?document.scrollingElement:event.target;
    if(!node||typeof node.scrollTop!=="number")return;
    const previous=quickScrollBottomSettled.get(node);
    if(previous && node.scrollTop<previous.position-QUICK_SCROLL_UNLOCK_PX)
      quickScrollBottomSettled.delete(node);
  },true);
  // Shared boundary check for both visual availability and click handling.
  // No color, animation or button dimensions are altered by disabled status.
  const canQuickScroll=(direction,node)=>{
    if(!node||typeof node.scrollTop!=="number")return false;
    const max=Math.max(0,node.scrollHeight-node.clientHeight);
    const from=Math.min(max,Math.max(0,node.scrollTop));
    if(Math.abs((direction==="up"?0:max)-from)<=5)return false;
    if(direction==="down"){
      // A completed downward trip remains locked while the user is at its
      // destination. Late log entries, Safari scroll anchoring and viewport
      // resize can all change scrollTop *without* an upward user gesture.
      // Do not treat such changes as permission for a second Down click.
      if(quickScrollBottomSettled.has(node)){
        // Navigation to a different section can reset the document to the
        // very top without an explicit Up-button click. In that case Down
        // must be available again, just as on the first visit to the page.
        if(from<=5&&max>5)quickScrollBottomSettled.delete(node);
        else return false;
      }
    }
    return true;
  };
  let quickScrollActiveDirection=null;
  const performQuickScroll=direction=>{
    if(!quickScrollEnabled()||document.body.classList.contains("stats-fullscreen-active"))return;
    // A second tap while moving in that same direction does nothing.
    if(quickScrollMotionFrame&&quickScrollActiveDirection===direction)return;
    const modal=openScrollModal();
    const surfaces=modal?modalScrollSurfaces(modal):[document.scrollingElement||document.documentElement];
    if(!surfaces.length){scheduleQuickScrollSync();return;}
    const EDGE_TOLERANCE=5; // Fractional layout, Safari elastic overscroll.
    const destinations=surfaces.map(node=>{
      const max=Math.max(0,node.scrollHeight-node.clientHeight);
      const from=Math.min(max,Math.max(0,node.scrollTop));
      return {node,from,to:direction==="up"?0:max};
    }).filter(item=>canQuickScroll(direction,item.node));
    // Include every independently scrollable area in a long modal, but log
    // exactly once if at least one surface truly moved.
    if(!destinations.length)return;
    const maxDistance=Math.max(...destinations.map(item=>Math.abs(item.to-item.from)));
    cancelAnimationFrame(quickScrollMotionFrame);
    quickScrollMotionFrame=0;
    // Ignore any scroll-gesture window that predates this button action.
    // Only a NEW deliberate user gesture may release a settled bottom.
    quickScrollManualInputUntil=0;
    quickScrollActiveDirection=direction;
    const logCompletedScroll=()=>{
      const moved=destinations.some(item=>Math.abs(item.node.scrollTop-item.from)>EDGE_TOLERANCE);
      if(!moved)return;
      if(direction==="up"){
        for(const item of destinations)quickScrollBottomSettled.delete(item.node);
      }else{
        for(const item of destinations)
          quickScrollBottomSettled.set(item.node,{position:item.node.scrollTop});
      }
      logAction(direction==="up"
        ?"Прокручено до початку поточної сторінки."
        :"Прокручено до кінця поточної сторінки.",null,true);
      if(direction==="down"){
        // A console entry itself can change the document height. Snap to the
        // new physical end silently, keeping the logical end locked.
        for(const item of destinations){
          item.node.scrollTop=Math.max(0,item.node.scrollHeight-item.node.clientHeight);
          quickScrollBottomSettled.set(item.node,{position:item.node.scrollTop});
        }
      }
      // Re-evaluate disabled states after the real movement and its log.
      scheduleQuickScrollSync();
    };
    const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if(reducedMotion){
      for(const item of destinations)item.node.scrollTop=item.to;
      quickScrollActiveDirection=null;
      logCompletedScroll();
    }else{
      // Keep the established fast, smooth v190 timing and easing unchanged.
      const duration=Math.min(335,Math.max(215,215+Math.log2(1+maxDistance/600)*25));
      const start=performance.now();
      const step=now=>{
        const t=Math.min(1,Math.max(0,(now-start)/duration));
        const ease=t*t*(3-2*t);
        for(const item of destinations)item.node.scrollTop=item.from+(item.to-item.from)*ease;
        if(t<1)quickScrollMotionFrame=requestAnimationFrame(step);
        else{quickScrollMotionFrame=0;quickScrollActiveDirection=null;logCompletedScroll();}
      };
      quickScrollMotionFrame=requestAnimationFrame(step);
    }
    // Original (pre-v191) press animation: start immediately on a valid tap.
    flashQuickScroll(direction);
  };
  quickScrollUp?.addEventListener("click",()=>performQuickScroll("up"));
  quickScrollDown?.addEventListener("click",()=>performQuickScroll("down"));
  quickScrollToggle?.addEventListener("click",()=>{
    const next=!quickScrollEnabled();
    const key=quickScrollPreferenceKey();
    if(!key||!safeStorageSet(key,next?"1":"0",{critical:true})){
      showButtonState(quickScrollToggle,"Не збережено","error");return;
    }
    clearTimeout(quickScrollToggleFeedbackTimer);
    // Cancel the previous feedback before displaying a new result. Repeated
    // taps cannot leave an old timer overwriting the current button label.
    clearSharedButtonState(quickScrollToggle);
    quickScrollToggleFeedbackActive=true;
    quickScrollToggle.dataset.originalText=next?"Вимкнути":"Увімкнути";
    if(!next){
      quickScrollSettingsExpanded=false;
      clearTimeout(quickScrollPositionFeedbackTimer);
      clearSharedButtonState(quickScrollPosition);
      quickScrollPositionFeedbackActive=false;
      if(quickScrollPosition){
        quickScrollPosition.textContent="Змінити позицію";
        quickScrollPosition.dataset.originalText="Змінити позицію";
      }
      cancelAnimationFrame(quickScrollMotionFrame);quickScrollMotionFrame=0;
      clearTimeout(quickScrollFlashTimer);
      quickScrollControls?.removeAttribute("data-direction");
    }
    syncQuickScroll();
    showButtonState(quickScrollToggle,next?"Увімкнено":"Вимкнено",next?"success":"error");
    // showButtonState always lasts BUTTON_FEEDBACK_MS (1450 ms). The normal
    // action label is restored only after its color fades to neutral.
    quickScrollToggleFeedbackTimer=setTimeout(()=>{
      quickScrollToggleFeedbackActive=false;
      syncQuickScroll();
    },BUTTON_FEEDBACK_MS+35);
  });
  quickScrollSettingsToggle?.addEventListener("click",()=>{
    if(!quickScrollEnabled())return;
    quickScrollSettingsExpanded=!quickScrollSettingsExpanded;
    syncQuickScroll();
    showButtonState(quickScrollSettingsToggle,quickScrollSettingsExpanded?"Показано":"Сховано",quickScrollSettingsExpanded?"success":"error");
    // Shared feedback restores the normal action and its matching neutral color.
    setTimeout(()=>syncQuickScroll(),BUTTON_FEEDBACK_MS+35);
  });
  quickScrollPosition?.addEventListener("click",()=>{
    if(!quickScrollEnabled())return;
    const next=quickScrollSide()==="left"?"right":"left";
    const key=quickScrollSideKey();
    if(!key||!safeStorageSet(key,next,{critical:true})){
      showButtonState(quickScrollPosition,"Не збережено","error");return;
    }
    clearTimeout(quickScrollPositionFeedbackTimer);
    clearSharedButtonState(quickScrollPosition);
    quickScrollPositionFeedbackActive=true;
    quickScrollPosition.dataset.originalText="Змінити позицію";
    syncQuickScroll();
    showButtonState(quickScrollPosition,"Змінено","success");
    // Feedback finishes before the normal, next-clickable state is rendered.
    quickScrollPositionFeedbackTimer=setTimeout(()=>{
      quickScrollPositionFeedbackActive=false;
      syncQuickScroll();
    },BUTTON_FEEDBACK_MS+35);
  });
  // Observe only modal nodes and the app visibility. Avoid the expensive
  // document-wide observer and never react to our own button color changes.
  // Height editor is a real modal: never expose an unsaved value in System Status.
  // The success/error feedback finishes before closing or returning to the next action.
  let quickScrollHeightCloseTimer=0;
  const closeQuickScrollHeightModal=()=>{
    clearTimeout(quickScrollHeightCloseTimer);
    if(!quickScrollHeightModal)return;
    quickScrollHeightModal.hidden=true;
    quickScrollHeightModal.classList.remove("active","modal-topmost");
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
    clearTimeout(quickHeightFeedbackTimer);
    quickScrollHeightSave.disabled=false;
    clearSharedButtonState(quickScrollHeightSave);
    quickScrollHeightChange?.focus({preventScroll:true});
    scheduleQuickScrollSync();
  };
  quickScrollHeightChange?.addEventListener("click",()=>{
    if(!quickScrollEnabled()||!quickScrollHeightModal)return;
    clearSharedButtonState(quickScrollHeightChange);
    clearTimeout(quickScrollHeightCloseTimer);
    quickScrollHeightInput.value=formatQuickScrollPercent(quickScrollHeight());
    clearTimeout(quickHeightFeedbackTimer);
    quickScrollHeightSave.disabled=false;
    clearSharedButtonState(quickScrollHeightSave);
    quickScrollHeightClose.disabled=false;
    clearSharedButtonState(quickScrollHeightClose);
    quickScrollHeightModal.hidden=false;
    quickScrollHeightModal.classList.add("active","modal-topmost");
    document.body.classList.add("edit-modal-open");
    quickScrollHeightInput.focus({preventScroll:true});
    quickScrollHeightInput.select();
  });
  quickScrollHeightClose?.addEventListener("click",()=>{
    if(!quickScrollHeightModal?.classList.contains("active")||quickScrollHeightClose.disabled)return;
    quickScrollHeightClose.disabled=true;
    showButtonState(quickScrollHeightClose,"Закрито","success",0);
    clearTimeout(quickScrollHeightCloseTimer);
    quickScrollHeightCloseTimer=setTimeout(()=>{
      quickScrollHeightClose.disabled=false;
      closeQuickScrollHeightModal();
      clearSharedButtonState(quickScrollHeightClose);
    },340);
  });
  quickScrollHeightModal?.addEventListener("click",event=>{
    if(event.target===quickScrollHeightModal){
      closeQuickScrollHeightModal();
      showButtonState(quickScrollHeightChange,"Висоту не змінено","error");
    }
  });
  // v175: feedback in the height editor lasts exactly as long as its Close action.
  const QUICK_HEIGHT_FEEDBACK_MS=340;
  let quickHeightFeedbackTimer=0;
  function quickHeightFeedback(text,state){
    clearTimeout(quickHeightFeedbackTimer);
    showButtonState(quickScrollHeightSave,text,state,0);
    // Preserve the same success/error palette and exit transition as other buttons.
    quickScrollHeightSave.classList.remove("button-status-entering");
    quickHeightFeedbackTimer=setTimeout(()=>{
      // Successful changes close the dialog themselves; avoid a transient label flicker.
      if(quickScrollHeightModal?.classList.contains("active")&&!quickScrollHeightSave.disabled)clearSharedButtonState(quickScrollHeightSave);
    },QUICK_HEIGHT_FEEDBACK_MS);
  }
  quickScrollHeightSave?.addEventListener("click",()=>{
    if(quickScrollHeightSave.disabled)return;
    clearTimeout(quickScrollHeightCloseTimer);
    const raw=quickScrollHeightInput?.value?.trim()??"";
    if(parseQuickScrollPercent(raw)===null){
      quickHeightFeedback("Від 0 до 100","error");return;
    }
    const next=parseQuickScrollPercent(raw),current=quickScrollHeight();
    if(next===current){quickHeightFeedback("Без змін","error");return;}
    const key=quickScrollHeightKey();
    if(!key||!safeStorageSet(key,String(next),{critical:true})){
      quickHeightFeedback("Не збережено","error");return;
    }
    quickScrollHeightInput.blur();syncQuickScroll();
    quickScrollHeightSave.disabled=true;
    quickHeightFeedback("Змінено","success");
    quickScrollHeightCloseTimer=setTimeout(closeQuickScrollHeightModal,QUICK_HEIGHT_FEEDBACK_MS);
  });
  quickScrollHeightInput?.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();quickScrollHeightSave?.click();}
    if(event.key==="Escape"){
      event.preventDefault();event.stopImmediatePropagation();closeQuickScrollHeightModal();
      showButtonState(quickScrollHeightChange,"Висоту не змінено","error");
    }
  });

  // v178: independent horizontal placement and capsule dimensions, same modal feedback rhythm as height.
  function initQuickScrollNumberDialog({modal,open,input,save,close,reset=null,defaults=null,getCurrent,writeValue,parseValue,afterSave}){
    let timer=0;
    const clearFeedback=button=>{if(button){clearSharedButtonState(button);button.disabled=false;}};
    const dismiss=({cancelled=false}={})=>{
      clearTimeout(timer);modal.hidden=true;modal.classList.remove("active","modal-topmost");
      if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
      clearFeedback(save);clearFeedback(close);clearFeedback(reset);open?.focus({preventScroll:true});
      if(cancelled){
        const label=modal.id==="quick-scroll-width-modal"?"Ширину не змінено":"Розмір не змінено";
        showButtonState(open,label,"error");
      }
      scheduleQuickScrollSync();
    };
    open?.addEventListener("click",()=>{
      if(!quickScrollEnabled())return;
      clearSharedButtonState(open);
      clearTimeout(timer);clearFeedback(save);clearFeedback(close);clearFeedback(reset);
      const values=getCurrent();
      for(const [key,node] of Object.entries(input)){if(node)node.value=key==="width_percent"?formatQuickScrollPercent(values[key]):String(values[key]);}
      modal.hidden=false;modal.classList.add("active","modal-topmost");
      document.body.classList.add("edit-modal-open");
      Object.values(input)[0]?.focus({preventScroll:true});Object.values(input)[0]?.select();
    });
    const feedback=(msg,tone)=>{
      showButtonState(save,msg,tone,0);save.classList.remove("button-status-entering");
      clearTimeout(timer);timer=setTimeout(()=>{if(modal.classList.contains("active")&&!save.disabled)clearFeedback(save);},340);
    };
    save?.addEventListener("click",()=>{
      if(save.disabled)return;
      const values=parseValue(input);
      if(!values){feedback("Невірне значення","error");return;}
      if(Object.keys(values).every(k=>values[k]===getCurrent()[k])){feedback("Без змін","error");return;}
      if(!writeValue(values)){feedback("Не збережено","error");return;}
      Object.values(input)[0]?.blur();afterSave?.();syncQuickScroll();save.disabled=true;
      showButtonState(save,"Змінено","success",0);
      save.classList.remove("button-status-entering");
      clearTimeout(timer);timer=setTimeout(dismiss,340);
    });
    reset?.addEventListener("click",()=>{
      if(reset.disabled||!defaults)return;
      const current=getCurrent();
      if(Object.keys(defaults).every(k=>current[k]===defaults[k])){
        showButtonState(reset,"Без змін","error",0);
        setTimeout(()=>clearFeedback(reset),340);
        return;
      }
      if(!writeValue(defaults)){
        showButtonState(reset,"Не збережено","error",0);
        setTimeout(()=>clearFeedback(reset),340);
        return;
      }
      afterSave?.();syncQuickScroll();
      reset.disabled=true;
      showButtonState(reset,"Змінено","success",0);
      clearTimeout(timer);timer=setTimeout(dismiss,340);
    });
    close?.addEventListener("click",()=>{
      if(!modal.classList.contains("active")||close.disabled)return;
      close.disabled=true;showButtonState(close,"Закрито","success",0);
      clearTimeout(timer);timer=setTimeout(dismiss,340);
    });
    modal?.addEventListener("click",event=>{if(event.target===modal)dismiss({cancelled:true});});
    for(const node of Object.values(input))node?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();save.click();}
      if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();dismiss({cancelled:true});}
    });
  }
  initQuickScrollNumberDialog({modal:quickScrollWidthModal,open:quickScrollWidthChange,
    input:{width_percent:quickScrollWidthInput},save:quickScrollWidthSave,close:quickScrollWidthClose,
    getCurrent:()=>({width_percent:quickScrollWidth()}),
    parseValue:inputs=>{const raw=inputs.width_percent?.value.trim()||"";
      const width_percent=parseQuickScrollPercent(raw);return width_percent!==null?{width_percent}:null;},
    writeValue:values=>{const key=quickScrollWidthKey();return !!key&&safeStorageSet(key,String(values.width_percent),{critical:true});}
  });
  initQuickScrollNumberDialog({modal:quickScrollSizeModal,open:quickScrollSizeChange,
    input:{width_px:quickScrollSizeWidth,height_px:quickScrollSizeHeight},save:quickScrollSizeSave,close:quickScrollSizeClose,
    reset:quickScrollSizeReset,defaults:{width_px:7,height_px:31},
    getCurrent:quickScrollSize,
    parseValue:inputs=>{
      const w=inputs.width_px?.value.trim()||"",h=inputs.height_px?.value.trim()||"";
      if(!/^\d{1,2}$/.test(w)||!/^\d{1,2}$/.test(h))return null;
      const width_px=Number(w),height_px=Number(h);
      return width_px>=4&&width_px<=14&&height_px>=18&&height_px<=48?{width_px,height_px}:null;
    },
    writeValue:values=>{const key=quickScrollSizeKey();return !!key&&safeStorageSet(key,JSON.stringify(values),{critical:true});}
  });
  // iOS can resize/shift visualViewport without firing a window resize.
  // rAF coalesces the frequent keyboard frames; CSS transitions smooth them.
  window.visualViewport?.addEventListener("resize",scheduleQuickScrollSync,{passive:true});
  window.visualViewport?.addEventListener("scroll",scheduleQuickScrollSync,{passive:true});
  window.addEventListener("resize",scheduleQuickScrollSync,{passive:true});
  const quickScrollObserver=new MutationObserver(scheduleQuickScrollSync);
  for(const modal of document.querySelectorAll(".product-modal")){
    quickScrollObserver.observe(modal,{attributes:true,attributeFilter:["class","hidden","style"],childList:true,subtree:true});
  }
  if(mainAppNode)quickScrollObserver.observe(mainAppNode,{attributes:true,attributeFilter:["hidden","class"]});
  quickScrollObserver.observe(document.body,{attributes:true,attributeFilter:["class"]});
  if(typeof ResizeObserver!=="undefined"){
    const quickSizeObserver=new ResizeObserver(scheduleQuickScrollSync);
    for(const box of document.querySelectorAll(".product-modal-box"))quickSizeObserver.observe(box);
  }
  window.addEventListener("resize",scheduleQuickScrollSync,{passive:true});
  scheduleQuickScrollSync();
  let utilitiesReturnPage = "blocks";
  let utilitiesReturnScrollY = 0;

  const authScreen=$("auth-screen"), mainApp=$("main-app"), authTitle=$("auth-title"), authSubtitle=$("auth-subtitle"), authMessage=$("auth-message");
  const loginForm=$("login-form"), loginUsername=$("login-username"), loginPassword=$("login-password"), loginRemember=$("login-remember"), loginSubmit=$("login-submit"), showRegister=$("show-register"), showForgotPassword=$("show-forgot-password");
  const registerForm=$("register-form"), registerUsername=$("register-username"), registerPassword=$("register-password"), registerPasswordConfirm=$("register-password-confirm"), registerRemember=$("register-remember"), registerSubmit=$("register-submit"), showLogin=$("show-login");
  const forgotPasswordForm=$("forgot-password-form"), forgotPasswordSubmit=$("forgot-password-submit"), forgotPasswordBack=$("forgot-password-back"), recoveryRequestUsername=$("recovery-request-username"), recoveryContactTelegram=$("recovery-contact-telegram"), recoveryContactPhone=$("recovery-contact-phone");
  const passwordStrengthFill=$("password-strength-fill"), passwordStrengthText=$("password-strength-text"), passwordRuleElements=[...document.querySelectorAll("[data-password-rule]")];
  const adminRefresh=$("admin-refresh"), adminOpenUsers=$("admin-open-users"), adminCurrentUsername=$("admin-current-username"), adminUsersCount=$("admin-users-count"), adminAdminsCount=$("admin-admins-count"), adminMembersCount=$("admin-members-count"), adminStatus=$("admin-status"), adminOwnerNote=$("admin-owner-note"), adminUsersList=$("admin-users-list"), adminRecoveryCount=$("admin-recovery-count"), adminRecoveryStatus=$("admin-recovery-status"), adminRecoveryList=$("admin-recovery-list"), adminAuditCount=$("admin-audit-count"), adminAuditStatus=$("admin-audit-status"), adminAuditList=$("admin-audit-list");
  const adminAvatarCache=new Map();
  const adminTempPasswordModal=$("admin-temp-password-modal"), adminTempPasswordUser=$("admin-temp-password-user"), adminTempPasswordValue=$("admin-temp-password-value"), adminTempPasswordCopy=$("admin-temp-password-copy"), adminTempPasswordClose=$("admin-temp-password-close"), adminLoginsModal=$("admin-logins-modal"), adminLoginsUser=$("admin-logins-user"), adminLoginsList=$("admin-logins-list"), adminLoginsClose=$("admin-logins-close"), adminUsersModal=$("admin-users-modal"), adminUsersModalStatus=$("admin-users-modal-status"), adminUsersModalList=$("admin-users-modal-list"), adminUsersModalClose=$("admin-users-modal-close"), adminActionTypesModal=$("admin-action-types-modal"), adminActionTypesList=$("admin-action-types-list"), adminActionTypesClose=$("admin-action-types-close"), adminOpenActionTypes=$("admin-open-action-types"), adminFullModal=$("admin-full-modal"), adminFullUser=$("admin-full-user"), adminFullSummary=$("admin-full-summary"), adminFullStateSearch=$("admin-full-state-search"), adminFullStateSearchStatus=$("admin-full-state-search-status"), adminFullStateSearchResults=$("admin-full-state-search-results"), adminFullState=$("admin-full-state"), adminFullList=$("admin-full-list"), adminFullClose=$("admin-full-close"), logoutAccount=$("logout-account");
  const profileOpen=$("profile-open"), profileAvatarSmall=$("profile-avatar-small"), profileAvatarInitials=$("profile-avatar-initials"), profileDisplayName=$("profile-display-name"), profileDisplayNameText=$("profile-display-name-text");
  // v140 — unified, slightly slimmer SVG chevrons/rails, centered version.
  // The horizontal rails and angled chevrons use exactly the same stroke.
  // Endpoints follow the actual edges of the avatar and username, without
  // moving the four-digit version from the bar's geometric center.
  (function centerProfileVersionRails(){
    const bar=document.querySelector('.profile-bar');
    const avatar=profileOpen,name=profileDisplayName;
    const version=bar?.querySelector('.profile-site-version');
    const number=version?.querySelector('.profile-version-number');
    const svg=version?.querySelector('.profile-version-decoration');
    const leftPath=svg?.querySelector('.profile-version-line-left');
    const rightPath=svg?.querySelector('.profile-version-line-right');
    if(!bar||!avatar||!name||!number||!svg||!leftPath||!rightPath)return;
    let scheduled=false;
    const update=()=>{
      scheduled=false;
      if(!bar.getClientRects().length)return;
      const br=bar.getBoundingClientRect(),ar=avatar.getBoundingClientRect();
      const nr=number.getBoundingClientRect();
      const half=Math.ceil(nr.width/2+25);
      const halfPx=half+'px';
      if(bar.style.getPropertyValue('--version-half-width')!==halfPx)
        bar.style.setProperty('--version-half-width',halfPx);
      const user=name.getBoundingClientRect();
      const w=br.width,h=br.height,y=h/2;
      if(w<=0||h<=0)return;
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const start=Math.max(0,ar.right-br.left+5);
      const end=Math.min(w,user.left-br.left-1);
      // Lines and angled ends are continuous: one geometry, one stroke width,
      // so font metrics or 0.5px transforms cannot introduce a seam.
      const leftShoulder=nr.left-br.left-2;
      const rightShoulder=nr.right-br.left+2;
      const drawLeft=start<leftShoulder-1?`M ${start} ${y} H ${leftShoulder}`:'';
      const drawRight=end>rightShoulder+1?`M ${rightShoulder} ${y} H ${end}`:'';
      if(leftPath.getAttribute('d')!==drawLeft)leftPath.setAttribute('d',drawLeft);
      if(rightPath.getAttribute('d')!==drawRight)rightPath.setAttribute('d',drawRight);
    };
    const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(schedule);
      [bar,avatar,name,number].forEach(element=>observer.observe(element));
    }
    if(typeof MutationObserver!=='undefined')new MutationObserver(schedule)
      .observe(profileDisplayNameText,{subtree:true,childList:true,characterData:true});
    window.addEventListener('resize',schedule,{passive:true});
    schedule();
  })();

  const profilePhotoButton=$("profile-photo-button"), profileAvatarLarge=$("profile-avatar-large"), profileAvatarLargeInitials=$("profile-avatar-large-initials"), profilePhotoChange=$("profile-photo-change"), profilePhotoRemove=$("profile-photo-remove"), profilePhotoInput=$("profile-photo-input");
  const profileDisplayInput=$("profile-display-input"), profileDisplayCount=$("profile-display-count"), profileFullName=$("profile-full-name"), profileBirthDate=$("profile-birth-date"), profileWeight=$("profile-weight"), profileHeight=$("profile-height"), profileSave=$("profile-save");
  const profileWeightUpdated=$("profile-weight-updated"), profileHeightUpdated=$("profile-height-updated");
  const grid = $("grid");
  const searchInput = $("search");
  const clearSearch = $("clear-search");
  const exportButton = $("export-products");
  const importButton = $("import-products");
  const importFile = $("import-file");
  const addProductButton = $("add-product");
  const deleteProductButton = $("delete-product");
  const reorderProductsButton = $("reorder-products");
  const sortProductsButton = $("sort-products");

  const productModal = $("product-modal");
  const productModalName = $("product-modal-name");
  const productWeight = $("product-weight");
  const productQuickWeights = $("product-quick-weights");
  const productCancel = $("product-cancel");
  const productCopy = $("product-copy");
  const productCalculator = $("product-calculator");

  const addProductModal = $("add-product-modal");
  const addProductCancel = $("add-product-cancel");
  const addProductSave = $("add-product-save");
  const newProductName = $("new-product-name");
  const newProductKcal = $("new-product-kcal");
  const newProductKcalNoData = $("new-product-kcal-no-data");
  const newProductProtein = $("new-product-protein");
  const newProductProteinNoData = $("new-product-protein-no-data");
  const newProductFat = $("new-product-fat");
  const newProductFatNoData = $("new-product-fat-no-data");
  const newProductCarb = $("new-product-carb");
  const newProductCarbNoData = $("new-product-carb-no-data");
  const newProductSugar = $("new-product-sugar");
  const newProductSugarNoData = $("new-product-sugar-no-data");
  const newProductSalt = $("new-product-salt");
  const newProductSaltNoData = $("new-product-salt-no-data");
  const newProductFiber = $("new-product-fiber");
  const newProductFiberNoData = $("new-product-fiber-no-data");
  const newProductCategory = $("new-product-category");
  const newProductQuickWeights = [...document.querySelectorAll(".new-product-quick-weight")];
  const newProductDescription = $("new-product-description");
  const newProductDescriptionNoData = $("new-product-description-no-data");

  const editProductModal = $("edit-product-modal");
  const editProductCancel = $("edit-product-cancel");
  const editProductSave = $("edit-product-save");
  const editProductName = $("edit-product-name");
  const editProductKcal = $("edit-product-kcal");
  const editProductKcalNoData = $("edit-product-kcal-no-data");
  const editProductProtein = $("edit-product-protein");
  const editProductProteinNoData = $("edit-product-protein-no-data");
  const editProductFat = $("edit-product-fat");
  const editProductFatNoData = $("edit-product-fat-no-data");
  const editProductCarb = $("edit-product-carb");
  const editProductCarbNoData = $("edit-product-carb-no-data");
  const editProductSugar = $("edit-product-sugar");
  const editProductSugarNoData = $("edit-product-sugar-no-data");
  const editProductSalt = $("edit-product-salt");
  const editProductSaltNoData = $("edit-product-salt-no-data");
  const editProductFiber = $("edit-product-fiber");
  const editProductFiberNoData = $("edit-product-fiber-no-data");
  const editProductCategory = $("edit-product-category");
  const editProductQuickWeights = [...document.querySelectorAll(".edit-product-quick-weight")];
  const editProductDescription = $("edit-product-description");
  const editProductDescriptionNoData = $("edit-product-description-no-data");

  const productOrderModal = $("product-order-modal");
  const productOrderList = $("product-order-list");
  const productOrderReset = $("product-order-reset");
  const productOrderCancel = $("product-order-cancel");
  const productOrderSave = $("product-order-save");

  const sortProductsModal = $("sort-products-modal");
  const sortCategories = $("sort-categories");
  const sortDepartmentsToggle = $("sort-departments-toggle");
  const sortCategoryOrder = $("sort-category-order");
  const sortCustomCategory = $("sort-custom-category");
  const sortOldest = $("sort-oldest");
  const sortNewest = $("sort-newest");
  const sortList = $("sort-list");
  const sortRandom = $("sort-random");
  const sortInitial = $("sort-initial");
  const sortProductsCancel = $("sort-products-cancel");
  const categoryOrderModal = $("category-order-modal");
  const categoryOrderList = $("category-order-list");
  const categoryOrderReset = $("category-order-reset");
  const categoryOrderCancel = $("category-order-cancel");
  const categoryOrderSave = $("category-order-save");
  const customCategoryModal = $("custom-category-modal");
  const customCategoryName = $("custom-category-name");
  const customCategoryAdd = $("custom-category-add");
  const customCategoryList = $("custom-category-list");
  const customCategoryClose = $("custom-category-close");

  const deleteProductModal = $("delete-product-modal");
  const deleteProductList = $("delete-product-list");
  const deleteProductSearch = $("delete-product-search");
  const deleteProductSearchClear = $("delete-product-search-clear");
  const deleteProductCancelTop = $("delete-product-cancel-top");
  const deleteProductCancelBottom = $("delete-product-cancel-bottom");
  const deleteSortProducts = $("delete-sort-products");

  const calcInput = $("calc-input");
  const calcAdd = $("calc-add");
  const calcPaste = $("calc-paste");
  const calcClearText = $("calc-clear-text");
  const calcClearBlocks = $("calc-clear-blocks");
  const calcSection = $("calc-section");
  const calcQuickPresets = $("calc-quick-presets");
  const calcQuickManage = $("calc-quick-manage");
  const calcQuickModal = $("calc-quick-modal");
  const calcQuickMetric = $("calc-quick-metric");
  const calcQuickValue = $("calc-quick-value");
  const calcQuickAdd = $("calc-quick-add");
  const calcQuickList = $("calc-quick-list");
  const calcQuickClose = $("calc-quick-close");
  const kcalElement = $("kcal");
  const proteinElement = $("protein");
  const fatElement = $("fat");
  const carbElement = $("carb");
  const sugarElement = $("sugar");
  const saltElement = $("salt");
  const fiberElement = $("fiber");
  const copyTotal = $("copy-total");
  const saveArchive = $("save-archive");
  const reorderCalculatorHistory = $("reorder-calculator-history");
  const calcLog = $("calc-log");
  const archiveLog = $("archive-log");
  const archiveSearch = $("archive-search");
  const archiveSearchClear = $("archive-search-clear");
  const archiveSearchStatus = $("archive-search-status");
  const avgKcal7 = $("avg-kcal-7"), avgKcal14 = $("avg-kcal-14"), avgKcal30 = $("avg-kcal-30");
  const avgKcal7Note = $("avg-kcal-7-note"), avgKcal14Note = $("avg-kcal-14-note"), avgKcal30Note = $("avg-kcal-30-note");

  const siteDataToggle = $("site-data-toggle");
  const siteDataSection = $("archive-site-info");
  const siteDataContent = $("site-data-content");
  const archiveNoteToggle = $("archive-note-toggle"), archiveNoteSection = $("archive-note-section");
  const archiveNoteText = $("archive-note-text"), archiveNoteDisplay = $("archive-note-display"), archiveNoteLimitWarning = $("archive-note-limit-warning"), archiveNoteEdit = $("archive-note-edit");
  const archiveNotePaste = $("archive-note-paste"), archiveNoteClear = $("archive-note-clear"), archiveNoteCopy = $("archive-note-copy");
  const dailyGoalToggle = $("daily-goal-toggle");
  const dailyGoalContent = $("daily-goal-content");
  const dailyGoalSettings = $("daily-goal-settings");
  const dailyGoalDetailsToggle = $("daily-goal-details-toggle");
  const dailyGoalCopyRemaining = $("daily-goal-copy-remaining");
  const dailyGoalSave = $("daily-goal-save");
  const goalInputs = {kcal:$("goal-kcal"),protein:$("goal-protein"),fat:$("goal-fat"),carb:$("goal-carb"),sugar:$("goal-sugar"),salt:$("goal-salt"),fiber:$("goal-fiber")};
  const remainElements = {kcal:$("remain-kcal"),protein:$("remain-protein"),fat:$("remain-fat"),carb:$("remain-carb"),sugar:$("remain-sugar"),salt:$("remain-salt"),fiber:$("remain-fiber")};
  const progressElements = {kcal:$("progress-kcal"),protein:$("progress-protein"),fat:$("progress-fat"),carb:$("progress-carb"),sugar:$("progress-sugar"),salt:$("progress-salt"),fiber:$("progress-fiber")};
  const progressLabels = {kcal:$("progress-label-kcal"),protein:$("progress-label-protein"),fat:$("progress-label-fat"),carb:$("progress-label-carb"),sugar:$("progress-label-sugar"),salt:$("progress-label-salt"),fiber:$("progress-label-fiber")};
  const exportPreviewModal = $("export-preview-modal");
  const exportPreviewProducts = $("export-preview-products");
  const exportPreviewArchive = $("export-preview-archive");
  const exportPreviewArchiveNote = $("export-preview-archive-note");
  const exportPreviewCalculator = $("export-preview-calculator");
  const exportPreviewDraft = $("export-preview-draft");
  const exportPreviewGoal = $("export-preview-goal");
  const exportPreviewSettings = $("export-preview-settings");
  const exportPreviewProfile = $("export-preview-profile");
  const exportPreviewVersion = $("export-preview-version");
  const exportPreviewDate = $("export-preview-date");
  const exportPreviewCancel = $("export-preview-cancel");
  const exportPreviewConfirm = $("export-preview-confirm");
  const exportScopeButtons = [...document.querySelectorAll("#export-scope-actions [data-scope]")];
  const importPreviewModal = $("import-preview-modal");
  const importPreviewProducts = $("import-preview-products");
  const importPreviewProductsDiff = $("import-preview-products-diff");
  const importPreviewArchive = $("import-preview-archive");
  const importPreviewArchiveNote = $("import-preview-archive-note");
  const importPreviewArchiveDiff = $("import-preview-archive-diff");
  const importPreviewCalculator = $("import-preview-calculator");
  const importPreviewDraft = $("import-preview-draft");
  const importPreviewGoal = $("import-preview-goal");
  const importPreviewSettings = $("import-preview-settings");
  const importPreviewProfile = $("import-preview-profile");
  const importPreviewVersion = $("import-preview-version");
  const importPreviewDate = $("import-preview-date");
  const importPreviewCancel = $("import-preview-cancel");
  const importPreviewConfirm = $("import-preview-confirm");
  const importScopeButtons = [...document.querySelectorAll("#import-scope-actions [data-scope]")];
  const clearSiteButton = $("clear-site");
  const deleteAccountButton = $("delete-account");
  const undoLastAction = $("undo-last-action");
  const refreshSiteButton = $("refresh-site");
  const consoleLog = $("console-log");
  const systemStatusRefresh = $("system-status-refresh");
  const systemHelpOpen = $("system-status-help"), systemHelpModal = $("system-help-modal"), systemHelpClose = $("system-help-close");
  const systemVersion = $("system-version"), systemNetwork = $("system-network"), systemWorker = $("system-worker"), systemStorage = $("system-storage"), systemStorageCard = $("system-storage-card"), systemStorageNote = $("system-storage-note"), systemUndo = $("system-undo"), systemSync = $("system-sync"), systemDatabaseUpdated = $("system-database-updated"), systemBackupSync = $("system-backup-sync"), systemExport = $("system-export"), systemImport = $("system-import"), systemSyncNote = $("system-sync-note");
  const syncNowButton = $("sync-now"), syncUseServer = $("sync-use-server"), syncUseLocal = $("sync-use-local");
  const syncV2MigrationButton = $("sync-v2-migrate"), syncCheckButton = $("sync-check");
  const statsChart = $("stats-chart");
  const statsFullscreen = $("stats-fullscreen"), statsFullscreenOpen = $("stats-fullscreen-open");
  const statsFullscreenCanvas = $("stats-fullscreen-canvas"), statsFullscreenViewport = $("stats-fullscreen-viewport"), statsFullscreenTooltip = $("stats-fullscreen-tooltip");
  const statsFullscreenClose = $("stats-fullscreen-close"), statsFullscreenPlus = $("stats-fullscreen-plus");
  const statsFullscreenMinus = $("stats-fullscreen-minus"), statsFullscreenReset = $("stats-fullscreen-reset");
  const statsFullscreenTitle = $("stats-fullscreen-title"), statsFullscreenInspection = $("stats-fullscreen-inspection");
  const statsFullscreenFrom=$("stats-fullscreen-from"),statsFullscreenTo=$("stats-fullscreen-to");
  let fullscreenFrom="",fullscreenTo="";
  let fullscreenZoom = 1, fullscreenRenderedPoints = [], fullscreenChartGeometry = null, fullscreenLastPinch = 0;
  const siteLatestNode = $("system-site-latest"), workerLatestNode = $("system-worker-latest");
  const copyComparisonNode = $("system-copy-comparison"), copyDetailsNode = $("system-copy-details");
  let remoteSyncOverview=null;
  let confirmedIncrementalMode=false;
  function setMigrationButtonVisibility(status){
    confirmedIncrementalMode=!!status?.active;
    if(syncV2MigrationButton)syncV2MigrationButton.hidden=!(authUser&&status?.ok===true&&status?.active===false);
  }
  let latestReleaseManifest=null;
  function numericVersion(version){
    const value=String(version??"").trim().replace(/^v/i,"");
    // Release manifests may use an integer or a dotted version (e.g. 253.1).
    return /^\d+(?:\.\d+)?$/.test(value)?Number(value):null;
  }
  function writeVersionMarker(node,message,state){
    if(!node)return;
    node.textContent=message;
    node.classList.remove("version-ok","version-old","version-unknown");
    node.classList.add(state||"version-unknown");
  }
  async function updateReleaseStatus(){
    if(!navigator.onLine){
      writeVersionMarker(siteLatestNode,"Неможливо перевірити офлайн","version-unknown");
      writeVersionMarker(workerLatestNode,"Неможливо перевірити офлайн","version-unknown");
      return;
    }
    try{
      // Not an app-shell asset. Uncached network request exposes new deployments to old PWA.
      const url=new URL(RELEASE_MANIFEST_URL);url.searchParams.set("check",String(Date.now()));
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
      let response;
      try{response=await fetch(url,{cache:"no-store",signal:controller.signal});}finally{clearTimeout(timer);}
      if(!response.ok)throw new Error("Маніфест оновлень недоступний");
      const info=await response.json();
      if(info.environment!=="avicularia-testing"||numericVersion(info.site_version)===null||numericVersion(info.worker_version)===null)throw new Error("Некоректний маніфест релізу");
      latestReleaseManifest=info;
      const latest=numericVersion(info.site_version),current=numericVersion(SITE_VERSION);
      writeVersionMarker(siteLatestNode,latest>current?`Є оновлення: v${latest}`:latest===current?"Остання версія сайту":"Встановлена новіша версія",latest>current?"version-old":"version-ok");
      // Server marker is updated by /health; manifest only declares published release.
    }catch(error){writeVersionMarker(siteLatestNode,"Не вдалося перевірити","version-unknown");latestReleaseManifest=null;}
  }
  function renderSyncCopyComparison(){
    if(!copyComparisonNode||!copyDetailsNode)return;
    copyComparisonNode.classList.remove("copy-ok","copy-warn","copy-error");
    if(!authUser){copyComparisonNode.textContent="Увійдіть до акаунта";copyDetailsNode.textContent="";return;}
    if(!remoteSyncOverview){
      const pending=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
      copyComparisonNode.textContent=pending?"Не синхронізовано":"Сервер ще не перевірений";
      copyComparisonNode.classList.add(syncLastCheckError?"copy-error":"copy-warn");
      copyDetailsNode.textContent=syncLastCheckError
        ?`Перевірка сервера не вдалася: ${syncLastCheckError}. Локальні дані не змінено.`
        :pending?"Є локальні зміни; відповідність серверним даним поки не підтверджена.":"Натисніть «Перевірити синхронізацію» або «Синхронізувати зараз».";
      return;
    }
    const localRevision=Number(localStorage.getItem(SYNC_REVISION_KEY)||0),remoteRevision=Number(remoteSyncOverview.revision||0),dirty=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
    const localAt=localStorage.getItem(SYNC_LOCAL_UPDATED_KEY),remoteAt=remoteSyncOverview.updated_at;
    const audit=avSyncAudit?.user===String(authUser.id)&&avSyncAudit?.checkedAt
      && Date.now()-avSyncAudit.checkedAt<120000 ? avSyncAudit : null;
    const contentDiffers=!!audit?.groups&&Object.values(audit.groups).some(equal=>equal===false);
    const contentVerified=!!audit?.groups&&Object.values(audit.groups).every(Boolean);
    let summary="Копії потребують порівняння",warning=true;
    if(syncConflict){summary="Різні копії — виберіть джерело";}
    else if(dirty&&remoteRevision>localRevision){summary="Зміни з обох сторін — можливий конфлікт";}
    else if(dirty){summary="Незбережені зміни на пристрої";}
    else if(remoteRevision>localRevision){summary="На сервері новіша ревізія";}
    else if(localRevision>remoteRevision){summary="На пристрої новіша ревізія";}
    else if(contentDiffers){summary="Ревізії збігаються, дані відрізняються";}
    else if(audit&&!audit.groups){summary="Серверні дані не підтверджено";}
    else if(contentVerified){summary="Копії збігаються";warning=false;}
    else{summary="Ревізії збігаються · вміст не перевірено";}
    copyComparisonNode.textContent=summary;
    copyComparisonNode.classList.add(syncConflict?"copy-error":warning?"copy-warn":"copy-ok");
    copyDetailsNode.textContent=`${audit?"Сервер перевірено. ":""}Пристрій: r${localRevision} · ${localAt?formatAdminDate(localAt):"дата невідома"}; сервер: r${remoteRevision} · ${remoteAt?formatAdminDate(remoteAt):"дата невідома"}. Дата може відрізнятися через час на пристрої.`;
  }

  const statsEmpty = $("stats-empty");
  const statsTooltip = $("stats-tooltip");
  const statsMonthSummary = $("stats-month-summary");
  const statsRangeSummary = $("stats-range-summary"), statsAverageLabel = $("stats-average-label");
  let statsRenderedPoints = [];
  let statsChartGeometry = null;
  const statsFrom = $("stats-from");
  const statsTo = $("stats-to");
  const statsToToday = $("stats-to-today");
  const statsChartGoal = $("stats-chart-goal");
  let statsToTodayEnabled = false;
  let statsGoalVisible = true;
  let lastValidStatsFrom = "";
  let lastValidStatsTo = "";
  let siteDataVisible = true;
  let archiveNote = "", archiveNoteVisible = false, archiveNoteEditing = false;
  const ARCHIVE_NOTE_MAX_LENGTH = 500;
  const statsMetricButtons = document.querySelectorAll(".stats-metric");
  let statsMetric = "kcal";

  const archiveTextModal = $("archive-text-modal");
  const archiveTextInput = $("archive-text-input");
  const archiveTextCancel = $("archive-text-cancel");
  const archiveTextSave = $("archive-text-save");
  const archiveTextPaste = $("archive-text-paste");
  const archiveTextClear = $("archive-text-clear");
  const archiveTextCopy = $("archive-text-copy");
  const archiveCommentModal = $("archive-comment-modal");
  const archiveCommentInput = $("archive-comment-input");
  const archiveCommentLimit = $("archive-comment-limit");
  const archiveCommentCancel = $("archive-comment-cancel");
  const archiveCommentSave = $("archive-comment-save");
  const archiveCommentPaste = $("archive-comment-paste");
  const archiveCommentClear = $("archive-comment-clear");
  const archiveCommentCopy = $("archive-comment-copy");
  const archiveDayTypeInputs = [...document.querySelectorAll('input[name="archive-day-type"]')];
  const archiveCompositionModal = $("archive-composition-modal");
  const archiveCompositionDate = $("archive-composition-date");
  const archiveCompositionList = $("archive-composition-list");
  const archiveCompositionClose = $("archive-composition-close");

  const statusStyle = document.createElement("style");
  statusStyle.textContent = `
    .button-status-success,.button-status-success:hover{background:#22c55e!important;color:#fff!important;box-shadow:0 0 0 1px rgba(34,197,94,.30),0 0 18px rgba(34,197,94,.30)!important}
    .button-status-error,.button-status-error:hover{background:#ef4444!important;color:#fff!important;box-shadow:0 0 0 1px rgba(239,68,68,.30),0 0 18px rgba(239,68,68,.30)!important}
    .button-status-info,.button-status-info:hover{background:#7289da!important;color:#fff!important;box-shadow:0 0 0 1px rgba(114,137,218,.30),0 0 18px rgba(114,137,218,.30)!important}
    .button-status-success::after,.button-status-error::after{display:inline-block;margin-left:7px;font-weight:800;animation:buttonStatusIconIn .36s cubic-bezier(.16,1,.3,1) both}
    .button-status-success::after{content:"✓"}
    .button-status-error::after{content:"✕"}
    .button-status-entering{animation:buttonStatusIn .40s cubic-bezier(.16,1,.3,1) both}
    .button-status-leaving{animation:buttonStatusOut .25s cubic-bezier(.4,0,.2,1) both}
    @keyframes buttonStatusIn{
      0%{transform:scale(.988);filter:brightness(.94);opacity:.96}
      58%{transform:scale(1.006);filter:brightness(1.025);opacity:1}
      100%{transform:scale(1);filter:brightness(1);opacity:1}
    }
    @keyframes buttonStatusOut{
      0%{transform:scale(1);filter:brightness(1);opacity:1}
      100%{transform:scale(.994);filter:brightness(.98);opacity:.97}
    }
    @keyframes buttonStatusIconIn{
      0%{opacity:0;transform:translateX(-3px) scale(.86)}
      100%{opacity:1;transform:translateX(0) scale(1)}
    }
  `;
  document.head.appendChild(statusStyle);


  class AuthApiError extends Error{constructor(status,message){super(message);this.status=status;}}

  function repairLegacyMessage(value) {
    if (typeof value !== "string") return value;
    const score = text => (text.match(/[\u0420\u0421][\u0080-\u04ff\u2000-\u2122]/g) || []).length;
    if (score(value) < 3) return value;
    const cp1251 = "\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u0098\u2122\u0459\u203a\u045a\u045c\u045b\u045f\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f";
    const lookup = new Map(Array.from(cp1251, (char, index) => [char, index + 128]));
    const toByte = char => char.charCodeAt(0) < 128 ? char.charCodeAt(0) : lookup.get(char);
    const decoder = new TextDecoder("utf-8", {fatal: true});
    let text = value;
    for (let pass = 0; pass < 2 && score(text) >= 3; pass++) {
      // Prefer a complete reversible conversion; this also repairs one-letter words.
      const wholeBytes = Array.from(text, toByte);
      if (wholeBytes.every(byte => byte !== undefined)) {
        try {
          const candidate = decoder.decode(Uint8Array.from(wholeBytes));
          if (score(candidate) < score(text)) { text = candidate; continue; }
        } catch (_) { /* Mixed healthy names are handled by the conservative run fallback. */ }
      }
      // Only reverse valid UTF-8 byte sequences; healthy text and unknown characters stay untouched.
      const repaired = text.replace(/[^\u0000-\u007f]+/gu, run => {
        let result = "", chunk = "", bytes = [];
        const flush = () => {
          if (!chunk) return;
          try {
            const candidate = decoder.decode(Uint8Array.from(bytes));
            result += (score(chunk) >= 2 || /[\u0420\u0421][^\u0400-\u04ff]/.test(chunk)) && score(candidate) < score(chunk) ? candidate : chunk;
          } catch (_) { result += chunk; }
          chunk = ""; bytes = [];
        };
        for (let i = 0; i < run.length;) {
          const lead = toByte(run[i]);
          const size = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
          const part = size ? Array.from(run.slice(i, i + size), toByte) : [];
          if (part.length === size && size && part.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
            chunk += run.slice(i, i + size); bytes.push(...part); i += size;
          } else { flush(); result += run[i++]; }
        }
        flush(); return result;
      });
      if (repaired === text) break;
      text = repaired;
    }
    return text;
  }

  function setAuthMessage(message="",type=""){
    if(!authMessage)return;
    authMessage.textContent=message;
    authMessage.className=`auth-message${type?` ${type}`:""}`;
  }

  function switchAuthMode(mode){
    const current=["login","register","forgot"].includes(mode)?mode:"login";
    if(loginForm)loginForm.hidden=current!=="login";
    if(registerForm)registerForm.hidden=current!=="register";
    if(forgotPasswordForm)forgotPasswordForm.hidden=current!=="forgot";
    const titles={login:"Вхід в акаунт",register:"Реєстрація акаунта",forgot:"Відновлення пароля"};
    const subtitles={
      login:"Увійдіть у свій акаунт, щоб продовжити.",
      register:"Створіть власний акаунт. Для реєстрації потрібні логін і пароль.",
      forgot:"Надішліть запит власнику сайту для відновлення доступу та зв’яжіться з ним напряму.",
    };
    if(authTitle)authTitle.textContent=titles[current];
    if(authSubtitle)authSubtitle.textContent=subtitles[current];
    setAuthMessage("");
  }

  function getStoredAuthSession(){
    const sources=[{storage:localStorage,key:AUTH_LOCAL_KEY,remembered:true},{storage:sessionStorage,key:AUTH_SESSION_KEY,remembered:false}];
    for(const source of sources){
      let raw=null;
      try{raw=JSON.parse(source.storage.getItem(source.key)||"null");}catch(_){source.storage.removeItem(source.key);continue;}
      if(!raw)continue;
      if(!raw.token||!raw.user){source.storage.removeItem(source.key);continue;}
      if(raw.expires_at&&Date.parse(raw.expires_at)<=Date.now()){source.storage.removeItem(source.key);continue;}
      return {...raw,remembered:source.remembered};
    }
    return null;
  }

  function persistAuthSession(session,remembered){
    const payload=JSON.stringify({token:session.token,expires_at:session.expires_at,user:session.user});
    try{
      if(remembered){localStorage.setItem(AUTH_LOCAL_KEY,payload);sessionStorage.removeItem(AUTH_SESSION_KEY);}
      else{sessionStorage.setItem(AUTH_SESSION_KEY,payload);localStorage.removeItem(AUTH_LOCAL_KEY);}
    }catch(_){
      // Якщо постійне сховище недоступне/заповнене, сесію не втрачаємо: зберігаємо до закриття вкладки.
      sessionStorage.setItem(AUTH_SESSION_KEY,payload);
      try{localStorage.removeItem(AUTH_LOCAL_KEY);}catch(_2){}
      authRemembered=false;
    }
  }

  function updateStoredAuthUser(user){
    const storage=authRemembered?localStorage:sessionStorage, key=authRemembered?AUTH_LOCAL_KEY:AUTH_SESSION_KEY;
    try{const raw=JSON.parse(storage.getItem(key)||"null");if(raw&&raw.token){raw.user=user;storage.setItem(key,JSON.stringify(raw));}}catch(_){}
  }

  function clearAuthSession(){
    localStorage.removeItem(AUTH_LOCAL_KEY);sessionStorage.removeItem(AUTH_SESSION_KEY);authToken="";authUser=null;authRemembered=false;
  }

  async function authApi(path,{method="GET",body,token=authToken}={}){
    const headers={};
    if(body!==undefined)headers["Content-Type"]="application/json";
    if(token)headers.Authorization=`Bearer ${token}`;
    let response;
    try{response=await fetch(`${AUTH_API_URL}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});}
    catch(error){const networkError=new AuthApiError(0,"Немає з’єднання із сервером.");networkError.cause=error;throw networkError;}
    let data={};try{data=await response.json();}catch(_){}
    const repairMessages=value=>{
      if(!value||typeof value!=="object")return;
      for(const [key,item] of Object.entries(value)){
        if((key==="message"||key==="error")&&typeof item==="string")value[key]=repairLegacyMessage(item);
        else if(item&&typeof item==="object")repairMessages(item);
      }
    };
    repairMessages(data);
    if(!response.ok)throw new AuthApiError(response.status,data?.error||`Помилка сервера (${response.status}).`);
    return data;
  }



  function normalizeTelegramContact(value){
    const raw=String(value||"").trim();
    if(!raw)return {label:"",href:""};
    if(/^https?:\/\//i.test(raw))return {label:raw.replace(/^https?:\/\/(?:www\.)?t\.me\//i,"@"),href:raw};
    const username=raw.replace(/^@/,"");
    return {label:`@${username}`,href:`https://t.me/${encodeURIComponent(username)}`};
  }

  async function loadPublicRecoveryContact(){
    try{
      const data=await authApi("/public/recovery-contact",{token:""});
      const telegram=normalizeTelegramContact(data?.telegram);
      const phone=String(data?.phone||"").trim();
      if(recoveryContactTelegram){
        recoveryContactTelegram.hidden=!telegram.href;
        if(telegram.href){recoveryContactTelegram.href=telegram.href;recoveryContactTelegram.textContent=`Telegram: ${telegram.label}`;}
      }
      if(recoveryContactPhone){
        recoveryContactPhone.hidden=!phone;
        if(phone){recoveryContactPhone.href=`tel:${phone.replace(/[^+\d]/g,"")}`;recoveryContactPhone.textContent=`Телефон: ${phone}`;}
      }
    }catch(error){
      console.warn("Recovery contact load failed:",error);
      if(recoveryContactTelegram)recoveryContactTelegram.hidden=true;
      if(recoveryContactPhone)recoveryContactPhone.hidden=true;
    }
  }







  function passwordRules(value){
    const password=String(value||"");
    return {length:password.length>=11,upper:/\p{Lu}/u.test(password),lower:/\p{Ll}/u.test(password),number:/\p{N}/u.test(password),special:/[\p{P}\p{S}]/u.test(password)};
  }

  function renderPasswordStrength(){
    if(!registerPassword)return;
    const value=registerPassword.value,rules=passwordRules(value),score=Object.values(rules).filter(Boolean).length;
    passwordRuleElements.forEach(element=>element.classList.toggle("valid",!!rules[element.dataset.passwordRule]));
    if(!value){passwordStrengthFill.style.width="0";passwordStrengthFill.style.backgroundColor="";passwordStrengthText.textContent="Пароль ще не введено";return;}
    passwordStrengthFill.style.width=`${Math.max(12,score*20)}%`;
    if(score<=2){passwordStrengthFill.style.backgroundColor="#ef4444";passwordStrengthText.textContent="Слабкий пароль";}
    else if(score<5){passwordStrengthFill.style.backgroundColor="#f59e0b";passwordStrengthText.textContent="Середній пароль";}
    else{passwordStrengthFill.style.backgroundColor="#22c55e";passwordStrengthText.textContent="Надійний пароль";}
  }

  function validateRegistrationPassword(password){
    const rules=passwordRules(password);
    if(password.length>128)return "Пароль не може містити більше 128 символів.";
    if(!rules.length)return "Пароль повинен містити мінімум 11 символів.";
    if(!rules.upper)return "Додайте хоча б одну велику літеру.";
    if(!rules.lower)return "Додайте хоча б одну малу літеру.";
    if(!rules.number)return "Додайте хоча б одну цифру.";
    if(!rules.special)return "Додайте хоча б один спеціальний символ.";
    return "";
  }

  function formatAdminDate(value){
    if(!value)return "—";const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
    return date.toLocaleString("uk-UA",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
  }

  function profileChangedDate(value){
    const date=String(value||"").trim();
    return isExactIsoDate(date)?date:"";
  }
  function profileDateLabel(value,hasMeasurement){
    if(!hasMeasurement)return "—";
    const iso=profileChangedDate(value);
    if(!iso)return "Дата не вказана"; // Legacy profiles had no edit timestamp.
    const [year,month,day]=iso.split("-");
    return `${day}.${month}.${year.slice(-2)}`;
  }
  function measurementChanged(left,right){
    const a=String(left??"").trim().replace(",","."),b=String(right??"").trim().replace(",",".");
    if(a===b)return false;
    return !a||!b||Number(a)!==Number(b);
  }
  function normalizeProfile(value){
    const source=value&&typeof value==="object"?value:{};
    return {
      display_name:String(source.display_name||"").trim().slice(0,20),
      full_name:String(source.full_name||"").trim().slice(0,120),
      birth_date:String(source.birth_date||"").trim().slice(0,10),
      weight:String(source.weight??"").trim().slice(0,20),
      height:String(source.height??"").trim().slice(0,20),
      weight_updated_at:profileChangedDate(source.weight_updated_at),
      height_updated_at:profileChangedDate(source.height_updated_at),
      avatar:String(source.avatar||"").startsWith("data:image/")?String(source.avatar):""
    };
  }
  // Reject import-only profile fields that normalizeProfile would silently truncate.
  // Legacy missing/null fields are accepted; ordinary user form limits are unchanged.
  function validateImportedProfile(value){
    if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Пошкоджено профіль у резервній копії.");
    for(const [key,max] of Object.entries({display_name:20,full_name:120,birth_date:10,weight:20,height:20})){
      const field=value[key];
      if(field===undefined||field===null)continue;
      if(typeof field!=="string"||field.trim().length>max)
        throw new Error(`Некоректне або надто довге поле профілю «${key}». Дані не змінено.`);
    }
    for(const key of ["weight","height"]){
      const metric=value[key];
      if(metric!==undefined&&metric!==null&&String(metric).trim()!==""&&!isValidBackupNumber(metric))
        throw new Error(`Некоректне числове поле профілю «${key}». Дані не змінено.`);
    }
    if(value.birth_date!==undefined&&value.birth_date!==null&&value.birth_date!==""&&!isExactIsoDate(value.birth_date))
      throw new Error("Некоректна дата народження у профілі. Дані не змінено.");
    for(const key of ["weight_updated_at","height_updated_at"]){
      const date=value[key];
      if(date!==undefined&&date!==null&&(typeof date!=="string"||(date!==""&&!isExactIsoDate(date))))
        throw new Error(`Некоректна дата зміни показника профілю «${key}».`);
    }
    if(value.avatar!==undefined&&value.avatar!==null&&
       (typeof value.avatar!=="string"||(value.avatar!==""&&!value.avatar.startsWith("data:image/"))))
      throw new Error("Некоректне зображення профілю в резервній копії.");
    if(value.quick_scroll!==undefined && !isValidQuickScrollProfilePrefs(value.quick_scroll))
      throw new Error("Некоректні налаштування швидкої прокрутки в профілі резервної копії.");
    return true;
  }
  function hasProfileData(value=profileData){
    const p=normalizeProfile(value);
    return Boolean(p.display_name||p.full_name||p.birth_date||p.weight||p.height||p.avatar);
  }

  const MAX_CALCULATOR_QUICK_PRESETS=50;
  const QUICK_METRICS=new Set(["kcal","protein","fat","carb","sugar","salt","fiber"]);
  const QUICK_METRIC_LABELS={
    kcal:"ккал",
    protein:"білка",
    fat:"жирів",
    carb:"вуглеводів",
    sugar:"цукрів",
    salt:"солі",
    fiber:"клітковини"
  };
  function normalizeQuickPreset(value,index=0){
    if(!value||typeof value!=="object")return null;
    const metric=String(value.metric||"").trim();
    const amount=calculatorNumber(value.amount);
    if(!QUICK_METRICS.has(metric)||!(amount>0))return null;
    return {
      id:String(value.id||`quick-${index}-${metric}-${amount}`),
      metric,
      amount:Math.round((amount+Number.EPSILON)*1000)/1000
    };
  }
  function normalizeQuickPresets(values){
    const seen=new Set();
    return (Array.isArray(values)?values:[]).map(normalizeQuickPreset).filter(Boolean).filter(item=>{
      const key=`${item.metric}|${item.amount}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }
  function loadCalculatorQuickPresets(){
    const raw=readProtectedJson(CALC_QUICK_PRESETS_KEY,[],value=>Array.isArray(value)&&
      normalizeQuickPresets(value).length===value.length);
    calculatorQuickPresets=normalizeQuickPresets(raw);
    renderCalculatorQuickPresets();
  }
  function saveCalculatorQuickPresets(){
    const next=normalizeQuickPresets(calculatorQuickPresets);
    if(!persistUserChange("Збереження швидких КБЖВ",()=>safeStorageSet(CALC_QUICK_PRESETS_KEY,JSON.stringify(next),{critical:true}))){
      if(!storageTransaction)loadCalculatorQuickPresets();
      return false;
    }
    calculatorQuickPresets=next;
    renderCalculatorQuickPresets();
    return true;
  }
  function quickPresetLabel(item){
    return `+${formatNumber(item.amount)} ${QUICK_METRIC_LABELS[item.metric]||item.metric}`;
  }

  function getProfileDisplayName(){
    return profileData.display_name||authUser?.username||"Користувач";
  }

  function profileInitials(){
    const source=getProfileDisplayName();
    const parts=String(source||"").trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return "?";
    return (parts.length===1?parts[0].slice(0,2):(parts[0][0]+parts[1][0])).toUpperCase();
  }

  function renderProfile(){
    const displayName=getProfileDisplayName();
    const initials=profileInitials();
    const hasAvatar=!!profileData.avatar;
    profileOpen?.classList.toggle("has-avatar",hasAvatar);
    profilePhotoButton?.classList.toggle("has-avatar",hasAvatar);

    if(profileDisplayName){
      if(profileDisplayNameText){
        // Visual-only: ten user-visible characters in the top bar. The saved
        // display name, admin username, profile and exports remain untouched.
        const chars=(typeof Intl!=="undefined" && Intl.Segmenter)
          ? Array.from(new Intl.Segmenter("uk",{granularity:"grapheme"}).segment(String(displayName)),part=>part.segment)
          : Array.from(String(displayName));
        profileDisplayNameText.textContent=chars.length>10?chars.slice(0,10).join("")+"…":displayName;
      }
      const isAdmin=authUser?.role==="admin";
      // Keep the name scrollable on touch screens without enabling admin actions
      // for ordinary accounts (the click handler independently checks the role).
      profileDisplayName.disabled=false;
      profileDisplayName.setAttribute("aria-disabled",isAdmin?"false":"true");
      profileDisplayName.tabIndex=isAdmin?0:-1;
      profileDisplayName.setAttribute("aria-label",isAdmin?`${displayName}. Відкрити панель адміністратора`:displayName);
      profileDisplayName.classList.toggle("admin-link",isAdmin);
      if(!isAdmin){profileDisplayName.classList.remove("admin-selected");profileDisplayName.removeAttribute("aria-current");}
      profileDisplayName.title=isAdmin?`${displayName} — відкрити панель адміністратора`:displayName;
    }

    [[profileAvatarSmall,profileAvatarInitials],[profileAvatarLarge,profileAvatarLargeInitials]].forEach(([imageEl,initialEl])=>{
      if(imageEl){
        if(hasAvatar){imageEl.src=profileData.avatar;imageEl.hidden=false;}
        else{imageEl.removeAttribute("src");imageEl.hidden=true;}
      }
      if(initialEl){initialEl.textContent=initials;initialEl.hidden=hasAvatar;}
    });

    if(profileDisplayInput)profileDisplayInput.value=profileData.display_name;
    if(profileDisplayCount)profileDisplayCount.textContent=String(profileData.display_name.length);
    if(profileFullName)profileFullName.value=profileData.full_name;
    if(profileBirthDate)profileBirthDate.value=profileData.birth_date;
    if(profileWeight)profileWeight.value=profileData.weight;
    if(profileHeight)profileHeight.value=profileData.height;
    if(profileWeightUpdated)profileWeightUpdated.textContent=profileDateLabel(profileData.weight_updated_at,!!profileData.weight);
    if(profileHeightUpdated)profileHeightUpdated.textContent=profileDateLabel(profileData.height_updated_at,!!profileData.height);
    // An empty action stays available and explicitly reports “Немає фото”.
    if(profilePhotoRemove)profilePhotoRemove.disabled=false;
  }

  const profileDraftKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_profile_draft_v189`:null;
  const profileDraftFields=()=>({
    display_name:profileDisplayInput?.value??"",full_name:profileFullName?.value??"",
    birth_date:profileBirthDate?.value??"",weight:profileWeight?.value??"",
    height:profileHeight?.value??""
  });
  const savedProfileFields=()=>({
    display_name:String(profileData.display_name??""),full_name:String(profileData.full_name??""),
    birth_date:String(profileData.birth_date??""),weight:String(profileData.weight??""),
    height:String(profileData.height??"")
  });
  function saveProfileDraft(){
    const key=profileDraftKey();if(!key)return;
    const values=profileDraftFields(),base=savedProfileFields();
    if(JSON.stringify(values)===JSON.stringify(base)){safeStorageRemove(key);return;}
    safeStorageSet(key,JSON.stringify({base,values}),{critical:true});
  }
  function restoreProfileDraft(){
    const key=profileDraftKey();if(!key)return;
    let saved;try{saved=JSON.parse(localStorage.getItem(key)||"null");}catch(_){return;}
    if(!saved||!saved.base||!saved.values||JSON.stringify(saved.base)!==JSON.stringify(savedProfileFields()))return;
    for(const [name,input] of Object.entries({
      display_name:profileDisplayInput,full_name:profileFullName,birth_date:profileBirthDate,
      weight:profileWeight,height:profileHeight})){
      if(input&&typeof saved.values[name]==="string")input.value=saved.values[name];
    }
    if(profileDisplayCount&&profileDisplayInput)profileDisplayCount.textContent=String(profileDisplayInput.value.length);
  }
  function clearProfileDraft(){const key=profileDraftKey();if(key)safeStorageRemove(key);}

  function loadProfile(){
    const raw=readProtectedJson(PROFILE_KEY,{},value=>{
      if(!value||typeof value!=="object"||Array.isArray(value))return false;
      try{validateImportedProfile(value);return true;}catch(_){return false;}
    });
    profileData=normalizeProfile(raw);
    renderProfile();
  }

  function saveProfileLocal(){
    if(!persistUserChange("Збереження профілю",()=>safeStorageSet(PROFILE_KEY,JSON.stringify(profileData),{critical:true}))){loadProfile();return false;}
    clearProfileDraft();renderProfile();return true;
  }

  function collectProfileForm(avatar=profileData.avatar){
    return normalizeProfile({
      avatar,
      display_name:profileDisplayInput?.value??profileData.display_name,
      full_name:profileFullName?.value??profileData.full_name,
      birth_date:profileBirthDate?.value??profileData.birth_date,
      weight:profileWeight?.value??profileData.weight,
      height:profileHeight?.value??profileData.height,
      weight_updated_at:profileData.weight_updated_at,
      height_updated_at:profileData.height_updated_at
    });
  }

  async function resizeProfileImage(file){
    if(!file||!String(file.type||"").startsWith("image/"))throw new Error("Оберіть зображення.");
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();
      image.decoding="async";
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("Не вдалося прочитати фото."));image.src=url;});
      const side=Math.min(image.naturalWidth||image.width,image.naturalHeight||image.height);
      const sx=Math.max(0,((image.naturalWidth||image.width)-side)/2);
      const sy=Math.max(0,((image.naturalHeight||image.height)-side)/2);
      const canvas=document.createElement("canvas");
      canvas.width=384;canvas.height=384;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Не вдалося обробити фото.");
      context.drawImage(image,sx,sy,side,side,0,0,384,384);
      return canvas.toDataURL("image/jpeg",0.82);
    }finally{URL.revokeObjectURL(url);}
  }

  function fitTopTabLabels(){
    const nodes=[...document.querySelectorAll(".app > .tabs:not(.utilities-tabs) .tab-label-sub,.app > .tabs:not(.utilities-tabs) .tab-label-single")];

    nodes.forEach(node=>{
      node.style.removeProperty("font-size");
      const available=node.clientWidth;
      if(!available)return;

      let size=parseFloat(getComputedStyle(node).fontSize)||11.5;
      const isCalculator=!!node.closest('.tab[data-tab="calculator"]');
      const minSize=isCalculator?10.4:10.8;

      node.style.setProperty("font-size",`${size}px`,"important");

      let guard=0;
      while(node.scrollWidth>node.clientWidth+0.5&&size>minSize&&guard<20){
        size=Math.max(minSize,size-0.15);
        node.style.setProperty("font-size",`${size}px`,"important");
        guard++;
      }
    });
  }

  function scheduleTopTabFit(){
    requestAnimationFrame(()=>{
      requestAnimationFrame(fitTopTabLabels);
    });
    setTimeout(fitTopTabLabels,120);
  }

  function isAdminUser(user=authUser){return user?.role==="admin";}
  function roleLabel(user){
    if(user?.is_owner)return "Головний адміністратор";
    return user?.role==="admin"?"Адміністратор":"Учасник";
  }

  // A separate, device-local navigation preference; never put UI state in D1 or backups.
  const LAST_PAGE_ALLOWED=new Set(["blocks","calculator","archive","console","profile","admin","about","utilities","utilities-training","utilities-console"]);
  const lastPageStorageKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_last_page_v197`:null;
  function restoreLastPage(){
    try{
      const saved=localStorage.getItem(lastPageStorageKey());
      return LAST_PAGE_ALLOWED.has(saved)&&(saved!=="admin"||isAdminUser())?saved:"blocks";
    }catch(_){return "blocks";}
  }
  function rememberLastPage(target){
    const key=lastPageStorageKey();
    if(!key||!LAST_PAGE_ALLOWED.has(target))return;
    try{localStorage.setItem(key,target);}catch(error){console.warn("Не вдалося зберегти останню вкладку",error);}
  }
  function activateAppPage(target,{label="",save=true,remember=true}={}){
    if(target==="admin"&&!isAdminUser())return;
    // «Консоль» у «Зручностях» — окреме представлення тієї самої
    // функціональної сторінки та журналу. Жодних дублікатів DOM/БД.
    const wasUtilities=!!mainApp?.classList.contains("utilities-mode");
    const wasToolsActive=!!$("utilities")?.classList.contains("active");
    const isUtilityConsole=target==="utilities-console";
    const isUtilityTraining=target==="utilities-training";
    // The administrator page is a global page, not a request to switch
    // navigation groups. Keep the second navigation visible when entered
    // from Utilities/Training/Console; the first navigation remains unchanged
    // when entered from the main group.
    const isAdminOnUtilities=target==="admin"&&wasUtilities;
    const isAboutOnUtilities=target==="about"&&wasUtilities;
    const isUtilities=target==="utilities"||isUtilityConsole||isUtilityTraining||isAdminOnUtilities||isAboutOnUtilities;
    const pageId=isUtilityConsole?"console":(isUtilityTraining?"training":target);
    // При зміні сторінки збережені розрахунки не очищаються; тільки
    // генератор паролів мусить забувати ВСІ дані при виході з «Зручностей»,
    // навіть якщо наступна вкладка — «Тренування» чи «Консоль» на сторінці 2.
    if(wasToolsActive&&pageId!=="utilities")window.dispatchEvent(new Event("utilities:reset"));
    mainApp?.classList.toggle("utilities-mode",isUtilities);
    mainApp?.classList.toggle("utilities-console-view",isUtilityConsole);
    mainApp?.classList.toggle("about-view",pageId==="about");
    // Preserve the exact tab-strip selection when the administrator opens
    // their panel; the header must not jump or change selected utility tab.
    utilitiesTools?.classList.toggle("active",isUtilities&&!isUtilityConsole&&!isUtilityTraining&&pageId!=="admin"&&pageId!=="about");
    utilitiesTools?.setAttribute("aria-pressed",String(isUtilities&&!isUtilityConsole&&!isUtilityTraining&&pageId!=="admin"&&pageId!=="about"));
    utilitiesTraining?.classList.toggle("active",isUtilityTraining&&pageId!=="admin"&&pageId!=="about");
    utilitiesTraining?.setAttribute("aria-pressed",String(isUtilityTraining&&pageId!=="admin"&&pageId!=="about"));
    utilitiesConsole?.classList.toggle("active",isUtilityConsole&&pageId!=="admin"&&pageId!=="about");
    utilitiesConsole?.setAttribute("aria-pressed",String(isUtilityConsole&&pageId!=="admin"&&pageId!=="about"));
    tabs.forEach(tab=>tab.classList.remove("active"));
    pages.forEach(page=>page.classList.remove("active"));
    if(!isUtilities)document.querySelector(`.tab[data-tab="${pageId}"]`)?.classList.add("active");
    $(pageId)?.classList.add("active");
    // Quick-scroll markers are available in Profile too, and will switch
    // to a dialog's scrolling surface when a long modal is opened.
    scheduleQuickScrollSync();
    // Navigation state, not transient :hover/:active: show persistent underline
    // only while the administrator is actually viewing the admin page.
    const adminPageSelected=pageId==="admin"&&isAdminUser();
    const avBrand=document.getElementById("av-brand-open");
    avBrand?.classList.toggle("brand-selected",pageId==="about");
    if(pageId==="about")avBrand?.setAttribute("aria-current","page");
    else avBrand?.removeAttribute("aria-current");
    profileDisplayName?.classList.toggle("admin-selected",adminPageSelected);
    if(adminPageSelected)profileDisplayName?.setAttribute("aria-current","page");
    else profileDisplayName?.removeAttribute("aria-current");
    if(isUtilities&&!wasUtilities)window.dispatchEvent(new Event("utilities:open"));
    if(save&&!isUtilities)safeStorageSet(ACTIVE_TAB_KEY,pageId);
    if(remember)rememberLastPage(target);
    if(label&&((!isUtilities&&!wasUtilities)||pageId==="about"))logAction(`Відкрито вкладку «${label}».`);
    if(pageId==="archive"){renderArchive();requestAnimationFrame(()=>renderStatistics());}
    if(pageId==="calculator"){renderCalculatorLog();updateTotals();}
    if(pageId==="console"){renderConsole();renderSystemStatus();void renderAviculariaSessions(false);}
    if(target==="profile"){renderProfile();restoreProfileDraft();}
    if(target==="admin"&&isAdminUser()){loadAdminUsers(false);void renderAviculariaSessions(true);}
  }

  async function showAuthenticatedApp(user,{offline=false}={}){
    authUser=user;applyUserStorageNamespace(user.id);
    // The owner keeps the pre-v187 vertical layout; other accounts retain v187 responsive spacing.
    document.body.classList.toggle("av-owner-layout",Boolean(user?.is_owner));
    try{
      const result=await window.KBJVStorage.prepare(user.id);
      if(!result.available)console.warn("IndexedDB недоступна; використовується попереднє локальне сховище:",result.reason||"");
      await migrateLegacyDataToAdmin(user);
      await window.KBJVStorage.whenIdle();
    }catch(error){
      console.error("Захист даних: запуск зупинено",error);
      if(authScreen)authScreen.hidden=false;
      if(mainApp)mainApp.hidden=true;
      setAuthMessage("Не вдалося безпечно перенести локальні дані. Не очищуйте сховище та збережіть попередню резервну копію. "+String(error?.message||""),"error");
      return;
    }
    // User-scoped, device-only utility preferences: excluded from D1 and JSON backup.
    window.dispatchEvent(new CustomEvent("utilities:user",{detail:{id:String(user.id)}}));
    // Окремий IndexedDB-модуль планів; не є частиною КБЖВ-даних.
    window.dispatchEvent(new CustomEvent("training:user",{detail:{id:String(user.id)}}));
    if(adminCurrentUsername)adminCurrentUsername.textContent=user.username||"—";
    if(adminOwnerNote)adminOwnerNote.hidden=!user.is_owner;
    loadProfile();
    
    document.body.classList.remove("auth-active");
    if(authScreen)authScreen.hidden=true;if(mainApp)mainApp.hidden=false;
    scheduleTopTabFit();
    if(!appInitialized)initializeAuthenticatedApp();
    else activateAppPage(restoreLastPage(),{save:false,remember:false});
    if(isAdminUser(user)&&!offline)loadAdminUsers(false);
    scheduleAdminStateSync(250);
    recordSiteVisit();
    setTimeout(()=>ensureMissingArchiveDays(),5000);
    scheduleMissingMidnightCheck();
    if(!offline)setTimeout(()=>void flushAuditQueue(),0);
  }

  async function completeAuthentication(session,remembered){
    authToken=session.token;authUser=session.user;authRemembered=!!remembered;persistAuthSession(session,authRemembered);showAuthenticatedApp(session.user);
  }

  async function bootstrapAuthentication(){
    document.body.classList.add("auth-active");
    switchAuthMode("login");
    const saved=getStoredAuthSession();
    if(!saved){authScreen.hidden=false;mainApp.hidden=true;return;}
    authToken=saved.token;authUser=saved.user;authRemembered=!!saved.remembered;setAuthMessage("Перевірка сесії...","info");
    try{const data=await authApi("/auth/me");authUser=data.user;updateStoredAuthUser(data.user);setAuthMessage("");showAuthenticatedApp(data.user);}
    catch(error){
      if(error?.status===0&&saved.user){setAuthMessage("");showAuthenticatedApp(saved.user,{offline:true});return;}
      clearAuthSession();authScreen.hidden=false;mainApp.hidden=true;setAuthMessage(error?.message||"Увійдіть знову.","error");
    }
  }

  async function performLogout(){
    // Preserve committed local data even when the network is unavailable.
    // Never clear the account session before pending IndexedDB writes settle.
    try{await window.KBJVStorage.whenIdle();}catch(error){
      showButtonState(logoutAccount,"Не збережено","error");
      alert("Не вдалося завершити локальне збереження. Вихід скасовано — перевірте сховище браузера.");
      return false;
    }
    const token=authToken;clearAuthSession();if(token){try{await authApi("/auth/logout",{method:"POST",token});}catch(_){}}location.reload();
    return true;
  }

  // A remotely revoked device signs out on its next authenticated request.
  // This lightweight periodic check limits the delay while another tab is idle.
  let sessionCheckRunning=false,sessionCheckTime=0;
  async function validateCurrentSession(){
    if(!authToken||!navigator.onLine||document.visibilityState!=="visible"||sessionCheckRunning)return;
    if(Date.now()-sessionCheckTime<20000)return;
    sessionCheckTime=Date.now();sessionCheckRunning=true;
    const currentToken=authToken;
    try{await authApi("/auth/me");}
    catch(error){
      if(error?.status===401 && authToken===currentToken){
        clearAuthSession();
        location.reload();
      }
    }finally{sessionCheckRunning=false;}
  }
  setInterval(()=>void validateCurrentSession(),45000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void validateCurrentSession();});

  const ADMIN_AUDIT_LABELS={
    account_created:"Реєстрація",
    login:"Вхід через логін і пароль",
    visit:"Відвідування сайту",
    logout:"Вихід",
    account_deleted:"Видалення акаунта",
    role_changed:"Зміна ролі",
    site_action:"Серверна / історична дія",
    client_action:"Дія (зі слів браузера)"
  };

  const ADMIN_AUDIT_DESCRIPTIONS={
    account_created:"Створення нового акаунта користувача.",
    login:"Успішна авторизація з введенням логіна та пароля.",
    visit:"Фактичне відкриття або повернення на сайт із чинною сесією без обов’язкового повторного введення пароля.",
    logout:"Вихід користувача зі свого акаунта.",
    account_deleted:"Самостійне видалення користувачем свого акаунта.",
    role_changed:"Надання або зняття прав адміністратора головним адміністратором.",
    site_action:"Дія, записана сервером або перенесена зі старого журналу. Старі записи могли надходити від браузера.",
    client_action:"Повідомлення браузера про дію. Сам факт виконання не підтверджений сервером."
  };

  let adminUsersCache=[];
  let adminRecoveryCache=[];
  let adminFullStateSnapshot=null;

  function isVisibleAdminAuditEvent(event){
    const type=String(event?.event_type||"");
    if(["account_created","login","logout","account_deleted","role_changed"].includes(type))return true;
    return ["site_action","client_action"].includes(type)&&isClearSiteAuditMessage(event?.message);
  }

  function latestCriticalAction(user){
    const candidates=[
      [user?.last_logout_at,"Вихід"],
      [user?.last_clear_at,"Заявлене очищення сайту"]
    ].filter(([time])=>time&&Number.isFinite(Date.parse(time)));
    if(!candidates.length)return {label:"—",time:null};
    candidates.sort((a,b)=>Date.parse(b[0])-Date.parse(a[0]));
    return {label:candidates[0][1],time:candidates[0][0]};
  }

  async function fetchAllAdminCoreAudit(){
    let beforeId=null;
    const seenCursors=new Set();
    const events=[];
    while(true){
      const params=new URLSearchParams({scope:"core",limit:"1000"});
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/audit?${params.toString()}`);
      if(Array.isArray(data.events))events.push(...data.events);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {events,truncated:false};
  }

  // Older Worker strings were accidentally decoded as Windows-1251 instead of UTF-8.
  // Repair on display (including historic D1 rows), without modifying the original metadata.
  const avCp1251ByteMap=(()=>{
    try{
      const decoder=new TextDecoder("windows-1251");
      const result=new Map();
      for(let i=0;i<256;i++)result.set(decoder.decode(Uint8Array.of(i)),i);
      return result;
    }catch(_){return null;}
  })();
  // Log messages are short action labels, not sentences in a document.
  // Clean both newly recorded actions and historical rows on display; retain
  // the original stored message as-is for backwards compatibility.
  function normalizeAuditSentence(value){
    return String(value??"").trim().replace(/[\s.。．]+$/gu, "").trim();
  }
  function readableAuditText(value){
    let result=String(value??"");
    if(!avCp1251ByteMap||!/[РС][А-яЁёІіЇїЄєЃѓЂђЌќ]/u.test(result))return normalizeAuditSentence(result);
    for(let attempt=0;attempt<3;attempt++){
      const bytes=[];let convertible=true;
      for(const char of result){
        const byte=avCp1251ByteMap.get(char);
        if(byte===undefined){convertible=false;break;}
        bytes.push(byte);
      }
      if(!convertible)break;
      let decoded;
      try{decoded=new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(bytes));}
      catch(_){break;}
      if(!decoded||decoded===result)break;
      const oldBroken=(result.match(/(?:Р.|С.)/gu)||[]).length;
      const newBroken=(decoded.match(/(?:Р.|С.)/gu)||[]).length;
      if(newBroken>=oldBroken&&attempt>0)break;
      result=decoded;
    }
    return normalizeAuditSentence(result);
  }

  async function loadAdminAudit(){
    if(!isAdminUser()||!adminAuditList)return;
    if(adminAuditStatus)adminAuditStatus.textContent="Завантаження історії активності";
    const data=await fetchAllAdminCoreAudit();
    const rawEvents=Array.isArray(data.events)?data.events:[];
    const events=rawEvents.filter(event=>activityIsFresh(event.created_at)&&isVisibleAdminAuditEvent(event));
    adminAuditList.innerHTML="";
    if(adminAuditCount)adminAuditCount.textContent=String(events.length);
    if(adminAuditStatus)adminAuditStatus.textContent=events.length?"Показано всі основні події акаунтів.":"Історія активності порожня.";
    if(!events.length)return;

    events.forEach(event=>{
      const row=document.createElement("div");
      row.className=`admin-audit-row ${event.event_type==="account_deleted"?"deleted":""}`;
      const who=document.createElement("div");who.className="admin-audit-who";
      const whoStrong=document.createElement("strong");whoStrong.textContent=event.username||"—";
      const whoMeta=document.createElement("span");whoMeta.textContent=`ID: ${String(event.user_id??"—")}`;who.append(whoStrong,whoMeta);
      const badge=document.createElement("span");badge.className=`admin-audit-badge ${event.event_type==="account_deleted"?"deleted":""}`;badge.textContent=ADMIN_AUDIT_LABELS[event.event_type]||"Подія";
      const time=document.createElement("div");time.className="admin-audit-time";time.textContent=formatAdminDate(event.created_at);
      const message=document.createElement("div");message.className="admin-audit-message";message.textContent=readableAuditText(event.message)||"—";
      row.append(who,badge,time,message);adminAuditList.append(row);
    });
  }

  function makeAdminInfoCell(title,value,wide=false){
    const cell=document.createElement("div");cell.className=`admin-user-cell${wide?" admin-wide":""}`;
    const strong=document.createElement("strong");strong.textContent=title;cell.append(strong,document.createTextNode(value||"—"));return cell;
  }

  async function changeAdminRole(user,nextRole,button){
    if(!authUser?.is_owner)return;
    const nextLabel=nextRole==="admin"?"адміністратора":"учасника";
    if(!confirm(`Змінити роль «${user.username}» на ${nextLabel}?`)){
      showButtonState(button,"Скасовано","error");return;
    }
    button.disabled=true;
    try{
      await authApi(`/admin/users/${encodeURIComponent(user.id)}/role`,{method:"PATCH",body:{role:nextRole}});
      showButtonState(button,nextRole==="admin"?"Права надано":"Права знято","success",1000);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;showButtonState(button,"Помилка","error");alert(error?.message||"Не вдалося змінити роль.");
    }
  }

  // v91/8321: masked confirmation code for deleting another user account.
  function requestOwnerDeleteCode(username){
    return new Promise(resolve=>{
      const modal=$("owner-password-modal"),input=$("owner-password-input");
      const confirmButton=$("owner-password-confirm"),cancelButton=$("owner-password-cancel");
      const target=$("owner-password-target");
      if(!modal||!input||!confirmButton||!cancelButton){resolve(null);return;}
      if(target)target.textContent=`Видалення акаунта «${username}»`;
      input.value="";
      let completed=false;
      const close=value=>{
        if(completed)return;
        completed=true;
        modal.classList.remove("active");
        if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
        confirmButton.removeEventListener("click",handleConfirm);
        cancelButton.removeEventListener("click",handleCancel);
        modal.removeEventListener("click",handleBackdrop);
        input.removeEventListener("keydown",handleKey);
        document.removeEventListener("keydown",handleEscape,true);
        input.value="";
        resolve(value);
      };
      const handleConfirm=()=>close(input.value||null);
      const handleCancel=()=>close(null);
      const handleBackdrop=event=>{if(event.target===modal)handleCancel();};
      const handleKey=event=>{if(event.key==="Enter"){event.preventDefault();handleConfirm();}};
      const handleEscape=event=>{if(event.key==="Escape"&&modal.classList.contains("active")){event.preventDefault();event.stopImmediatePropagation();handleCancel();}};
      confirmButton.addEventListener("click",handleConfirm);
      cancelButton.addEventListener("click",handleCancel);
      modal.addEventListener("click",handleBackdrop);
      input.addEventListener("keydown",handleKey);
      document.addEventListener("keydown",handleEscape,true);
      modal.classList.add("active");document.body.classList.add("edit-modal-open");
      setTimeout(()=>input.focus(),60);
    });
  }

  async function deleteAdminUser(user,button){
    if(!authUser?.is_owner||!user||user.is_owner)return;
    const username=String(user.username||`ID ${String(user.id)}`);
    if(!confirm(`Видалити акаунт «${username}»? Цю дію не можна скасувати.`)){
      showButtonState(button,"Скасовано","error");return;
    }
    const confirmationCode=await requestOwnerDeleteCode(username);
    if(!confirmationCode){showButtonState(button,"Скасовано","error",900);return;}
    button.disabled=true;
    try{
      await authApi(`/admin/users/${encodeURIComponent(user.id)}`,{method:"DELETE",body:{confirmation_code:confirmationCode}});
      showButtonState(button,"Видалено","success",900);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;
      showButtonState(button,error?.status===403?"Неправильний код":"Помилка","error",1200);
      alert(error?.message||"Не вдалося видалити акаунт.");
    }
  }

  function closeAdminTempPassword(){
    adminTempPasswordModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    if(adminTempPasswordValue)adminTempPasswordValue.textContent="—";
    if(adminTempPasswordUser)adminTempPasswordUser.textContent="—";
  }

  function showAdminTempPassword(username,password){
    if(!adminTempPasswordModal||!adminTempPasswordValue)return;
    if(adminTempPasswordUser)adminTempPasswordUser.textContent=`Акаунт: ${username||"—"}`;
    adminTempPasswordValue.textContent=String(password||"—");
    adminTempPasswordModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }

  async function resolveRecoveryRequest(request,button){
    if(!authUser?.is_owner||!request)return;
    const username=String(request.username||"Користувач");
    if(!confirm(`Створити новий пароль для «${username}»? Усі активні сесії цього акаунта буде завершено.`)){
      showButtonState(button,"Скасовано","error");return;
    }
    button.disabled=true;
    try{
      const data=await authApi(`/admin/recovery-requests/${encodeURIComponent(request.id)}/reset`,{method:"POST",body:{}});
      showButtonState(button,"Створено","success",1000);
      showAdminTempPassword(username,data?.new_password||data?.temporary_password||"");
      await loadAdminRecoveryRequests(false);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;
      showButtonState(button,"Помилка","error",1200);
      alert(error?.message||"Не вдалося створити новий пароль.");
    }
  }

  const ADMIN_RECOVERY_VISIBLE_ROWS=3;
  function fitAdminRecoveryViewport(){
    if(!adminRecoveryList)return;
    const rows=Array.from(adminRecoveryList.children).filter(row=>row.classList.contains("admin-recovery-row"));
    if(rows.length<=ADMIN_RECOVERY_VISIBLE_ROWS){
      adminRecoveryList.style.maxHeight="";
      adminRecoveryList.style.overflowY="";
      return;
    }
    const first=rows[0].getBoundingClientRect();
    const last=rows[ADMIN_RECOVERY_VISIBLE_ROWS-1].getBoundingClientRect();
    // Hidden admin pages cannot be measured. ResizeObserver refits when the rows become visible.
    if(!first.width||!first.height||!last.height)return;
    const style=getComputedStyle(adminRecoveryList);
    const padding=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
    const height=last.bottom-first.top+padding;
    adminRecoveryList.style.maxHeight=`${height}px`;
    adminRecoveryList.style.overflowY="auto";
  }
  const adminRecoveryResizeObserver=typeof ResizeObserver==="function"
    ?new ResizeObserver(()=>requestAnimationFrame(fitAdminRecoveryViewport)):null;

  async function rejectRecoveryRequest(request,button){
    if(!authUser?.is_owner||!request)return;
    const username=String(request.username||"Користувач");
    if(!confirm(`Відмовити у відновленні доступу для «${username}»? Запит буде закрито, а пароль користувача не зміниться.`)){
      showButtonState(button,"Скасовано","error");return;
    }
    button.disabled=true;
    try{
      await authApi(`/admin/recovery-requests/${encodeURIComponent(request.id)}/reject`,{method:"POST",body:{}});
      await loadAdminRecoveryRequests(false);
    }catch(error){
      button.disabled=false;
      alert(error?.message||"Не вдалося відмовити у відновленні доступу.");
    }
  }

  async function loadAdminRecoveryRequests(showFeedback=false){
    if(!adminRecoveryList)return;
    if(!authUser?.is_owner){
      adminRecoveryCache=[];
      adminRecoveryResizeObserver?.disconnect();
      adminRecoveryList.innerHTML="";
      adminRecoveryList.style.maxHeight="";
      adminRecoveryList.style.overflowY="";
      if(adminRecoveryCount)adminRecoveryCount.textContent="0";
      if(adminRecoveryStatus){
        adminRecoveryStatus.textContent="Змінювати паролі користувачів може лише головний адміністратор";
        adminRecoveryStatus.classList.add("admin-recovery-restricted");
      }
      return;
    }
    if(adminRecoveryStatus){
      adminRecoveryStatus.classList.remove("admin-recovery-restricted");
      adminRecoveryStatus.textContent="Завантаження запитів";
    }
    try{
      const data=await authApi("/admin/recovery-requests?limit=350");
      const requests=Array.isArray(data.requests)?data.requests:[];
      const totalCount=Number.isFinite(Number(data?.total_count))?Number(data.total_count):requests.length;
      adminRecoveryCache=requests.map(item=>({...item}));
      adminRecoveryList.innerHTML="";
      if(adminRecoveryCount)adminRecoveryCount.textContent=String(totalCount);
      if(adminRecoveryStatus){
        if(!requests.length)adminRecoveryStatus.textContent="Запитів на відновлення немає";
        else if(totalCount>requests.length)adminRecoveryStatus.textContent=`Показано останні ${requests.length} із ${totalCount} запитів.`;
        else adminRecoveryStatus.textContent="Останні запити на відновлення доступу";
      }
      requests.forEach(item=>{
        const recoveryStatus=item.status==="pending"?"pending":item.status==="rejected"?"rejected":"resolved";
        const row=document.createElement("div");row.className=`admin-recovery-row ${recoveryStatus}`;
        const who=document.createElement("div");who.className="admin-recovery-who";
        const strong=document.createElement("strong");strong.textContent=item.username||"—";
        const meta=document.createElement("span");meta.textContent=`ID: ${String(item.user_id??"—")} · ${formatAdminDate(item.created_at)}`;
        who.append(strong,meta);
        const status=document.createElement("span");status.className=`admin-recovery-badge ${recoveryStatus}`;status.textContent=recoveryStatus==="pending"?"Очікує":recoveryStatus==="rejected"?"Відмовлено":"Пароль створено";
        const actions=document.createElement("div");actions.className="admin-recovery-actions";
        if(recoveryStatus==="pending"){
          if(Number(item.user_id)!==Number(authUser?.id)){
            const reset=document.createElement("button");reset.type="button";reset.textContent="Створити новий пароль";reset.className="admin-recovery-reset";reset.addEventListener("click",()=>resolveRecoveryRequest(item,reset));actions.append(reset);
          }else{
            const warning=document.createElement("span");warning.textContent="Для власного акаунта створення пароля тут заблоковано задля безпеки";actions.append(warning);
          }
          const reject=document.createElement("button");reject.type="button";reject.textContent="Відмовитись";reject.className="admin-recovery-reject";reject.addEventListener("click",()=>rejectRecoveryRequest(item,reject));actions.append(reject);
        }else{
          const note=document.createElement("span");
          if(recoveryStatus==="rejected")note.textContent=item.resolved_at?`Відмовлено: ${formatAdminDate(item.resolved_at)}`:"Відмовлено";
          else note.textContent=item.resolved_at?`Вирішено: ${formatAdminDate(item.resolved_at)}`:"Вирішено";
          actions.append(note);
        }
        row.append(who,status,actions);adminRecoveryList.append(row);
      });
      adminRecoveryResizeObserver?.disconnect();
      Array.from(adminRecoveryList.children).slice(0,ADMIN_RECOVERY_VISIBLE_ROWS).forEach(row=>adminRecoveryResizeObserver?.observe(row));
      requestAnimationFrame(fitAdminRecoveryViewport);
    }catch(error){
      if(adminRecoveryStatus)adminRecoveryStatus.textContent=error?.message||"Не вдалося завантажити запити на відновлення.";
    }
  }

  window.addEventListener("resize",()=>requestAnimationFrame(fitAdminRecoveryViewport));

  function makeAdminBackupFromSnapshot(user,meta,activity,logins){
    const snapshot=activity?.state_snapshot&&typeof activity.state_snapshot==="object"?activity.state_snapshot:{};
    const settings=snapshot.settings&&typeof snapshot.settings==="object"?snapshot.settings:{};
    return {
      backup_format:"kbjv-full-backup-v3",schema_version:3,version:1,
      exported_at:new Date().toISOString(),export_scope:"all",
      products:Array.isArray(snapshot.products)?snapshot.products:[],
      blocks_settings:{
        sort_mode:settings.sort_mode??"initial",random_sort_seed:settings.random_sort_seed??null,
        departments_enabled:settings.departments_enabled!==false,
        category_order:Array.isArray(settings.category_order)?settings.category_order:[],
        custom_categories:Array.isArray(settings.custom_categories)?settings.custom_categories:[],
        deleted_default_categories:Array.isArray(settings.deleted_default_categories)?settings.deleted_default_categories:[],
        database_updated_at:settings.database_updated_at??null
      },
      archive:Array.isArray(snapshot.archive)?snapshot.archive:[],
      archive_note:typeof settings.archive_note==="string"?settings.archive_note:"",
      calculator:Array.isArray(snapshot.calculator)?snapshot.calculator:[],
      calculator_draft:String(snapshot.calculator_draft||""),
      daily_goal:snapshot.daily_goal&&typeof snapshot.daily_goal==="object"?snapshot.daily_goal:{},
      profile:snapshot.profile&&typeof snapshot.profile==="object"?snapshot.profile:{},
      calculator_quick_presets:Array.isArray(snapshot.calculator_quick_presets)?snapshot.calculator_quick_presets:[]
    };
  }

  async function exportAdminUserData(user,button){
    if(!authUser?.is_owner||!user)return;
    button.disabled=true;
    showButtonState(button,"Збирання...","info",0);
    try{
      const [meta,activity,logins]=await Promise.all([
        authApi(`/admin/users/${encodeURIComponent(user.id)}/export-meta`),
        fetchAllAdminUserActivity(user.id),
        fetchAllAdminUserLogins(user.id)
      ]);
      // Never describe an unsynchronized/absent server state as a complete backup.
      // Local-only console entries and unsynchronized changes cannot be exported by D1.
      if(!activity?.state_snapshot||typeof activity.state_snapshot!=="object"||Array.isArray(activity.state_snapshot)){
        throw new Error("Серверної копії цього акаунта ще немає. Користувач має відкрити сайт із мережею та завершити синхронізацію перед експортом.");
      }
      const data=makeAdminBackupFromSnapshot(user,meta,activity,logins);
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const safeName=String(user.username||`user-${user.id}`).replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/^-+|-+$/g,"")||`user-${user.id}`;
      a.href=url;a.download=`kbjv-${safeName}-server-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();
      // Safari may cancel a download when its Blob URL is revoked immediately.
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      showButtonState(button,"Експортовано","success",1200);
    }catch(error){
      showButtonState(button,"Помилка","error",1200);
      alert(error?.message||"Не вдалося експортувати дані користувача.");
    }finally{button.disabled=false;}
  }

  async function loadAdminUsers(showFeedback=true){
    if(!isAdminUser()||!adminUsersList)return;
    if(showFeedback)showButtonState(adminRefresh,"Оновлення...","info",0);
    if(adminStatus)adminStatus.textContent="Завантаження користувачів";
    try{
      const data=await authApi("/admin/users"),users=Array.isArray(data.users)?data.users:[];
      adminAvatarCache.clear(); // A new upload should not be hidden by an older cached photo.
      adminUsersCache=users.map(user=>({...user}));
      if(data.requested_by){authUser={...authUser,...data.requested_by};updateStoredAuthUser(authUser);}
      if(adminOwnerNote)adminOwnerNote.hidden=!authUser?.is_owner;
      adminUsersList.innerHTML="";
      if(adminUsersCount)adminUsersCount.textContent=String(users.length);
      if(adminAdminsCount)adminAdminsCount.textContent=String(users.filter(user=>user.role==="admin").length);
      if(adminMembersCount)adminMembersCount.textContent=String(users.filter(user=>user.role!=="admin").length);
      if(adminStatus)adminStatus.textContent=users.length?"Дані актуальні.":"Користувачів поки немає.";

      users.forEach(user=>{
        const row=document.createElement("div");row.className="admin-user-row admin-user-row-v60";
        const login=document.createElement("div");login.className="admin-user-cell";
        const loginStrong=document.createElement("strong");loginStrong.textContent=user.username||"—";
        const loginId=document.createElement("span");loginId.textContent=`ID: ${String(user.id)}`;login.append(loginStrong,loginId);

        const role=document.createElement("div");role.className="admin-user-cell";
        const badge=document.createElement("span");badge.className=`admin-role ${user.role==="admin"?"admin":""} ${user.is_owner?"owner":""}`;badge.textContent=roleLabel(user);role.append(badge);

        const created=makeAdminInfoCell("Реєстрація",formatAdminDate(user.created_at),true);
        const seen=makeAdminInfoCell("Останнє відвідування",formatAdminDate(user.last_seen_at),true);
        const lastLogin=makeAdminInfoCell("Останній вхід через пароль",formatAdminDate(user.last_login_at),true);
        const critical=latestCriticalAction(user);
        const red=makeAdminInfoCell("Остання червона дія",critical.time?`${critical.label} · ${formatAdminDate(critical.time)}`:"—",true);
        const count=makeAdminInfoCell("Входів через пароль",String(user.login_count??0));

        const actions=document.createElement("div");actions.className="admin-user-actions";
        const history=document.createElement("button");history.type="button";history.className="admin-history-button";history.textContent="Входи";history.addEventListener("click",()=>openAdminLoginHistory(user));
        const full=document.createElement("button");full.type="button";full.className="admin-history-button admin-full-button";full.textContent="Повна інформація";full.addEventListener("click",()=>openAdminFullInfo(user));
        actions.append(history,full);

        if(authUser?.is_owner){
          const exportUserButton=document.createElement("button");exportUserButton.type="button";exportUserButton.className="admin-export-user-button";exportUserButton.textContent="Експорт серверних даних";
          exportUserButton.addEventListener("click",()=>exportAdminUserData(user,exportUserButton));
          actions.append(exportUserButton);
        }

        if(authUser?.is_owner&&!user.is_owner){
          const roleButton=document.createElement("button");roleButton.type="button";roleButton.className=`admin-role-button ${user.role==="admin"?"demote":"promote"}`;
          roleButton.textContent=user.role==="admin"?"Зняти права адміністратора":"Надати права адміністратора";
          roleButton.addEventListener("click",()=>changeAdminRole(user,user.role==="admin"?"member":"admin",roleButton));
          const deleteButton=document.createElement("button");deleteButton.type="button";deleteButton.className="admin-delete-user-button";deleteButton.textContent="Видалити акаунт";
          deleteButton.addEventListener("click",()=>deleteAdminUser(user,deleteButton));
          actions.append(roleButton,deleteButton);
        }

        const sessionCard=document.createElement("section");sessionCard.className="av-admin-user-sessions";
        sessionCard.dataset.userId=String(user.id);
        const sessionTitle=document.createElement("h3");sessionTitle.textContent="Активні сеанси:";
        const sessionList=document.createElement("div");sessionList.className="av-session-list av-admin-user-session-list";
        sessionList.textContent="Завантаження сеансів";
        sessionCard.append(sessionTitle,sessionList);
        row.append(login,role,created,seen,lastLogin,red,count,actions,sessionCard);adminUsersList.append(row);
      });

      try{
        await Promise.all([loadAdminRecoveryRequests(false),loadAdminAudit(),renderAviculariaSessions(true)]);
        if(showFeedback)showButtonState(adminRefresh,"Оновлено","success");
      }catch(auditError){
        if(adminAuditStatus)adminAuditStatus.textContent=auditError?.message||"Не вдалося завантажити історію активності.";
        if(showFeedback)showButtonState(adminRefresh,"Частково","error");
      }
    }catch(error){if(adminStatus)adminStatus.textContent=error?.message||"Не вдалося завантажити панель адміністратора.";if(showFeedback)showButtonState(adminRefresh,"Помилка","error");}
  }

  function makeAdminAvatarNode(user){
    const box=document.createElement("span");box.className="admin-simple-avatar";
    const initials=document.createElement("span");initials.textContent=String(user?.username||"?").slice(0,2).toUpperCase();
    const img=document.createElement("img");img.alt=`Фото профілю ${String(user?.username||"")}`;img.hidden=true;
    box.append(img,initials);
    if(!isAdminUser())return box;
    const id=String(user.id);
    if(id===String(authUser?.id)&&typeof profileData?.avatar==="string"&&profileData.avatar.startsWith("data:image/")){
      img.src=profileData.avatar;img.hidden=false;initials.hidden=true;
    }
    if(adminAvatarCache.has(id)){
      const avatar=adminAvatarCache.get(id);
      if(avatar){img.src=avatar;img.hidden=false;initials.hidden=true;}
      return box;
    }
    box.dataset.userId=id;
    return box;
  }
  let adminAvatarLoading=false;
  async function loadAdminAvatarsForModal(){
    if(!isAdminUser()||adminAvatarLoading||!adminUsersModal?.classList.contains("active"))return;
    const boxes=[...adminUsersModalList.querySelectorAll(".admin-simple-avatar[data-user-id]")].slice(0,100);
    if(!boxes.length)return;
    adminAvatarLoading=true;
    try{
      // Maximum three parallel requests: avoids downloading dozens of large D1 snapshots simultaneously.
      for(let i=0;i<boxes.length;i+=3){
        if(!adminUsersModal.classList.contains("active"))break;
        await Promise.all(boxes.slice(i,i+3).map(async box=>{
          const id=box.dataset.userId;
          if(!/^\d+$/.test(id))return;
          try{
            const response=await authApi(`/admin/users/${id}/avatar`);
            const avatar=typeof response.avatar==="string"&&/^data:image\/(?:jpeg|png|webp);base64,/.test(response.avatar)?response.avatar:"";
            adminAvatarCache.set(id,avatar);
            if(avatar&&box.isConnected){const img=box.querySelector("img");img.src=avatar;img.hidden=false;box.querySelector("span").hidden=true;}
          }catch(_){/* Offline or no synced photo: keep initials; do not cache a permanent failure. */}
        }));
      }
    }finally{adminAvatarLoading=false;}
  }
  function renderAdminSimpleUsersList(users=adminUsersCache){
    if(!adminUsersModalList)return;
    const list=Array.isArray(users)?users:[];
    adminUsersModalList.innerHTML="";
    if(adminUsersModalStatus)adminUsersModalStatus.textContent=list.length?`Користувачів: ${list.length}`:"Користувачів поки немає.";
    if(!list.length){
      const empty=document.createElement("div");empty.className="admin-login-entry";empty.textContent="Список користувачів порожній";adminUsersModalList.append(empty);return;
    }
    [...list].sort((a,b)=>Number(a.id)-Number(b.id)).forEach(user=>{
      const row=document.createElement("div");row.className="admin-simple-user-row";
      const name=document.createElement("div");name.className="admin-simple-user-name";name.textContent=user.username||"—";
      const id=document.createElement("div");id.className="admin-simple-user-id";id.textContent=`ID: ${String(user.id??"—")}`;
      const role=document.createElement("span");role.className=`admin-role ${user.role==="admin"?"admin":""} ${user.is_owner?"owner":""}`;role.textContent=roleLabel(user);
      row.append(makeAdminAvatarNode(user),name,id,role);adminUsersModalList.append(row);
    });
    void loadAdminAvatarsForModal();
  }

  async function openAdminUsersModal(){
    if(!adminUsersModal)return;
    adminAvatarCache.clear(); // Revalidate each user's latest synchronized image on every opening.
    adminUsersModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    renderAdminSimpleUsersList();
    if(adminUsersCache.length)return;
    if(adminUsersModalStatus)adminUsersModalStatus.textContent="Завантаження користувачів";
    try{
      const data=await authApi("/admin/users");
      adminUsersCache=Array.isArray(data.users)?data.users.map(user=>({...user})):[];
      renderAdminSimpleUsersList();
    }catch(error){
      if(adminUsersModalStatus)adminUsersModalStatus.textContent=error?.message||"Не вдалося завантажити список користувачів.";
    }
  }

  function closeAdminUsersModal(){adminUsersModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}

  function appendAdminVisitSection(title,note,items,timeKey,emptyText){
    if(!adminLoginsList)return;
    const section=document.createElement("section");section.className="admin-logins-section";
    const heading=document.createElement("div");heading.className="admin-logins-section-title";heading.textContent=title;section.append(heading);
    if(note){const description=document.createElement("div");description.className="admin-logins-section-note";description.textContent=note;section.append(description);}
    const scroll=document.createElement("div");scroll.className="admin-logins-scroll";
    if(!items.length){const empty=document.createElement("div");empty.className="admin-login-entry";empty.textContent=emptyText;scroll.append(empty);}
    else items.forEach((entry,index)=>{const row=document.createElement("div");row.className="admin-login-entry";row.textContent=`${index+1}. ${formatAdminDate(entry?.[timeKey])}`;scroll.append(row);});
    section.append(scroll);
    adminLoginsList.append(section);
  }

  async function fetchAllAdminUserLogins(userId){
    let beforeId=null;
    const seenCursors=new Set();
    const logins=[];
    let firstData=null;
    while(true){
      const params=new URLSearchParams({limit:"1000"});
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/users/${encodeURIComponent(userId)}/logins?${params.toString()}`);
      if(!firstData)firstData=data;
      if(Array.isArray(data.logins))logins.push(...data.logins);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {...(firstData||{}),logins,truncated:false};
  }

  async function fetchAllAdminUserActivity(userId,{types=""}={}){
    let beforeId=null;
    const seenCursors=new Set();
    const events=[];
    let firstData=null;
    while(true){
      const params=new URLSearchParams({limit:"1000"});
      if(types)params.set("types",types);
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/users/${encodeURIComponent(userId)}/activity?${params.toString()}`);
      if(!firstData)firstData=data;
      if(Array.isArray(data.events))events.push(...data.events);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {...(firstData||{}),events,truncated:false};
  }

  async function openAdminLoginHistory(user){
    if(!adminLoginsModal||!adminLoginsList)return;
    adminLoginsUser.textContent=`${user.username||"Користувач"} · ${roleLabel(user)}`;
    adminLoginsList.innerHTML='<div class="admin-login-entry">Завантаження...</div>';
    adminLoginsModal.classList.add("active");document.body.classList.add("edit-modal-open");
    try{
      const [loginData,activityData]=await Promise.all([
        fetchAllAdminUserLogins(user.id),
        fetchAllAdminUserActivity(user.id,{types:"visit"})
      ]);
      const logins=(Array.isArray(loginData.logins)?loginData.logins:[]).filter(item=>activityIsFresh(item.login_at));
      const visits=(Array.isArray(activityData.events)?activityData.events:[]).filter(item=>activityIsFresh(item.created_at));
      adminLoginsList.innerHTML="";
      appendAdminVisitSection(
        "Входи через логін і пароль",
        "Тут фіксуються тільки успішні авторизації з введенням логіна та пароля.",
        logins,
        "login_at",
        "Входів через логін і пароль ще немає."
      );
      appendAdminVisitSection(
        "Відвідування сайту",
        "Тут показано відкриття або повернення на сайт за повідомленням браузера. Ці події не є незалежним підтвердженням сервера.",
        visits,
        "created_at",
        "Відвідувань сайту ще немає."
      );
    }catch(error){
      adminLoginsList.innerHTML="";
      const row=document.createElement("div");row.className="admin-login-entry";row.textContent=error?.message||"Не вдалося завантажити входи та відвідування.";adminLoginsList.append(row);
    }
  }

  function renderAdminActionTypes(){
    if(!adminActionTypesList)return;
    adminActionTypesList.innerHTML="";
    Object.entries(ADMIN_AUDIT_LABELS).forEach(([type,label])=>{
      const row=document.createElement("div");row.className="admin-action-type-row";
      const head=document.createElement("div");head.className="admin-action-type-head";
      const badge=document.createElement("span");badge.className="admin-audit-badge";badge.textContent=label;
      const desc=document.createElement("div");desc.className="admin-action-type-description";desc.textContent=ADMIN_AUDIT_DESCRIPTIONS[type]||"Подія журналу активності.";
      head.append(badge);row.append(head,desc);adminActionTypesList.append(row);
    });
  }

  function openAdminActionTypes(){
    if(!adminActionTypesModal)return;
    renderAdminActionTypes();
    adminActionTypesModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }

  function closeAdminActionTypes(){adminActionTypesModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}

  function adminActivityLabel(type){return ADMIN_AUDIT_LABELS[type]||"Дія";}

  const ADMIN_METADATA_LABELS={
    calculator_items:"Записи калькулятора",calculator:"Калькулятор",calculator_draft:"Чернетка калькулятора",daily_goal:"Денна ціль",products:"КБЖВ-блоки",archive:"Архів",settings:"Налаштування",calculator_quick_presets:"Швидкі значення калькулятора",product:"Продукт",profile:"Профіль",changed_fields:"Змінені поля",archive_composition:"Склад архіву",total:"Підсумок",scope:"Обсяг",version:"Версія",backup_format:"Формат резервної копії",page:"Сторінка",installed:"PWA встановлено",name:"Назва",weight:"Вага",text:"Текст",kcal:"Калорії",protein:"Білки",fat:"Жири",carb:"Вуглеводи",sugar:"Цукри",salt:"Сіль",fiber:"Клітковина",display_name:"Відображуване ім’я",full_name:"ПІБ",birth_date:"Дата народження",height:"Зріст",avatar:"Фото профілю",avatar_present:"Фото профілю збережено",sort_mode:"Сортування",random_sort_seed:"Випадкове сортування",active_tab:"Активна вкладка",stats_to_today:"Статистика до сьогодні",departments_enabled:"Відділи увімкнені",category_order:"Порядок відділів",custom_categories:"Власні відділи",deleted_default_categories:"Видалені стандартні відділи",database_updated_at:"Оновлення бази",site_data_visible:"Поточні дані сайту показані",archive_note:"Нотатка архіву",archive_note_visible:"Нотатка архіву показана"
  };
  function adminMetadataLabel(key,path=[]){
    const root=String(path[0]||"");
    if(key==="full_name"&&root==="products")return "Опис продукту";
    if(key==="full_name_no_data"&&root==="products")return "Опис продукту: немає даних";
    if(key==="schema_version")return "Версія структури";
    return ADMIN_METADATA_LABELS[key]||key;
  }
  function translateAdminMetadata(value,path=[]){
    if(value===null||value===undefined)return "Немає даних";
    if(typeof value==="boolean")return value?"Так":"Ні";
    if(Array.isArray(value))return value.map((item,index)=>translateAdminMetadata(item,[...path,String(index)]));
    if(value&&typeof value==="object"){
      const out={};
      Object.entries(value).forEach(([key,item])=>{const label=adminMetadataLabel(key,path);out[label]=key==="avatar"?(item?"Збережено":"Немає даних"):translateAdminMetadata(item,[...path,key]);});
      return out;
    }
    return value;
  }

  function adminSearchNormalize(value){
    return String(value??"").normalize("NFKC").toLocaleLowerCase("uk-UA");
  }

  function flattenAdminState(value,path="",out=[]){
    if(Array.isArray(value)){
      if(!value.length)out.push({path:path||"Дані",value:"[]"});
      value.forEach((item,index)=>flattenAdminState(item,`${path}${path?" → ":""}№${index+1}`,out));
      return out;
    }
    if(value&&typeof value==="object"){
      const entries=Object.entries(value);
      if(!entries.length)out.push({path:path||"Дані",value:"{}"});
      entries.forEach(([key,item])=>flattenAdminState(item,`${path}${path?" → ":""}${key}`,out));
      return out;
    }
    out.push({path:path||"Дані",value:value===null||value===undefined?"Немає даних":String(value)});
    return out;
  }

  function appendHighlightedLiteral(target,text,query){
    const source=String(text??"");
    const normalized=adminSearchNormalize(source),needle=adminSearchNormalize(query);
    if(!needle){target.textContent=source;return;}
    let start=0;
    while(start<source.length){
      const index=normalized.indexOf(needle,start);
      if(index<0){target.append(document.createTextNode(source.slice(start)));break;}
      if(index>start)target.append(document.createTextNode(source.slice(start,index)));
      const mark=document.createElement("mark");mark.textContent=source.slice(index,index+query.length);target.append(mark);
      start=index+query.length;
    }
  }

  function renderAdminStateSearch(){
    if(!adminFullStateSearchResults||!adminFullStateSearchStatus)return;
    const query=String(adminFullStateSearch?.value||"").trim();
    adminFullStateSearchResults.innerHTML="";
    if(!query){
      adminFullStateSearchResults.hidden=true;
      if(adminFullState)adminFullState.hidden=false;
      adminFullStateSearchStatus.textContent="Пошук виконується буквально за введеними літерами";
      return;
    }
    if(!adminFullStateSnapshot||typeof adminFullStateSnapshot!=="object"){
      adminFullStateSearchResults.hidden=false;
      if(adminFullState)adminFullState.hidden=true;
      adminFullStateSearchStatus.textContent="Поточні дані ще не синхронізовані";
      return;
    }
    const translated=translateAdminMetadata(adminFullStateSnapshot);
    const needle=adminSearchNormalize(query);
    const matches=flattenAdminState(translated).filter(item=>adminSearchNormalize(`${item.path} ${item.value}`).includes(needle));
    adminFullStateSearchResults.hidden=false;
    if(adminFullState)adminFullState.hidden=true;
    adminFullStateSearchStatus.textContent=matches.length?`Знайдено точних збігів: ${matches.length}.`:`За «${query}» нічого не знайдено.`;
    matches.slice(0,250).forEach(item=>{
      const row=document.createElement("div");row.className="admin-state-search-result";
      const path=document.createElement("div");path.className="admin-state-search-path";appendHighlightedLiteral(path,item.path,query);
      const value=document.createElement("div");value.className="admin-state-search-value";appendHighlightedLiteral(value,item.value,query);
      row.append(path,value);adminFullStateSearchResults.append(row);
    });
    if(matches.length>250){
      const more=document.createElement("div");more.className="admin-login-entry";more.textContent=`Показано перші 250 із ${matches.length} збігів. Уточніть пошук.`;adminFullStateSearchResults.append(more);
    }
  }

  async function openAdminFullInfo(user){
    if(!adminFullModal||!adminFullList)return;
    adminFullUser.textContent=`${user.username||"Користувач"} · ${roleLabel(user)} · ID ${String(user.id)}`;
    if(adminFullSummary)adminFullSummary.innerHTML="";
    adminFullStateSnapshot=null;
    if(adminFullStateSearch)adminFullStateSearch.value="";
    if(adminFullStateSearchResults){adminFullStateSearchResults.innerHTML="";adminFullStateSearchResults.hidden=true;}
    if(adminFullStateSearchStatus)adminFullStateSearchStatus.textContent="Пошук виконується буквально за введеними літерами";
    if(adminFullState){adminFullState.hidden=false;adminFullState.textContent="Завантаження поточних даних";}
    adminFullList.innerHTML='<div class="admin-login-entry">Завантаження повної історії...</div>';
    adminFullModal.classList.add("active");document.body.classList.add("edit-modal-open");
    try{
      const data=await fetchAllAdminUserActivity(user.id);
      const details=data.user||user;
      if(adminFullSummary){
        const fields=[
          ["Роль",roleLabel(details)],
          ["Реєстрація",formatAdminDate(details.created_at)],
          ["Останнє відвідування",formatAdminDate(details.last_seen_at)],
          ["Останній вхід через пароль",formatAdminDate(details.last_login_at)],
          ["Кількість входів через пароль",String(details.login_count??user.login_count??0)]
        ];
        fields.forEach(([label,value])=>{const box=document.createElement("div");const strong=document.createElement("strong");strong.textContent=label;const span=document.createElement("span");span.textContent=value;box.append(strong,span);adminFullSummary.append(box);});
      }
      if(adminFullState){
        if(data.state_snapshot&&typeof data.state_snapshot==="object"){
          adminFullStateSnapshot=data.state_snapshot;
          const state=document.createElement("pre");state.className="admin-full-state-pre";state.textContent=JSON.stringify(translateAdminMetadata(data.state_snapshot),null,2);
          adminFullState.innerHTML="";
          const updated=document.createElement("div");updated.className="admin-full-state-updated";updated.textContent=`Стан синхронізовано: ${formatAdminDate(data.state_updated_at)}`;
          adminFullState.append(updated,state);
        }else{adminFullStateSnapshot=null;adminFullState.textContent=authUser?.is_owner?"Поточні дані ще не синхронізовані. Вони з’являться після того, як користувач відкриє оновлену версію сайту з інтернетом.":"Для захисту приватності ці дані може переглядати тільки головний адміністратор.";}
      }
      const events=(Array.isArray(data.events)?data.events:[]).filter(event=>activityIsFresh(event.created_at));
      adminFullList.innerHTML="";
      if(!events.length){adminFullList.innerHTML='<div class="admin-login-entry">Повна історія дій порожня.</div>';return;}
            events.forEach(event=>{
        const row=document.createElement("div");row.className="admin-full-entry";
        const head=document.createElement("div");head.className="admin-full-entry-head";
        const badge=document.createElement("span");badge.className="admin-audit-badge";badge.textContent=adminActivityLabel(event.event_type);
        const time=document.createElement("time");time.textContent=formatAdminDate(event.created_at);head.append(badge,time);
        const message=document.createElement("div");message.className="admin-full-entry-message";message.textContent=readableAuditText(event.message)||"—";
        row.append(head,message);
        if(event.metadata){
          let metadataText="";
          try{const parsed=typeof event.metadata==="string"?JSON.parse(event.metadata):event.metadata;metadataText=JSON.stringify(translateAdminMetadata(parsed),null,2);}catch(_){metadataText=String(event.metadata);}
          if(metadataText&&metadataText!=="{}"){
            const meta=document.createElement("pre");meta.className="admin-full-entry-meta";meta.textContent=metadataText;row.append(meta);
          }
        }
        adminFullList.append(row);
      });
    }catch(error){adminFullList.innerHTML="";const row=document.createElement("div");row.className="admin-login-entry";row.textContent=error?.message||"Не вдалося завантажити повну інформацію.";adminFullList.append(row);}
  }

  function closeAdminLoginHistory(){adminLoginsModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  function closeAdminFullInfo(){adminFullModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");adminFullStateSnapshot=null;if(adminFullStateSearch)adminFullStateSearch.value="";}

  const BUTTON_STATE_COLORS={
    success:{background:"#22c55e",shadow:"0 0 0 1px rgba(34,197,94,.30),0 0 18px rgba(34,197,94,.30)"},
    error:{background:"#ef4444",shadow:"0 0 0 1px rgba(239,68,68,.30),0 0 18px rgba(239,68,68,.30)"},
    info:{background:"#7289da",shadow:"0 0 0 1px rgba(114,137,218,.30),0 0 18px rgba(114,137,218,.30)"}
  };
  function restoreButtonInlineState(button){
    if(!button?._statusInlineSnapshot)return;
    const snapshot=button._statusInlineSnapshot;
    ["background-color","color","box-shadow"].forEach(property=>{
      const saved=snapshot[property];
      if(saved?.value)button.style.setProperty(property,saved.value,saved.priority||"");
      else button.style.removeProperty(property);
    });
    button._statusInlineSnapshot=null;
  }
  function applyButtonInlineState(button,state){
    const palette=BUTTON_STATE_COLORS[state];
    if(!button||!palette)return;
    if(!button._statusInlineSnapshot){
      button._statusInlineSnapshot={};
      ["background-color","color","box-shadow"].forEach(property=>{
        button._statusInlineSnapshot[property]={
          value:button.style.getPropertyValue(property),
          priority:button.style.getPropertyPriority(property)
        };
      });
    }
    button.style.setProperty("background-color",palette.background,"important");
    button.style.setProperty("color","#fff","important");
    button.style.setProperty("box-shadow",
      (button.id==="sort-category-order"||button.id==="sort-custom-category")?"none":palette.shadow,"important");
  }
  function clearButtonStatus(button) {
    if(!button)return;
    button.classList.remove("button-status-success","button-status-error","button-status-info","button-status-entering","button-status-leaving");
    restoreButtonInlineState(button);
  }
  const BUTTON_FEEDBACK_MS = 1450;
  const BUTTON_STATUS_OUT_MS = 250;
  function showButtonState(button,text,state,duration=BUTTON_FEEDBACK_MS) {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent.trim();

    clearTimeout(button._statusTimeout);
    clearTimeout(button._statusLeaveTimeout);
    clearButtonStatus(button);

    button.textContent = text;
    if (state) {
      void button.offsetWidth;
      button.classList.add(`button-status-${state}`,"button-status-entering");
      applyButtonInlineState(button,state);
    }

    // Honor the requested duration instead of forcing every action to 1450 ms.
    // An entrance lasts 400 ms; preserve enough time for its icon to appear.
    const effectiveDuration=duration===0?0:(Number.isFinite(duration)?Math.max(630,duration):BUTTON_FEEDBACK_MS);
    if (effectiveDuration > 0) {
      const leaveAt=Math.max(0,effectiveDuration-BUTTON_STATUS_OUT_MS);
      button._statusTimeout=setTimeout(()=>{
        button.classList.remove("button-status-entering");
        button.classList.add("button-status-leaving");
        button._statusLeaveTimeout=setTimeout(()=>{
          // Keep the centered search-clear glyph after a rare no-data error state.
          if(button.id==="archive-search-clear"||button.id==="delete-product-search-clear"){
            button.innerHTML='<span class="av-search-clear-glyph" aria-hidden="true">✕</span>';
          }else{
            button.textContent=button.dataset.originalText||"";
          }
          clearButtonStatus(button);
        },BUTTON_STATUS_OUT_MS);
      },leaveAt);
    }
  }
  // Єдине джерело станів кнопок для всіх сторінок, включно зі «Зручностями».
  // Повторно використовуємо той самий таймер, пріоритет кольорів і відновлення стилю.
  function clearSharedButtonState(button) {
    if (!button) return;
    clearTimeout(button._statusTimeout);
    clearTimeout(button._statusLeaveTimeout);
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    clearButtonStatus(button);
  }
  // v231: transient press feedback on ordinary buttons, including dynamically
  // created ones. Semantic success/error state is still owned by showButtonState.
  // No clicks, labels, data, or form submission behavior are changed here.
  (function installUnifiedPressFeedback(){
    const pressTimers=new WeakMap();
    const mark=(button)=>{
      if(!button||button.disabled)return;
      clearTimeout(pressTimers.get(button));
      button.classList.add('av-feedback-pressed');
      pressTimers.set(button,setTimeout(()=>button.classList.remove('av-feedback-pressed'),200));
    };
    const findButton=e=>e.target?.closest?.('button, [role="button"]');
    document.addEventListener('pointerdown',e=>mark(findButton(e)),true);
    document.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' ')mark(findButton(e));
    },true);
  })();
  window.kbjvButtonFeedback = Object.freeze({show: showButtonState, clear: clearSharedButtonState});

  function setButtonStatusPermanent(button,text,state) { showButtonState(button,text,state,0); }

  function formatConsoleDate(date = new Date()) {
    const d=String(date.getDate()).padStart(2,"0"),m=String(date.getMonth()+1).padStart(2,"0"),y=date.getFullYear();
    const h=String(date.getHours()).padStart(2,"0"),mi=String(date.getMinutes()).padStart(2,"0"),se=String(date.getSeconds()).padStart(2,"0");
    return `${d}.${m}.${y} - ${h}:${mi}:${se}`;
  }
  const MAX_CONSOLE_ITEMS=500;
  // Sliding retention: exactly 24 hours from creation; never midnight-based.
  const ACTIVITY_RETENTION_MS=24*60*60*1000;
  function activityIsFresh(value,now=Date.now()){
    const timestamp=Date.parse(String(value||""));
    return Number.isFinite(timestamp)&&timestamp<=now+5*60*1000&&timestamp>now-ACTIVITY_RETENTION_MS;
  }
  function trimLocalConsoleHistory(persist=true){
    const before=consoleItems.length;
    consoleItems=consoleItems.filter(item=>activityIsFresh(item?.time)).slice(-MAX_CONSOLE_ITEMS);
    if(persist&&consoleItems.length!==before)safeStorageSet(CONSOLE_KEY,JSON.stringify(consoleItems));
    return consoleItems.length!==before;
  }

  let storageLastError="";
  let storageErrorShownAt=0;

  let storageTransaction=null;
  // A malformed stored collection must never be silently interpreted as an empty
  // collection and then uploaded, edited, or exported as if the records were gone.
  const corruptLocalDataKeys=new Set();

  function beginStorageTransaction(label="Операція"){
    if(storageTransaction)return false;
    storageTransaction={label,original:new Map(),touched:new Set(),changed:new Set(),failed:false,error:"",needsSync:false,fullBackupRestore:label.startsWith("Відновлення:"),explicitClear:label==="Повне очищення сайту"};
    return true;
  }

  function rememberStorageOriginal(key){
    if(!storageTransaction||storageTransaction.original.has(key))return;
    storageTransaction.original.set(key,localStorage.getItem(key));
    storageTransaction.touched.add(key);
  }

  function rollbackStorageTransaction(){
    const tx=storageTransaction;
    if(!tx)return true;
    const failedKeys=[];
    try{
      // localStorage.setItem is atomic for one key. In particular, NEVER remove a
      // previous value before trying to restore it: if setItem fails again,
      // removing it would destroy the only surviving copy.
      for(const key of [...tx.changed].reverse()){
        const original=tx.original.get(key);
        try{
          // No write is necessary if a failed setItem left the old value intact.
          if(localStorage.getItem(key)===original)continue;
          if(original===null)localStorage.removeItem(key);
          else localStorage.setItem(key,original);
        }catch(_){failedKeys.push(key);}
      }
    }finally{storageTransaction=null;}
    if(failedKeys.length){
      // Do not claim an atomic rollback if the browser is still rejecting writes.
      storageLastError=`Не вдалося відновити ${failedKeys.length} запис(ів) після збою сховища. Не очищуйте дані браузера; зробіть резервну копію та звільніть місце.`;
      console.error("Incomplete storage rollback",failedKeys.length);
      return false;
    }
    return true;
  }

  function finishStorageTransaction(){
    const tx=storageTransaction;
    if(!tx)return true;
    const failed=tx.failed;
    const error=tx.error;
    const needsSync=tx.needsSync;
    if(failed){
      const restored=rollbackStorageTransaction();
      if(restored)storageLastError=error||"Не вдалося зберегти дані. Попередній стан відновлено.";
      renderSystemStatus();
      return false;
    }
    storageTransaction=null;
    storageLastError="";
    if(needsSync)scheduleAdminStateSync(1000);
    return true;
  }

  function safeStorageSet(key,value,{critical=false}={}){
    if(corruptLocalDataKeys.has(key)&&!storageTransaction?.fullBackupRestore&&!storageTransaction?.explicitClear){
      storageLastError="Пошкоджені локальні дані захищено від перезапису. Відновіть повну резервну копію.";
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error=storageLastError;}
      renderSystemStatus();return false;
    }
    const text=String(value);
    rememberStorageOriginal(key);
    try{
      localStorage.setItem(key,text);
      if(storageTransaction)storageTransaction.changed.add(key);
      if(!storageTransaction)storageLastError="";
      return true;
    }catch(error){
      const quota=error?.name==="QuotaExceededError"||error?.name==="NS_ERROR_DOM_QUOTA_REACHED";
      if(storageTransaction){
        if(key===UNDO_KEY&&!critical)return false;
        storageTransaction.failed=true;
        storageTransaction.error=quota
          ? "Локального сховища недостатньо. Операцію скасовано повністю, попередні дані збережено."
          : "Не вдалося записати дані. Операцію скасовано повністю, попередні дані збережено.";
        return false;
      }
      // Для одиночного критичного запису спершу жертвуємо лише Undo, а не основними даними.
      if(quota&&critical&&key!==UNDO_KEY){
        try{
          localStorage.removeItem(UNDO_KEY);
          localStorage.setItem(key,text);
          storageLastError="Сховище було майже заповнене: історію скасувань очищено, основні дані збережено.";
          renderSystemStatus();
          return true;
        }catch(_){/* handled below */}
      }
      storageLastError=quota
        ? "Локальне сховище заповнене. Зробіть експорт і звільніть місце."
        : "Не вдалося записати дані в локальне сховище.";
      if(critical&&Date.now()-storageErrorShownAt>60000){
        storageErrorShownAt=Date.now();
        alert(storageLastError);
      }
      renderSystemStatus();
      return false;
    }
  }

  function safeStorageRemove(key){
    if(corruptLocalDataKeys.has(key)&&!storageTransaction?.fullBackupRestore&&!storageTransaction?.explicitClear){
      storageLastError="Пошкоджені локальні дані захищено від видалення. Відновіть повну резервну копію.";
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error=storageLastError;}
      renderSystemStatus();return false;
    }
    rememberStorageOriginal(key);
    try{localStorage.removeItem(key);if(storageTransaction)storageTransaction.changed.add(key);return true;}
    catch(error){
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error="Не вдалося змінити локальне сховище. Операцію скасовано.";}
      return false;
    }
  }

  function saveConsoleLocal(){
    trimLocalConsoleHistory(false);
    safeStorageSet(CONSOLE_KEY,JSON.stringify(consoleItems));
  }

  let auditFlushInProgress=false;
  let lastSiteVisitQueuedAt=0;

  function isClearSiteAuditMessage(message){
    return String(message||"").trim()==="Очищено локальні дані сайту для поточного акаунта.";
  }

  const AUDIT_DB_NAME="avicularia-testing-audit-queue";
  const AUDIT_DB_VERSION=1;
  const AUDIT_STORE="events";
  let auditDbPromise=null;

  function legacyAuditQueue(){
    try{const value=JSON.parse(localStorage.getItem(AUDIT_QUEUE_KEY)||"[]");return Array.isArray(value)?value:[];}
    catch(_){return [];}
  }
  function saveLegacyAuditQueue(items){safeStorageSet(AUDIT_QUEUE_KEY,JSON.stringify(Array.isArray(items)?items:[]));}

  function openAuditDb(){
    if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB недоступна"));
    if(auditDbPromise)return auditDbPromise;
    auditDbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(AUDIT_DB_NAME,AUDIT_DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        const store=db.objectStoreNames.contains(AUDIT_STORE)?request.transaction.objectStore(AUDIT_STORE):db.createObjectStore(AUDIT_STORE,{keyPath:"id"});
        if(!store.indexNames.contains("user_id"))store.createIndex("user_id","user_id",{unique:false});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>{auditDbPromise=null;reject(request.error||new Error("IndexedDB помилка"));};
    });
    return auditDbPromise;
  }

  async function migrateLegacyAuditQueue(){
    if(!authUser)return;
    const legacy=legacyAuditQueue().filter(item=>activityIsFresh(item?.occurred_at));
    if(legacy.length!==legacyAuditQueue().length)saveLegacyAuditQueue(legacy);
    if(!legacy.length)return;
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),store=tx.objectStore(AUDIT_STORE);
        legacy.forEach(item=>store.put({...item,user_id:Number(authUser.id)}));
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
      safeStorageRemove(AUDIT_QUEUE_KEY);
    }catch(_){/* fallback remains in localStorage */}
  }

  async function persistAuditItem(item){
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite");
        tx.objectStore(AUDIT_STORE).put(item);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
      return true;
    }catch(_){
      const queue=legacyAuditQueue().filter(row=>activityIsFresh(row?.occurred_at));queue.push(item);
      // fallback is bounded only to protect core localStorage if IndexedDB is unavailable
      while(queue.length>3000)queue.shift();
      saveLegacyAuditQueue(queue);
      return false;
    }
  }

  async function getAuditBatch(limit=15){
    const userId=Number(authUser?.id||0);
    if(!userId)return [];
    try{
      await migrateLegacyAuditQueue();
      const db=await openAuditDb();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readonly"),index=tx.objectStore(AUDIT_STORE).index("user_id");
        const request=index.getAll(IDBKeyRange.only(userId),limit);
        request.onsuccess=()=>resolve(Array.isArray(request.result)?request.result:[]);
        request.onerror=()=>reject(request.error);
      });
    }catch(_){return legacyAuditQueue().filter(item=>Number(item.user_id||userId)===userId).slice(0,limit);}
  }

  async function deleteAuditItems(ids){
    if(!ids.length)return;
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),store=tx.objectStore(AUDIT_STORE);
        ids.forEach(id=>store.delete(id));
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }catch(_){
      const remove=new Set(ids);saveLegacyAuditQueue(legacyAuditQueue().filter(item=>!remove.has(item.id)));
    }
  }

  async function clearAuditQueueForUser(userId){
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),index=tx.objectStore(AUDIT_STORE).index("user_id");
        const request=index.openCursor(IDBKeyRange.only(Number(userId)));
        request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue();}};
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }catch(_){/* ignore */}
    const queue=legacyAuditQueue().filter(item=>Number(item.user_id||0)!==Number(userId));
    if(queue.length)saveLegacyAuditQueue(queue);else safeStorageRemove(AUDIT_QUEUE_KEY);
  }

  // Clean expired offline audit events without waiting for network access.
  let lastAuditPruneAt=0;
  async function pruneLocalAuditQueue(force=false){
    if(!force&&Date.now()-lastAuditPruneAt<10*60*1000)return;
    lastAuditPruneAt=Date.now();
    const legacy=legacyAuditQueue();
    const retained=legacy.filter(item=>activityIsFresh(item?.occurred_at));
    if(retained.length!==legacy.length){
      if(retained.length)saveLegacyAuditQueue(retained);
      else safeStorageRemove(AUDIT_QUEUE_KEY);
    }
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite");
        const request=tx.objectStore(AUDIT_STORE).openCursor();
        request.onsuccess=()=>{
          const cursor=request.result;
          if(!cursor)return;
          if(!activityIsFresh(cursor.value?.occurred_at))cursor.delete();
          cursor.continue();
        };
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      });
    }catch(_){/* Private browsing may block IndexedDB. */}
  }

  // v221: product photos are temporary reference material, never audit-log attachments.
  // Older server audit events and previously exported JSON are NOT rewritten here.
  function sanitizeAuditPhotoMetadata(value,depth=0){
    if(depth>16)return "[обмежено]";
    if(typeof value==="string"&&/^data:image\//i.test(value))return "[фото не записується до журналу]";
    if(Array.isArray(value))return value.map(item=>sanitizeAuditPhotoMetadata(item,depth+1));
    if(!value||typeof value!=="object")return value;
    const clean={};
    for(const [key,item] of Object.entries(value)){
      if(key==="gallery"&&item&&typeof item==="object"){
        clean[key]={no_data:item.no_data===true,visible:item.visible===true,
          image_count:Array.isArray(item.images)?item.images.filter(Boolean).length:0};
      }else clean[key]=sanitizeAuditPhotoMetadata(item,depth+1);
    }
    return clean;
  }

  function queueAuditAction(message,occurredAt=new Date().toISOString(),eventType="site_action",metadata=null){
    if(!authUser)return;
    const item={
      id:createId("audit"),user_id:Number(authUser.id),
      event_type:["site_action","visit"].includes(String(eventType))?String(eventType):"site_action",
      message:String(message??"Невідома дія").slice(0,1000),
      occurred_at:String(occurredAt||new Date().toISOString()),
      metadata:metadata&&typeof metadata==="object"?sanitizeAuditPhotoMetadata(metadata):null
    };
    void persistAuditItem(item).then(()=>flushAuditQueue());
  }

  function recordSiteVisit(){
    if(!authUser)return;
    const now=Date.now();
    if(now-lastSiteVisitQueuedAt<60000)return;
    lastSiteVisitQueuedAt=now;
    queueAuditAction("Відкрито або повернуто на передній план сайт із чинною сесією.",new Date(now).toISOString(),"visit",{
      page:location.pathname,
      installed:window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true
    });
  }

  async function flushAuditQueue(){
    if(auditFlushInProgress||!authToken||!navigator.onLine)return;
    auditFlushInProgress=true;
    try{
      while(authToken&&navigator.onLine){
        await pruneLocalAuditQueue();
        const batch=await getAuditBatch(15);
        if(!batch.length)break;
        const expired=batch.filter(item=>!activityIsFresh(item?.occurred_at));
        if(expired.length){await deleteAuditItems(expired.map(item=>item.id));continue;}
        try{
          const response=await authApi("/audit/batch",{method:"POST",body:{events:batch.map(item=>({event_type:item.event_type,message:item.message,occurred_at:item.occurred_at,metadata:sanitizeAuditPhotoMetadata(item.metadata)}))}});
          // Never delete queued actions without an explicit positive server acknowledgment.
          const count=Number(response?.accepted);
          if(!Number.isSafeInteger(count)||count<0||count>batch.length){
            console.warn('Некоректне підтвердження прийому журналу; події залишено локально.');
            break;
          }
          if(!count)break;
          await deleteAuditItems(batch.slice(0,count).map(item=>item.id));
        }catch(error){
          // Retain malformed/unaccepted events for diagnostics instead of
          // silently discarding a user's activity history on HTTP 400.
          if(error?.status===400)console.warn('Worker відхилив пакет журналу; записи не видалені.');
          break;
        }
      }
    }finally{auditFlushInProgress=false;}
  }

  let stateSyncTimer=null;
  let syncInProgress=false;
  let syncCheckInProgress=false;
  let syncApplyingRemote=false;
  let syncConflict=false;
  let syncStatusMessage="Ще не виконувалася";
  // Read-only checks must retain the actual failure reason, never imply D1 equality.
  let syncLastCheckError="";
  function syncExplainError(error){
    const code=Number(error?.status||0);
    const message=String(error?.message||"Не вдалося зв’язатися із сервером.").replace(/\s+/g," ").slice(0,160);
    return code>0?`HTTP ${code}: ${message}`:message;
  }
  let lastStateSnapshotFingerprint="";
  let externalReloadTimer=null;

  function currentUserPrefix(){return authUser?`avicularia_testing_user_${String(authUser.id)}_`:"";}

  function buildSyncSnapshot(){
    const settings={...collectBackupSettings()};
    delete settings.active_tab;
    return {
      schema_version:1,
      profile:normalizeProfile(profileData),
      daily_goal:normalizeDailyGoal(dailyGoal),
      products:products.map((product,index)=>normalizeProduct(product,index)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:JSON.parse(JSON.stringify(archiveItems)),
      // Archive note travels in settings to preserve sync snapshot schema_version=1.
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets),
      settings
    };
  }

  function buildAdminStateSnapshot(){return buildSyncSnapshot();}

  function syncFingerprint(snapshot){
    // Compare semantic content, not JSON key insertion order. v210 introduced an
    // Old server snapshots may contain barcodes; v217 ignores that retired field.
    // Do NOT remove real values: mismatched content still needs explicit review.
    try{
      const input=snapshot&&typeof snapshot==="object"?snapshot:{};
      const clean={...input};
      if(Array.isArray(clean.products))clean.products=clean.products.map(p=>{
        const v={...p};delete v.barcode;v.gallery=normalizeProductGallery(v.gallery);
        v.planned=avDeferredProduct(v);
        return v;
      });
      const stable=value=>{
        if(Array.isArray(value))return value.map(stable);
        if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
        return value;
      };
      return JSON.stringify(stable(clean));
    }catch(_){return "";}
  }

  function localSnapshotHasData(snapshot=buildSyncSnapshot()){
    const profile=snapshot?.profile||{};
    return Boolean(
      (Array.isArray(snapshot?.products)&&snapshot.products.length)||
      (Array.isArray(snapshot?.calculator)&&snapshot.calculator.length)||
      (Array.isArray(snapshot?.archive)&&snapshot.archive.length)||
      String(snapshot?.calculator_draft||"").trim()||
      (Array.isArray(snapshot?.calculator_quick_presets)&&snapshot.calculator_quick_presets.length)||
      Object.values(profile).some(value=>String(value||"").length)||
      snapshot?.daily_goal?.enabled||
      Object.entries(snapshot?.daily_goal||{}).some(([key,value])=>key!=="enabled"&&Number(value)>0)||
      (Array.isArray(snapshot?.settings?.custom_categories)&&snapshot.settings.custom_categories.length)||
      (Array.isArray(snapshot?.settings?.deleted_default_categories)&&snapshot.settings.deleted_default_categories.length)||
      (Array.isArray(snapshot?.settings?.category_order)&&snapshot.settings.category_order.join("|")!==defaultCategoryOrder().join("|"))||
      snapshot?.settings?.random_sort_seed!=null||
      Boolean(snapshot?.settings?.database_updated_at)||
      snapshot?.settings?.departments_enabled===false||
      snapshot?.settings?.stats_to_today===true||
      snapshot?.settings?.site_data_visible===false||
      Boolean(snapshot?.settings?.archive_note)||
      (snapshot?.settings?.sort_mode&&snapshot.settings.sort_mode!=="categories")
    );
  }

  function markLocalDataChanged(){
    if(syncApplyingRemote||!authUser)return true;
    // Both synchronization markers are critical. When called from a transaction,
    // failure aborts and rolls back the data write as well.
    const dirty=safeStorageSet(SYNC_DIRTY_KEY,"1",{critical:true});
    const timestamp=dirty&&safeStorageSet(SYNC_LOCAL_UPDATED_KEY,new Date().toISOString(),{critical:true});
    if(!dirty||!timestamp){
      syncStatusMessage="Помилка позначення змін для синхронізації";
      renderSystemStatus();
      return false;
    }
    syncStatusMessage="Є локальні зміни";
    avSyncAudit=null; // Do not show a stale section comparison after a local edit.
    lastStateSnapshotFingerprint="";
    if(storageTransaction)storageTransaction.needsSync=true;
    else scheduleAdminStateSync(1000);
    renderSystemStatus();
    return true;
  }

  function persistUserChange(label,write){
    if(corruptLocalDataKeys.size&&!storageTransaction?.fullBackupRestore){
      storageLastError="Пошкоджено локальні дані. Зміни призупинено, щоб не перезаписати записи. Відновіть повну резервну копію.";
      renderSystemStatus();return false;
    }
    const ownTransaction=!storageTransaction;
    if(ownTransaction)beginStorageTransaction(label);
    let wrote=false;
    try{wrote=write()!==false;if(wrote)wrote=markLocalDataChanged();}
    catch(error){
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error=String(error?.message||"Помилка локального запису.");}
      else throw error;
    }
    if(ownTransaction){
      if(!finishStorageTransaction()||!wrote)return storageWriteFailed();
      return true;
    }
    return wrote&&!storageTransaction?.failed;
  }

  function setSyncMeta(revision,updatedAt,{dirty=false,status="Синхронізовано"}={}){
    if(!beginStorageTransaction("Оновлення стану синхронізації")){
      syncStatusMessage="Не вдалося підтвердити синхронізацію: локальна операція ще триває";
      renderSystemStatus();return false;
    }
    safeStorageSet(SYNC_REVISION_KEY,String(Math.max(0,Number(revision)||0)),{critical:true});
    safeStorageSet(SYNC_DIRTY_KEY,dirty?"1":"0",{critical:true});
    if(updatedAt)safeStorageSet(SYNC_LAST_AT_KEY,String(updatedAt),{critical:true});
    if(!finishStorageTransaction()){
      syncStatusMessage="Сервер відповів, але позначку синхронізації зберегти не вдалося";
      renderSystemStatus();return false;
    }
    syncConflict=false;
    syncLastCheckError="";
    syncStatusMessage=status;
    renderSystemStatus();return true;
  }

  function reloadPrimaryStateFromStorage(){
    if(!appInitialized||!authUser)return;
    departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)==="1"; // v241: restore saved per-user preference
    currentSort=localStorage.getItem(SORT_KEY)||"categories";
    if(!VALID_SORT_MODES.has(currentSort))currentSort=departmentsEnabled?"categories":"initial";
    products=loadArray(PRODUCTS_KEY).map((p,i)=>normalizeProduct(p,i));
    calculatorItems=loadArray(CALCULATOR_KEY).map(normalizeCalculatorItem);
    archiveItems=loadArray(ARCHIVE_KEY);
    consoleItems=loadArray(CONSOLE_KEY).slice(-MAX_CONSOLE_ITEMS);trimLocalConsoleHistory();
    const draft=localStorage.getItem(CALCULATOR_DRAFT_KEY);
    if(calcInput)calcInput.value=draft||"";
    const remoteGoal=readProtectedJson(DAILY_GOAL_KEY,{},value=>value&&typeof value==="object"&&!Array.isArray(value)&&
      validBackupNutrition(value)&&(value.enabled===undefined||typeof value.enabled==="boolean"));
    dailyGoal=normalizeDailyGoal(remoteGoal);
    statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
    statsGoalVisible=localStorage.getItem(STATS_GOAL_VISIBLE_KEY)!=="0";
    if(statsChartGoal)statsChartGoal.checked=statsGoalVisible;
    siteDataVisible=localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0";
    archiveNote=String(localStorage.getItem(ARCHIVE_NOTE_KEY)||"");
    archiveNoteVisible=localStorage.getItem(ARCHIVE_NOTE_VISIBLE_KEY)==="1";
    archiveNoteEditing=false; renderArchiveNote();
    loadProfile();
    loadCalculatorQuickPresets();
    populateProductCategorySelects();
    updateSortOptionState();
    for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
    renderProducts(searchInput?.value||"");renderCalculatorLog();updateTotals();renderDailyGoal();renderArchive();renderConsole();renderStatistics();updateSiteDataCounts();renderSystemStatus();
  }

  function validateSyncSnapshotV91(snapshot){
    const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
    const text=v=>typeof v==="string";
    const number=v=>v===undefined||v===null||v===""||((typeof v==="number"||typeof v==="string")&&String(v).trim()!==""&&Number.isFinite(Number(String(v).trim().replace(",",".")))&&Number(String(v).trim().replace(",","."))>=0);
    const pairs=[["protein","proteins"],["fat","fats"],["carb","carbs"],["sugar","sugars"],["fiber","fibre"]];
    const metrics=["kcal","protein","proteins","fat","fats","carb","carbs","sugar","sugars","salt","fiber","fibre"];
    const nutrition=row=>{
      if(!obj(row)||metrics.some(k=>!number(row[k]))||!number(row.weight))return false;
      for(const [a,b] of pairs){
        if(row[a]!==undefined&&row[a]!==null&&row[b]!==undefined&&row[b]!==null&&Number(String(row[a]).replace(",","."))!==Number(String(row[b]).replace(",",".")))return false;
      }
      return true;
    };
    if(!obj(snapshot))return false;
    // Synchronization must be a complete snapshot. A partial object could wipe local data.
    if(snapshot.schema_version!==1)return false;
    for(const key of ["products","calculator","archive","calculator_quick_presets"]){
      if(!Array.isArray(snapshot[key]))return false;
    }
    if(!text(snapshot.calculator_draft)||!obj(snapshot.profile)||!obj(snapshot.settings)||!obj(snapshot.daily_goal))return false;
  if(snapshot.daily_goal!==undefined){
      if(!obj(snapshot.daily_goal))return false;
      if(snapshot.daily_goal.enabled!==undefined&&typeof snapshot.daily_goal.enabled!=="boolean")return false;
      if(!nutrition(snapshot.daily_goal))return false;
    }
    if(snapshot.settings!==undefined){
      const setting=snapshot.settings;
      if(!obj(setting))return false;
      for(const key of ["custom_categories","category_order","deleted_default_categories"]){
        if(setting[key]!==undefined&&!Array.isArray(setting[key]))return false;
      }
      if(Array.isArray(setting.custom_categories)&&setting.custom_categories.some(c=>!obj(c)||!text(c.id)||!text(c.label)||!c.id.trim()||!c.label.trim()))return false;
      for(const key of ["category_order","deleted_default_categories"]){
        if(Array.isArray(setting[key])&&setting[key].some(c=>!text(c)))return false;
      }
      for(const key of ["departments_enabled","stats_to_today","stats_goal_visible","site_data_visible","archive_note_visible"]){
        if(setting[key]!==undefined&&typeof setting[key]!=="boolean")return false;
      }
      if(setting.sort_mode!==undefined&&!text(setting.sort_mode))return false;
      if(setting.archive_note!==undefined&&(!text(setting.archive_note)||setting.archive_note.length>30000))return false;
    }
    if(Array.isArray(snapshot.products)&&snapshot.products.some(row=>{
      if(!nutrition(row)||!text(row.name)||!row.name.trim())return true;
      if(row.display!==undefined){
        if(!obj(row.display)||!nutrition(row.display))return true;
        for(const k of ["kcal","protein","fat","carb","sugar","salt","fiber"]){
          if(row.display[k]!==undefined&&Number(row.display[k])!==Number(row[k]??row[k==="protein"?"proteins":k==="fat"?"fats":k==="carb"?"carbs":k==="sugar"?"sugars":k==="fiber"?"fibre":k]??0))return true;
        }
      }
      return false;
    }))return false;
    if(Array.isArray(snapshot.calculator)&&snapshot.calculator.some(row=>!nutrition(row)||!text(row.text??row.name??"")||!(row.text??row.name??"").trim()))return false;
    if(Array.isArray(snapshot.archive)&&snapshot.archive.some(row=>{
      if(!nutrition(row)||!text(row.text)||!row.text.trim()||!text(row.date)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.date))return true;
      if(row.comment!==undefined&&!text(row.comment))return true;
      if(row.day_type!==undefined&&(!text(row.day_type)||(row.day_type!==""&&!ARCHIVE_DAY_TYPE_LABELS[row.day_type])))return true;
      if(row.composition!==undefined&&(!Array.isArray(row.composition)||row.composition.some(r=>!nutrition(r)||!text(r.text??r.name??"")||!(r.text??r.name??"").trim())))return true;
      return false;
    }))return false;
    if(Array.isArray(snapshot.calculator_quick_presets)&&snapshot.calculator_quick_presets.some(p=>!obj(p)||!number(p.amount)))return false;
    return true;
  }

  async function applyRemoteSnapshot(snapshot,revision,updatedAt){
    if(corruptLocalDataKeys.size){
      syncStatusMessage="Локальні дані пошкоджено; автоматичну заміну заборонено";
      renderSystemStatus();return false;
    }
    if(!validateSyncSnapshotV91(snapshot)){
      syncStatusMessage="Сервер повернув некоректні дані; локальні записи не змінено";
      syncConflict=true;renderSystemStatus();return false;
    }
    syncApplyingRemote=true;
    beginStorageTransaction("Отримання даних із сервера");
    try{
      const remoteProducts=Array.isArray(snapshot.products)?snapshot.products.map((p,i)=>normalizeProduct(p,i)):[];
      const remoteCalculator=Array.isArray(snapshot.calculator)?snapshot.calculator.map(normalizeCalculatorItem).filter(Boolean):[];
      const remoteArchive=Array.isArray(snapshot.archive)?snapshot.archive:[];
      const remoteGoal=normalizeDailyGoal(snapshot.daily_goal||{});
      const remoteProfile=normalizeProfile(snapshot.profile||{});
      const remotePresets=normalizeQuickPresets(snapshot.calculator_quick_presets||[]);
      const settings=snapshot.settings&&typeof snapshot.settings==="object"?snapshot.settings:{};

      safeStorageSet(PRODUCTS_KEY,JSON.stringify(remoteProducts),{critical:true});
      safeStorageSet(CALCULATOR_KEY,JSON.stringify(remoteCalculator),{critical:true});
      safeStorageSet(ARCHIVE_KEY,JSON.stringify(remoteArchive),{critical:true});
      safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(remoteGoal),{critical:true});
      safeStorageSet(PROFILE_KEY,JSON.stringify(remoteProfile),{critical:true});
      safeStorageSet(CALC_QUICK_PRESETS_KEY,JSON.stringify(remotePresets),{critical:true});
      const draft=String(snapshot.calculator_draft||"");
      if(draft)safeStorageSet(CALCULATOR_DRAFT_KEY,draft,{critical:true});else safeStorageRemove(CALCULATOR_DRAFT_KEY);
      if(Array.isArray(settings.custom_categories))safeStorageSet(CUSTOM_CATEGORIES_KEY,JSON.stringify(settings.custom_categories),{critical:true});
      if(Array.isArray(settings.deleted_default_categories))safeStorageSet(DELETED_DEFAULT_CATEGORIES_KEY,JSON.stringify(settings.deleted_default_categories),{critical:true});
      if(Array.isArray(settings.category_order))safeStorageSet(CATEGORY_ORDER_KEY,JSON.stringify(settings.category_order),{critical:true});
      if(typeof settings.departments_enabled==="boolean")safeStorageSet(DEPARTMENTS_ENABLED_KEY,settings.departments_enabled?"1":"0",{critical:true});
      if(VALID_SORT_MODES.has(String(settings.sort_mode||"")))safeStorageSet(SORT_KEY,String(settings.sort_mode),{critical:true});
      if(settings.random_sort_seed===null||settings.random_sort_seed===undefined)safeStorageRemove(RANDOM_SORT_SEED_KEY);else safeStorageSet(RANDOM_SORT_SEED_KEY,String(settings.random_sort_seed),{critical:true});
      if(typeof settings.stats_to_today==="boolean")safeStorageSet(STATS_TO_TODAY_KEY,settings.stats_to_today?"1":"0",{critical:true});
      if(typeof settings.stats_goal_visible==="boolean")safeStorageSet(STATS_GOAL_VISIBLE_KEY,settings.stats_goal_visible?"1":"0",{critical:true});
      if(typeof settings.site_data_visible==="boolean")safeStorageSet(SITE_DATA_VISIBLE_KEY,settings.site_data_visible?"1":"0",{critical:true});
      if(typeof settings.archive_note==="string")safeStorageSet(ARCHIVE_NOTE_KEY,settings.archive_note,{critical:true});
      // Preserve locally held notes when the older server snapshot predates this field.
      if(typeof settings.archive_note_visible==="boolean")safeStorageSet(ARCHIVE_NOTE_VISIBLE_KEY,settings.archive_note_visible?"1":"0",{critical:true});
      if(settings.database_updated_at)safeStorageSet(DATABASE_UPDATED_KEY,String(settings.database_updated_at),{critical:true});else safeStorageRemove(DATABASE_UPDATED_KEY);
      safeStorageSet(SYNC_LOCAL_UPDATED_KEY,String(updatedAt||new Date().toISOString()),{critical:true});
      safeStorageSet(SYNC_REVISION_KEY,String(Math.max(0,Number(revision)||0)),{critical:true});
      safeStorageSet(SYNC_DIRTY_KEY,"0",{critical:true});
      if(updatedAt)safeStorageSet(SYNC_LAST_AT_KEY,String(updatedAt),{critical:true});

      if(!finishStorageTransaction()){
        syncStatusMessage="Не вистачає локального сховища";
        renderSystemStatus();
        reloadPrimaryStateFromStorage();
        return false;
      }
      await window.KBJVStorage.whenIdle();
      syncConflict=false;syncStatusMessage="Синхронізовано";
    }catch(error){
      rollbackStorageTransaction();
      syncStatusMessage="Помилка застосування даних";renderSystemStatus();
      return false;
    }finally{syncApplyingRemote=false;}
    reloadPrimaryStateFromStorage();
    lastStateSnapshotFingerprint=syncFingerprint(snapshot);
    avAuditServerSnapshot(snapshot,updatedAt);
    return true;
  }

  function showSyncConflict(message="На іншому пристрої є новіші дані."){
    syncConflict=true;
    syncStatusMessage="Потрібно вибрати версію";
    if(systemSyncNote)systemSyncNote.textContent=message;
    renderSystemStatus();
  }

  function shouldDeferAutomaticRemoteApply(){
    // Any editing/import/export/admin dialog can contain unsaved user intent.
    if(document.querySelector(".product-modal.active")||archiveNoteEditing)return true;
    const active=document.activeElement;
    return !!active&&(["INPUT","TEXTAREA","SELECT"].includes(active.tagName)||active.isContentEditable);
  }

  async function getRemoteSyncState(){
    // Read-only system details must compare v2 records, never a stale v1
    // checkpoint after record-level migration has been activated.
    try{
      const active=await authApi('/sync/v2/status');
      if(active.active){
        setMigrationButtonVisibility(active);
        const remote=await window.AviculariaIncrementalSync.manifest(authApi);
        const local=await window.AviculariaIncrementalSync.localHashes(
          window.AviculariaIncrementalSync.asEntries(buildSyncSnapshot()));
        const union=new Set([...Object.keys(local),...remote.items.keys()]);
        const groups={blocks:true,calculator:true,archive:true,profile:true};
        for(const key of union){
          const a=local[key]??null,b=remote.items.get(key)??null;
          if(a===b)continue;
          if(key.startsWith('p:')||key==='s:order:products')groups.blocks=false;
          else if(key.startsWith('a:')||key==='s:order:archive')groups.archive=false;
          else if(key==='s:profile')groups.profile=false;
          else if(key==='s:settings') {groups.blocks=false;groups.archive=false;}
          else groups.calculator=false;
        }
        remoteSyncOverview={revision:remote.rev,updated_at:remote.updated,byte_size:remote.total};
        avSyncAudit={user:String(authUser.id),groups,checkedAt:Date.now(),updatedAt:remote.updated};
        renderAvSyncIndicators();renderSyncCopyComparison();
        return {ok:true,revision:remote.rev,updated_at:remote.updated,byte_size:remote.total,
          v2:true,snapshot:null};
      }
    }catch(error){if(error?.status!==404)throw error;}
    const data=await authApi("/sync/state");
    remoteSyncOverview={revision:Number(data?.revision||0),updated_at:data?.updated_at||"",byte_size:Number(data?.byte_size||0)};
    avAuditServerSnapshot(data?.snapshot,data?.updated_at);
    renderSyncCopyComparison();
    return data;
  }

  // Revision-only check: avoid downloading the entire JSON snapshot at every
  // automatic background poll. The old full GET remains authoritative whenever
  // data differ, on fresh sign-in, or when a user explicitly opens sync details.
  let syncMetadataEndpointAvailable=true;
  async function getRemoteSyncMeta(){
    if(!syncMetadataEndpointAvailable)return null;
    try{
      const meta=await authApi("/sync/meta");
      if(!meta || meta.ok!==true || !Number.isSafeInteger(Number(meta.revision)) ||
         typeof meta.has_snapshot!=="boolean")throw new Error("Некоректна відповідь перевірки синхронізації");
      remoteSyncOverview={revision:Number(meta.revision),updated_at:meta.updated_at||"",byte_size:Number(meta.byte_size||0)};
      return meta;
    }catch(error){
      // Deployment can briefly run a new site against Worker v106.
      // Only a missing endpoint triggers backward-compatible full-GET fallback.
      if(error?.status===404){syncMetadataEndpointAvailable=false;return null;}
      throw error;
    }
  }

  async function pushLocalSync({force=false}={}){
    try{await window.KBJVStorage.whenIdle();}catch(error){syncStatusMessage="Помилка локального збереження IndexedDB";renderSystemStatus();return false;}
    if(corruptLocalDataKeys.size){
      syncStatusMessage="Синхронізацію зупинено: пошкоджені локальні записи";
      renderSystemStatus();return false;
    }
    const snapshot=buildSyncSnapshot();
    // The browser can import a larger backup than Worker D1 sync accepts.
    // Reject locally with an explicit status rather than attempting a doomed upload.
    const snapshotBytes=new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    if(snapshotBytes>32*1024*1024){
      syncStatusMessage="Обсяг даних перевищує 32 МіБ — синхронізацію зупинено без видалення локальних записів. Зробіть резервний експорт.";
      renderSystemStatus();return false;
    }
    const baseRevision=Number(localStorage.getItem(SYNC_REVISION_KEY)||0);
    const submittedFingerprint=syncFingerprint(snapshot);
    const changeMarker=localStorage.getItem(SYNC_LOCAL_UPDATED_KEY);
    try{
      const data=await authApi("/sync/state",{method:"POST",body:{snapshot,base_revision:baseRevision,force}});
      const changedDuringRequest=syncFingerprint(buildSyncSnapshot())!==submittedFingerprint
        || localStorage.getItem(SYNC_LOCAL_UPDATED_KEY)!==changeMarker;
      if(!setSyncMeta(data.revision,data.updated_at,{dirty:changedDuringRequest,status:changedDuringRequest?"Є локальні зміни":"Синхронізовано"}))return false;
      lastStateSnapshotFingerprint=submittedFingerprint;
      avAuditServerSnapshot(snapshot,data.updated_at);
      if(changedDuringRequest)scheduleAdminStateSync(1000);
      return true;
    }catch(error){
      if(error?.status===409){showSyncConflict(error?.message||"На іншому пристрої є новіші дані.");return false;}
      syncStatusMessage=error?.status===0?"Немає мережі":String(error?.message||"Помилка синхронізації").slice(0,160);
      renderSystemStatus();
      return false;
    }
  }

  async function syncStateNow({preferServer=false,forceLocal=false,silent=false}={}){
    try{await window.KBJVStorage.whenIdle();}catch(error){syncStatusMessage="Помилка локального збереження IndexedDB";renderSystemStatus();return false;}
    if(corruptLocalDataKeys.size){
      syncStatusMessage="Синхронізацію зупинено: пошкоджені локальні записи";
      renderSystemStatus();return false;
    }
    if(syncInProgress||syncCheckInProgress||!authToken||!authUser||!appInitialized)return false;
    if(!navigator.onLine){syncStatusMessage="Немає мережі";renderSystemStatus();return false;}
    syncInProgress=true;syncStatusMessage="Синхронізація...";renderSystemStatus();
    try{
      // v235 opt-in protocol. Older v107 Workers continue using v1 unchanged.
      let v2Status=null;
      try{v2Status=await authApi('/sync/v2/status');}
      catch(error){if(error?.status!==404)throw error;}
      setMigrationButtonVisibility(v2Status);
      if(v2Status?.active){
        const marker=localStorage.getItem(SYNC_LOCAL_UPDATED_KEY);
        const startingFingerprint=syncFingerprint(buildSyncSnapshot());
        const unchanged=()=>marker===localStorage.getItem(SYNC_LOCAL_UPDATED_KEY)
          && startingFingerprint===syncFingerprint(buildSyncSnapshot());
        const ok=await window.AviculariaIncrementalSync.synchronize({
          api:authApi,userId:Number(authUser.id),build:buildSyncSnapshot,
          validate:validateSyncSnapshotV91,apply:applyRemoteSnapshot,
          setMeta:(rev,at)=>setSyncMeta(rev,at,{dirty:!unchanged(),
            status:unchanged()?'Синхронізовано':'Є локальні зміни'}),
          conflict:message=>showSyncConflict(message),
          preferServer,forceLocal,isEditing:shouldDeferAutomaticRemoteApply,isUnchanged:unchanged
        });
        if(ok){
          lastStateSnapshotFingerprint=syncFingerprint(buildSyncSnapshot());
          syncConflict=false;
          // A validated v2 commit or pull proves the current snapshot; detailed
          // section comparisons remain available via manifest hashes.
          avAuditServerSnapshot(buildSyncSnapshot(),new Date().toISOString());
        } else if(!syncConflict){
          syncStatusMessage='Очікування безпечної синхронізації';
        }
        renderSystemStatus();
        return ok;
      }
      // Step 1: metadata-only probe. No full JSON transfer if the server is
      // already known to match this browser session, or if a CAS upload is due.
      const knownRevision=Number(localStorage.getItem(SYNC_REVISION_KEY)||0);
      const dirty=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
      const local=buildSyncSnapshot();
      const localFingerprint=syncFingerprint(local);
      const meta=await getRemoteSyncMeta();
      if(meta && !forceLocal && !preferServer){
        const remoteRev=Number(meta.revision||0);
        if(meta.has_snapshot && knownRevision>0 && remoteRev===knownRevision){
          // Optimistic concurrency is still checked on every POST by Worker.
          if(dirty)return await pushLocalSync({force:false});
          if(lastStateSnapshotFingerprint && lastStateSnapshotFingerprint===localFingerprint){
            if(!setSyncMeta(remoteRev,meta.updated_at,{dirty:false,status:"Синхронізовано"}))return false;
            return true;
          }
        }
        if(remoteRev>knownRevision && dirty){
          showSyncConflict();
          return false;
        }
        if(!meta.has_snapshot && remoteRev===0)return await pushLocalSync({force:false});
      }
      // Step 2: full content is still required to compare unknown local data,
      // review a conflict, apply another device's changes, or restore from D1.
      const remote=await getRemoteSyncState();
      const remoteRevision=Number(remote.revision||0);
      if(remote.snapshot&&!validateSyncSnapshotV91(remote.snapshot)){
        syncStatusMessage="Помилка структури серверних даних; локальні записи не змінено";
        syncConflict=true;renderSystemStatus();return false;
      }
      const remoteFingerprint=syncFingerprint(remote.snapshot);

      if(forceLocal)return await pushLocalSync({force:true});
      if(preferServer){
        if(remote.snapshot){return await applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);}
        syncStatusMessage="На сервері ще немає даних";renderSystemStatus();return false;
      }
      if(!remote.snapshot)return await pushLocalSync({force:false});

      // Перше оновлення зі старої v60-v63: серверний snapshot мав revision=0.
      // Поточний пристрій піднімає його до версійної синхронізації без втрати локальних даних.
      if(knownRevision===0&&remoteRevision===0){
        // Equal snapshots are not a conflict, even if both contain real data.
        if(localFingerprint===remoteFingerprint){
          if(!setSyncMeta(remoteRevision,remote.updated_at,{dirty:false,status:"Синхронізовано"}))return false;
          lastStateSnapshotFingerprint=localFingerprint;
          return true;
        }
        // An existing legacy server snapshot may contain valuable records at revision 0.
        // Never overwrite it just because this device has not synchronized before.
        const localHasData=localSnapshotHasData(local);
        const serverHasData=localSnapshotHasData(remote.snapshot);
        if(serverHasData&&!localHasData)return await applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);
        if(serverHasData&&localHasData){
          showSyncConflict("Локальні й серверні дані містять записи з початковою ревізією. Виберіть версію після створення резервної копії.");
          return false;
        }
        if(localHasData)return await pushLocalSync({force:false});
        return await applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);
      }

      if(localFingerprint===remoteFingerprint){
        if(!setSyncMeta(remoteRevision,remote.updated_at,{dirty:false,status:"Синхронізовано"}))return false;
        lastStateSnapshotFingerprint=localFingerprint;
        return true;
      }

      if(remoteRevision>knownRevision){
        if(dirty){showSyncConflict();return false;}
        if(shouldDeferAutomaticRemoteApply()){
          syncStatusMessage="Очікування завершення редагування";
          renderSystemStatus();
          scheduleAdminStateSync(1500);
          return false;
        }
        return await applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);
      }
      if(remoteRevision===knownRevision){
        if(dirty)return await pushLocalSync({force:false});
        // Однакова ревізія, але різний вміст — не робимо тихого перезапису.
        showSyncConflict("Локальні й серверні дані відрізняються. Виберіть, яку версію залишити.");
        return false;
      }
      showSyncConflict("Серверна ревізія не збігається з локальною. Виберіть, яку версію залишити.");
      return false;
    }catch(error){
      if(error?.status===409){
        showSyncConflict(String(error?.message||'На іншому пристрої є новіші записи.'));
        return false;
      }
      syncStatusMessage=syncExplainError(error);
      if(!silent&&error?.message)console.warn("Sync failed:",error);
      renderSystemStatus();
      return false;
    }finally{syncInProgress=false;renderSystemStatus();}
  }

  async function syncAdminStateSnapshot(){return syncStateNow({silent:true});}

  function scheduleAdminStateSync(delay=900){
    clearTimeout(stateSyncTimer);
    stateSyncTimer=setTimeout(()=>void syncAdminStateSnapshot(),Math.max(0,Number(delay)||0));
  }

  function localStorageUsage(){
    let chars=0;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||"";
        chars+=key.length+String(localStorage.getItem(key)||"").length;
      }
    }catch(_){}
    return chars*2;
  }

  const LOCAL_STORAGE_REFERENCE_LIMIT=5*1024*1024;
  let browserStorageQuota=0,browserStorageUsed=0;
  async function measureBrowserStorageQuota(){
    if(!navigator.storage?.estimate)return;
    try{
      const result=await navigator.storage.estimate();
      browserStorageQuota=Number(result.quota||0);
      browserStorageUsed=Number(result.usage||0);
      renderSystemStatus();
    }catch(_){}
  }
  window.addEventListener("kbjv:storage-failure",event=>{
    storageLastError="Не вдалося записати великі дані IndexedDB. Не закривайте сайт до створення резервної копії.";
    syncStatusMessage="Локальне сховище: помилка запису";
    renderSystemStatus();
    alert(storageLastError+" "+String(event?.detail?.message||""));
  });

  function formatBytes(bytes){
    const value=Math.max(0,Number(bytes)||0);
    if(value<1024)return `${value} Б`;
    if(value<1024*1024)return `${(value/1024).toFixed(1)} КБ`;
    return `${(value/(1024*1024)).toFixed(2)} МБ`;
  }

  let breakdownTimer=null,breakdownAt=0,breakdownInProgress=false;
  function sectionPayloadSizes(){
    const calcDraft=String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??"");
    const sections=[
      ["КБЖВ-блоки",products],
      ["КБЖВ-калькулятор",{entries:calculatorItems,draft:calcDraft,daily_goal:dailyGoal,quick_presets:calculatorQuickPresets}],
      ["КБЖВ-архів",{entries:archiveItems,note:archiveNote}],
      ["Профіль",profileData],
      ["Зручності",{draft:localStorage.getItem(`avicularia_testing_user_${authUser?.id||""}_utilities_draft_v101`)||""}],
      ["Консоль",consoleItems],
      ["Інші налаштування",{sort:currentSort,category_order:getCategoryOrder(),custom_categories:getCustomCategories(),departments_enabled:departmentsEnabled,undo:localStorage.getItem(UNDO_KEY)||""}]
    ];
    const encoder=new TextEncoder();
    const result=sections.map(([name,value])=>({name,bytes:encoder.encode(JSON.stringify(value??null)).byteLength}));
    const t=window.kbjvTrainingInfo?.snapshot?.();
    result.splice(5,0,{name:"Тренування",bytes:(t?.planBytes||0)+(t?.pdfBytes||0)});
    return result;
  }
  function scheduleStorageBreakdown(force=false){
    const node=$("system-storage-breakdown");
    if(!node||!document.querySelector("#console.page.active")||breakdownInProgress)return;
    if(!force&&Date.now()-breakdownAt<20000)return;
    clearTimeout(breakdownTimer);
    breakdownTimer=setTimeout(()=>{
      breakdownInProgress=true;
      try{
        const sections=sectionPayloadSizes(),total=sections.reduce((sum,item)=>sum+item.bytes,0)||1;
        node.replaceChildren();
        sections.forEach(({name,bytes})=>{
          const row=document.createElement("div");row.className="storage-breakdown-item";
          const label=document.createElement("span");label.textContent=name;
          const value=document.createElement("strong");value.textContent=`${formatBytes(bytes)} · ${(bytes*100/total).toFixed(1)}%`;
          const track=document.createElement("div");track.className="storage-track";
          const fill=document.createElement("div");fill.className="storage-fill";fill.style.width=`${Math.min(100,bytes*100/total)}%`;
          track.append(fill);row.append(label,value,track);node.append(row);
        });
        breakdownAt=Date.now();
      }catch(e){node.textContent="Не вдалося обчислити розподіл сховища";}
      finally{breakdownInProgress=false;}
    },force?0:300);
  }

  // v198: read-only section comparison. This does NOT initiate an upload or claim
  // that local-only drafts / offline devices have been synchronized.
  let avSyncAudit=null;
  function avSyncSections(snapshot){
    const s=snapshot?.settings||{};
    const pick=(keys)=>Object.fromEntries(keys.map(k=>[k,s[k]??null]));
    return {
      blocks:{products:snapshot?.products,settings:pick(['sort_mode','random_sort_seed','departments_enabled','category_order','custom_categories','deleted_default_categories','database_updated_at'])},
      calculator:{calculator:snapshot?.calculator,calculator_draft:snapshot?.calculator_draft,daily_goal:snapshot?.daily_goal,calculator_quick_presets:snapshot?.calculator_quick_presets},
      archive:{archive:snapshot?.archive,settings:pick(['archive_note','archive_note_visible','stats_to_today','stats_goal_visible','site_data_visible'])},
      profile:{profile:snapshot?.profile}
    };
  }
  function avAuditServerSnapshot(snapshot,updatedAt){
    if(!authUser)return;
    if(!snapshot||!validateSyncSnapshotV91(snapshot)){
      avSyncAudit={user:String(authUser.id),groups:null,checkedAt:Date.now(),updatedAt,reason:'На сервері немає коректного знімка'};
    }else{
      const local=avSyncSections(buildSyncSnapshot()),remote=avSyncSections(snapshot),groups={};
      for(const key of Object.keys(local))groups[key]=syncFingerprint(local[key])===syncFingerprint(remote[key]);
      avSyncAudit={user:String(authUser.id),groups,checkedAt:Date.now(),updatedAt};
    }
    renderAvSyncIndicators();
  }
  function avSyncGroupStatus(key){
    if(!authUser)return {state:'unknown',text:'Немає акаунта'};
    if(!navigator.onLine)return {state:'unknown',text:'Офлайн'};
    if(key==='training'){
      const data=window.kbjvTrainingInfo?.snapshot?.();
      if(!data?.loaded)return {state:'unknown',text:'Очікування даних'};
      const state=data.sync||'';
      if(state==='Синхронізовано')return {state:'ok',text:'Синхронізовано'};
      if(/конфлікт|помилка|не завершена/iu.test(state))return {state:'bad',text:state};
      if(/очікує/iu.test(state))return {state:'warn',text:state};
      return {state:'unknown',text:state||'Немає підтвердження'};
    }
    if(syncLastCheckError)return {state:'unknown',text:'Помилка перевірки'};
    if(!avSyncAudit||avSyncAudit.user!==String(authUser.id))return {state:'unknown',text:'Не перевірено'};
    if(avSyncAudit.checkedAt&&Date.now()-avSyncAudit.checkedAt>120000)return {state:'unknown',text:'Потрібна нова перевірка'};
    if(syncInProgress)return {state:'unknown',text:'Синхронізація…'};
    if(syncConflict)return {state:'bad',text:'Конфлікт даних'};
    if(!avSyncAudit.groups)return {state:'unknown',text:'Немає даних сервера'};
    // A section can be green only if its actual content matched the server.
    return avSyncAudit.groups[key] ? {state:'ok',text:'Синхронізовано'} : {state:'warn',text:'Дані відрізняються'};
  }
  function avSetIndicator(node,status){
    if(!node)return;
    node.classList.remove('is-ok','is-bad','is-warn','is-unknown');
    node.classList.add('is-'+status.state);
    const label=node.querySelector('span');if(label)label.textContent=status.text;
    node.setAttribute('aria-label',status.text);
  }
  function renderAvSyncIndicators(){
    const statuses=['blocks','calculator','archive','profile','training'].map(key=>[key,avSyncGroupStatus(key)]);
    for(const [key,status] of statuses){
      avSetIndicator(document.querySelector(`[data-av-sync-group="${key}"]`),status);
      if(key==='training')avSetIndicator($('system-training-sync'),status);
    }
    const values=statuses.map(([,state])=>state.state);
    const dirty=localStorage.getItem(SYNC_DIRTY_KEY)==='1';
    const summary=syncConflict?{state:'bad',text:'Конфлікт даних'}:
      syncLastCheckError?{state:'bad',text:'Помилка перевірки'}:
      values.every(s=>s==='ok')&&!dirty?{state:'ok',text:'Синхронізовано'}:
      values.some(s=>s==='bad')?{state:'bad',text:'Помилка синхронізації'}:
      values.some(s=>s==='warn')||dirty?{state:'warn',text:'Не синхронізовано'}:
      {state:'unknown',text:'Потребує перевірки'};
    avSetIndicator($('system-total-sync'),summary);
    const checked=$('system-sync-details-checked');
    if(checked){
      checked.textContent=syncLastCheckError
        ?`Перевірку D1 не завершено: ${syncLastCheckError}. Локальні дані не змінено.`
        :avSyncAudit?.user===String(authUser?.id)&&avSyncAudit.checkedAt
          ?`Перевірка КБЖВ: ${formatAdminDate(new Date(avSyncAudit.checkedAt).toISOString())}. Тренування синхронізуються окремо. Локальні чернетки й налаштування пристрою не входять до D1.`
          :'Стан сервера ще не перевірено. Локальні чернетки та налаштування цього пристрою не входять до D1.';
    }
  }

  function renderSystemStatus(){
    if(!authUser&&syncV2MigrationButton)syncV2MigrationButton.hidden=true;
    if(systemVersion)systemVersion.textContent=SITE_VERSION;
    const training=window.kbjvTrainingInfo?.snapshot?.();
    const tv=$("system-training-version"),tu=$("system-training-updated");
    if(tv)tv.textContent=training?.loaded?(training.version?`v${training.version}`:"Немає плану"):"Очікування";
    if(tu)tu.textContent=training?.updatedAt?formatAdminDate(training.updatedAt):(training?.version?"Дата не вказана у старому плані":"Ще не змінювався");
    const trainingImported=$('system-training-imported');
    if(trainingImported)trainingImported.textContent=training?.importedAt?formatAdminDate(training.importedAt):'Немає даних для старих імпортів';
    renderAvSyncIndicators();
    scheduleStorageBreakdown();
    renderSyncCopyComparison();
    if(systemNetwork){
      const isOnline=navigator.onLine;
      systemNetwork.textContent=isOnline?"Онлайн":"Офлайн";
      systemNetwork.classList.toggle("network-online",isOnline);
      systemNetwork.classList.toggle("network-offline",!isOnline);
    }
    const storageBytes=localStorageUsage();
    const usingIndexedDb=window.KBJVStorage.available;
    const storagePercent=usingIndexedDb&&browserStorageQuota
      ?Math.min(100,100*browserStorageUsed/browserStorageQuota)
      :Math.min(100,(storageBytes/LOCAL_STORAGE_REFERENCE_LIMIT)*100);
    const integrityWarning=corruptLocalDataKeys.size?"Є пошкоджені локальні дані. Збереження й синхронізацію обмежено до відновлення резервної копії.":"";
    const storageDanger=Boolean(integrityWarning||storageLastError)||storagePercent>=80;
    if(systemStorage)systemStorage.textContent=integrityWarning||storageLastError||(usingIndexedDb
      ?`Налаштування ≈${formatBytes(storageBytes)} · дані IndexedDB${browserStorageQuota?` · квота ≈${formatBytes(browserStorageQuota)}`:""}`
      :`${formatBytes(storageBytes)} / ≈5 МБ · ${storagePercent.toFixed(storagePercent<10?1:0)}%`);
    if(systemStorageCard)systemStorageCard.classList.toggle("system-status-danger",storageDanger);
    if(systemStorageNote)systemStorageNote.textContent=integrityWarning
      ?"Не очищуйте дані браузера. Відновіть перевірену повну JSON-копію."
      :usingIndexedDb
        ?(storageDanger?"Місце на пристрої закінчується — зробіть резервну копію.":(confirmedIncrementalMode?"Локальні дані зберігає IndexedDB; квоту визначає пристрій. У D1 активна поштучна синхронізація (програмний захисний ліміт 400 МБ записів, не гарантована вільна місткість). 32 МіБ — межа старого повного знімка, не локального сховища.":"Великі записи: IndexedDB. Квоту визначає браузер і пристрій. До переходу на поштучну синхронізацію повний знімок КБЖВ обмежено 32 МіБ; це не квота iPhone."))
        :(storageDanger?"Локальне сховище майже заповнене — створіть резервну копію.":"IndexedDB недоступна: використовується старе сховище з орієнтовним лімітом 5 МБ.");
    const productsCountNode=$("system-products-count");
    const archiveCountNode=$("system-archive-count");
    if(productsCountNode)productsCountNode.textContent=String(products.filter(p=>!avDeferredProduct(p)).length);
    if(archiveCountNode)archiveCountNode.textContent=String(archiveItems.length);
    if(systemUndo)systemUndo.textContent=`${loadUndoStack().length}/3`;
    if(systemSync)systemSync.textContent=syncStatusMessage;
    const syncAt=localStorage.getItem(SYNC_LAST_AT_KEY);
    if(systemBackupSync)systemBackupSync.textContent=syncAt?formatAdminDate(syncAt):"Ще не виконувалася";
    const databaseUpdated=localStorage.getItem(DATABASE_UPDATED_KEY);
    if(systemDatabaseUpdated){
      const date=databaseUpdated?new Date(databaseUpdated):null;
      systemDatabaseUpdated.textContent=date&&Number.isFinite(date.getTime())?formatAdminDate(databaseUpdated):"Ще не оновлювалася";
    }
    const lastExport=localStorage.getItem(LAST_EXPORT_KEY),lastImport=localStorage.getItem(LAST_IMPORT_KEY);
    if(systemExport)systemExport.textContent=lastExport?formatAdminDate(lastExport):"Ще не виконувався";
    if(systemImport)systemImport.textContent=lastImport?formatAdminDate(lastImport):"Ще не виконувався";
    const auditedGroups=avSyncAudit?.user===String(authUser?.id||'')&&avSyncAudit?.checkedAt
      &&Date.now()-avSyncAudit.checkedAt<120000?avSyncAudit.groups:null;
    const verifiedDifference=!!auditedGroups&&Object.values(auditedGroups).some(equal=>equal===false);
    const canChooseSource=!!authUser&&!syncLastCheckError&&navigator.onLine
      &&(syncConflict||verifiedDifference);
    if(syncUseServer)syncUseServer.hidden=!canChooseSource;
    if(syncUseLocal)syncUseLocal.hidden=!canChooseSource;
    if(systemSyncNote&&!syncConflict){
      const normal=new Set(["Синхронізовано","Є локальні зміни","Ще не виконувалася","Синхронізація...","Активна поштучна синхронізація v2"]);
      systemSyncNote.textContent=syncLastCheckError
        ?`Не вдалося перевірити сервер: ${syncLastCheckError}. Локальні дані збережено.`
        :!normal.has(syncStatusMessage)
          ?`Причина незавершеної синхронізації: ${syncStatusMessage}`
          :"Автосинхронізація захищена ревізіями: старіший пристрій не перезапише новіші дані без підтвердження";
    }
  }

  function renderWorkerVersionMarker(running){
    if(!Number.isFinite(running)){
      writeVersionMarker(workerLatestNode,"Версію сервера не визначено","version-unknown");return;
    }
    const expected=numericVersion(latestReleaseManifest?.worker_version);
    if(expected===null){writeVersionMarker(workerLatestNode,"Останню версію не перевірено","version-unknown");return;}
    writeVersionMarker(workerLatestNode,running<expected?`Є оновлення: v${expected}`:running===expected?"Остання версія сервера":"Сервер новіший за маніфест",running<expected?"version-old":"version-ok");
  }
  async function refreshSystemStatus({checkWorker=true}={}){
    renderSystemStatus();
    if(!checkWorker||!systemWorker)return;
    void updateReleaseStatus().then(()=>{if(systemWorker?.dataset.workerVersion)renderWorkerVersionMarker(Number(systemWorker.dataset.workerVersion));});
    systemWorker.textContent="Перевірка";
    if(!navigator.onLine){systemWorker.textContent="Немає мережі";writeVersionMarker(workerLatestNode,"Офлайн","version-unknown");return;}
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),5000);
      const response=await fetch(`${AUTH_API_URL}/health`,{cache:"no-store",signal:controller.signal});
      clearTimeout(timer);
      const data=await response.json().catch(()=>({}));
      systemWorker.textContent=response.ok?`Доступний · v${data.version??"?"}`:"Помилка";
      if(response.ok){systemWorker.dataset.workerVersion=String(data.version??"");renderWorkerVersionMarker(Number(data.version));}
      else writeVersionMarker(workerLatestNode,"Сервер не відповідає","version-unknown");
    }catch(_){systemWorker.textContent="Недоступний";writeVersionMarker(workerLatestNode,"Неможливо перевірити","version-unknown");}
  }

  function scheduleExternalReload(){
    clearTimeout(externalReloadTimer);
    externalReloadTimer=setTimeout(()=>{
      if(document.querySelector(".product-modal.active")){scheduleExternalReload();return;}
      reloadPrimaryStateFromStorage();
      syncStatusMessage=localStorage.getItem(SYNC_DIRTY_KEY)==="1"?"Є локальні зміни":"Синхронізовано";
      renderSystemStatus();
    },250);
  }

  // Each semantic handler keeps its own detailed message. A fallback covers
  // buttons that do not have a dedicated logAction call, without double logging
  // normal synchronous or short delayed handlers.
  const pendingUiActions=[];
  function markCoveredUiAction(){
    const now=Date.now();
    for(let i=pendingUiActions.length-1;i>=0;i--){
      const item=pendingUiActions[i];
      if(!item.covered&&now-item.at<480){item.covered=true;break;}
    }
  }
  function logAction(message,metadata=null,skipPendingUiMatch=false){
    const time=new Date().toISOString();
    const rawText=String(message??"Невідома дія").trim();
    const text=normalizeAuditSentence(rawText);
    if(!text)return;
    if(!skipPendingUiMatch)markCoveredUiAction();
    consoleItems.push({id:createId("console"),time,message:text});
    saveConsoleLocal();
    renderConsole();
    // Preserve raw server event strings: the Worker uses the exact original
    // wording of certain security-sensitive cleanup events as a predicate.
    queueAuditAction(rawText,time,"site_action",metadata);
  }

  // Last-resort audit for meaningful UI controls. This deliberately never
  // records keystrokes, field values, passwords, generated codes or free text.
  // A named semantic action takes priority if it is emitted within 420 ms.
  function uiControlLabel(el){
    const name=el.getAttribute('aria-label')||el.getAttribute('title')
      ||el.dataset.originalText||el.textContent||'';
    const trimmed=String(name).replace(/\s+/g,' ').trim();
    return trimmed.slice(0,90)||'Елемент керування';
  }
  function uiActionContext(el){
    const modal=el.closest('.product-modal');
    if(modal){
      const title=modal.querySelector('h2,h3,[id$="-title"]');
      const name=title?.textContent?.replace(/\s+/g,' ').trim().slice(0,90);
      return {modal,name:name||''};
    }
    const page=el.closest('.page');
    const section=page?.querySelector('h1,h2');
    return {modal:null,name:String(section?.textContent||page?.id||'').replace(/\s+/g,' ').trim().slice(0,90)};
  }
  function fallbackUiDescription(item){
    const {el,label,context}=item;
    if(context.modal){
      const stillOpen=context.modal.classList.contains('active')&&!context.modal.hidden;
      if(!stillOpen&&/^(закрити|назад|скасувати)$/iu.test(label))return `Закрито вікно «${context.name||'Діалог'}»`;
      return `Натиснуто «${label}» у вікні «${context.name||'Діалог'}»`;
    }
    return `Натиснуто «${label}»${context.name?` у розділі «${context.name}»`:''}`;
  }
  document.addEventListener('click',event=>{
    if(!authUser||!appInitialized||!event.isTrusted&&event.detail===0)return;
    const target=event.target instanceof Element?event.target.closest('button,[role="button"],a[href]'):null;
    if(!target||target.matches(':disabled,[aria-disabled="true"]')||target.closest('[inert],#login-page,#register-page'))return;
    if(target.id==="quick-scroll-up"||target.id==="quick-scroll-down")return;
    const label=uiControlLabel(target);
    const item={at:Date.now(),el:target,label,context:uiActionContext(target),covered:false};
    pendingUiActions.push(item);
    setTimeout(()=>{
      const pos=pendingUiActions.indexOf(item);
      if(pos>=0)pendingUiActions.splice(pos,1);
      if(!item.covered&&authUser)logAction(fallbackUiDescription(item),null,true);
    },430);
  },true);
  // Non-text form control changes that have no dedicated audit handler.
  document.addEventListener('change',event=>{
    if(!authUser||!appInitialized)return;
    const target=event.target;
    if(!(target instanceof HTMLInputElement)&&!(target instanceof HTMLSelectElement))return;
    if(target instanceof HTMLInputElement&&!['checkbox','radio'].includes(target.type))return;
    const label=(target.getAttribute('aria-label')||target.labels?.[0]?.textContent||target.name||target.id||'Налаштування').replace(/\s+/g,' ').trim().slice(0,90);
    // The selected value itself may be private and must not be logged.
    const item={at:Date.now(),covered:false};
    pendingUiActions.push(item);
    setTimeout(()=>{
      const pos=pendingUiActions.indexOf(item);
      if(pos>=0)pendingUiActions.splice(pos,1);
      if(!item.covered&&authUser)logAction(`Змінено налаштування «${label}»`,null,true);
    },430);
  },true);
  function renderConsole(){
    trimLocalConsoleHistory();
    if(!consoleLog)return; consoleLog.innerHTML="";
    if(!consoleItems.length){consoleLog.innerHTML='<div class="console-entry">Журнал дій порожній.</div>';return;}
    [...consoleItems].reverse().forEach(item=>{
      const row=document.createElement("div");row.className="console-entry";
      const dt=item.time?new Date(item.time):new Date();row.textContent=`[${formatConsoleDate(dt)}] ${readableAuditText(item.message)}`;consoleLog.append(row);
    });
  }

  // Two complete session rows stay visible; additional rows are available by scrolling.
  function fitAvSessionViewport(viewport){
    if(!viewport||!viewport.isConnected)return;
    const rows=[...viewport.children].filter(el=>el.classList?.contains("av-session-row"));
    if(rows.length<=2){viewport.classList.remove("av-session-scrollable");viewport.style.removeProperty("max-height");return;}
    const outer=viewport.getBoundingClientRect();
    const second=rows[1].getBoundingClientRect();
    const measured=second.bottom-outer.top;
    // Hidden tabs cannot be measured yet. Their first visible resize recalculates the cap.
    const height=measured>40?Math.ceil(measured):165;
    if(viewport.style.maxHeight!==`${height}px`)viewport.style.maxHeight=`${height}px`;
    viewport.classList.add("av-session-scrollable");
  }
  const avSessionResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(entries=>{
    const targets=new Set(entries.map(e=>e.target.closest(".av-session-viewport")).filter(Boolean));
    targets.forEach(viewport=>requestAnimationFrame(()=>fitAvSessionViewport(viewport)));
  }):null;
  function registerAvSessionViewport(viewport){
    if(!viewport)return;
    requestAnimationFrame(()=>fitAvSessionViewport(viewport));
    if(avSessionResizeObserver){
      [...viewport.children].slice(0,2).forEach(row=>avSessionResizeObserver.observe(row));
    }
  }
  const avSessionsRequestNumber={mine:0,admin:0};
  function relativeSessionStatus(entry){
    if(!entry.valid)return "Завершений";
    if(entry.current)return "Поточний сеанс";
    return entry.online?"Активний":"Неактивний";
  }
  // The browser's native confirm exposed corrupted legacy device labels on iPhone.
  // Show the same sanitized label seen in the session card inside a fixed site dialog.
  function confirmOtherDeviceSession(deviceName){
    const modal=$("av-session-confirm-modal"),description=$("av-session-confirm-description");
    const cancel=$("av-session-confirm-cancel"),yes=$("av-session-confirm-yes");
    description.textContent=`Завершити вхід з пристрою «${deviceName}»?`;
    modal.hidden=false;modal.classList.add("active","modal-topmost");
    document.body.classList.add("edit-modal-open");
    const prevFocus=document.activeElement;
    return new Promise(resolve=>{
      let settled=false;
      const finish=accepted=>{
        if(settled)return;settled=true;
        cancel.removeEventListener("click",onCancel);
        yes.removeEventListener("click",onYes);
        modal.removeEventListener("click",onOutside);
        document.removeEventListener("keydown",onKey);
        modal.hidden=true;modal.classList.remove("active","modal-topmost");
        document.body.classList.remove("edit-modal-open");
        try{prevFocus?.focus?.({preventScroll:true});}catch(_){}
        resolve(accepted);
      };
      const onCancel=()=>{
        window.kbjvButtonFeedback?.show(cancel,"Скасовано","error",230);
        setTimeout(()=>finish(false),240);
      };
      const onYes=()=>finish(true);
      const onOutside=e=>{if(e.target===modal)finish(false);};
      const onKey=e=>{if(e.key==="Escape"){e.preventDefault();finish(false);}};
      cancel.addEventListener("click",onCancel,{once:true});
      yes.addEventListener("click",onYes,{once:true});
      modal.addEventListener("click",onOutside);
      document.addEventListener("keydown",onKey);
      requestAnimationFrame(()=>cancel.focus({preventScroll:true}));
    });
  }
  async function renderAviculariaSessions(admin=false){
    const root=$(admin?"av-admin-sessions-list":"av-my-sessions-list");
    if(!root||!authToken)return false;
    if(admin&&!isAdminUser())return false;
    if(!navigator.onLine){root.textContent="Немає мережі. Історія сеансів доступна після підключення";return false;}
    const kind=admin?"admin":"mine";
    const requestNumber=++avSessionsRequestNumber[kind];
    avSessionResizeObserver?.disconnect();
    root.textContent="Завантаження сеансів";
    try{
      const data=await authApi(admin?"/admin/sessions":"/auth/sessions");
      if(requestNumber!==avSessionsRequestNumber[kind])return true;
      root.replaceChildren();
      const list=Array.isArray(data.sessions)?data.sessions:[];
      if(!list.length){
        root.textContent="Сеансів ще немає";
        if(admin)for(const e of adminUsersList?.querySelectorAll(".av-admin-user-session-list")||[])e.textContent="Активних сеансів немає";
        return true;
      }
      const count=document.createElement("div");count.className="av-session-count";
      count.textContent=admin?`Сеансів користувачів: ${list.length}`:`Останні сеанси: ${list.length}`;
      root.append(count);
      for(const entry of list){
        const item=document.createElement("div");item.className="av-session-row";
        if(admin)item.dataset.userId=String(entry.user_id??"");
        const main=document.createElement("div");main.className="av-session-main";
        const device=document.createElement("strong");device.className="av-session-device";
        const dot=document.createElement("i");dot.className="av-session-indicator";
        dot.classList.toggle("is-online",!!entry.online||!!entry.current);
        dot.setAttribute("aria-hidden","true");
        const deviceLabel=document.createElement("span");const recognized=/^(iPhone|iPad|Android телефон|Android планшет|Комп[’']ютер · (Windows|macOS|Linux))$/;const normalized=recognized.test(String(entry.device||""))?String(entry.device):"Невизначений девайс";deviceLabel.textContent=admin?`${entry.username} · ${normalized}`:normalized;
        device.append(dot,deviceLabel);main.append(device);
        if(!admin&&entry.valid&&!entry.current&&Number.isSafeInteger(Number(entry.session_id))){
          const revoke=document.createElement("button");revoke.type="button";revoke.className="av-session-end";
          revoke.textContent="Вийти";revoke.setAttribute("aria-label",`Завершити сеанс: ${normalized}`);
          revoke.addEventListener("click",async()=>{
            if(revoke.disabled)return;
            const accepted=await confirmOtherDeviceSession(normalized);
            if(!accepted)return; // Cancelling a dialog must not alter the original button.
            revoke.disabled=true;showButtonState(revoke,"Завершення...","info",0);
            try{
              await authApi(`/auth/sessions/${Number(entry.session_id)}/revoke`,{method:"POST"});
              showButtonState(revoke,"Завершено","success",750);
              logAction(`Завершено сеанс іншого пристрою: ${normalized}.`);
              setTimeout(()=>void renderAviculariaSessions(false),800);
            }catch(error){revoke.disabled=false;showButtonState(revoke,"Помилка","error");}
          });
          main.append(revoke);
        }
        const status=document.createElement("div");status.className="av-session-note";
        status.textContent=relativeSessionStatus(entry);
        const info=document.createElement("div");info.className="av-session-line";
        info.textContent=`Вхід: ${formatAdminDate(entry.created_at)} · Остання активність: ${formatAdminDate(entry.last_seen_at)}`;
        item.append(main,status,info);
        if(entry.ended_at||!entry.valid){
          const ended=document.createElement("div");ended.className="av-session-line";
          ended.textContent=entry.ended_at?`Завершено: ${formatAdminDate(entry.ended_at)}`:"Термін дії завершився";
          item.append(ended);
        }
        root.append(item);
      }
      if(admin){
        // Match by stable numeric user ID; every session remains in its owner's own card.
        for(const card of adminUsersList?.querySelectorAll(".av-admin-user-sessions")||[]){
          const listNode=card.querySelector(".av-admin-user-session-list");
          const match=[...root.querySelectorAll(".av-session-row")].filter(node=>node.dataset.userId===card.dataset.userId);
          listNode.replaceChildren();
          if(!match.length){listNode.textContent="Сеансів немає";continue;}
          const viewport=document.createElement("div");viewport.className="av-session-viewport";
          match.forEach(node=>viewport.append(node));
          listNode.append(viewport);
          registerAvSessionViewport(viewport);
        }
      }else{
        const rows=[...root.querySelectorAll(":scope > .av-session-row")];
        const viewport=document.createElement("div");viewport.className="av-session-viewport";
        rows.forEach(row=>viewport.append(row));
        root.append(viewport);
        registerAvSessionViewport(viewport);
      }
      return true;
    }catch(error){root.textContent=error?.message||"Не вдалося отримати сеанси.";return false;}
  }
  setInterval(()=>{
    if(document.visibilityState!=="visible"||!authToken)return;
    if($("console")?.classList.contains("active"))void renderAviculariaSessions(false);
    if($("admin")?.classList.contains("active"))void renderAviculariaSessions(true);
  },60000);

  function undoStorageValue(key){const value=localStorage.getItem(key);return value===null?null:value;}
  // Gallery frames are deliberately excluded from Undo. This prevents old
  // snapshots from restoring a photo deleted to reclaim space and avoids
  // multiplying the same JPEG data in three local history entries.
  function undoProductsWithoutPhotos(rows){
    if(!Array.isArray(rows))return rows;
    return rows.map(product=>{
      if(!product||typeof product!=="object")return product;
      const g=product.gallery;
      if(!g||typeof g!=="object")return product;
      return {...product,gallery:{...g,images:[null,null,null]}};
    });
  }
  function loadUndoStack(){
    try{
      const parsed=JSON.parse(localStorage.getItem(UNDO_KEY)||"null");
      if(Array.isArray(parsed))return parsed.filter(item=>item&&typeof item==="object").slice(-3).map(item=>({...item,products:undoProductsWithoutPhotos(item.products)}));
      if(parsed&&typeof parsed==="object")return [{...parsed,products:undoProductsWithoutPhotos(parsed.products)}];
    }catch(_){}
    return [];
  }
  function saveUndoStack(stack){
    let normalized=(Array.isArray(stack)?stack:[]).filter(item=>item&&typeof item==="object").slice(-3).map(item=>({...item,products:undoProductsWithoutPhotos(item.products)}));
    if(!normalized.length){safeStorageRemove(UNDO_KEY);renderSystemStatus();return;}
    // Намагаймося зберегти 3 кроки. Якщо сховище замале, відкидаємо найстаріший
    // Undo, але не ризикуємо основними КБЖВ-даними.
    while(normalized.length){
      if(safeStorageSet(UNDO_KEY,JSON.stringify(normalized),{critical:false})){renderSystemStatus();return;}
      normalized=normalized.slice(1);
    }
    safeStorageRemove(UNDO_KEY);
    storageLastError="Для захисту основних даних історію скасувань не збережено через нестачу місця.";
    renderSystemStatus();
  }
  function saveUndoSnapshot(description){
    const snapshot={
      description:String(description||"Остання дія"),
      createdAt:new Date().toISOString(),
      products:undoProductsWithoutPhotos(JSON.parse(JSON.stringify(products))),
      calculatorItems:JSON.parse(JSON.stringify(calculatorItems)),
      archiveItems:JSON.parse(JSON.stringify(archiveItems)),
      dailyGoal:JSON.parse(JSON.stringify(dailyGoal)),
      calcDraft:calcInput?calcInput.value:undoStorageValue(CALCULATOR_DRAFT_KEY),
      sort:currentSort,
      randomSortSeed:undoStorageValue(RANDOM_SORT_SEED_KEY),
      categoryOrder:undoStorageValue(CATEGORY_ORDER_KEY),
      customCategories:undoStorageValue(CUSTOM_CATEGORIES_KEY),
      deletedDefaultCategories:undoStorageValue(DELETED_DEFAULT_CATEGORIES_KEY),
      departmentsEnabled:undoStorageValue(DEPARTMENTS_ENABLED_KEY),
      statsToToday:undoStorageValue(STATS_TO_TODAY_KEY),
      statsGoalVisible:undoStorageValue(STATS_GOAL_VISIBLE_KEY),
      profile:undoStorageValue(PROFILE_KEY),
      calculatorQuickPresets:undoStorageValue(CALC_QUICK_PRESETS_KEY),
      archiveNote:undoStorageValue(ARCHIVE_NOTE_KEY),
      archiveNoteVisible:undoStorageValue(ARCHIVE_NOTE_VISIBLE_KEY),
      meta:{
        databaseUpdated:undoStorageValue(DATABASE_UPDATED_KEY),
        exportVersion:undoStorageValue(EXPORT_VERSION_KEY),
        exportFingerprint:undoStorageValue(EXPORT_FINGERPRINT_KEY)
      }
    };
    const stack=loadUndoStack();
    stack.push(snapshot);
    saveUndoStack(stack);
  }
  function restoreStorageValue(key,value){if(value===null||value===undefined)safeStorageRemove(key);else safeStorageSet(key,String(value),{critical:true});}
  function applyUndoSnapshot(){
    const stack=loadUndoStack();
    const snapshot=stack.length?stack[stack.length-1]:null;
    if(!snapshot){showButtonState(undoLastAction,"Немає дії","error",1500);logAction("Скасування не виконано: немає дії для скасування.");return;}
    const actionDescription=String(snapshot.description||"Остання дія");
    if(!window.confirm(`Скасувати дію «${actionDescription}»?\n\nПідтвердьте скасування або натисніть «Скасувати», щоб залишити дані без змін.`)){
      showButtonState(undoLastAction,"Не скасовано","error",1200);return;
    }
    stack.pop();
    beginStorageTransaction("Скасування дії");
    try{
      // Undo may revert nutrition and names, not gallery photo deletion.
      // Existing photos survive unrelated Undo; deleted photos cannot return.
      const liveProductGalleries=new Map(products.map(p=>[String(p.id),normalizeProductGallery(p.gallery)]));
      const nextProducts=Array.isArray(snapshot.products)?snapshot.products.map((p,i)=>{
        const restored=normalizeProduct(p,i);
        restored.gallery=liveProductGalleries.get(String(restored.id))||normalizeProductGallery();
        return restored;
      }):products;
      const nextCalculator=uniqueCalculatorRowIds(Array.isArray(snapshot.calculatorItems)?snapshot.calculatorItems:calculatorItems).items;
      const nextArchive=Array.isArray(snapshot.archiveItems)?snapshot.archiveItems:archiveItems;
      const nextGoal=snapshot.dailyGoal&&typeof snapshot.dailyGoal==="object"?normalizeDailyGoal({...dailyGoal,...snapshot.dailyGoal}):dailyGoal;
      const nextSort=snapshot.sort||"categories";
      safeStorageSet(PRODUCTS_KEY,JSON.stringify(nextProducts),{critical:true});
      safeStorageSet(CALCULATOR_KEY,JSON.stringify(nextCalculator),{critical:true});
      safeStorageSet(ARCHIVE_KEY,JSON.stringify(nextArchive),{critical:true});
      safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(nextGoal),{critical:true});
      safeStorageSet(SORT_KEY,nextSort,{critical:true});
      restoreStorageValue(RANDOM_SORT_SEED_KEY,snapshot.randomSortSeed);
      restoreStorageValue(CATEGORY_ORDER_KEY,snapshot.categoryOrder);
      restoreStorageValue(CUSTOM_CATEGORIES_KEY,snapshot.customCategories);
      if(Object.prototype.hasOwnProperty.call(snapshot,"deletedDefaultCategories"))restoreStorageValue(DELETED_DEFAULT_CATEGORIES_KEY,snapshot.deletedDefaultCategories);
      restoreStorageValue(DEPARTMENTS_ENABLED_KEY,snapshot.departmentsEnabled);
      if(Object.prototype.hasOwnProperty.call(snapshot,"statsToToday"))restoreStorageValue(STATS_TO_TODAY_KEY,snapshot.statsToToday);
      if(Object.prototype.hasOwnProperty.call(snapshot,"statsGoalVisible"))restoreStorageValue(STATS_GOAL_VISIBLE_KEY,snapshot.statsGoalVisible);
      restoreStorageValue(PROFILE_KEY,snapshot.profile);
      if(Object.prototype.hasOwnProperty.call(snapshot,"archiveNote"))restoreStorageValue(ARCHIVE_NOTE_KEY,snapshot.archiveNote);
      if(Object.prototype.hasOwnProperty.call(snapshot,"archiveNoteVisible"))restoreStorageValue(ARCHIVE_NOTE_VISIBLE_KEY,snapshot.archiveNoteVisible);
      if(Object.prototype.hasOwnProperty.call(snapshot,"calculatorQuickPresets"))restoreStorageValue(CALC_QUICK_PRESETS_KEY,snapshot.calculatorQuickPresets);
      if(snapshot.calcDraft)safeStorageSet(CALCULATOR_DRAFT_KEY,snapshot.calcDraft,{critical:true});else safeStorageRemove(CALCULATOR_DRAFT_KEY);
      const meta=snapshot.meta||{};
      restoreStorageValue(DATABASE_UPDATED_KEY,meta.databaseUpdated);
      if(meta.exportVersion!==null)recordExportHighwater(Number(meta.exportVersion));
      restoreStorageValue(EXPORT_FINGERPRINT_KEY,meta.exportFingerprint);
      saveUndoStack(stack);
      markLocalDataChanged();
      if(!finishStorageTransaction()){
        reloadPrimaryStateFromStorage();
        showButtonState(undoLastAction,"Не скасовано","error",1500);
        alert("Не вистачає місця для безпечного скасування. Дані залишено без змін.");
        return;
      }
      products=nextProducts;calculatorItems=nextCalculator;archiveItems=nextArchive;dailyGoal=nextGoal;currentSort=nextSort;
      departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)==="1"; // v241: restore saved per-user preference
      statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
      archiveNote=String(localStorage.getItem(ARCHIVE_NOTE_KEY)||"");
      archiveNoteVisible=localStorage.getItem(ARCHIVE_NOTE_VISIBLE_KEY)==="1";
      archiveNoteEditing=false;renderArchiveNote();
      populateProductCategorySelects();loadProfile();loadCalculatorQuickPresets();
      if(calcInput)calcInput.value=snapshot.calcDraft||"";
      for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
      updateSortOptionState();syncStatsToToday(false);renderProducts(searchInput?.value||"");renderCalculatorLog();updateTotals();renderDailyGoal();renderArchive();renderStatistics();updateSiteDataCounts();
      showButtonState(undoLastAction,`Повернуто (${stack.length}/3)`,"success",1500);
      logAction(`Скасовано дію «${snapshot.description||"Остання дія"}».`);
    }catch(error){
      rollbackStorageTransaction();reloadPrimaryStateFromStorage();showButtonState(undoLastAction,"Помилка","error");
      alert("Не вдалося безпечно скасувати дію. Попередні дані збережено.");
    }
  }

  function createId(prefix="id") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
  function number(value) { const n=Number(typeof value==="string"?value.trim().replace(",","."):value); return Number.isFinite(n)?n:0; }
  function round(value,decimals=1) { const f=10**decimals; return Math.round((number(value)+Number.EPSILON)*f)/f; }
  function dayCountWord(count){
    const n=Math.abs(Math.trunc(Number(count)||0)), last=n%10, tail=n%100;
    return tail>=11&&tail<=14?"днів":last===1?"день":last>=2&&last<=4?"дні":"днів";
  }
  function formatNumber(value) {
    const n=number(value);
    const rounded=Math.round((n+Number.EPSILON)*1000)/1000;
    return String(Object.is(rounded,-0)?0:rounded);
  }
  function normalizeDisplayNumber(value,fallback){
    const raw=String(value??"").trim().replace(",",".");
    if(/^\d+(?:\.\d{1,3})?$/.test(raw) && Number(raw)===Number(fallback))return raw;
    return formatNumber(fallback);
  }
  function productDisplayNumber(product,key){
    return normalizeDisplayNumber(product?.display?.[key],product?.[key]);
  }
  function getInitials(name) {
    const words=String(name||"").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    return words.length===1?words[0].slice(0,2).toUpperCase():(words[0][0]+words[1][0]).toUpperCase();
  }
  function normalizeQuickWeights(values){
    const result=[];
    (Array.isArray(values)?values:[]).forEach(value=>{
      const weight=number(value);
      if(weight<=0)return;
      if(result.some(existing=>Math.abs(existing-weight)<1e-9))return;
      result.push(weight);
    });
    return result.slice(0,4);
  }
  function readQuickWeightInputs(inputs){
    return normalizeQuickWeights((inputs||[]).map(input=>input?.value));
  }
  function fillQuickWeightInputs(inputs,values){
    const normalized=normalizeQuickWeights(values);
    (inputs||[]).forEach((input,index)=>{if(input)input.value=normalized[index]===undefined?"":formatNumber(normalized[index]);});
  }

  // Product picker in «Зручності» reads the live array without making a second database.
  window.addEventListener("utilities:products-request",event=>{
    if(!authUser||!event.detail||typeof event.detail.deliver!=="function")return;
    event.detail.deliver(products.map(product=>({
      id:String(product.id),name:String(product.name),unit:product.unit,
      ...Object.fromEntries(["kcal","protein","fat","carb","sugar","salt","fiber"].map(key=>
        [key,product[key+"_no_data"]?null:String(product.display?.[key]??product[key]??"")]
      ))
    })));
  });

  // v227: read-only, account-scoped archive bridge for the "Вуглеводи без цукрів" utility.
  // No new storage, export fields or Worker endpoints; delivered numbers are snapshots.
  window.addEventListener("utilities:archive-request",event=>{
    if(!authUser||!event.detail||typeof event.detail.deliver!=="function")return;
    event.detail.deliver(archiveItems.filter(item=>{
      if(isMissingArchiveDay(item))return false;
      if(item?.carb===null||item?.sugar===null||item?.carb===undefined||item?.sugar===undefined)return false;
      const c=Number(item.carb),s=Number(item.sugar);
      return Number.isFinite(c)&&Number.isFinite(s)&&c>=0&&s>=0&&c>=s;
    }).map(item=>({id:String(item.id),date:String(item.date||""),
      carb:String(item.carb),sugar:String(item.sugar)})));
  });

  // v217: photographs live inside the product JSON, thus inside sync and export.
  // Strictly bounded JPEG data URLs protect localStorage and D1 snapshots.
  const MAX_GALLERY_URL_CHARS = 170000;
  function normalizeProductGallery(source){
    const g=source&&typeof source==="object"&&!Array.isArray(source)?source:{};
    const images=(Array.isArray(g.images)?g.images:[]).slice(0,3).map(value=>
      typeof value==="string"&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)&&value.length<=MAX_GALLERY_URL_CHARS?value:null);
    while(images.length<3)images.push(null);
    const no_data=g.no_data===true;
    return {no_data,visible:g.visible===true,images:no_data?[null,null,null]:images};
  }
  function validProductGallery(g){
    if(g===undefined)return true; // Old exported databases remain importable.
    if(!g||typeof g!=="object"||Array.isArray(g)||typeof g.no_data!=="boolean"||typeof g.visible!=="boolean"||!Array.isArray(g.images)||g.images.length!==3)return false;
    return g.images.every(url=>url===null||(typeof url==="string"&&url.length<=MAX_GALLERY_URL_CHARS&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(url)));
  }
  function normalizeProduct(product,index=0) {
    const kcal=backupNumber(product.kcal);
    const protein=backupNumber(product.protein ?? product.proteins);
    const fat=backupNumber(product.fat ?? product.fats);
    const carb=backupNumber(product.carb ?? product.carbs);
    const sugar=backupNumber(product.sugar ?? product.sugars);
    const salt=backupNumber(product.salt);
    const fiber=backupNumber(product.fiber ?? product.fibre);
    const incomingDisplay=product.display&&typeof product.display==="object"?product.display:{};
    return {
      id:String(product.id ?? createId("product")),
      name:String(product.name ?? "").trim(),
      planned:product.planned===true || /^(?:потрібно додати пізніше|запланувати на потім|запланований продукт\s*[—–-]\s*\d+)$/iu.test(String(product.name||"").trim()),
      kcal,
      kcal_no_data:Boolean(product.kcal_no_data ?? product.no_data?.kcal),
      protein,
      protein_no_data:Boolean(product.protein_no_data ?? product.no_data?.protein),
      fat,
      fat_no_data:Boolean(product.fat_no_data ?? product.no_data?.fat),
      carb,
      carb_no_data:Boolean(product.carb_no_data ?? product.no_data?.carb),
      sugar,
      sugar_no_data:Boolean(product.sugar_no_data ?? product.no_data?.sugar),
      salt,
      salt_no_data:Boolean(product.salt_no_data ?? product.no_data?.salt),
      fiber,
      fiber_no_data:Boolean(product.fiber_no_data ?? product.no_data?.fiber),
      display:{
        kcal:normalizeDisplayNumber(incomingDisplay.kcal ?? product.kcal,kcal),
        protein:normalizeDisplayNumber(incomingDisplay.protein ?? product.protein ?? product.proteins,protein),
        fat:normalizeDisplayNumber(incomingDisplay.fat ?? product.fat ?? product.fats,fat),
        carb:normalizeDisplayNumber(incomingDisplay.carb ?? product.carb ?? product.carbs,carb),
        sugar:normalizeDisplayNumber(incomingDisplay.sugar ?? product.sugar ?? product.sugars,sugar),
        salt:normalizeDisplayNumber(incomingDisplay.salt ?? product.salt,salt),
        fiber:normalizeDisplayNumber(incomingDisplay.fiber ?? product.fiber ?? product.fibre,fiber)
      },
      unit:product.unit==="мл"?"мл":"г",
      category:String(product.category ?? product.category_id ?? "").trim(),
      quick_weights:normalizeQuickWeights(product.quick_weights ?? product.quickWeights ?? []),
      gallery:normalizeProductGallery(product.gallery),
      full_name:String(product.full_name ?? product.description ?? "").trim(),
      full_name_no_data:Boolean(product.full_name_no_data ?? product.description_no_data ?? product.no_data?.full_name),
      created_at:String(product.created_at || new Date(2000,0,1,0,0,index).toISOString())
    };
  }
  // Keep the original localStorage bytes intact if JSON is syntactically valid
  // but the collection has an invalid shape. Such a collection must not be
  // silently normalized into an empty/different dataset or synchronized.
  function protectCorruptLocalData(key,error){
    corruptLocalDataKeys.add(key);
    storageLastError="Виявлено пошкоджені локальні дані. Автосинхронізацію та зміни призупинено. Відновіть повну резервну копію.";
    console.error("Invalid KBZhV local data; original bytes retained:",key,error);
  }
  function readProtectedJson(key,fallback,validate){
    const raw=localStorage.getItem(key);
    if(raw===null){corruptLocalDataKeys.delete(key);return fallback;}
    try{
      const parsed=JSON.parse(raw);
      if(!validate(parsed))throw new Error("Некоректна структура збережених даних");
      corruptLocalDataKeys.delete(key);
      return parsed;
    }catch(error){protectCorruptLocalData(key,error);return fallback;}
  }
  function validLocalCollectionRow(key,row){
    if(!row||typeof row!=="object"||Array.isArray(row))return false;
    if(key===PRODUCTS_KEY)return isValidImportProduct(row);
    if(key===CALCULATOR_KEY)return isValidCalculatorItem(row);
    if(key===ARCHIVE_KEY){
      return typeof row.text==="string"&&row.text.trim().length>0&&
        typeof row.date==="string"&&Boolean(archiveDateKey(row.date))&&
        validBackupNutrition(row)&&
        (row.composition===undefined||(Array.isArray(row.composition)&&row.composition.every(item=>
          typeof item==="string"?!!item.trim():validBackupNutrition(item,{weight:true})&&!!String(item?.text??item?.name??"").trim())));
    }
    if(key===CONSOLE_KEY)return typeof row.message==="string"&&
      (row.id===undefined||typeof row.id==="string")&&
      (row.time===undefined||typeof row.time==="string");
    return true;
  }
  function loadArray(key) {
    return readProtectedJson(key,[],parsed=>Array.isArray(parsed)&&
      (key!==CONSOLE_KEY||parsed.length<=MAX_CONSOLE_ITEMS)&&
      parsed.every(item=>validLocalCollectionRow(key,item)));
  }

  function storageWriteFailed(){
    // Only roll back live application state when there is no enclosing import/sync transaction.
    if(!storageTransaction)reloadPrimaryStateFromStorage();
    return false;
  }
  function saveProductsLocal(){
    const ok=persistUserChange("Збереження продуктів",()=>{
      const dataOk=safeStorageSet(PRODUCTS_KEY,JSON.stringify(products),{critical:true});
      const dateOk=dataOk&&safeStorageSet(DATABASE_UPDATED_KEY,new Date().toISOString(),{critical:true});
      return dataOk&&dateOk;
    });
    if(ok)updateSiteDataCounts();
    return ok;
  }
  function saveCalculatorLocal(){
    // IDs identify separate calculator rows in /sync/v2. Preserve every row,
    // including intentional repeated products; repair only missing/colliding IDs.
    const before=calculatorItems;
    const repair=uniqueCalculatorRowIds(before);
    if(repair.changed)calculatorItems=repair.items;
    const saved=persistUserChange("Збереження калькулятора",()=>safeStorageSet(CALCULATOR_KEY,JSON.stringify(calculatorItems),{critical:true}));
    if(!saved&&repair.changed)calculatorItems=before;
    return saved;
  }
  function repairStoredCalculatorIds(){
    if(corruptLocalDataKeys.size)return false;
    const repair=uniqueCalculatorRowIds(calculatorItems);
    if(!repair.changed)return true;
    // saveCalculatorLocal is transactional: on write failure original bytes survive.
    const original=calculatorItems;
    calculatorItems=repair.items;
    if(!saveCalculatorLocal()){
      calculatorItems=original;
      syncStatusMessage="Не вдалося виправити ID калькулятора; дані збережено без змін";
      renderSystemStatus();
      return false;
    }
    logAction(`Відновлено унікальні ID ${repair.changed} записів калькулятора без зміни КБЖВ.`);
    return true;
  }
  // v134: unrecorded days are explicit, non-numeric archive entries.
  // A per-device, per-account checkpoint prevents a consciously deleted marker
  // from being re-created on the next refresh. Markers use deterministic IDs
  // so importing the same history cannot generate duplicates.
  const MISSING_ARCHIVE_CHECK_KEY=()=>currentUserPrefix()+"missing_days_checked_until";
  function isMissingArchiveDay(item){return item?.missing===true;}
  function nextArchiveDay(iso){
    const [y,m,d]=iso.split("-").map(Number);
    const next=new Date(y,m-1,d+1,12,0,0);
    return localDateKey(next);
  }
  function previousArchiveDay(iso){
    const [y,m,d]=iso.split("-").map(Number);
    return localDateKey(new Date(y,m-1,d-1,12,0,0));
  }
  function normalizeMissingArchiveDays(){
    // An actual record always supersedes a missing-day placeholder for its date.
    const recorded=new Set(archiveItems.filter(item=>!isMissingArchiveDay(item)).map(item=>archiveDateKey(item?.date)).filter(Boolean));
    archiveItems=archiveItems.filter(item=>!isMissingArchiveDay(item)||!recorded.has(archiveDateKey(item?.date)));
  }
  let missingMidnightTimer=null;
  function scheduleMissingMidnightCheck(){
    clearTimeout(missingMidnightTimer);
    const tomorrow=new Date();tomorrow.setHours(24,0,1,0);
    missingMidnightTimer=setTimeout(()=>{
      ensureMissingArchiveDays();
      scheduleMissingMidnightCheck();
    },Math.max(1000,tomorrow.getTime()-Date.now()));
  }
  function ensureMissingArchiveDays(){
    if(!appInitialized||!authUser||corruptLocalDataKeys.size||syncApplyingRemote||syncConflict||syncInProgress)return;
    const yesterday=previousArchiveDay(getCurrentDate());
    const checkpoint=localStorage.getItem(MISSING_ARCHIVE_CHECK_KEY());
    if(checkpoint&&isExactIsoDate(checkpoint)&&checkpoint>=yesterday)return;
    const first=archiveItems.map(item=>archiveDateKey(item?.date)).filter(Boolean).sort()[0];
    if(!first)return; // Do not invent days before the first actual archive entry.
    let date=checkpoint&&isExactIsoDate(checkpoint)?nextArchiveDay(checkpoint):nextArchiveDay(first);
    if(date>yesterday){safeStorageSet(MISSING_ARCHIVE_CHECK_KEY(),yesterday);return;}
    const previous=archiveItems;
    const existing=new Set(previous.map(item=>archiveDateKey(item?.date)).filter(Boolean));
    const additions=[];
    // Safety bound: prevent a bad system clock from allocating millions of rows.
    for(let count=0;date<=yesterday&&count<36525;date=nextArchiveDay(date),count++){
      if(!existing.has(date))additions.push({
        id:"missing-"+date,date,missing:true,text:"Калорійність не була записана",
        comment:"",day_type:"",composition:[],created_at:date+"T12:00:00.000Z"
      });
    }
    if(additions.length){
      archiveItems=archiveNewestFirst([...archiveItems,...additions]);
      if(!saveArchiveLocal()){archiveItems=previous;return;}
      renderArchive();renderStatistics();updateSiteDataCounts();
    }
    safeStorageSet(MISSING_ARCHIVE_CHECK_KEY(),yesterday,{critical:true});
  }
  function saveArchiveLocal(){
    normalizeMissingArchiveDays();
    return persistUserChange("Збереження архіву",()=>safeStorageSet(ARCHIVE_KEY,JSON.stringify(archiveItems),{critical:true}));
  }
  function saveCalculatorDraft(){
    return !calcInput||persistUserChange("Збереження чернетки",()=>safeStorageSet(CALCULATOR_DRAFT_KEY,calcInput.value,{critical:true}));
  }
  function resizeArchiveNoteEditor(){
    if(!archiveNoteText||archiveNoteText.hidden||!archiveNoteText.isConnected)return;
    archiveNoteText.style.height="auto";
    const border=archiveNoteText.offsetHeight-archiveNoteText.clientHeight;
    archiveNoteText.style.height=Math.max(50,Math.ceil(archiveNoteText.scrollHeight+border))+"px";
  }
  function showArchiveNoteLimitWarning(){
    if(archiveNoteLimitWarning)archiveNoteLimitWarning.hidden=false;
  }
  function hideArchiveNoteLimitWarning(){
    if(archiveNoteLimitWarning)archiveNoteLimitWarning.hidden=true;
  }
  function renderArchiveNote(){
    if(archiveNoteSection)archiveNoteSection.hidden=!archiveNoteVisible;
    if(archiveNoteToggle){
      archiveNoteToggle.textContent=archiveNoteVisible?"Сховати нотатку":"Показати нотатку";
      archiveNoteToggle.dataset.originalText=archiveNoteToggle.textContent;
      archiveNoteToggle.setAttribute("aria-expanded",archiveNoteVisible?"true":"false");
    }
    if(archiveNoteDisplay){
      archiveNoteDisplay.hidden=archiveNoteEditing;
      archiveNoteDisplay.textContent=archiveNote||"Нотатка порожня";
      archiveNoteDisplay.classList.toggle("archive-note-empty",!archiveNote);
    }
    if(archiveNoteText){
      archiveNoteText.hidden=!archiveNoteEditing;
      archiveNoteText.readOnly=!archiveNoteEditing;
      if(!archiveNoteEditing)archiveNoteText.value=archiveNote;
      else requestAnimationFrame(resizeArchiveNoteEditor);
    }
    if(!archiveNoteEditing)hideArchiveNoteLimitWarning();
    if(archiveNoteEdit){
      const label=archiveNoteEditing?"Зберегти дані":"Редагувати";
      // Active state is managed by the same permanent blue status used for
      // calculator history reorder mode, not a bespoke CSS imitation.
      archiveNoteEdit.dataset.originalText=label;
      if(archiveNoteEditing)setButtonStatusPermanent(archiveNoteEdit,label,"info");
      else if(archiveNoteEdit.classList.contains("button-status-info"))clearSharedButtonState(archiveNoteEdit);
      archiveNoteEdit.textContent=label;
      archiveNoteEdit.classList.toggle("archive-note-editing",archiveNoteEditing);
      archiveNoteEdit.setAttribute("aria-pressed",archiveNoteEditing?"true":"false");
    }
  }

  function renderSiteDataVisibility(){
    if(siteDataSection)siteDataSection.hidden=!siteDataVisible;
    if(siteDataContent)siteDataContent.hidden=false;
    if(siteDataToggle){
      siteDataToggle.textContent=siteDataVisible?"Сховати поточні дані сайту":"Показати поточні дані сайту";
      siteDataToggle.dataset.originalText=siteDataToggle.textContent;
      siteDataToggle.setAttribute("aria-expanded",siteDataVisible?"true":"false");
    }
  }
  function updateSiteDataCounts(){
    renderSiteDataVisibility();
    renderSystemStatus();
  }
  function compactFingerprint(value){
    const text=typeof value==="string"?value:JSON.stringify(value);
    let h1=2166136261,h2=2246822519;
    for(let i=0;i<text.length;i++){
      const c=text.charCodeAt(i);
      h1=Math.imul(h1^c,16777619);
      h2=Math.imul(h2^c,3266489917);
    }
    return `fp2:${text.length}:${(h1>>>0).toString(16)}:${(h2>>>0).toString(16)}`;
  }
  function exportFingerprint(){
    return compactFingerprint({
      products:products.map((p,i)=>normalizeProduct(p,i)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:archiveItems,
      archive_note:archiveNote,
      daily_goal:normalizeDailyGoal(dailyGoal),
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      departments_enabled:departmentsEnabled,
      sort_mode:currentSort,
      random_sort_seed:localStorage.getItem(RANDOM_SORT_SEED_KEY),
      profile:{...normalizeProfile(profileData),quick_scroll:quickScrollProfilePrefs()},
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets)
    });
  }
  function legacyExportFingerprintV68(){
    return JSON.stringify({
      products:products.map((p,i)=>normalizeProduct(p,i)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:archiveItems,
      daily_goal:normalizeDailyGoal(dailyGoal),
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      departments_enabled:departmentsEnabled,
      sort_mode:currentSort,
      stats_to_today:localStorage.getItem(STATS_TO_TODAY_KEY)==="1",
      profile:normalizeProfile(profileData),
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets)
    });
  }
  function storedExportFingerprint(){
    const previous=localStorage.getItem(EXPORT_FINGERPRINT_KEY);
    if(previous&&!previous.startsWith("fp2:")&&previous===legacyExportFingerprintV68()){
      const compact=exportFingerprint();
      safeStorageSet(EXPORT_FINGERPRINT_KEY,compact);
      return compact;
    }
    return previous;
  }
  // Export revisions advance only when backed-up data actually changes.
  // Keep the per-account high-water mark across site releases; a browser reset
  // cannot reveal historical revisions without an imported older backup.
  function exportHighwaterKey(){return authUser?.id?`avicularia_testing_user_${authUser.id}_export_highwater`:null;}
  function exportHighwater(){
    const toVersion=value=>{const n=Number.parseInt(String(value??''),10);return Number.isSafeInteger(n)&&n>0?n:0;};
    return Math.max(
      toVersion(localStorage.getItem(EXPORT_VERSION_KEY)),
      toVersion(authUser?.is_owner?localStorage.getItem(LEGACY_STORAGE_KEYS.EXPORT_VERSION_KEY):null),
      toVersion(exportHighwaterKey()?localStorage.getItem(exportHighwaterKey()):null)
    );
  }
  function recordExportHighwater(value){
    const number=Number(value);
    if(!Number.isSafeInteger(number)||number<1)return false;
    const maximum=Math.max(exportHighwater(),number);
    // Never decrease the counter, including on import of an older archive.
    const primary=safeStorageSet(EXPORT_VERSION_KEY,String(maximum),{critical:true});
    const stable=exportHighwaterKey()?safeStorageSet(exportHighwaterKey(),String(maximum),{critical:true}):false;
    return Boolean(primary&&stable);
  }
  function exportRevisionDecision(){
    const previous=exportHighwater();
    const currentFingerprint=exportFingerprint();
    const unchanged=previous>0 && storedExportFingerprint()===currentFingerprint;
    const version=unchanged?previous:previous+1;
    return {version,currentFingerprint,unchanged};
  }
  function getExportVersion(){
    const decision=exportRevisionDecision();
    const {version,currentFingerprint,unchanged}=decision;
    if(!Number.isSafeInteger(version)||version<1)throw new Error('Номер експорту поза допустимим діапазоном');
    if(!unchanged && !recordExportHighwater(version))throw new Error('Не вдалося надійно зберегти номер експорту');
    if(!safeStorageSet(EXPORT_FINGERPRINT_KEY,currentFingerprint,{critical:true}))
      throw new Error('Не вдалося зберегти відбиток даних експорту');
    return version;
  }
  function productNameCompare(a,b){
    return String(a?.name||"").localeCompare(String(b?.name||""),"uk",{sensitivity:"base",numeric:true});
  }
  function stableRandomValue(product,seed){
    const text=`${String(product?.id||product?.name||"")}|${seed}`;
    let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return hash>>>0;
  }
  function getSortedProducts() {
    const arr=products.filter(product=>!avDeferredProduct(product));
    if(currentSort==="oldest")arr.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    else if(currentSort==="newest")arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    else if(currentSort==="list")arr.sort(productNameCompare);
    else if(currentSort==="random"){
      const seed=localStorage.getItem(RANDOM_SORT_SEED_KEY)||"0";
      arr.sort((a,b)=>stableRandomValue(a,seed)-stableRandomValue(b,seed));
    }else if(currentSort==="categories"&&departmentsEnabled){
      const orderIndex=new Map(getCategoryOrder().map((id,index)=>[id,index]));
      arr.sort((a,b)=>{
        const ca=orderIndex.get(getProductCategory(a).id)??9999;
        const cb=orderIndex.get(getProductCategory(b).id)??9999;
        return ca-cb||productNameCompare(a,b);
      });
    }
    // "initial" and "manual" preserve the current database order.
    return arr;
  }

  const PRODUCT_CATEGORIES=[
    {
      id:"frozen",label:"Заморожені продукти",
      aliases:["заморожені продукти","заморожені","заморозка","frozen"],
      patterns:[/заморож/i,/\bfrozen\b/i]
    },
    {
      id:"eggs",label:"Яйця",
      aliases:["яйця","яєчні продукти"],
      patterns:[/яйц/i,/\begg(s)?\b/i]
    },
    {
      id:"dairy",label:"Молочні продукти",
      aliases:["молочні продукти","молочні","молочка"],
      patterns:[/молок/i,/кефір/i,/йогурт/i,/сметан/i,/вершк/i,/ряжанк/i,/творог/i,/(^|\s)сир(\s|$|[,.:;])/i,/моцарел/i,/пармезан/i,/бринз/i,/\bmilk\b/i,/\byogurt\b/i,/\byoghurt\b/i,/\bcheese\b/i,/\bkefir\b/i]
    },
    {
      id:"meat",label:"М’ясо та птиця",
      aliases:["м’ясо та птиця","мясо та птиця","м’ясо","мясо","птиця"],
      patterns:[/кур(ка|яч|ин)/i,/індич/i,/ялович/i,/теляч/i,/свинин/i,/м.?яс/i,/фарш/i,/ковбас/i,/шинка/i,/бекон/i,/салям/i,/сосиск/i,/кролик/i,/\bchicken\b/i,/\bturkey\b/i,/\bbeef\b/i,/\bpork\b/i]
    },
    {
      id:"fish",label:"Риба та морепродукти",
      aliases:["риба та морепродукти","риба","морепродукти"],
      patterns:[/риб/i,/лосос/i,/форел/i,/тун(ець|ця)/i,/скумбр/i,/оселед/i,/кревет/i,/кальмар/i,/міді/i,/морепродукт/i,/\bsalmon\b/i,/\btuna\b/i,/\btrout\b/i,/\bshrimp\b/i,/\bfish\b/i]
    },
    {
      id:"grains",label:"Крупи, макарони та бобові",
      aliases:["крупи, макарони та бобові","крупи","каші","каша","макарони","бобові"],
      patterns:[/рис/i,/вівсян/i,/овсян/i,/греч/i,/булгур/i,/кус.?кус/i,/кіноа/i,/круп/i,/каш/i,/макарон/i,/спагет/i,/локшин/i,/паст(а|и)(\s|$)/i,/сочевиц/i,/квасол/i,/нут(\s|$|[,.:;])/i,/горох/i,/\boats?\b/i,/\brice\b/i,/\bpasta\b/i,/\bquinoa\b/i]
    },
    {
      id:"bakery",label:"Хліб та випічка",
      aliases:["хліб та випічка","хліб","випічка"],
      patterns:[/хліб/i,/лаваш/i,/булоч/i,/багет/i,/тостов/i,/круасан/i,/випіч/i,/борошн/i,/тортил/i,/\bbread\b/i,/\bflour\b/i]
    },
    {
      id:"vegetables",label:"Овочі, зелень та гриби",
      aliases:["овочі, зелень та гриби","овочі","зелень","гриби"],
      patterns:[/картопл/i,/моркв/i,/огір/i,/помід/i,/томат(\s|$|[,.:;])/i,/цибул/i,/часник/i,/брокол/i,/капуст/i,/буряк/i,/кабач/i,/баклаж/i,/болгарськ.*перець/i,/перець.*болгарськ/i,/селера/i,/шпинат/i,/рукол/i,/зелень/i,/гриб/i,/печериц/i,/кукурудз/i,/\bpotato\b/i,/\btomato\b/i,/\bcucumber\b/i]
    },
    {
      id:"fruits",label:"Фрукти та ягоди",
      aliases:["фрукти та ягоди","фрукти","ягоди"],
      patterns:[/банан/i,/яблук/i,/ківі/i,/апельсин/i,/мандарин/i,/лимон/i,/груш/i,/виноград/i,/персик/i,/нектарин/i,/ананас/i,/манго/i,/авокад/i,/лохин/i,/чорниц/i,/полуниц/i,/малин/i,/смородин/i,/вишн/i,/черешн/i,/ягод/i,/\bbanana\b/i,/\bapple\b/i,/\bkiwi\b/i,/\bberry\b/i]
    },
    {
      id:"nuts",label:"Горіхи, насіння та сухофрукти",
      aliases:["горіхи, насіння та сухофрукти","горіхи","насіння","сухофрукти"],
      patterns:[/горіх/i,/мигдал/i,/кеш.?ю/i,/пекан/i,/фісташ/i,/арахіс/i,/насін/i,/кунжут/i,/родзин/i,/кураг/i,/фінік/i,/сухофрукт/i,/\bnut(s)?\b/i,/\balmond/i,/\bseed(s)?\b/i]
    },
    {
      id:"condiments",label:"Соуси, олії та приправи",
      aliases:["соуси, олії та приправи","соуси","олії","приправи","спеції"],
      patterns:[/соус/i,/кетчуп/i,/майонез/i,/гірчиц/i,/олія/i,/масло олив/i,/оливков.*масло/i,/паприк/i,/спеці/i,/приправа/i,/імбир/i,/кориц/i,/сіль(\s|$|[,.:;])/i,/перець(\s|$|[,.:;])/i,/чилі/i,/\bsauce\b/i,/\boil\b/i,/\bspice/i]
    },
    {
      id:"sports",label:"Спортивне харчування",
      aliases:["спортивне харчування","спортхарчування","спортпіт"],
      patterns:[/протеїн/i,/гейнер/i,/ізолят/i,/whey/i,/protein powder/i,/mass gainer/i]
    },
    {
      id:"sweets",label:"Солодощі та снеки",
      aliases:["солодощі та снеки","солодощі","снеки"],
      patterns:[/шоколад/i,/цукерк/i,/печив/i,/вафл/i,/батончик/i,/чіпс/i,/снек/i,/морозиво/i,/десерт/i,/мармелад/i,/зефір/i,/мед(\s|$|[,.:;])/i,/\bchocolate\b/i,/\bcandy\b/i,/\bcookie/i,/\bchips\b/i]
    },
    {
      id:"ready",label:"Готові страви",
      aliases:["готові страви","готова їжа","готові продукти"],
      patterns:[/піца/i,/бургер/i,/сендвіч/i,/бутерброд/i,/вареник/i,/пельмен/i,/суші/i,/рол(и|\s|$)/i,/шаурм/i,/готова страва/i,/готовий обід/i,/\bpizza\b/i,/\bburger\b/i,/\bsushi\b/i]
    },
    {
      id:"drinks",label:"Напої",
      aliases:["напої","газіровки","газировка","газовані напої","енергетики"],
      patterns:[/red bull/i,/ред бул/i,/coca.?cola/i,/кока.?кол/i,/pepsi/i,/пепсі/i,/sprite/i,/спрайт/i,/fanta/i,/фанта/i,/газован/i,/енергетик/i,/напій/i,/напиток/i,/вода(\s|$|[,.:;])/i,/сік(\s|$|[,.:;])/i,/кава/i,/coffee/i,/чай(\s|$|[,.:;])/i,/juice/i]
    },
    {
      id:"other",label:"Інше",
      aliases:["інше","інші продукти"],
      patterns:[]
    }
  ];

  const AV_MAX_CUSTOM_CATEGORIES=15;

  function normalizeCustomCategoryItem(item){
    if(!item||typeof item!=="object")return null;
    const id=String(item.id||"").trim();
    const label=String(item.label||"").trim().slice(0,40);
    if(!id.startsWith("custom-")||!label)return null;
    return {id,label,aliases:[label],patterns:[],custom:true};
  }

  function getCustomCategories(){
    const raw=readProtectedJson(CUSTOM_CATEGORIES_KEY,[],value=>Array.isArray(value)&&
      value.every(item=>!!normalizeCustomCategoryItem(item)&&String(item.label||"").trim().length<=40)&&
      new Set(value.map(item=>item.id)).size===value.length);
    return raw.map(normalizeCustomCategoryItem);
  }

  function saveCustomCategories(items){
    const normalized=(Array.isArray(items)?items:[]).map(normalizeCustomCategoryItem).filter(Boolean);
    if(normalized.length>AV_MAX_CUSTOM_CATEGORIES)return false;
    return persistUserChange("Збереження власних відділів",()=>safeStorageSet(CUSTOM_CATEGORIES_KEY,JSON.stringify(normalized.map(({id,label})=>({id,label}))),{critical:true}));
  }

  function getDeletedDefaultCategoryIds(){
    const raw=readProtectedJson(DELETED_DEFAULT_CATEGORIES_KEY,[],value=>Array.isArray(value)&&
      value.every(id=>typeof id==="string"));
    const valid=new Set(PRODUCT_CATEGORIES.map(category=>category.id));
    return [...new Set(raw.filter(id=>valid.has(id)))];
  }

  function saveDeletedDefaultCategoryIds(ids){
    const valid=new Set(PRODUCT_CATEGORIES.map(category=>category.id));
    const normalized=[...new Set((Array.isArray(ids)?ids:[]).map(id=>String(id||"")).filter(id=>valid.has(id)))];
    return persistUserChange("Збереження прихованих відділів",()=>safeStorageSet(DELETED_DEFAULT_CATEGORIES_KEY,JSON.stringify(normalized),{critical:true}));
  }

  function getAllCategories(){
    // v241: all original departments are permanent; retain old deleted-ID metadata
    // for backward compatibility without allowing it to hide or erase defaults.
    return [...PRODUCT_CATEGORIES,...getCustomCategories()];
  }

  function createCustomCategoryId(){
    return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  }

  function populateProductCategorySelects(){
    [newProductCategory,editProductCategory].forEach((select,index)=>{
      if(!select)return;
      select.innerHTML="";
      if(index===0){
        const placeholder=document.createElement("option");
        placeholder.value="";
        placeholder.textContent="Оберіть відділ";
        placeholder.disabled=true;
        placeholder.selected=true;
        select.append(placeholder);
      }
      getAllCategories().forEach(category=>{
        const option=document.createElement("option");
        option.value=category.id;
        option.textContent=category.label;
        select.append(option);
      });
    });
  }
  populateProductCategorySelects();

  function defaultCategoryOrder(){
    return getAllCategories().map(category=>category.id);
  }
  function normalizeCategoryOrder(value){
    const valid=new Set(defaultCategoryOrder());
    const raw=Array.isArray(value)?value:[];
    const seen=new Set();
    const result=[];
    raw.forEach(id=>{
      const key=String(id||"");
      if(valid.has(key)&&!seen.has(key)){seen.add(key);result.push(key);}
    });
    defaultCategoryOrder().forEach(id=>{
      if(!seen.has(id)){seen.add(id);result.push(id);}
    });
    return result;
  }
  function getCategoryOrder(){
    const parsed=readProtectedJson(CATEGORY_ORDER_KEY,[],value=>Array.isArray(value)&&
      value.every(id=>typeof id==="string"));
    return normalizeCategoryOrder(parsed);
  }

  function saveCategoryOrder(order){
    return persistUserChange("Збереження порядку відділів",()=>safeStorageSet(CATEGORY_ORDER_KEY,JSON.stringify(normalizeCategoryOrder(order)),{critical:true}));
  }
  function getOrderedCategories(){
    const byId=new Map(getAllCategories().map(category=>[category.id,category]));
    return getCategoryOrder().map(id=>byId.get(id)).filter(Boolean);
  }

  function normalizeCategorySearch(value){
    return String(value||"").toLowerCase().replace(/[’'`]/g,"").replace(/\s+/g," ").trim();
  }
  function getProductCategory(product){
    const allCategories=getAllCategories();
    const explicit=allCategories.find(category=>category.id===String(product?.category||"").trim());
    if(explicit)return explicit;
    const activeIds=new Set(allCategories.map(category=>category.id));
    const text=normalizeCategorySearch(`${product?.name||""} ${product?.full_name||""}`);
    const classified=PRODUCT_CATEGORIES.find(category=>activeIds.has(category.id)&&category.id!=="other"&&category.patterns.some(pattern=>pattern.test(text)));
    if(classified)return classified;
    const other=allCategories.find(category=>category.id==="other");
    if(other)return other;
    return {id:"__uncategorized__",label:"",aliases:[],patterns:[],synthetic:true};
  }
  function categoryMatchesSearch(category,query){
    if(!query)return false;
    const q=normalizeCategorySearch(query);
    return [category.label,...category.aliases].some(value=>{
      const v=normalizeCategorySearch(value);
      return v===q||v.includes(q);
    });
  }
  function categoryExactSearch(category,query){
    if(!query)return false;
    const q=normalizeCategorySearch(query);
    return [category.label,...category.aliases].some(value=>normalizeCategorySearch(value)===q);
  }
  function createCategorySeparator(category,count){
    const separator=document.createElement("div");
    separator.className="product-category-separator";
    separator.dataset.category=category.id;
    const label=document.createElement("span");
    label.textContent=category.label;
    const amount=document.createElement("small");
    amount.textContent=String(count);
    separator.append(label,amount);
    return separator;
  }

  tabs.forEach(tab=>tab.addEventListener("click",()=>{
    const target=tab.dataset.tab;
    const tabLabel=tab.textContent.trim().replace(/:$/," ").trim();
    activateAppPage(target,{label:tabLabel});
  }));
  utilitiesOpen?.addEventListener("click",()=>{
    const current=document.querySelector(".page.active")?.id;
    utilitiesReturnPage=["blocks","calculator","archive","console","profile"].includes(current)?current:"blocks";
    utilitiesReturnScrollY=window.scrollY;
    activateAppPage("utilities",{save:false});
    logAction("Перехід на сторінку 2.");
    window.scrollTo(0,0);
  });
  utilitiesBack?.addEventListener("click",()=>{
    logAction("Перехід на сторінку 1.");
    activateAppPage(["blocks","calculator","archive","console","profile"].includes(utilitiesReturnPage)?utilitiesReturnPage:"blocks",{save:false});
    requestAnimationFrame(()=>window.scrollTo(0,utilitiesReturnScrollY));
  });
  utilitiesTools?.addEventListener("click",()=>{
    // Кнопки працюють як звичайні вкладки: повторне натискання не перемикає назад.
    const wasOther=!!mainApp?.classList.contains("utilities-mode")&&!$("utilities")?.classList.contains("active");
    activateAppPage("utilities",{save:false});
    if(wasOther)logAction("Відкрито вкладку «Зручності».");
    window.scrollTo(0,0);
  });
  utilitiesTraining?.addEventListener("click",()=>{
    const wasTraining=$("training")?.classList.contains("active");
    activateAppPage("utilities-training",{save:false});
    if(!wasTraining)logAction("Відкрито вкладку «Тренування».");
    window.scrollTo(0,0);
  });
  utilitiesConsole?.addEventListener("click",()=>{
    const wasConsole=mainApp?.classList.contains("utilities-console-view");
    activateAppPage("utilities-console",{save:false});
    if(!wasConsole)logAction("Відкрито вкладку «Консоль» (сторінка 2).");
    window.scrollTo(0,0);
  });
  // У журналі — назви дій, без вмісту планів, коментарів і локального файлу.
  const trainingActionMessages={
    plan_added:"У вкладці «Тренування» завантажено план тренування.",
    plan_replaced:"У вкладці «Тренування» замінено план тренування.",
    plan_cleared:"У вкладці «Тренування» очищено план тренування.",
    day_comment_saved:"У вкладці «Тренування» змінено коментар до дня.",
    day_comment_copied:"У вкладці «Тренування» скопійовано коментар до дня.",
    pdf_added:"У вкладці «Тренування» збережено PDF-файл(и).",
    pdf_replaced:"У вкладці «Тренування» замінено PDF-файл.",
    pdf_deleted:"У вкладці «Тренування» видалено PDF-файл.",
    pdf_viewed:"У вкладці «Тренування» відкрито PDF для перегляду.",
    pdf_downloaded:"У вкладці «Тренування» завантажено збережений PDF.",
    extract_downloaded:"У вкладці «Тренування» сформовано витяг з коментарями.",
    package_exported:"У вкладці «Тренування» експортовано ZIP з планом і двома PDF.",
    package_imported:"У вкладці «Тренування» імпортовано ZIP з планом і двома PDF."
  };
  Object.assign(trainingActionMessages, {
    reference_imported:"У вкладці «Тренування» імпортовано еталонний архів (6 JSON).",
    reference_exported:"У вкладці «Тренування» вивантажено початковий ZIP.",
    reference_completed:"У вкладці «Тренування» сформовано ZIP з коментарями.",
    reference_json:"У вкладці «Тренування» вивантажено окремий JSON.",
    reference_deleted:"У вкладці «Тренування» видалено файл архіву.",
    reference_cleared:"У вкладці «Тренування» очищено весь архів.",
    reference_comment:"У вкладці «Тренування» збережено коментар до дня."
  });
  window.addEventListener("training:action",event=>{
    const type=String(event.detail?.type||"");
    if(Object.prototype.hasOwnProperty.call(trainingActionMessages,type)){
      const v=Number(event.detail?.archiveVersion)||0;
      logAction(trainingActionMessages[type]+(v?` Версія тренувального архіву: v${v}.`:""));
    }
  });
  // Лише визначені типи дій: жодний пароль або вміст буфера сюди не передається.
  const utilityActionMessages={
    password_generated:"У вкладці «Зручності» згенеровано пароль.",
    password_cleared:"У вкладці «Зручності» очищено згенерований пароль.",
    password_settings_changed:"У вкладці «Зручності» змінено налаштування генератора паролів.",
    password_generation_failed:"У вкладці «Зручності» не вдалося згенерувати пароль.",
    password_copied:"У вкладці «Зручності» скопійовано пароль.",
    password_copy_failed:"У вкладці «Зручності» не вдалося скопіювати пароль.",
    ratio_copy_failed:"У вкладці «Зручності» не вдалося скопіювати коефіцієнт піднятої ваги.",
    conversion_copy_failed:"У вкладці «Зручності» не вдалося скопіювати результат конвертації.",
    price_comparison_copied:"У вкладці «Зручності» скопійовано результат порівняння цін товарів.",
    date_difference_copied:"У вкладці «Зручності» скопійовано результат калькулятора дат.",
    cooked_nutrition_copied:"У вкладці «Зручності» скопійовано перерахунок КБЖВ сирого продукту на готовий.",
    copy_failed:"У вкладці «Зручності» не вдалося скопіювати результат."
  };
  window.addEventListener("utilities:action",event=>{
    if(!$("utilities")?.classList.contains("active"))return;
    const type=event.detail?.type;
    if(type==="timezone_changed"){
      const zone=String(event.detail?.zone||"Часовий пояс пристрою").slice(0,100);
      logAction(`У вкладці «Зручності» змінено часовий пояс на «${zone}».`);
    }else if(type==="utility_cleared"){
      const labels={clock:"поточний час",ratio:"коефіцієнт піднятої ваги",convert:"конвертер",cooked:"перерахунок КБЖВ",price:"порівняння цін",date:"калькулятор дат"};
      const label=labels[String(event.detail?.section||"")];
      if(label)logAction(`У вкладці «Зручності» очищено блок «${label}».`);
    }else if(type==="ratio_copied"||type==="conversion_copied"){
      // Записуємо лише числовий РЕЗУЛЬТАТ успішного копіювання.
      // Довільні рядки, введені ваги та паролі не журналюємо.
      const value=String(event.detail?.value??"").trim();
      if(!/^-?\d+(?:[,.]\d{1,18})?$/.test(value))return;
      if(type==="ratio_copied"){
        logAction(`У вкладці «Зручності» скопійовано коефіцієнт піднятої ваги: ${value}.`);
      }else{
        const safeUnit=String(event.detail?.unit||"");
        const unit=/^[A-Za-zА-Яа-яІіЇїЄєҐґ°µμΩ²³/%·⁻0-9 .]{1,18}$/.test(safeUnit)?safeUnit:"од.";
        logAction(`У вкладці «Зручності» скопійовано результат конвертації: ${value} ${unit}.`);
      }
    }else if(Object.prototype.hasOwnProperty.call(utilityActionMessages,type)){
      logAction(utilityActionMessages[type]);
    }
  });

  document.getElementById("av-brand-open")?.addEventListener("click",event=>{
    event.currentTarget.blur();
    activateAppPage("about",{label:"Чому саме Avicularia"});
    window.scrollTo(0,0);
  });
  profileOpen?.addEventListener("click",()=>activateAppPage("profile",{label:"Профіль"}));
  profileDisplayName?.addEventListener("click",()=>{
    if(authUser?.role==="admin")activateAppPage("admin",{label:"Адміністратор"});
  });

  profileDisplayInput?.addEventListener("input",()=>{
    if(profileDisplayInput.value.length>20)profileDisplayInput.value=profileDisplayInput.value.slice(0,20);
    if(profileDisplayCount)profileDisplayCount.textContent=String(profileDisplayInput.value.length);
  });
  for(const input of [profileDisplayInput,profileFullName,profileBirthDate,profileWeight,profileHeight]){
    input?.addEventListener("input",saveProfileDraft);
    input?.addEventListener("change",saveProfileDraft);
  }

  profilePhotoButton?.addEventListener("click",()=>profilePhotoInput?.click());
  profilePhotoChange?.addEventListener("click",()=>profilePhotoInput?.click());
  profilePhotoInput?.addEventListener("change",async()=>{
    const file=profilePhotoInput.files?.[0];
    if(!file)return;
    try{
      const avatar=await resizeProfileImage(file);
      saveUndoSnapshot("Зміна фото профілю");
      profileData=collectProfileForm(avatar);
      if(saveProfileLocal()===false)throw new Error("Не вдалося зберегти фото. Перевірте сховище браузера.");
      showButtonState(profilePhotoChange,"Фото збережено","success");
      logAction("Фото профілю змінено.",{profile_change:{avatar:"оновлено"}});
    }catch(error){
      showButtonState(profilePhotoChange,"Помилка","error");
      alert(error?.message||"Не вдалося обробити фото.");
    }finally{
      profilePhotoInput.value="";
    }
  });

  profilePhotoRemove?.addEventListener("click",()=>{
    if(!profileData.avatar){showButtonState(profilePhotoRemove,"Немає фото","error");return;}
    // Nothing is written or synchronized if Cancel is pressed.
    if(!confirm("Ви справді бажаєте видалити фото профілю?")){
      showButtonState(profilePhotoRemove,"Скасовано","error");return;
    }
    saveUndoSnapshot("Видалення фото профілю");
    profileData=collectProfileForm("");
    if(saveProfileLocal()===false){showButtonState(profilePhotoRemove,"Не видалено","error");return;}
    showButtonState(profilePhotoRemove,"Видалено","success");
    logAction("Фото профілю видалено.",{profile_change:{avatar:"видалено"}});
  });

  profileSave?.addEventListener("click",()=>{
    // The profile is not submitted through an HTML form; validate its fields here.
    const invalid=[profileBirthDate,profileWeight,profileHeight].find(input=>input&&!input.checkValidity());
    if(invalid){showButtonState(profileSave,"Некоректні дані","error");invalid.focus({preventScroll:true});return;}
    const previous=normalizeProfile(profileData);
    const next=collectProfileForm(profileData.avatar);
    if(JSON.stringify(previous)===JSON.stringify(next)){
      showButtonState(profileSave,"Не змінено","error");return;
    }
    saveUndoSnapshot("Зміна профілю");
    profileData=next;
    const editedOn=getCurrentDate();
    if(measurementChanged(previous.weight,profileData.weight))profileData.weight_updated_at=editedOn;
    if(measurementChanged(previous.height,profileData.height))profileData.height_updated_at=editedOn;
    if(saveProfileLocal()===false){showButtonState(profileSave,"Не збережено","error");return;}
    adminAvatarCache.clear();showButtonState(profileSave,"Збережено","success");
    const fields={display_name:"Відображуване ім’я",full_name:"ПІБ",birth_date:"Дата народження",weight:"Вага",height:"Зріст"};
    const changed=Object.keys(fields).filter(key=>String(previous[key]??"")!==String(profileData[key]??""));
    const summary=changed.length?changed.map(key=>`${fields[key]}: «${previous[key]||"—"}» → «${profileData[key]||"—"}»`).join("; "):"без змін";
    logAction(`Профіль збережено: ${summary}.`,{profile:{display_name:profileData.display_name,full_name:profileData.full_name,birth_date:profileData.birth_date,weight:profileData.weight,height:profileData.height},changed_fields:changed});
    setTimeout(()=>activateAppPage("blocks",{label:"КБЖВ-блоки"}),360);
  });

  function productSearchRank(product,query){
    const name=normalizeCategorySearch(product?.name||"");
    const description=normalizeCategorySearch(product?.full_name||"");
    if(!query)return 999;
    if(!name)return description.includes(query)?5:999;
    if(name===query)return 0;
    if(name.startsWith(query))return 1;
    if(name.split(/\s+/).some(part=>part.startsWith(query)))return 2;
    if(name.includes(query))return 3;
    if(description.includes(query))return 5;
    return 999;
  }

  window.avOpenFoundProduct=product=>{if(product){const blocksTab=document.querySelector('.tab[data-tab="blocks"]');blocksTab?.click();openProductModal(product);}};
  function renderProducts(filter="",options={}) {
    syncAvSearchClear(clearSearch,searchInput?.value);
    if(!grid)return;
    // Searching does not change total storage counts; avoid repeated IDB/DOM work
    // on every keystroke. All normal data mutations still refresh the counters.
    if(!options.skipCounts)updateSiteDataCounts();
    const q=normalizeCategorySearch(filter);
    grid.innerHTML="";

    const sorted=getSortedProducts();

    // Спочатку точна назва, далі часткові збіги й опис.
    if(q){
      const filtered=sorted
        .map((product,index)=>({product,index,rank:productSearchRank(product,q)}))
        .filter(item=>item.rank<999)
        .sort((a,b)=>a.rank-b.rank||a.index-b.index)
        .map(item=>item.product);

      if(!filtered.length){
        const empty=document.createElement("div");
        empty.style.cssText="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-secondary)";
        empty.textContent="Продуктів за назвою або описом не знайдено";
        grid.appendChild(empty);
        return;
      }

      const fragment=document.createDocumentFragment();
      filtered.forEach(product=>fragment.appendChild(createProductCard(product)));
      grid.appendChild(fragment);
      updateReorderState();
      return;
    }

    if(!sorted.length){
      const empty=document.createElement("div");
      empty.style.cssText="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-secondary)";
      empty.textContent="Продуктів ще немає";
      grid.appendChild(empty);
      return;
    }

    const fragment=document.createDocumentFragment();
    if(departmentsEnabled&&currentSort==="categories"){
      const renderedIds=new Set();
      getOrderedCategories().forEach(category=>{
        const group=sorted.filter(product=>getProductCategory(product).id===category.id);
        if(!group.length)return;
        fragment.appendChild(createCategorySeparator(category,group.length));
        group.forEach(product=>{renderedIds.add(product.id);fragment.appendChild(createProductCard(product));});
      });
      sorted.filter(product=>!renderedIds.has(product.id)).forEach(product=>fragment.appendChild(createProductCard(product)));
    }else sorted.forEach(product=>fragment.appendChild(createProductCard(product)));
    grid.appendChild(fragment);

    updateReorderState();
  }

  function iconCopy(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21H6a2 2 0 0 1-2-2V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/></svg><span class="tooltip">Скопіювати</span>`;
  }
  function iconEdit(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="tooltip">Редагувати</span>`;
  }

  function createProductCard(product){
    const card=document.createElement("article");
    card.className="food-card"; card.dataset.id=product.id;
    const actions=document.createElement("div"); actions.className="card-actions";
    const copy=document.createElement("button"); copy.type="button"; copy.className="copy-btn"; copy.innerHTML=iconCopy();
    const edit=document.createElement("button"); edit.type="button"; edit.className="edit-btn"; edit.innerHTML=iconEdit();
    copy.addEventListener("click",e=>{e.stopPropagation();openProductModal(product);});
    edit.addEventListener("click",e=>{e.stopPropagation();openEditProductModal(product);});
    actions.append(copy,edit);

    const title=document.createElement("div"); title.className="food-title";
    const badge=document.createElement("div"); badge.className="badge"; badge.textContent=getInitials(product.name);
    const tc=document.createElement("div");
    const name=document.createElement("div"); name.className="name"; name.textContent=product.name;
    const meta=document.createElement("div"); meta.className="meta"; meta.textContent=`100 ${product.unit||"г"}`;
    tc.append(name,meta);
    title.append(badge,tc);

    const kbjv=document.createElement("div"); kbjv.className="kbjv";
    const row=(key,val,unit="г",noData=false,displayValue=null)=>`<div class="row"><div class="key">${key}</div><div class="val${noData?" no-data-value":""}">${noData?"Немає даних":`${displayValue??formatNumber(val)} ${unit}`}</div></div>`;
    kbjv.innerHTML =
      row("Калорії",product.kcal,"ккал",product.kcal_no_data,productDisplayNumber(product,"kcal")) +
      `<div class="kbjv-divider"></div>` +
      row("Білки",product.protein,"г",product.protein_no_data,productDisplayNumber(product,"protein")) +
      row("Жири",product.fat,"г",product.fat_no_data,productDisplayNumber(product,"fat")) +
      row("Вуглеводи",product.carb,"г",product.carb_no_data,productDisplayNumber(product,"carb")) +
      `<div class="kbjv-divider"></div>` +
      row("Цукри",product.sugar,"г",product.sugar_no_data,productDisplayNumber(product,"sugar")) +
      row("Сіль",product.salt,"г",product.salt_no_data,productDisplayNumber(product,"salt")) +
      `<div class="kbjv-divider"></div>` +
      row("Клітковина",product.fiber,"г",product.fiber_no_data,productDisplayNumber(product,"fiber")) +
      `<div class="kbjv-divider"></div>`;

    const full=document.createElement("div"); full.className="full-name";
    full.textContent=product.full_name_no_data?"Немає даних":(product.full_name||"");
    if(product.full_name_no_data)full.classList.add("no-data-value");
    card.append(actions,title,kbjv,full);
    card.addEventListener("click",e=>{if(!reorderMode&&!e.target.closest(".card-actions"))openProductModal(product);});
    return card;
  }

  // v276: invisible while empty; red when text exists. Red removal flash
  // matches the planned-photo trash button (420ms), before disappearing.
  function syncAvSearchClear(button,value){
    if(!button)return;
    const hasText=Boolean(String(value??"").length);
    button.disabled=!hasText;
    button.setAttribute("aria-disabled",String(!hasText));
    button.setAttribute("aria-hidden",String(!hasText));
  }
  function flashAvSearchClear(button){
    if(!button)return;
    clearTimeout(button._avClearFlashTimer);
    button.classList.add("av-search-clear-remove-flash");
    // Match product-gallery.js photo removal's 420ms red flash.
    button._avClearFlashTimer=setTimeout(()=>{
      button.classList.remove("av-search-clear-remove-flash");
    },420);
  }

  // v272: restore the active/inactive state from the INPUT, not only from
  // the last input event. Safari can restore form data after script startup
  // or when returning to a backgrounded PWA without firing input.
  function avRefreshAllClearButtons(){
    syncAvSearchClear(clearSearch,searchInput?.value);
    syncAvSearchClear(archiveSearchClear,archiveSearch?.value);
    syncAvSearchClear(deleteProductSearchClear,deleteProductSearch?.value);
  }
  function avFitClearButtonToInput(input,button){
    if(!input||!button)return;
    const height=input.getBoundingClientRect().height;
    if(height>0&&height<90){
      input.parentElement?.style.setProperty('--av-clear-size',`${Math.round(height*100)/100}px`);
    }
  }
  const avSearchClearPairs=[
    [searchInput,clearSearch],
    [archiveSearch,archiveSearchClear],
    [deleteProductSearch,deleteProductSearchClear]
  ];
  function avRefreshClearButtonsAndDimensions(){
    avRefreshAllClearButtons();
    avSearchClearPairs.forEach(([input,button])=>avFitClearButtonToInput(input,button));
  }
  avSearchClearPairs.forEach(([input,button])=>{
    if(!input||!button)return;
    ['focus','change','keyup','search'].forEach(type=>
      input.addEventListener(type,()=>{
        syncAvSearchClear(button,input.value);
        avFitClearButtonToInput(input,button);
      })
    );
  });
  if(typeof ResizeObserver!=='undefined'){
    const avClearSizeObserver=new ResizeObserver(entries=>{
      for(const entry of entries){
        const pair=avSearchClearPairs.find(([input])=>input===entry.target);
        if(pair)avFitClearButtonToInput(pair[0],pair[1]);
      }
    });
    avSearchClearPairs.forEach(([input])=>{if(input)avClearSizeObserver.observe(input);});
  }
  window.addEventListener('pageshow',()=>{
    avRefreshClearButtonsAndDimensions();
    requestAnimationFrame(avRefreshClearButtonsAndDimensions);
    setTimeout(avRefreshClearButtonsAndDimensions,160);
    setTimeout(avRefreshClearButtonsAndDimensions,800);
  });
  window.addEventListener('focus',avRefreshClearButtonsAndDimensions);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)avRefreshClearButtonsAndDimensions();
  });
  avRefreshClearButtonsAndDimensions();

  // v222: avoid rebuilding hundreds of product cards on every keystroke.
  let productSearchTimer=0;
  syncAvSearchClear(clearSearch,searchInput?.value);
  searchInput?.addEventListener("input",()=>{
    clearTimeout(productSearchTimer);
    syncAvSearchClear(clearSearch,searchInput.value);
    productSearchTimer=setTimeout(()=>renderProducts(searchInput.value,{skipCounts:true}),120);
  });
  clearSearch?.addEventListener("click",()=>{
    if(!searchInput.value)return;
    searchInput.value="";clearTimeout(productSearchTimer);
    flashAvSearchClear(clearSearch);
    syncAvSearchClear(clearSearch,searchInput.value);
    renderProducts();searchInput.focus({preventScroll:true});
    logAction("Пошук продуктів очищено.");
  });

  function renderProductQuickWeights(product){
    if(!productQuickWeights)return;
    productQuickWeights.innerHTML="";
    const weights=normalizeQuickWeights(product?.quick_weights);
    productQuickWeights.hidden=!weights.length;
    weights.forEach(weight=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="product-quick-weight-button";
      button.textContent=`${formatNumber(weight)} г`;
      // iOS Safari can use the first tap only to dismiss the numeric keyboard.
      // Apply a quick weight on touchstart while the field is focused and prevent
      // the blur. Suppress the synthetic click that follows the same touch.
      const applyWeight=()=>{
        productWeight.value=formatNumber(weight);
        productWeight.dispatchEvent(new Event("input",{bubbles:true}));
        productWeight.dispatchEvent(new Event("change",{bubbles:true}));
        productQuickWeights.querySelectorAll(".product-quick-weight-button").forEach(item=>item.classList.toggle("active",item===button));
      };
      let lastHandledTouch=0;
      button.addEventListener("touchstart",event=>{
        if(document.activeElement!==productWeight)return;
        if(event.cancelable)event.preventDefault(); // keep focus and iOS keyboard
        lastHandledTouch=Date.now();
        applyWeight();
      },{passive:false});
      button.addEventListener("click",()=>{
        if(Date.now()-lastHandledTouch<600)return;
        applyWeight();
      });
      productQuickWeights.append(button);
    });
  }
  function openProductModal(product){
    selectedProduct=product;
    productModalName.textContent=product.name;
    productWeight.value="";
    renderProductQuickWeights(product);
    const quickHeight=productQuickWeights?.querySelector('.product-quick-weight-button')?.getBoundingClientRect().height;
    productModal.style.setProperty('--av-copy-action-height',`${Math.round(quickHeight||34)}px`);
    // A new modal must not inherit a previous keyboard's positioning values.
    productModal.style.removeProperty('--av-copy-top');
    productModal.style.removeProperty('--av-copy-available-height');
    productModal.classList.add("active");
    productModal.classList.remove("av-product-keyboard-open");
    document.body.classList.add("edit-modal-open");
    requestAnimationFrame(()=>{
      const quick=productQuickWeights?.querySelector('.product-quick-weight-button');
      if(quick)productModal.style.setProperty('--av-copy-action-height',`${Math.ceil(quick.getBoundingClientRect().height)}px`);
    });
    try{productWeight.focus({preventScroll:true});}catch(_){productWeight.focus();}
    requestAnimationFrame(()=>{try{productWeight.focus({preventScroll:true});}catch(_){productWeight.focus();}});
    logAction(`Відкрито продукт «${product.name}».`);
  }
  function closeProductModal(){selectedProduct=null;productModal.classList.remove("active");productModal.classList.remove('av-product-keyboard-open');productModal.style.removeProperty('--av-copy-top');productModal.style.removeProperty('--av-copy-available-height');document.body.classList.remove("edit-modal-open");if(productQuickWeights){productQuickWeights.innerHTML="";productQuickWeights.hidden=true;}}
  // Keep quick weights/actions above the iOS keyboard. Only the copy-weight modal
  // changes alignment; its normal centered appearance returns on blur/close.
  const avCopyModalViewport=()=>{
    if(!productModal?.classList.contains('active')||document.activeElement!==productWeight)return;
    const vv=window.visualViewport;
    const viewportHeight=Math.floor(vv?.height||window.innerHeight);
    const box=productModal.querySelector('.product-modal-box');
    // Align the dialog *bottom* to the top of the iOS keyboard (visual viewport).
    // The old fixed 90-140 px offset left a 150-220 px unused gap on iPhones.
    // Only run this path for the focused copy-weight field; do not move other modals.
    const keyboardVisible=vv&&window.innerHeight-vv.height>100;
    if(!keyboardVisible){
      // iOS 'Done' closes the keyboard but must not lift or recenter this modal.
      // Keep the last confirmed position until the modal itself is closed.
      return;
    }
    const boxHeight=Math.ceil(box?.getBoundingClientRect().height||260);
    const bottomGap=14;
    const top=Math.max(14, Math.floor(viewportHeight-boxHeight-bottomGap));
    productModal.style.setProperty('--av-copy-top',top+'px');
    productModal.style.setProperty('--av-copy-available-height',Math.max(145,viewportHeight-top-bottomGap)+'px');
  };
  productWeight?.addEventListener('focus',()=>{productModal.classList.add('av-product-keyboard-open');avCopyModalViewport();requestAnimationFrame(avCopyModalViewport);});
  // Respect the iPhone keyboard Done key. Dismissing it does not move the dialog
  // or force the keyboard back open; refocusing the input remains possible.
  productModal?.addEventListener('pointerdown',event=>{
    if(event.target===productModal&&document.activeElement===productWeight)event.preventDefault();
  });
  window.visualViewport?.addEventListener('resize',avCopyModalViewport);
  window.visualViewport?.addEventListener('scroll',avCopyModalViewport);
  // Keyboard animations on iOS change the visual viewport over several frames.
  let avCopyViewportRaf=0;
  window.visualViewport?.addEventListener('resize',()=>{
    cancelAnimationFrame(avCopyViewportRaf);
    avCopyViewportRaf=requestAnimationFrame(()=>requestAnimationFrame(avCopyModalViewport));
  });
  // iOS: the first tap on a button can merely dismiss the focused weight
  // keyboard. Activate each existing action on touchstart, then suppress the
  // synthetic click. Mouse, keyboard and nonfocused touches retain normal click.
  for(const action of [productCancel,productCopy,productCalculator]){
    action?.addEventListener('touchstart',event=>{
      if(document.activeElement!==productWeight)return;
      if(event.cancelable)event.preventDefault();
      action.click();
    },{passive:false});
  }
  productCancel?.addEventListener("click",()=>{
    showButtonState(productCancel,"Скасовано","error",700);
    logAction("Перегляд продукту закрито без дії.");
    setTimeout(closeProductModal,720);
  });
  productModal?.addEventListener("click",e=>{
    // With the numeric keyboard open, a tap on the dimmed area is not Cancel.
    if(e.target!==productModal)return;
    if(document.activeElement===productWeight){
      try{productWeight.focus({preventScroll:true});}catch(_){}
      return;
    }
    closeProductModal();
  });
  productModal?.addEventListener("touchmove",e=>{if(e.target===productModal)e.preventDefault();},{passive:false});

  function calculateProduct(product,weight){
    const m=number(weight)/100;
    return {kcal:product.kcal*m,protein:product.protein*m,fat:product.fat*m,carb:product.carb*m,sugar:product.sugar*m,salt:product.salt*m,fiber:product.fiber*m};
  }
  function getProductSummary(product,weight){
    const v=calculateProduct(product,weight);
    const isBase=Math.abs(number(weight)-100)<1e-9;
    const shown=(key,value)=>isBase?productDisplayNumber(product,key):formatNumber(value);
    const kcalText=product.kcal_no_data?"немає даних калорій":`${shown("kcal",v.kcal)} ккал`;
    const proteinText=product.protein_no_data?"немає даних білків":`${shown("protein",v.protein)} білка`;
    const fatText=product.fat_no_data?"немає даних жирів":`${shown("fat",v.fat)} жирів`;
    const carbText=product.carb_no_data?"немає даних вуглеводів":`${shown("carb",v.carb)} вуглеводів`;
    const sugarText=product.sugar_no_data?"немає даних цукрів":`${shown("sugar",v.sugar)} цукрів`;
    const saltText=product.salt_no_data?"немає даних солі":`${shown("salt",v.salt)} солі`;
    const fiberText=product.fiber_no_data?"немає даних клітковини":`${shown("fiber",v.fiber)} клітковини`;
    return `${product.name}, для ${formatNumber(weight)} г — ${kcalText} / ${proteinText} / ${fatText} / ${carbText} / ${sugarText} / ${saltText} / ${fiberText}`;
  }
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);return true;}catch(_){
      let textarea=null;
      try{
        textarea=document.createElement("textarea");textarea.value=text;
        textarea.style.position="fixed";textarea.style.left="-9999px";
        document.body.append(textarea);textarea.select();
        return document.execCommand("copy")===true;
      }catch(_2){return false;}
      finally{textarea?.remove();}
    }
  }
  productCopy?.addEventListener("click",async()=>{
    if(avDeferredProduct(selectedProduct)){showButtonState(productCopy,"Заповніть продукт","error");return;}
    if(!selectedProduct){showButtonState(productCopy,"Немає продукту","error");return;} const w=number(productWeight.value); if(w<=0){showButtonState(productCopy,"Вкажіть вагу","error");productWeight.focus({preventScroll:true});return;}
    if(await copyText(getProductSummary(selectedProduct,w))){showButtonState(productCopy,"Скопійовано","success",1200);logAction(`Скопійовано продукт «${selectedProduct.name}» (${formatNumber(w)} г).`);}else showButtonState(productCopy,"Не скопійовано","error",1200);
  });
  productCalculator?.addEventListener("click",()=>{
    if(avDeferredProduct(selectedProduct)){showButtonState(productCalculator,"Заповніть продукт","error");return;}
    if(!selectedProduct){showButtonState(productCalculator,"Немає продукту","error");return;} const w=number(productWeight.value); if(w<=0){showButtonState(productCalculator,"Вкажіть вагу","error");productWeight.focus({preventScroll:true});return;}
    const productName=selectedProduct.name;
    const text=getProductSummary(selectedProduct,w);
    const parsed=extractCalculatorNutrition(text);
    const calculated=calculateProduct(selectedProduct,w);
    const keys=['kcal','protein','fat','carb','sugar','salt','fiber'];
    const unrecognized=keys.some(key=>!selectedProduct[key+'_no_data']&&
      (!parsed||Math.abs(number(parsed[key])-number(calculated[key]))>0.005));
    if(unrecognized){
      showButtonState(productCalculator,'Перевірте КБЖВ','error',1800);
      logAction(`Перенесення продукту «${productName}» у калькулятор зупинено: перевірка КБЖВ не пройдена.`);
      return;
    }
    saveUndoSnapshot(`Додавання продукту «${productName}» у поле калькулятора`);
    const current=calcInput.value.trim(); calcInput.value=current?`${current}\n${text}`:text; saveCalculatorDraft();
    showButtonState(productCalculator,"Додано","success"); logAction(`Продукт «${productName}» додано в калькулятор.`);
    setTimeout(closeProductModal,720);
  });

  function setNoDataField(input,checkbox,active,emptyValue="0"){
    if(!input||!checkbox)return;
    checkbox.checked=!!active;
    input.disabled=!!active;
    if(active)input.value=emptyValue;
  }
  const noDataFieldPairs=[
    [newProductKcal,newProductKcalNoData,"0"],
    [newProductProtein,newProductProteinNoData,"0"],
    [newProductFat,newProductFatNoData,"0"],
    [newProductCarb,newProductCarbNoData,"0"],
    [newProductSugar,newProductSugarNoData,"0"],
    [newProductSalt,newProductSaltNoData,"0"],
    [newProductFiber,newProductFiberNoData,"0"],
    [newProductDescription,newProductDescriptionNoData,""],
    [editProductKcal,editProductKcalNoData,"0"],
    [editProductProtein,editProductProteinNoData,"0"],
    [editProductFat,editProductFatNoData,"0"],
    [editProductCarb,editProductCarbNoData,"0"],
    [editProductSugar,editProductSugarNoData,"0"],
    [editProductSalt,editProductSaltNoData,"0"],
    [editProductFiber,editProductFiberNoData,"0"],
    [editProductDescription,editProductDescriptionNoData,""]
  ];
  noDataFieldPairs.forEach(([input,checkbox,emptyValue])=>checkbox?.addEventListener("change",()=>setNoDataField(input,checkbox,checkbox.checked,emptyValue)));


  const AV_LATER_NAME="Потрібно додати пізніше";
  const avNameLater=$("new-product-name-later");
  const editProductNameLater = $("edit-product-name-later");
  let avNameBeforeLater="";
  avNameLater?.addEventListener("change",()=>{
    if(avNameLater.checked){avNameBeforeLater=newProductName.value;newProductName.value=AV_LATER_NAME;newProductName.readOnly=true;}
    else{newProductName.readOnly=false;newProductName.value=avNameBeforeLater||"";newProductName.focus({preventScroll:true});}
  });
  const AV_PLANNED_NAME="Запланувати на потім";
  function avDeferredProduct(p){return p?.planned===true || /^(?:потрібно додати пізніше|запланувати на потім|запланований продукт\s*[—–-]\s*\d+)$/iu.test(String(p?.name||"").trim());}
  // Guard against unbounded temporary photo storage; existing older records are kept intact.
  const AV_MAX_DEFERRED_PRODUCTS=30;
  const AV_MAX_DEFERRED_PHOTOS=30;
  function avDeferredQuota(rows){
    const deferred=(Array.isArray(rows)?rows:[]).filter(avDeferredProduct);
    return {products:deferred.length,photos:(Array.isArray(rows)?rows:[]).reduce((count,p)=>
      count+(Array.isArray(p?.gallery?.images)?p.gallery.images.filter(Boolean).length:0),0)};
  }
  function avDeferredQuotaOk(rows){
    const q=avDeferredQuota(rows);
    return q.products<=AV_MAX_DEFERRED_PRODUCTS&&q.photos<=AV_MAX_DEFERRED_PHOTOS;
  }
  function avQuotaError(button){
    const q=avDeferredQuota(products);
    showButtonState(button,"Ліміт 30 / 30","error",1800);
    alert(`Обмеження: не більше 30 запланованих продуктів та 30 фото в КБЖВ-блоках загалом. Зараз: ${q.products} продуктів, ${q.photos} фотографій. Заповніть або видаліть попередні відкладені продукти.`);
  }

  // v224: Planned entries share the same versioned product collection for sync,
  // full JSON export/import and rollback. The planned flag keeps them out of the
  // ready-product cards, calculator, sorting and delete list.
  function avNextPlannedName(){
    // Reserve identifiers even when imported legacy plans are mixed with new plans.
    // Names are display labels only: record identity and merges use stable product IDs.
    const used=new Set();let unnamed=0;
    for(const item of avPlanEntries()){
      const match=String(item.name||'').match(/^Запланований продукт\s*[—–-]\s*(\d+)$/iu);
      if(match&&Number(match[1])>=1&&Number(match[1])<=AV_MAX_DEFERRED_PRODUCTS)used.add(Number(match[1]));
      else unnamed++;
    }
    for(let i=1;i<=AV_MAX_DEFERRED_PRODUCTS&&unnamed>0;i++){if(!used.has(i)){used.add(i);unnamed--;}}
    for(let i=1;i<=AV_MAX_DEFERRED_PRODUCTS;i++)if(!used.has(i))return `Запланований продукт — ${i}`;
    return null;
  }
  // Memes are independent static files, never saved in localStorage, IndexedDB or D1.
  // 33 fixed slots; an uploaded real image replaces the optional placeholder in its slot.
  // Placeholder files are deliberately NEVER included in the rotation.
  const avChoiceMeme=$('av-choice-meme-img');
  const avChoiceMemeSlots=Object.freeze(Array.from({length:33},(_,i)=>
    `./assets/memes/photo-${String(i+1).padStart(2,'0')}.webp`));
  let avChoiceMemeFiles=Object.freeze([]);
  let avChoiceMemeProbe=null;
  let avCurrentMemeSlot=-1;
  let avManualMemeOffset=0; // Display-only; never persisted.
  // The bundled 512px WebP is copied verbatim to each empty slot.
  // This is an exact-byte fingerprint, not a filename/position heuristic: replacing
  // photo-XX.webp alone activates the slot automatically without editing JS.
  const avMemePlaceholderByteLength=15990;
  const avMemePlaceholderSHA256='87ca9af6286b725d149e9c01fb0de4c38f68e866905cfcb7448a6018860dff3c';
  async function avMemeIsPlaceholder(url,headResponse){
    const lengthHeader=headResponse.headers.get('Content-Length');
    const knownLength=lengthHeader === null ? NaN : Number(lengthHeader);
    // A different file size proves it is not the bundled empty-slot image.
    if(Number.isFinite(knownLength)&&knownLength!==avMemePlaceholderByteLength)return false;
    // Equal or unavailable Content-Length requires a content check. Checking bytes
    // avoids misclassifying replacement images having exactly the same file size.
    const response=await fetch(url,{method:'GET',cache:'no-cache'});
    if(!response.ok)return true;
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==avMemePlaceholderByteLength)return false;
    if(globalThis.crypto?.subtle){
      const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
      const hex=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
      return hex===avMemePlaceholderSHA256;
    }
    // The website normally uses HTTPS, but support older/insecure runtimes too.
    const reference=await fetch('./assets/memes/slot-empty.webp',{cache:'no-cache'});
    if(!reference.ok)return true; // Fail closed: do not accidentally show an empty slot.
    const sample=new Uint8Array(await reference.arrayBuffer());
    const candidate=new Uint8Array(bytes);
    return sample.length===candidate.length&&sample.every((b,i)=>b===candidate[i]);
  }
  function avLoadChoiceMemes(){
    if(avChoiceMemeProbe)return avChoiceMemeProbe;
    // Start checking as soon as the app is ready, but display the FIRST confirmed
    // image immediately, without waiting for all 33 optional slots to time out.
    avChoiceMemeProbe=(async()=>{
      const available=new Set();
      let cursor=0;
      const probe=async()=>{
        while(cursor<avChoiceMemeSlots.length){
          const index=cursor++;
          try{
            const response=await fetch(avChoiceMemeSlots[index],{method:'HEAD',cache:'default'});
            if(response.ok&&/^image\//i.test(response.headers.get('Content-Type')||'')
                && !(await avMemeIsPlaceholder(avChoiceMemeSlots[index],response))){
              available.add(index);
              if(available.size===1){
                avChoiceMemeFiles=Object.freeze([avChoiceMemeSlots[index]]);
                avCurrentMemeSlot=-1;
                const frame=avChoiceMeme?.closest('.av-choice-meme');
                frame?.classList.remove('av-meme-empty');
                if(avChoiceMeme)avChoiceMeme.hidden=false;
                avUpdateChoiceMeme();
              }
            }
          }catch(_){/* Missing/offline slots are skipped, not rendered. */}
        }
      };
      await Promise.all(Array.from({length:6},()=>probe()));
      const all=[...available].sort((a,b)=>a-b).map(i=>avChoiceMemeSlots[i]);
      avChoiceMemeFiles=Object.freeze(all);
      const frame=avChoiceMeme?.closest('.av-choice-meme');
      if(!all.length){avChoiceMeme?.removeAttribute('src');if(avChoiceMeme)avChoiceMeme.hidden=true;frame?.classList.add('av-meme-empty');}
      else if(!all.includes(avChoiceMeme?.getAttribute('src'))){avCurrentMemeSlot=-1;avUpdateChoiceMeme();}
    })();
    return avChoiceMemeProbe;
  }
  function avUpdateChoiceMeme(next=false){
    if(!avChoiceMeme)return;
    if(!avChoiceMemeProbe){void avLoadChoiceMemes();return;}
    if(!avChoiceMemeFiles.length)return; // Still checking, or no photos were uploaded.
    const slot=Math.floor(Date.now()/(2*60*60*1000));
    if(slot!==avCurrentMemeSlot){
      avCurrentMemeSlot=slot;
      avManualMemeOffset=0;
    }else if(next){
      avManualMemeOffset=(avManualMemeOffset+1)%avChoiceMemeFiles.length;
    }else return;
    const index=(slot+avManualMemeOffset)%avChoiceMemeFiles.length;
    avChoiceMeme.src=avChoiceMemeFiles[index];
    avChoiceMeme.alt=`Мем ${index+1} із ${avChoiceMemeFiles.length} наявних`;
  }
  // Display-only feedback. No meme selection or animation state is persisted.
  const avMemeNextButton=$('av-choice-meme-next');
  let avMemeFeedbackTimer=0;
  avMemeNextButton?.addEventListener('click',()=>{
    avUpdateChoiceMeme(true);
    clearTimeout(avMemeFeedbackTimer);
    avMemeNextButton.classList.remove('av-meme-success');
    // Restart the small icon animation even on repeated rapid taps.
    void avMemeNextButton.offsetWidth;
    avMemeNextButton.classList.add('av-meme-success');
    avMemeFeedbackTimer=setTimeout(()=>avMemeNextButton.classList.remove('av-meme-success'),650);
  });
  // Keep the rotation accurate while the choice dialog stays open, including after tab resume.
  setInterval(()=>{if($('av-product-choice')?.classList.contains('active'))avUpdateChoiceMeme();},30000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&$('av-product-choice')?.classList.contains('active'))avUpdateChoiceMeme();
  });
  void avLoadChoiceMemes();
  const avProductChoice=$('av-product-choice');
  const avChoiceReady=$('av-choice-ready'),avChoicePlan=$('av-choice-plan'),avChoiceQuick=$('av-choice-quick');
  const avModeToggle=$('av-switch-product-mode'),avPlanList=$('av-planned-list');
  const avQuotaHint=$('av-plan-quota-hint'),avPlanDivider=$('av-plan-form-divider'),avPlanAddLabel=$('av-plan-add-label');
  const avReadyReference=$('av-ready-reference'),avAddTitle=$('av-add-modal-title');
  const avLightboxReady=$('av-lightbox-ready');
  let avAddMode='ready',avEditingPlanId=null,avSelectedPlanId=null,avReadyNameDraft='';
  function avCloseAddModal(){
    window.AvProductGallery?.stopAll();addProductModal.classList.remove('active');
    document.body.classList.remove('edit-modal-open');
    avEditingPlanId=null;avSelectedPlanId=null;avReadyReference.hidden=true;
  }
  function avPlanEntries(){return products.filter(avDeferredProduct);}
  function avReferenceButtons(){
    avReadyReference.textContent='';
    const plan=products.find(p=>String(p.id)===String(avSelectedPlanId)&&avDeferredProduct(p));
    avReadyReference.hidden=!plan;
    if(!plan)return;
    const desc=document.createElement('div');desc.className='av-reference-caption';
    desc.textContent='Запланований продукт — звіряйте дані за фото. Після збереження готового продукту цей план буде видалено.';
    avReadyReference.append(desc);
    normalizeProductGallery(plan.gallery).images.slice(0,2).forEach((src,index)=>{
      if(!src)return;
      const b=document.createElement('button');b.type='button';b.textContent=index===0?'Головне фото':'Харчова цінність';
      b.addEventListener('click',()=>{const label=index===0?'Головне фото':'Харчова цінність';showButtonState(b,'Відкрито','success',900);setTimeout(()=>window.AvPhotoLightbox?.open(src,label,'ready'),170);});
      avReadyReference.append(b);
    });
  }
  function avRenderPlanList(){
    avPlanList.textContent='';
    const items=avPlanEntries();
    const header=document.createElement('div');header.className='av-planned-list-heading';
    header.textContent='Заплановані продукти:';
    avPlanList.append(header);
    if(!items.length){
      const empty=document.createElement('p');empty.textContent='Запланованих продуктів поки немає.';avPlanList.append(empty);
    }
    if(avPlanDivider)avPlanDivider.hidden=false;
    items.forEach((product,index)=>{
      const row=document.createElement('section');row.className='av-planned-card';
      const title=document.createElement('strong');title.textContent=/^Запланований продукт\s*[—–-]\s*\d+$/iu.test(String(product.name||''))?`Запланований продукт — ${Number(String(product.name).match(/(\d+)$/u)[1])}`:`Запланований продукт — ${index+1}`;row.append(title);
      const body=document.createElement('div');body.className='av-planned-card-body';
      const preview=document.createElement('div');preview.className='av-planned-photo-grid';
      normalizeProductGallery(product.gallery).images.slice(0,2).forEach((src,j)=>{
        if(!src)return;
        const btn=document.createElement('button');btn.type='button';btn.className='av-planned-image';
        const photo=document.createElement('img');photo.src=src;photo.alt=j===0?'Головне фото продукту':'Харчова цінність';
        btn.append(photo);btn.addEventListener('click',()=>{avSelectedPlanId=product.id;window.AvPhotoLightbox?.open(src,photo.alt,'planned');});preview.append(btn);
      });
      body.append(preview);
      const actions=document.createElement('div');actions.className='av-planned-actions';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Видалити';remove.className='av-plan-remove';
      remove.addEventListener('click',()=>{
        if(!confirm('Видалити запланований продукт разом із фотографіями?'))return;
        saveUndoSnapshot('Видалення запланованого продукту');
        const previousProducts=products;
        products=products.filter(p=>String(p.id)!==String(product.id));
        if(!saveProductsLocal()){products=previousProducts;showButtonState(remove,'Не видалено','error');return;}
        if(String(avSelectedPlanId)===String(product.id))avSelectedPlanId=null;
        avRenderPlanList();avReferenceButtons();renderProducts(searchInput?.value||'');
        logAction('Видалено запланований продукт.');
      });
      actions.append(remove);body.append(actions);row.append(body);avPlanList.append(row);
    });
  }
  function avSetAddMode(mode,resetPlanned=false){
    const next=mode==='planned'?'planned':'ready';
    if(next==='planned'&&avAddMode==='ready')avReadyNameDraft=newProductName.value;
    avAddMode=next;
    addProductModal.classList.toggle('av-planned-mode',avAddMode==='planned');
    avAddTitle.textContent=avAddMode==='planned'?'Запланувати продукт':'Додати продукт';
    avModeToggle.textContent=avAddMode==='planned'?'← Перейти до додавання продукту':'Перейти до запланованих →';
    avModeToggle.dataset.originalText=avModeToggle.textContent;
    if(avQuotaHint)avQuotaHint.hidden=avAddMode!=='planned';
    if(avPlanDivider&&avAddMode!=='planned')avPlanDivider.hidden=true;
    if(avPlanAddLabel)avPlanAddLabel.hidden=avAddMode!=='planned';
    addProductSave.textContent=avAddMode==='planned'?'Запланувати':'Зберегти';
    if(avAddMode==='planned'){
      if(resetPlanned){avEditingPlanId=null;window.AvProductGallery?.reset('new');}
      newProductName.value=AV_PLANNED_NAME;newProductName.readOnly=true;
      const g=window.AvProductGallery?.collect('new');
      if(g&&(!g.visible||g.no_data))window.AvProductGallery?.load('new',{...g,visible:true,no_data:false});
      avRenderPlanList();
    }else{
      newProductName.readOnly=false;
      newProductName.value=avReadyNameDraft;
      avReferenceButtons();
    }
    avPlanList.hidden=avAddMode!=='planned';
    if(avAddMode==='planned')avReadyReference.hidden=true;
  }
  // Keep all mode-switch and image controls on the site's existing pressed-state palette.
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('#av-switch-product-mode,.av-planned-image,.av-ready-reference button,#av-lightbox-ready,#av-choice-ready,#av-choice-plan,#av-choice-quick,#av-choice-cancel');
    if(!button)return;
    button.classList.add('av-ui-pressed');
    setTimeout(()=>button.classList.remove('av-ui-pressed'),190);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const button=event.target.closest?.('#av-switch-product-mode,.av-planned-image,.av-ready-reference button,#av-lightbox-ready,#av-choice-ready,#av-choice-plan,#av-choice-quick,#av-choice-cancel');
    if(!button)return;
    button.classList.add('av-ui-pressed');setTimeout(()=>button.classList.remove('av-ui-pressed'),190);
  },true);
  avModeToggle?.addEventListener('click',()=>{
    if(avModeToggle.disabled)return;
    const next=avAddMode==='ready'?'planned':'ready';
    avSetAddMode(next);
    // Status restores the *new* destination label, including the arrow.
    showButtonState(avModeToggle,'Перейдено','success',850);
  });
  const avChoiceCancel=$('av-choice-cancel');
  let avChoiceTransition=0;
  function avFinishChoice(mode=null){
    if(!avProductChoice?.classList.contains('active'))return;
    const token=++avChoiceTransition;
    const source=mode==='ready'?avChoiceReady:mode==='planned'?avChoicePlan:mode==='quick'?avChoiceQuick:avChoiceCancel;
    [avChoiceCancel,avChoiceReady,avChoicePlan,avChoiceQuick].forEach(button=>{if(button)button.disabled=true;});
    showButtonState(source,mode?'Відкрито':'Скасовано',mode?'success':'error',900);
    setTimeout(()=>{
      if(token!==avChoiceTransition)return;
      avProductChoice.classList.remove('active');
      [avChoiceCancel,avChoiceReady,avChoicePlan,avChoiceQuick].forEach(button=>{
        if(button){button.disabled=false;clearSharedButtonState(button);}
      });
      if(mode){if(mode==='quick')avOpenQuickModal();else avOpenAddWithMode(mode);return;}
      document.body.classList.remove('edit-modal-open');
      showButtonState(addProductButton,'Скасовано','error',1000);
      logAction('Вибір способу додавання продукту скасовано.');
    },240);
  }
  avChoiceQuick?.addEventListener('click',()=>avFinishChoice('quick'));
  avChoiceReady?.addEventListener('click',()=>avFinishChoice('ready'));
  avChoicePlan?.addEventListener('click',()=>avFinishChoice('planned'));
  avChoiceCancel?.addEventListener('click',()=>avFinishChoice());
  avProductChoice?.addEventListener('click',e=>{
    if(e.target===avProductChoice)avFinishChoice();
  });
  // AVP2_START: pure decoder. The text import NEVER persists a product directly.
  function parseAvp2(rawText){
    const submitted=String(rawText??'');
    if(/[\r\n]/u.test(submitted))throw new Error('AVP2 потрібно вводити одним рядком.');
    const source=submitted.trim();
    if(!source)throw new Error('Поле порожнє. Вставте рядок AVP2.');
    if(source.length>20000)throw new Error('Рядок AVP2 завеликий.');
    const parts=[];let part='';
    for(let i=0;i<source.length;i++){
      const c=source[i];
      if(c==='\\'){
        const next=source[++i];
        if(next!=='\\'&&next!=='|')throw new Error('Некоректне екранування: дозволені лише \\| та \\\\.');
        part+=next;
      }else if(c==='|'){parts.push(part);part='';}
      else part+=c;
    }
    parts.push(part);
    if(parts[0]!=='@AVP2')throw new Error('Невірний формат: потрібен ідентифікатор @AVP2.');
    const keys=['Н','Г','К','Б','Ж','В','Ц','С','КЛ','Р','ШВ','О'];
    const fields=new Map();
    for(const p of parts.slice(1)){
      const i=p.indexOf('=');
      if(i<1)throw new Error('Поле AVP2 має мати вигляд ПОЗНАЧЕННЯ=значення.');
      const key=p.slice(0,i).trim(),value=p.slice(i+1).trim();
      if(!keys.includes(key))throw new Error('Невідоме поле AVP2: '+key);
      if(fields.has(key))throw new Error('Поле '+key+' повторюється.');
      if(!value||value.includes('#'))throw new Error('Поле '+key+' порожнє або містить незаповнений #.');
      fields.set(key,value);
    }
    for(const key of keys)if(!fields.has(key))throw new Error('Відсутнє обов’язкове поле: '+key);
    function readNumber(raw,key,positive=false){
      if(!/^(?:\d+)(?:[,.]\d+)?$/u.test(raw))throw new Error('Некоректне число в полі '+key+'.');
      const n=Number(raw.replace(',','.'));
      if(!Number.isFinite(n)||(positive?n<=0:n<0))throw new Error('Некоректне значення в полі '+key+'.');
      return n;
    }
    const grams=readNumber(fields.get('Г'),'Г',true);
    if(fields.get('Н')==='НД')throw new Error('Укажіть назву продукту.');
    const nutrition={};
    const mapping={К:'kcal',Б:'protein',Ж:'fat',В:'carb',Ц:'sugar',С:'salt',КЛ:'fiber'};
    for(const [key,property] of Object.entries(mapping)){
      const raw=fields.get(key);
      if(raw==='НД'){nutrition[property]=null;continue;}
      const val=readNumber(raw,key);
      const result=val*100/grams;
      if(!Number.isFinite(result))throw new Error('Перерахунок поля '+key+' неможливий.');
      nutrition[property]=Number(result.toPrecision(12));
    }
    const rawWeights=fields.get('ШВ');
    const weights=rawWeights==='-'?[]:rawWeights.split(';').map(v=>readNumber(v,'ШВ',true));
    if(weights.length>4)throw new Error('Можна вказати не більше чотирьох швидких ваг.');
    const warnings=[];
    if(nutrition.sugar!==null&&nutrition.carb!==null&&nutrition.sugar>nutrition.carb+1e-9)
      warnings.push('Цукрів більше, ніж загальних вуглеводів.');
    for(const property of ['protein','fat','carb','sugar','salt','fiber']){
      if(nutrition[property]!==null&&nutrition[property]>100)
        warnings.push('Показник '+Object.entries(mapping).find(([,v])=>v===property)[0]+' перевищує 100 г на 100 г продукту.');
    }
    return {name:fields.get('Н'),categoryLabel:fields.get('Р'),
      description:fields.get('О')==='НД'?null:fields.get('О'),
      quickWeights:weights,nutrition,warnings};
  }
  // AVP2_END
  const avQuickModal=$('av-quick-modal'),avQuickDisplay=$('av-quick-display'),avQuickText=$('av-quick-text');
  const avQuickEdit=$('av-quick-edit'),avQuickClear=$('av-quick-clear'),avQuickCopy=$('av-quick-copy');
  const avQuickPaste=$('av-quick-paste'),avQuickApply=$('av-quick-apply'),avQuickCancel=$('av-quick-cancel'),avQuickStatus=$('av-quick-status');
  let avQuickValue='',avQuickEditing=false;
  function avQuickMessage(message='',success=false){
    if(!avQuickStatus)return;
    avQuickStatus.hidden=!message;avQuickStatus.textContent=message;
    avQuickStatus.classList.toggle('is-success',success);
  }
  function avQuickResize(){
    if(!avQuickEditing||!avQuickText)return;
    avQuickText.style.height='auto';
    avQuickText.style.height=Math.max(68,Math.ceil(avQuickText.scrollHeight+2))+'px';
  }
  function avQuickRender(){
    avQuickDisplay.hidden=avQuickEditing;
    avQuickDisplay.textContent=avQuickValue||'Дані ще не введені';
    avQuickDisplay.classList.toggle('archive-note-empty',!avQuickValue);
    avQuickText.hidden=!avQuickEditing;
    if(avQuickEditing){avQuickText.value=avQuickValue;requestAnimationFrame(avQuickResize);}
    // Paste must look and remain actionable: prior to editing, it explains what to do.
    avQuickPaste.classList.remove('is-awaiting-edit');
    avQuickPaste.removeAttribute('aria-disabled');
    avQuickPaste.title=avQuickEditing?'Вставити текст із буфера обміну':'Спочатку натисніть «Редагувати»';
    const label=avQuickEditing?'Зберегти дані':'Редагувати';
    avQuickEdit.textContent=label;avQuickEdit.dataset.originalText=label;
    avQuickEdit.setAttribute('aria-pressed',avQuickEditing?'true':'false');
    if(avQuickEditing)setButtonStatusPermanent(avQuickEdit,label,'info');
    else if(avQuickEdit.classList.contains('button-status-info'))clearSharedButtonState(avQuickEdit);
  }
  // iOS virtual keyboard obscures fixed, vertically centered dialogs. Only this AVP2
  // dialog follows the visual viewport while its editor is focused.
  let avQuickBaseViewportHeight=0;
  let avQuickKeyboardRaf=0;
  function avQuickFitKeyboard(){
    if(!avQuickModal?.classList.contains('active'))return;
    const vv=window.visualViewport;
    const available=Math.max(120,Math.round(vv?.height||window.innerHeight));
    const top=Math.max(0,Math.round(vv?.offsetTop||0));
    const active=avQuickEditing && document.activeElement===avQuickText;
    const keyboardOpen=active&&available<avQuickBaseViewportHeight-85;
    avQuickModal.classList.toggle('av-quick-keyboard-open',keyboardOpen);
    avQuickModal.style.setProperty('--av-quick-visible-height',available+'px');
    if(keyboardOpen){
      // Move only the card, never the full-screen dark overlay. Moving the overlay
      // exposed the page beneath the virtual keyboard and allowed rubber-band scroll.
      const box=avQuickModal.querySelector('.av-quick-box');
      const usable=Math.max(120,available-16);
      const boxHeight=box?Math.min(box.scrollHeight,usable):usable;
      const cardTop=Math.max(8,Math.round(top+(available-boxHeight)/2));
      avQuickModal.style.setProperty('--av-quick-card-top',cardTop+'px');
      if(box&&box.scrollHeight>box.clientHeight){
        // The action row remains reachable in the shortened visual viewport.
        box.scrollTop=Math.max(box.scrollTop,box.scrollHeight-box.clientHeight);
      }
    }else avQuickModal.style.removeProperty('--av-quick-card-top');
  }
  function avQuickScheduleKeyboardFit(){
    if(avQuickKeyboardRaf)cancelAnimationFrame(avQuickKeyboardRaf);
    avQuickKeyboardRaf=requestAnimationFrame(()=>{
      avQuickKeyboardRaf=0;
      avQuickFitKeyboard();
    });
  }
  window.visualViewport?.addEventListener('resize',avQuickScheduleKeyboardFit);
  window.visualViewport?.addEventListener('scroll',avQuickScheduleKeyboardFit);
  window.addEventListener('resize',avQuickScheduleKeyboardFit);
  avQuickText?.addEventListener('focus',avQuickScheduleKeyboardFit);
  avQuickText?.addEventListener('blur',avQuickScheduleKeyboardFit);
  function avOpenQuickModal(){
    avQuickValue='';avQuickEditing=false;avQuickMessage();avQuickRender();
    avQuickBaseViewportHeight=Math.round(window.visualViewport?.height||window.innerHeight);
    avQuickModal.classList.add('active');document.body.classList.add('edit-modal-open');
    avQuickScheduleKeyboardFit();
    logAction('Відкрито швидкий імпорт продукту AVP2.');
  }
  function avCloseQuickModal(){
    if(document.activeElement===avQuickText)avQuickText.blur();
    avQuickModal.classList.remove('active','av-quick-keyboard-open');document.body.classList.remove('edit-modal-open');
    avQuickModal.style.removeProperty('--av-quick-visible-height');
    avQuickModal.style.removeProperty('--av-quick-card-top');
    avQuickEditing=false;avQuickValue='';avQuickText.value='';avQuickMessage();
  }
  avQuickDisplay?.addEventListener('contextmenu',e=>e.preventDefault());
  avQuickDisplay?.addEventListener('dragstart',e=>e.preventDefault());
  avQuickText?.addEventListener('input',()=>{avQuickMessage();avQuickResize();avQuickScheduleKeyboardFit();});
  avQuickEdit?.addEventListener('click',()=>{
    clearSharedButtonState(avQuickEdit);
    if(!avQuickEditing){avQuickEditing=true;avQuickRender();avQuickText.focus({preventScroll:true});avQuickScheduleKeyboardFit();return;}
    avQuickValue=avQuickText.value;avQuickText.blur();avQuickEditing=false;avQuickRender();avQuickScheduleKeyboardFit();
    showButtonState(avQuickEdit,'Збережено','success',1100);
  });
  avQuickClear?.addEventListener('click',()=>{
    const value=avQuickEditing?avQuickText.value:avQuickValue;
    if(!value){showButtonState(avQuickClear,'Немає що очищати','error',1300);return;}
    if(!confirm('Очистити текст швидкого імпорту?')){showButtonState(avQuickClear,'Не очищено','error',1300);return;}
    avQuickValue='';avQuickEditing=false;avQuickRender();avQuickMessage();
    showButtonState(avQuickClear,'Очищено','success',1300);
  });
  avQuickCopy?.addEventListener('click',async()=>{
    const value=avQuickEditing?avQuickText.value:avQuickValue;
    if(!value){showButtonState(avQuickCopy,'Немає що копіювати','error',1300);return;}
    const ok=await copyText(value);
    showButtonState(avQuickCopy,ok?'Скопійовано':'Не скопійовано',ok?'success':'error',1300);
  });
  avQuickPaste?.addEventListener('click',async()=>{
    if(!avQuickEditing){showButtonState(avQuickPaste,'Спочатку редагуйте','error',1400);return;}
    try{
      const value=await navigator.clipboard.readText();
      if(!value){showButtonState(avQuickPaste,'Буфер порожній','error',1600);return;}
      avQuickText.value=value;avQuickMessage();avQuickResize();
      showButtonState(avQuickPaste,'Вставлено','success',1200);
    }catch(_){
      avQuickMessage('Немає доступу до буфера обміну. Вставте текст у поле вручну.');
      showButtonState(avQuickPaste,'Немає доступу','error',1700);
      avQuickText.focus({preventScroll:true});
    }
  });
  avQuickCancel?.addEventListener('click',()=>{
    showButtonState(avQuickCancel,'Скасовано','error',600);
    setTimeout(()=>{avCloseQuickModal();showButtonState(addProductButton,'Скасовано','error',1000);},230);
  });
  avQuickModal?.addEventListener('click',event=>{
    if(event.target!==avQuickModal)return;
    avCloseQuickModal();showButtonState(addProductButton,'Скасовано','error',1000);
  });
  avQuickApply?.addEventListener('click',()=>{
    const text=avQuickEditing?avQuickText.value:avQuickValue;
    let parsed;
    try{parsed=parseAvp2(text);}catch(error){
      avQuickMessage(error.message||'Помилка AVP2.');
      showButtonState(avQuickApply,'Помилка','error',1500);return;
    }
    const category=getAllCategories().find(item=>item.label===parsed.categoryLabel);
    if(!category){
      avQuickMessage('Відділ «'+parsed.categoryLabel+'» відсутній серед відділів сайту.');
      showButtonState(avQuickApply,'Помилка відділу','error',1500);return;
    }
    if(parsed.warnings.length&&!confirm('Перевірте суперечливі дані:\n'+parsed.warnings.join('\n')+'\n\nПродовжити заповнення без виправлень?')){
      avQuickMessage('Перенесення скасовано: перевірте значення AVP2.');
      showButtonState(avQuickApply,'Не перенесено','error',1600);return;
    }
    avCloseQuickModal();
    avOpenAddWithMode('ready'); // Existing save button remains the ONLY persistence action.
    newProductName.value=parsed.name;
    avReadyNameDraft=parsed.name;
    for(const [name,input,checkbox] of [
      ['kcal',newProductKcal,newProductKcalNoData],['protein',newProductProtein,newProductProteinNoData],
      ['fat',newProductFat,newProductFatNoData],['carb',newProductCarb,newProductCarbNoData],
      ['sugar',newProductSugar,newProductSugarNoData],['salt',newProductSalt,newProductSaltNoData],
      ['fiber',newProductFiber,newProductFiberNoData]]){
      const value=parsed.nutrition[name];
      setNoDataField(input,checkbox,value===null,'0');
      if(value!==null)input.value=String(value);
    }
    newProductCategory.value=category.id;
    newProductQuickWeights.forEach((input,i)=>{input.value=parsed.quickWeights[i]??'';});
    setNoDataField(newProductDescription,newProductDescriptionNoData,parsed.description===null,'');
    if(parsed.description!==null)newProductDescription.value=parsed.description;
    logAction('AVP2 перевірено: форму продукту заповнено без збереження.');
  });

  function avOpenAddWithMode(mode){
    clearAddForm();window.AvProductGallery?.reset('new');avSelectedPlanId=null;avEditingPlanId=null;avAddMode='ready';avReadyNameDraft='';
    addProductModal.classList.add('active');document.body.classList.add('edit-modal-open');
    avSetAddMode(mode,true);
    logAction('Відкрито '+(mode==='planned'?'планування':'додавання')+' продукту.');
    if(mode==='ready')setTimeout(()=>newProductName.focus({preventScroll:true}),60);
  }
  avLightboxReady?.addEventListener('click',()=>{
    if(avLightboxReady.disabled)return;
    avLightboxReady.disabled=true;
    showButtonState(avLightboxReady,'Перейдено','success',800);
    setTimeout(()=>{
      window.AvPhotoLightbox?.close();
      if(addProductModal.classList.contains('active'))avSetAddMode('ready');
      avLightboxReady.disabled=false;
    },220);
  });
  window.addEventListener('av:lightbox-open',event=>{
    const btn=avLightboxReady;
    if(btn){
      clearSharedButtonState(btn);
      btn.hidden=!(addProductModal.classList.contains('active')&&avSelectedPlanId&&['planned','ready'].includes(event.detail?.context));
      btn.textContent='Додати продукт';
      btn.dataset.originalText='Додати продукт';
    }
  });
  window.addEventListener('av:lightbox-close',()=>{if(avLightboxReady)avLightboxReady.hidden=true;});

  function clearAddForm(){
    if(avNameLater){avNameLater.checked=false;avNameBeforeLater="";newProductName.readOnly=false;}
    [newProductName,newProductKcal,newProductProtein,newProductFat,newProductCarb,newProductSugar,newProductSalt,newProductFiber,newProductDescription].forEach(el=>el.value="");
    newProductQuickWeights.forEach(input=>input.value="");
    
    if(newProductCategory)newProductCategory.value="";
    [
      [newProductKcal,newProductKcalNoData,"0"],
      [newProductProtein,newProductProteinNoData,"0"],
      [newProductFat,newProductFatNoData,"0"],
      [newProductCarb,newProductCarbNoData,"0"],
      [newProductSugar,newProductSugarNoData,"0"],
      [newProductSalt,newProductSaltNoData,"0"],
      [newProductFiber,newProductFiberNoData,"0"],
      [newProductDescription,newProductDescriptionNoData,""]
    ].forEach(([input,checkbox,emptyValue])=>setNoDataField(input,checkbox,false,emptyValue));
  }
  window.avOpenManualProduct=()=>avOpenAddWithMode('ready');
  addProductButton?.addEventListener('click',()=>{
    avChoiceTransition++;
    [avChoiceCancel,avChoiceReady,avChoicePlan,avChoiceQuick].forEach(button=>{
      if(button){button.disabled=false;clearSharedButtonState(button);}
    });
    avUpdateChoiceMeme();
    avProductChoice.classList.add('active');document.body.classList.add('edit-modal-open');
  });
  addProductCancel?.addEventListener("click",()=>{showButtonState(addProductCancel,"Скасовано","error",500);setTimeout(()=>{avCloseAddModal();requestAnimationFrame(()=>showButtonState(addProductButton,"Продукт не додано","error"));},260);logAction("Додавання продукту скасовано.");});
  addProductModal?.addEventListener("click",e=>{
    if(e.target===addProductModal){
      avCloseAddModal();
      showButtonState(addProductButton,'Скасовано','error',1000);
    }
  });
  // v87: browser min/step hints are not validation for click handlers.
  function validateProductNumericFields(fields,quickWeights=[]){
    for(const [input,noData] of fields){
      if(!input||noData?.checked)continue;
      const raw=String(input.value??"").trim();
      if(raw&&!Number.isFinite(Number(raw)) || (raw&&Number(raw)<0)){
        alert("Харчові показники не можуть бути від’ємними або некоректними.");
        input.focus();return false;
      }
    }
    for(const input of quickWeights){
      const raw=String(input?.value??"").trim();
      if(raw&&(!Number.isFinite(Number(raw))||Number(raw)<=0)){
        alert("Швидка вага повинна бути більшою за нуль.");
        input?.focus();return false;
      }
    }
    return true;
  }
  const addProductNumberFields=[[newProductKcal,newProductKcalNoData],[newProductProtein,newProductProteinNoData],[newProductFat,newProductFatNoData],[newProductCarb,newProductCarbNoData],[newProductSugar,newProductSugarNoData],[newProductSalt,newProductSaltNoData],[newProductFiber,newProductFiberNoData]];
  const editProductNumberFields=[[editProductKcal,editProductKcalNoData],[editProductProtein,editProductProteinNoData],[editProductFat,editProductFatNoData],[editProductCarb,editProductCarbNoData],[editProductSugar,editProductSugarNoData],[editProductSalt,editProductSaltNoData],[editProductFiber,editProductFiberNoData]];
  addProductSave?.addEventListener("click",()=>{
    if(avAddMode==='planned'){
      const gallery=window.AvProductGallery?.collect('new');
      if(!gallery||!validProductGallery(gallery)){showButtonState(addProductSave,'Помилка фото','error');return;}
      const count=gallery.images.slice(0,2).filter(Boolean).length;
      if(!count){showButtonState(addProductSave,'Зробіть фото','error');return;}
      const quota=avDeferredQuota(products);
      if(quota.products>=AV_MAX_DEFERRED_PRODUCTS || quota.photos+count>AV_MAX_DEFERRED_PHOTOS){
        avQuotaError(addProductSave);return;
      }
      const plannedName=avNextPlannedName();
      if(!plannedName){avQuotaError(addProductSave);return;}
      saveUndoSnapshot('Планування продукту');
      const entry=normalizeProduct({
        id:createId('product'),name:plannedName,planned:true,
        gallery:{...gallery,visible:true,no_data:false,images:[...gallery.images]},
        created_at:new Date().toISOString(),
        kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,
        kcal_no_data:true,protein_no_data:true,fat_no_data:true,carb_no_data:true,
        sugar_no_data:true,salt_no_data:true,fiber_no_data:true,full_name:'',full_name_no_data:true,
        quick_weights:[]
      });
      const previousProducts=products;
      products=[...products,entry];
      if(!saveProductsLocal()){products=previousProducts;showButtonState(addProductSave,'Не збережено','error');return;}
      logAction('Заплановано додавання продукту.');
      renderProducts(searchInput?.value||'');
      avEditingPlanId=null;window.AvProductGallery?.reset('new');
      avSetAddMode('planned');
      showButtonState(addProductSave,'Збережено','success',450);
      setTimeout(()=>{avCloseAddModal();requestAnimationFrame(()=>showButtonState(addProductButton,'Заплановано','success',1000));},470);
      return;
    }
    const name=newProductName.value.trim(); if(!name){showButtonState(addProductSave,"Вкажіть назву","error");newProductName.focus({preventScroll:true});return;}
    const deferred=avNameLater?.checked===true&&name===AV_LATER_NAME;
    const category=departmentsEnabled?String(newProductCategory?.value||"").trim():"";
    if(departmentsEnabled&&!getAllCategories().some(item=>item.id===category)){
      showButtonState(addProductSave,"Оберіть відділ","error");
      newProductCategory?.focus({preventScroll:true});return;
    }
    if(!validateProductNumericFields(addProductNumberFields,newProductQuickWeights)){showButtonState(addProductSave,"Некоректні дані","error");return;}
    const gallery=normalizeProductGallery(); // Completed products have no new gallery.
    const q=avDeferredQuota(products);
    if((deferred&&q.products>=AV_MAX_DEFERRED_PRODUCTS)||
       (gallery.images.some(Boolean)&&q.photos+gallery.images.filter(Boolean).length>AV_MAX_DEFERRED_PHOTOS)){
      avQuotaError(addProductSave);return;
    }
    saveUndoSnapshot(`Додавання продукту «${name}»`);
    products.push(normalizeProduct({
      id:createId("product"),name,
      kcal:newProductKcalNoData?.checked?0:newProductKcal.value,kcal_no_data:!!newProductKcalNoData?.checked||(deferred&&!String(newProductKcal.value).trim()),
      protein:newProductProteinNoData?.checked?0:newProductProtein.value,protein_no_data:!!newProductProteinNoData?.checked||(deferred&&!String(newProductProtein.value).trim()),
      fat:newProductFatNoData?.checked?0:newProductFat.value,fat_no_data:!!newProductFatNoData?.checked||(deferred&&!String(newProductFat.value).trim()),
      carb:newProductCarbNoData?.checked?0:newProductCarb.value,carb_no_data:!!newProductCarbNoData?.checked||(deferred&&!String(newProductCarb.value).trim()),
      sugar:newProductSugarNoData?.checked?0:newProductSugar.value,sugar_no_data:!!newProductSugarNoData?.checked||(deferred&&!String(newProductSugar.value).trim()),
      salt:newProductSaltNoData?.checked?0:newProductSalt.value,salt_no_data:!!newProductSaltNoData?.checked||(deferred&&!String(newProductSalt.value).trim()),
      fiber:newProductFiberNoData?.checked?0:newProductFiber.value,fiber_no_data:!!newProductFiberNoData?.checked||(deferred&&!String(newProductFiber.value).trim()),
      unit:"г",
      category,
      quick_weights:readQuickWeightInputs(newProductQuickWeights),
      full_name:newProductDescriptionNoData?.checked?"":newProductDescription.value.trim(),
      full_name_no_data:!!newProductDescriptionNoData?.checked,
      gallery,
      created_at:new Date().toISOString()
    }));
    // Completing a selected plan atomically replaces its temporary photos with
    // the ready product in one persisted products snapshot.
    const finishedPlan=products.find(p=>String(p.id)===String(avSelectedPlanId)&&avDeferredProduct(p));
    if(finishedPlan)products=products.filter(p=>String(p.id)!==String(finishedPlan.id));
    if(!saveProductsLocal()){showButtonState(addProductSave,"Не збережено","error",1500);return;}
    window.AvProductGallery?.reset("new");
    renderProducts(searchInput?.value||"");showButtonState(addProductSave,"Збережено","success",500);
    window.dispatchEvent(new CustomEvent("av:product-saved",{detail:{name}}));
    setTimeout(()=>{avCloseAddModal();requestAnimationFrame(()=>showButtonState(addProductButton,"Продукт додано","success"));},260);
    logAction(`Додано продукт «${name}».`,{product:products[products.length-1]});
  });

  function openEditProductModal(product){
    editingProduct=product;
    if(editProductNameLater)editProductNameLater.checked=avDeferredProduct(product);
    window.AvProductGallery?.load("edit",normalizeProductGallery(product.gallery));
    const oldImages=normalizeProductGallery(product.gallery).images;
    const legacyGallery=$('edit-gallery-widget');if(legacyGallery)legacyGallery.hidden=!oldImages.some(Boolean);
    if(editProductNameLater)editProductNameLater.closest('.no-data-option').hidden=true;
    editProductName.value=product.name;
    editProductKcal.value=productDisplayNumber(product,"kcal");setNoDataField(editProductKcal,editProductKcalNoData,product.kcal_no_data);
    editProductProtein.value=productDisplayNumber(product,"protein");setNoDataField(editProductProtein,editProductProteinNoData,product.protein_no_data);
    editProductFat.value=productDisplayNumber(product,"fat");setNoDataField(editProductFat,editProductFatNoData,product.fat_no_data);
    editProductCarb.value=productDisplayNumber(product,"carb");setNoDataField(editProductCarb,editProductCarbNoData,product.carb_no_data);
    editProductSugar.value=productDisplayNumber(product,"sugar");setNoDataField(editProductSugar,editProductSugarNoData,product.sugar_no_data);
    editProductSalt.value=productDisplayNumber(product,"salt");setNoDataField(editProductSalt,editProductSaltNoData,product.salt_no_data);
    editProductFiber.value=productDisplayNumber(product,"fiber");setNoDataField(editProductFiber,editProductFiberNoData,product.fiber_no_data);
    if(editProductCategory)editProductCategory.value=getProductCategory(product).id;
    fillQuickWeightInputs(editProductQuickWeights,product.quick_weights);
    editProductDescription.value=product.full_name||"";setNoDataField(editProductDescription,editProductDescriptionNoData,product.full_name_no_data,"");
    editProductModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction(`Відкрито редагування продукту «${product.name}».`);setTimeout(()=>editProductName.focus(),50);
  }
  editProductNameLater?.addEventListener("change",()=>{
    if(!editingProduct)return;
    if(editProductNameLater.checked){
      editProductName.value="Потрібно додати пізніше";
    }else if(avDeferredProduct({name:editProductName.value})){
      editProductName.value="";
      for(const [field,flag] of [
        [editProductKcal,editProductKcalNoData],[editProductProtein,editProductProteinNoData],
        [editProductFat,editProductFatNoData],[editProductCarb,editProductCarbNoData],
        [editProductSugar,editProductSugarNoData],[editProductSalt,editProductSaltNoData],
        [editProductFiber,editProductFiberNoData]
      ]){
        if(flag?.checked){flag.checked=false;field.disabled=false;field.readOnly=false;
          field.removeAttribute("disabled");field.removeAttribute("readonly");
          if(Number(field.value)===0)field.value="";
        }
      }
      editProductName.focus({preventScroll:true});
    }
  });
  function closeEditProductModal(){window.AvProductGallery?.reset("edit");editingProduct=null;editProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  editProductCancel?.addEventListener("click",()=>{const n=editingProduct?.name||"продукту";showButtonState(editProductCancel,"Скасовано","error");logAction(`Редагування «${n}» скасовано.`);setTimeout(closeEditProductModal,400);});
  editProductModal?.addEventListener("click",e=>{if(e.target===editProductModal)closeEditProductModal();});
  editProductModal?.addEventListener("touchmove",e=>{if(e.target===editProductModal)e.preventDefault();},{passive:false});
  editProductSave?.addEventListener("click",()=>{
    if(!editingProduct)return;
    const name=editProductName.value.trim(); if(!name){showButtonState(editProductSave,"Вкажіть назву","error");editProductName.focus({preventScroll:true});return;}
    if(!validateProductNumericFields(editProductNumberFields,editProductQuickWeights)){showButtonState(editProductSave,"Некоректні дані","error");return;}
    const gallery=window.AvProductGallery?.collect("edit") || normalizeProductGallery(editingProduct.gallery);
    if(!gallery||!validProductGallery(gallery)){showButtonState(editProductSave,"Помилка галереї","error");return;}
    // Finishing a deferred product is the natural point to reclaim photo space.
    // Only a positive confirmation removes photos: cancelling the prompt keeps
    // them attached and does not alter the rest of the product edit.
    if(avDeferredProduct(editingProduct)&&!avDeferredProduct({name})&&gallery.images.some(Boolean)){
      if(window.confirm("Продукт більше не позначено «Потрібно додати пізніше».\n\nВидалити його тимчасові фотографії, щоб звільнити пам’ять?\n\nOK — видалити фото; Скасувати — залишити фото.")){
        gallery.images=[null,null,null];gallery.visible=false;gallery.no_data=false;
      }
    }
    {
      const before=avDeferredQuota(products);
      const q=avDeferredQuota(products.filter(p=>String(p.id)!==String(editingProduct.id)));
      const nextPhotoCount=q.photos+gallery.images.filter(Boolean).length;
      if((avDeferredProduct({name})&&q.products>=AV_MAX_DEFERRED_PRODUCTS)||
         (nextPhotoCount>AV_MAX_DEFERRED_PHOTOS&&nextPhotoCount>before.photos)){
        avQuotaError(editProductSave);return;
      }
    }
    saveUndoSnapshot(`Редагування продукту «${editingProduct.name}»`);
    Object.assign(editingProduct,{
      name,
      kcal:editProductKcalNoData?.checked?0:number(editProductKcal.value),kcal_no_data:!!editProductKcalNoData?.checked||(avDeferredProduct({name})&&!String(editProductKcal.value).trim()),
      protein:editProductProteinNoData?.checked?0:number(editProductProtein.value),protein_no_data:!!editProductProteinNoData?.checked,
      fat:editProductFatNoData?.checked?0:number(editProductFat.value),fat_no_data:!!editProductFatNoData?.checked,
      carb:editProductCarbNoData?.checked?0:number(editProductCarb.value),carb_no_data:!!editProductCarbNoData?.checked,
      sugar:editProductSugarNoData?.checked?0:number(editProductSugar.value),sugar_no_data:!!editProductSugarNoData?.checked,
      salt:editProductSaltNoData?.checked?0:number(editProductSalt.value),salt_no_data:!!editProductSaltNoData?.checked,
      fiber:editProductFiberNoData?.checked?0:number(editProductFiber.value),fiber_no_data:!!editProductFiberNoData?.checked,
      category:departmentsEnabled?String(editProductCategory?.value||""):String(editingProduct.category||""), // v241: manual department or unchanged legacy metadata
      quick_weights:readQuickWeightInputs(editProductQuickWeights),
      display:{
        kcal:normalizeDisplayNumber(editProductKcal.value,number(editProductKcal.value)),
        protein:normalizeDisplayNumber(editProductProtein.value,number(editProductProtein.value)),
        fat:normalizeDisplayNumber(editProductFat.value,number(editProductFat.value)),
        carb:normalizeDisplayNumber(editProductCarb.value,number(editProductCarb.value)),
        sugar:normalizeDisplayNumber(editProductSugar.value,number(editProductSugar.value)),
        salt:normalizeDisplayNumber(editProductSalt.value,number(editProductSalt.value)),
        fiber:normalizeDisplayNumber(editProductFiber.value,number(editProductFiber.value))
      },
      full_name:editProductDescriptionNoData?.checked?"":editProductDescription.value.trim(),
      full_name_no_data:!!editProductDescriptionNoData?.checked,
      gallery
    });
    if(!saveProductsLocal()){showButtonState(editProductSave,"Не збережено","error",1500);return;}
    renderProducts(searchInput?.value||"");
    showButtonState(editProductSave,"Збережено","success"); logAction(`Зміни продукту «${name}» збережено.`,{product:normalizeProduct(editingProduct)});
    setTimeout(closeEditProductModal,400);
  });

  const SORT_LABELS={
    categories:"за відділами",
    oldest:"за датою: від старіших до новіших",
    newest:"за датою: від новіших до старіших",
    list:"списком А–Я",
    random:"хаотично",
    initial:"у початковому порядку",
    manual:"у ручному порядку"
  };
  const SORT_BUTTONS={
    categories:sortCategories,
    oldest:sortOldest,
    newest:sortNewest,
    list:sortList,
    random:sortRandom,
    initial:sortInitial
  };
  function categoryById(id){
    return getAllCategories().find(category=>category.id===id)||null;
  }
  function renderCategoryOrderList(){
    if(!categoryOrderList)return;
    categoryOrderList.innerHTML="";
    const order=normalizeCategoryOrder(pendingCategoryOrder);
    pendingCategoryOrder=[...order];

    order.forEach((id,index)=>{
      const category=categoryById(id);
      if(!category)return;

      const row=document.createElement("div");
      row.className="category-order-row";
      row.dataset.category=id;

      const position=document.createElement("span");
      position.className="category-order-position";
      position.textContent=String(index+1);

      const label=document.createElement("span");
      label.className="category-order-label";
      label.textContent=category.label;

      const controls=document.createElement("div");
      controls.className="category-order-controls";

      const up=document.createElement("button");
      up.type="button";
      up.className="category-order-move";
      up.textContent="↑";
      up.title="Перемістити вище";
      up.disabled=index===0;

      const down=document.createElement("button");
      down.type="button";
      down.className="category-order-move";
      down.textContent="↓";
      down.title="Перемістити нижче";
      down.disabled=index===order.length-1;

      up.addEventListener("click",()=>{
        if(index<=0)return;
        showButtonState(up,"↑","success",140);
        setTimeout(()=>{
          [pendingCategoryOrder[index-1],pendingCategoryOrder[index]]=[pendingCategoryOrder[index],pendingCategoryOrder[index-1]];
          logAction(`Відділ «${category.label}» переміщено вище.`);
          renderCategoryOrderList();
        },140);
      });
      down.addEventListener("click",()=>{
        if(index>=order.length-1)return;
        showButtonState(down,"↓","success",140);
        setTimeout(()=>{
          [pendingCategoryOrder[index],pendingCategoryOrder[index+1]]=[pendingCategoryOrder[index+1],pendingCategoryOrder[index]];
          logAction(`Відділ «${category.label}» переміщено нижче.`);
          renderCategoryOrderList();
        },140);
      });

      controls.append(up,down);
      row.append(position,label,controls);
      categoryOrderList.append(row);
    });
  }
  function openCategoryOrderModal(){
    pendingCategoryOrder=getCategoryOrder();
    renderCategoryOrderList();
    sortProductsModal?.classList.remove("active");
    categoryOrderModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито налаштування порядку відділів.");
  }
  function closeCategoryOrderModal(returnToSort=false){
    categoryOrderModal?.classList.remove("active");
    pendingCategoryOrder=null;
    if(returnToSort){
      sortProductsModal?.classList.add("active");
      updateSortOptionState();
      document.body.classList.add("edit-modal-open");
    }else if(!deleteProductModal?.classList.contains("active")){
      document.body.classList.remove("edit-modal-open");
    }
  }
  sortCategoryOrder?.addEventListener("click",()=>{
    showButtonState(sortCategoryOrder,"Відкрито","success",500);
    setTimeout(openCategoryOrderModal,220);
  });
  categoryOrderReset?.addEventListener("click",()=>{
    pendingCategoryOrder=defaultCategoryOrder();
    renderCategoryOrderList();
    showButtonState(categoryOrderReset,"Скинуто","error",1000);
    logAction("Порядок відділів скинуто до початкового у вікні налаштування.");
  });
  categoryOrderCancel?.addEventListener("click",()=>{
    showButtonState(categoryOrderCancel,"Скасовано","error",500);
    logAction("Зміну порядку відділів скасовано.");
    setTimeout(()=>{closeCategoryOrderModal(true);requestAnimationFrame(()=>showButtonState(sortCategoryOrder,"Не змінено","error"));},260);
  });
  categoryOrderSave?.addEventListener("click",()=>{
    saveUndoSnapshot("Зміна порядку відділів");
    beginStorageTransaction("Збереження порядку відділів");
    saveCategoryOrder(pendingCategoryOrder||defaultCategoryOrder());
    if(departmentsEnabled){
      currentSort="categories";
      safeStorageSet(SORT_KEY,"categories",{critical:true});markLocalDataChanged();
    }
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(categoryOrderSave,"Не збережено","error");return;}
    renderProducts(searchInput?.value||"");
    if(deleteProductModal?.classList.contains("active"))renderDeleteProductList();
    showButtonState(categoryOrderSave,"Збережено","success",500);
    const outer=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction(departmentsEnabled?"Порядок відділів збережено; сортування за відділами застосовано.":"Порядок відділів збережено; відділи залишаються вимкненими.");
    setTimeout(()=>{closeCategoryOrderModal(false);requestAnimationFrame(()=>showButtonState(outer,"Збережено","success"));},260);
  });
  categoryOrderModal?.addEventListener("click",e=>{
    if(e.target===categoryOrderModal){
      logAction("Налаштування порядку відділів закрито без збереження.");
      closeCategoryOrderModal(true);
    }
  });


  function updateSortOptionState(){
    Object.entries(SORT_BUTTONS).forEach(([mode,button])=>{
      if(!button)return;
      button.classList.toggle("sort-option-current",mode===currentSort);
    });
    if(sortCategories){sortCategories.disabled=false;sortCategories.setAttribute("aria-pressed",String(departmentsEnabled));sortCategories.classList.toggle("av-sort-departments-on",departmentsEnabled);}
    if(sortDepartmentsToggle)sortDepartmentsToggle.checked=departmentsEnabled;
  }
  function closeSortModal(){
    sortProductsModal?.classList.remove("active");
    if(!deleteProductModal?.classList.contains("active"))document.body.classList.remove("edit-modal-open");
  }
  function openSortModal(target="blocks"){
    sortTarget=target;
    updateSortOptionState();
    sortProductsModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито сортування продуктів.");
  }
  sortProductsButton?.addEventListener("click",()=>openSortModal("blocks"));
  deleteSortProducts?.addEventListener("click",()=>openSortModal("delete"));
  sortProductsCancel?.addEventListener("click",()=>{
    showButtonState(sortProductsCancel,"Скасовано","error",500);
    const b=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction("Сортування продуктів скасовано.");
    setTimeout(()=>{closeSortModal();requestAnimationFrame(()=>showButtonState(b,"Не відсортовано","error"));},260);
  });
  sortProductsModal?.addEventListener("click",e=>{
    if(e.target===sortProductsModal){
      const b=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
      logAction("Сортування продуктів закрито без змін.");
      closeSortModal();
      requestAnimationFrame(()=>showButtonState(b,"Не відсортовано","error"));
    }
  });
  function applySort(mode){
    if(!SORT_BUTTONS[mode])return;
    if(mode==="categories"&&!departmentsEnabled){
      showButtonState(sortCategories,"Відділи вимкнено","error");
      return;
    }
    saveUndoSnapshot("Сортування продуктів");
    beginStorageTransaction("Сортування продуктів");
    currentSort=mode;
    safeStorageSet(SORT_KEY,mode,{critical:true});markLocalDataChanged();
    if(mode==="random"){safeStorageSet(RANDOM_SORT_SEED_KEY,`${Date.now()}-${Math.random()}`,{critical:true});markLocalDataChanged();}
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(SORT_BUTTONS[mode],"Не збережено","error");return;}
    updateSortOptionState();

    const selectedSortButton=SORT_BUTTONS[mode];
    showButtonState(selectedSortButton,"Відсортовано","success",500);

    renderProducts(searchInput?.value||"");
    if(deleteProductModal.classList.contains("active"))renderDeleteProductList();

    const outer=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction(`Продукти відсортовано ${SORT_LABELS[mode]}.`);
    setTimeout(()=>{closeSortModal();requestAnimationFrame(()=>showButtonState(outer,"Відсортовано","success"));},260);
  }
  function saveDepartmentsEnabled(value){
    if(!persistUserChange("Налаштування відділів",()=>safeStorageSet(DEPARTMENTS_ENABLED_KEY,value?"1":"0",{critical:true})))return false;
    departmentsEnabled=!!value;updateSortOptionState();return true;
  }

  // Один перемикач «За відділами»: увімкнення / вимкнення без другої галочки.
  function toggleDepartmentsFromSortButton(){
    const next=!departmentsEnabled;
    saveUndoSnapshot(next?"Увімкнення сортування за відділами":"Вимкнення сортування за відділами");
    if(!beginStorageTransaction("Перемикання сортування за відділами")){
      showButtonState(sortCategories,"Не збережено","error");return;
    }
    const newMode=next?"categories":"initial";
    const enabledSaved=safeStorageSet(DEPARTMENTS_ENABLED_KEY,next?"1":"0",{critical:true});
    const sortSaved=enabledSaved&&safeStorageSet(SORT_KEY,newMode,{critical:true});
    const syncSaved=sortSaved&&markLocalDataChanged();
    const committed=finishStorageTransaction();
    if(!enabledSaved||!sortSaved||!syncSaved||!committed){
      reloadPrimaryStateFromStorage();
      showButtonState(sortCategories,"Не збережено","error");return;
    }
    departmentsEnabled=next;currentSort=newMode;
    markModalCommitted(sortProductsModal);
    updateSortOptionState();renderProducts(searchInput?.value||"");
    if(deleteProductModal?.classList.contains("active"))renderDeleteProductList();
    showButtonState(sortCategories,next?"Увімкнено":"Вимкнено",next?"success":"error");
    const outer=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction(next?"Відділи увімкнено; продукти відсортовано за відділами.":"Відділи вимкнено; повернено початковий порядок.");
    setTimeout(()=>{
      closeSortModal();
      requestAnimationFrame(()=>showButtonState(outer,"Відсортовано","success"));
    },340);
  }

  function renderCustomCategoryList(){
    if(!customCategoryList)return;

    const all=getAllCategories();
    const defaults=all.filter(category=>!category.custom);
    const custom=all.filter(category=>category.custom);
    const counter=document.getElementById("av-custom-category-counter");
    if(counter)counter.textContent=`Власних відділів: ${custom.length} / ${AV_MAX_CUSTOM_CATEGORIES}`;
    customCategoryList.innerHTML="";

    function appendSection(title,categories,emptyText){
      const section=document.createElement("section");
      section.className="custom-category-section";

      const heading=document.createElement("div");
      heading.className="custom-category-section-title";
      heading.textContent=title;
      section.append(heading);

      const list=document.createElement("div");
      list.className="custom-category-section-list";

      if(!categories.length){
        const empty=document.createElement("div");
        empty.className="custom-category-empty";
        empty.textContent=emptyText;
        list.append(empty);
      }else{
        categories.forEach(category=>{
          const row=document.createElement("div");
          row.className="custom-category-row";

          const name=document.createElement("div");
          name.className="custom-category-name";
          name.textContent=category.label;

          const remove=document.createElement("button");
          remove.type="button";
          remove.className="custom-category-remove";
          remove.textContent="Видалити";

          if(category.custom)remove.addEventListener("click",()=>{
            const ok=confirm(`Видалити відділ «${category.label}»? Самі продукти не видаляться.`);
            if(!ok){
              showButtonState(remove,"Скасовано","error");
              return;
            }

            saveUndoSnapshot(`Видалення відділу «${category.label}»`);
            products.forEach(product=>{
              if(String(product.category||"")===category.id)product.category="";
            });
            beginStorageTransaction("Видалення відділу");
            saveProductsLocal();

            if(category.custom){
              saveCustomCategories(getCustomCategories().filter(item=>item.id!==category.id));
            }else{
              saveDeletedDefaultCategoryIds([...getDeletedDefaultCategoryIds(),category.id]);
            }

            saveCategoryOrder(getCategoryOrder().filter(id=>id!==category.id));
            if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(remove,"Не видалено","error");return;}
            populateProductCategorySelects();
            renderCustomCategoryList();
            renderCategoryOrderList();
            renderProducts(searchInput?.value||"");
            showButtonState(remove,"Видалено","success");
            logAction(`Відділ «${category.label}» видалено.`);
          });

          row.append(name);
          if(category.custom)row.append(remove);
          else{
            const preset=document.createElement("span");
            preset.className="av-default-category-mark";
            preset.textContent="Стандартний";
            row.append(preset);
          }
          list.append(row);
        });
      }

      section.append(list);
      customCategoryList.append(section);
    }

    appendSection(
      "Власні відділи",
      custom,
      "Власних відділів ще немає."
    );
    appendSection(
      "Відділи за замовчуванням",
      defaults,
      "Усі відділи за замовчуванням видалено."
    );
  }

  function openCustomCategoryModal(){
    sortProductsModal?.classList.remove("active");
    renderCustomCategoryList();
    if(customCategoryName)customCategoryName.value="";
    customCategoryModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито налаштування власних відділів.");
  }

  function closeCustomCategoryModal(returnToSort=true){
    customCategoryModal?.classList.remove("active");
    if(returnToSort){
      sortProductsModal?.classList.add("active");
      updateSortOptionState();
      document.body.classList.add("edit-modal-open");
    }else if(!deleteProductModal?.classList.contains("active")){
      document.body.classList.remove("edit-modal-open");
    }
  }

  sortCustomCategory?.addEventListener("click",()=>{
    showButtonState(sortCustomCategory,"Відкрито","success",500);
    setTimeout(openCustomCategoryModal,220);
  });
  customCategoryAdd?.addEventListener("click",()=>{
    const label=String(customCategoryName?.value||"").trim().replace(/\s+/g," ").slice(0,40);
    if(!label){
      showButtonState(customCategoryAdd,"Вкажіть назву","error");
      customCategoryName?.focus();
      return;
    }
    const duplicate=getAllCategories().some(category=>normalizeCategorySearch(category.label)===normalizeCategorySearch(label));
    if(duplicate){showButtonState(customCategoryAdd,"Вже існує","error");return;}
    saveUndoSnapshot(`Створення відділу «${label}»`);
    const custom=getCustomCategories();
    if(custom.length>=AV_MAX_CUSTOM_CATEGORIES){
      showButtonState(customCategoryAdd,"Ліміт 15","error");
      return;
    }
    const created={id:createCustomCategoryId(),label};
    custom.push(created);
    beginStorageTransaction("Створення відділу");
    saveCustomCategories(custom);
    saveCategoryOrder([...getCategoryOrder(),created.id]);
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(customCategoryAdd,"Не додано","error");return;}
    populateProductCategorySelects();
    renderCustomCategoryList();
    if(customCategoryName)customCategoryName.value="";
    showButtonState(customCategoryAdd,"Додано","success");
    logAction(`Створено власний відділ «${label}».`);
  });
  customCategoryName?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();customCategoryAdd?.click();}});
  customCategoryClose?.addEventListener("click",()=>{
    showButtonState(customCategoryClose,"Закрито","success");
    setTimeout(()=>closeCustomCategoryModal(true),260);
  });
  customCategoryModal?.addEventListener("click",event=>{if(event.target===customCategoryModal)closeCustomCategoryModal(true);});

  sortCategories?.addEventListener("click",toggleDepartmentsFromSortButton);
  sortOldest?.addEventListener("click",()=>applySort("oldest"));
  sortNewest?.addEventListener("click",()=>applySort("newest"));
  sortList?.addEventListener("click",()=>applySort("list"));
  sortRandom?.addEventListener("click",()=>applySort("random"));
  sortInitial?.addEventListener("click",()=>applySort("initial"));

  deleteProductButton?.addEventListener("click",()=>{if(deleteProductSearch)deleteProductSearch.value="";updateDeleteProductSearchClear();renderDeleteProductList();deleteProductModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction("Відкрито видалення продукту.");});
  function updateDeleteProductSearchClear(){
    syncAvSearchClear(deleteProductSearchClear,deleteProductSearch?.value);
  }
  deleteProductSearch?.addEventListener("input",()=>{updateDeleteProductSearchClear();renderDeleteProductList();});
  deleteProductSearchClear?.addEventListener("click",()=>{
    if(!deleteProductSearch?.value)return;
    deleteProductSearch.value="";updateDeleteProductSearchClear();renderDeleteProductList();
    flashAvSearchClear(deleteProductSearchClear);
    deleteProductSearch.focus({preventScroll:true});
  });
  [deleteProductCancelTop,deleteProductCancelBottom].forEach(b=>b?.addEventListener("click",()=>{showButtonState(b,"Скасовано","error",500);setTimeout(()=>{deleteProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");requestAnimationFrame(()=>showButtonState(deleteProductButton,"Продукт не видалено","error"));},260);logAction("Видалення продукту скасовано.");}));
  deleteProductModal?.addEventListener("click",e=>{if(e.target===deleteProductModal){deleteProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}});
  function renderDeleteProductList(){
    deleteProductList.innerHTML="";
    const sorted=getSortedProducts();
    const query=normalizeCategorySearch(deleteProductSearch?.value||"");
    const list=query?sorted
      .map((product,index)=>({product,index,rank:productSearchRank(product,query)}))
      .filter(entry=>entry.rank<999)
      .sort((a,b)=>a.rank-b.rank||a.index-b.index)
      .map(entry=>entry.product):sorted;
    if(!list.length){
      deleteProductList.innerHTML=`<div class="delete-product-empty">${query?"Продуктів за назвою або описом не знайдено":"База продуктів порожня."}</div>`;
      return;
    }
    list.forEach(product=>{
      const item=document.createElement("div");item.className="delete-product-item";
      const name=document.createElement("div");name.className="delete-product-item-name";name.textContent=product.name;
      const button=document.createElement("button");button.className="delete-product-item-button";button.textContent="Видалити";
      button.addEventListener("click",()=>{
        if(!confirm(`Видалити продукт "${product.name}"?`)){
          showButtonState(button,"Скасовано","error",1000);
          showButtonState(deleteProductButton,"Продукт не видалено","error",1500);
          logAction(`Видалення продукту «${product.name}» скасовано.`);
          return;
        }
        saveUndoSnapshot(`Видалення продукту «${product.name}»`);
        products=products.filter(p=>p.id!==product.id);if(!saveProductsLocal()){showButtonState(deleteProductButton,"Не видалено","error");return;}renderProducts(searchInput?.value||"");renderDeleteProductList();
        showButtonState(deleteProductButton,"Продукт видалено","success",1500); logAction(`Видалено продукт «${product.name}».`);
      });
      item.append(name,button);deleteProductList.append(item);
    });
  }

  function productById(id){
    return products.find(product=>product.id===id)||null;
  }
  function renderProductOrderList(){
    if(!productOrderList)return;
    productOrderList.innerHTML="";
    const order=Array.isArray(pendingProductOrder)?pendingProductOrder:[];
    if(!order.length){
      productOrderList.innerHTML='<div class="product-order-empty">База продуктів порожня.</div>';
      return;
    }

    order.forEach((id,index)=>{
      const product=productById(id);
      if(!product)return;

      const row=document.createElement("div");
      row.className="product-order-row";
      row.dataset.id=id;

      const position=document.createElement("span");
      position.className="product-order-position";
      position.textContent=String(index+1);

      const name=document.createElement("span");
      name.className="product-order-name";
      name.textContent=product.name;

      const controls=document.createElement("div");
      controls.className="product-order-controls";

      const up=document.createElement("button");
      up.type="button";
      up.className="product-order-move";
      up.textContent="↑";
      up.title="Перемістити вище";
      up.disabled=index===0;

      const down=document.createElement("button");
      down.type="button";
      down.className="product-order-move";
      down.textContent="↓";
      down.title="Перемістити нижче";
      down.disabled=index===order.length-1;

      up.addEventListener("click",()=>{
        if(index<=0)return;
        showButtonState(up,"↑","success",140);
        setTimeout(()=>{
          [pendingProductOrder[index-1],pendingProductOrder[index]]=[pendingProductOrder[index],pendingProductOrder[index-1]];
          logAction(`Продукт «${product.name}» переміщено вище у вікні зміни розташування.`);
          renderProductOrderList();
        },140);
      });
      down.addEventListener("click",()=>{
        if(index>=order.length-1)return;
        showButtonState(down,"↓","success",140);
        setTimeout(()=>{
          [pendingProductOrder[index],pendingProductOrder[index+1]]=[pendingProductOrder[index+1],pendingProductOrder[index]];
          logAction(`Продукт «${product.name}» переміщено нижче у вікні зміни розташування.`);
          renderProductOrderList();
        },140);
      });

      controls.append(up,down);
      row.append(position,name,controls);
      productOrderList.append(row);
    });
  }
  function openProductOrderModal(){
    productOrderOriginal=products.filter(p=>!avDeferredProduct(p)).map(product=>product.id);
    pendingProductOrder=[...productOrderOriginal];
    renderProductOrderList();
    productOrderModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито зміну розташування продуктів.");
  }
  function closeProductOrderModal(){
    productOrderModal?.classList.remove("active");
    pendingProductOrder=null;
    productOrderOriginal=null;
    document.body.classList.remove("edit-modal-open");
  }
  reorderProductsButton?.addEventListener("click",()=>{
    if(!products.length){
      showButtonState(reorderProductsButton,"Немає продуктів","error",1500);
      logAction("Зміну розташування продуктів не відкрито: база порожня.");
      return;
    }
    openProductOrderModal();
  });
  function getInitialProductOrder(){
    return products.filter(p=>!avDeferredProduct(p))
      .map((product,index)=>({product,index}))
      .sort((a,b)=>{
        const at=Date.parse(a.product?.created_at||"");
        const bt=Date.parse(b.product?.created_at||"");
        const av=Number.isFinite(at)?at:0;
        const bv=Number.isFinite(bt)?bt:0;
        return av-bv||a.index-b.index;
      })
      .map(entry=>entry.product.id);
  }
  productOrderReset?.addEventListener("click",()=>{
    pendingProductOrder=getInitialProductOrder();
    renderProductOrderList();
    showButtonState(productOrderReset,"Скинуто","error",1000);
    logAction("Порядок продуктів у вікні зміни розташування скинуто до початкового порядку додавання.");
  });
  productOrderCancel?.addEventListener("click",()=>{
    showButtonState(productOrderCancel,"Скасовано","error",500);
    logAction("Зміну розташування продуктів скасовано.");
    setTimeout(()=>{closeProductOrderModal();requestAnimationFrame(()=>showButtonState(reorderProductsButton,"Не змінено","error"));},260);
  });
  productOrderSave?.addEventListener("click",()=>{
    const next=Array.isArray(pendingProductOrder)?pendingProductOrder:[];
    const original=Array.isArray(productOrderOriginal)?productOrderOriginal:[];
    const changed=next.length===original.length&&next.some((id,index)=>id!==original[index]);

    if(changed){
      saveUndoSnapshot("Зміна розташування продуктів");
      const byId=new Map(products.map(product=>[product.id,product]));
      // Do not drop planned records when the ready-product order changes.
      products=[...next.map(id=>byId.get(id)).filter(Boolean),...products.filter(avDeferredProduct)];
      currentSort="manual";
      beginStorageTransaction("Збереження порядку продуктів");
      safeStorageSet(SORT_KEY,"manual",{critical:true});
      saveProductsLocal();
      if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(productOrderSave,"Не збережено","error");return;}
      renderProducts(searchInput?.value||"");
      showButtonState(productOrderSave,"Збережено","success",500);
      logAction("Розташування продуктів змінено та збережено.");
    }else{
      showButtonState(productOrderSave,"Не змінено","error",500);
      logAction("Зміну розташування продуктів завершено без змін.");
    }
    const reorderResultChanged=changed;
    setTimeout(()=>{closeProductOrderModal();requestAnimationFrame(()=>showButtonState(reorderProductsButton,reorderResultChanged?"Розташування змінено":"Не змінено",reorderResultChanged?"success":"error"));},260);
  });
  productOrderModal?.addEventListener("click",e=>{
    if(e.target===productOrderModal){
      logAction("Вікно зміни розташування продуктів закрито без збереження.");
      closeProductOrderModal();
      requestAnimationFrame(()=>showButtonState(reorderProductsButton,"Не змінено","error"));
    }
  });
  function updateReorderState(){
    if(!grid)return;
    grid.classList.remove("reorder-mode");
    grid.querySelectorAll(".food-card").forEach(card=>{card.draggable=false;});
  }
  function attachDragEvents(){}

  function normalizeDailyGoal(value){
    const source=value&&typeof value==="object"?value:{};
    return {
      enabled:!!source.enabled,
      kcal:Math.max(0,number(source.kcal)),
      protein:Math.max(0,number(source.protein)),
      fat:Math.max(0,number(source.fat)),
      carb:Math.max(0,number(source.carb)),
      sugar:Math.max(0,number(source.sugar)),
      salt:Math.max(0,number(source.salt)),
      fiber:Math.max(0,number(source.fiber))
    };
  }
  function hasDailyGoalData(value){
    const goal=normalizeDailyGoal(value);
    return ["kcal","protein","fat","carb","sugar","salt","fiber"].some(key=>goal[key]>0);
  }

  function peekExportVersion(){return exportRevisionDecision().version;}

  function readStorageJson(key,fallback=null){
    const raw=localStorage.getItem(key);
    if(raw===null)return fallback;
    try{return JSON.parse(raw);}catch(_){return fallback;}
  }

  function collectBackupSettings(){
    return {
      sort_mode:currentSort,
      random_sort_seed:localStorage.getItem(RANDOM_SORT_SEED_KEY),
      active_tab:localStorage.getItem(ACTIVE_TAB_KEY)||"blocks",
      stats_to_today:localStorage.getItem(STATS_TO_TODAY_KEY)==="1",
      stats_goal_visible:localStorage.getItem(STATS_GOAL_VISIBLE_KEY)!=="0",
      site_data_visible:localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0",
      archive_note:archiveNote,
      archive_note_visible:archiveNoteVisible,
      departments_enabled:departmentsEnabled,
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      database_updated_at:localStorage.getItem(DATABASE_UPDATED_KEY)
    };
  }

  // A backup contains section data, never interface state or local console.
  function collectBlockBackupSettings(){
    const settings=collectBackupSettings();
    return {
      sort_mode:settings.sort_mode,
      random_sort_seed:settings.random_sort_seed,
      departments_enabled:settings.departments_enabled,
      category_order:settings.category_order,
      custom_categories:settings.custom_categories,
      deleted_default_categories:settings.deleted_default_categories,
      database_updated_at:settings.database_updated_at
    };
  }
  function exportScopeLabel(scope){
    return {all:"усі дані чотирьох основних розділів",blocks:"КБЖВ Блоки",archive:"КБЖВ Архів",calculator:"КБЖВ Калькулятор",profile:"дані профілю"}[scope]||"дані";
  }
  function updateExportScopeUI(){
    exportScopeButtons.forEach(button=>{
      button.disabled=false;
      button.classList.toggle("transfer-scope-selected",button.dataset.scope===exportScope);
    });
    const include=section=>exportScope==="all"||exportScope===section;
    if(exportPreviewProducts)exportPreviewProducts.textContent=include("blocks")?String(products.length):"Не експортується";
    if(exportPreviewArchive)exportPreviewArchive.textContent=include("archive")?String(archiveItems.length):"Не експортується";
    if(exportPreviewArchiveNote)exportPreviewArchiveNote.textContent=include("archive")?(archiveNote?"Присутня":"Порожня"):"Не експортується";
    if(exportPreviewCalculator)exportPreviewCalculator.textContent=include("calculator")?String(calculatorItems.length):"Не експортується";
    if(exportPreviewDraft)exportPreviewDraft.textContent=include("calculator")?(String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??"").trim()?"Є":"Порожня"):"Не експортується";
    if(exportPreviewGoal)exportPreviewGoal.textContent=include("calculator")?(hasDailyGoalData(dailyGoal)?"Задана":"Не задана"):"Не експортується";
    if(exportPreviewProfile)exportPreviewProfile.textContent=include("profile")?(hasProfileData()?"Задані":"Порожні"):"Не експортується";
    if(exportPreviewSettings)exportPreviewSettings.textContent=include("blocks")?"Сортування й відділи":"Не експортуються";
  }

  function closeExportPreview(){
    exportPreviewModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    pendingExport=null;
  }

  function buildExportData(version,exportedAt,scope){
    const data={backup_format:"kbjv-full-backup-v3",schema_version:3,version,exported_at:exportedAt,export_scope:scope};
    if(scope==="all"||scope==="blocks"){
      data.products=products.map((item,index)=>normalizeProduct(item,index));
      data.blocks_settings=collectBlockBackupSettings();
    }
    if(scope==="all"||scope==="archive"){
      // Archive charts and statistics are deterministically recalculated from these full entries.
      data.archive=JSON.parse(JSON.stringify(archiveNewestFirst(archiveItems).map(item=>({
        ...item,text:stripObsoleteCarbLabel(item.text),
        composition:Array.isArray(item.composition)?item.composition.map(row=>typeof row==='string'
          ?stripObsoleteCarbLabel(row):{...row,text:stripObsoleteCarbLabel(row?.text||'')}):item.composition
      }))));
      data.archive_note=archiveNote;
      data.stats_goal_visible=statsGoalVisible;
    }
    if(scope==="all"||scope==="calculator"){
      data.calculator=calculatorItems.map(item=>normalizeCalculatorItem(item));
      data.calculator_draft=String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??"");
      data.daily_goal=normalizeDailyGoal(dailyGoal);
      data.calculator_quick_presets=normalizeQuickPresets(calculatorQuickPresets);
    }
    if(scope==="all"||scope==="profile")data.profile={...normalizeProfile(profileData),quick_scroll:quickScrollProfilePrefs()};
    return data;
  }

  function performPendingExport(){
    if(!pendingExport)return;
    if(corruptLocalDataKeys.size){
      closeExportPreview();
      showButtonState(exportButton,"Не експортовано","error");
      alert("Виявлено пошкоджені локальні дані. Не створюйте неповну резервну копію; відновіть повний JSON або збережіть початкові дані браузера.");
      return;
    }

    let version;
    try{version=getExportVersion();}
    catch(error){
      closeExportPreview();
      showButtonState(exportButton,"Не експортовано","error");
      alert("Не вдалося зберегти порядковий номер експорту. Перевірте доступність пам’яті браузера; резервна копія не створена.");
      return;
    }
    const exportedAt=pendingExport.exportedAt;
    if(exportPreviewVersion)exportPreviewVersion.textContent=String(version);
    const data=buildExportData(version,exportedAt,exportScope);
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const suffix={blocks:"-blocks",archive:"-archive",calculator:"-calculator",profile:"-profile",all:"-full-backup"}[exportScope]||"-full-backup";
    a.href=url;a.download=`kbjv-v${version}${suffix}.json`;
    document.body.append(a);a.click();a.remove();
    // Give iOS Safari enough time to resolve the download before releasing the Blob.
    setTimeout(()=>URL.revokeObjectURL(url),60000);

    safeStorageSet(LAST_EXPORT_KEY,new Date().toISOString(),{critical:true});
    updateSiteDataCounts();
    closeExportPreview();
    showButtonState(exportButton,"Експортовано","success",1800);
    logAction(`Експортовано резервну копію v${version}: ${exportScopeLabel(exportScope)}.`,{scope:exportScope,version});
  }

  exportButton?.addEventListener("click",()=>{
    const version=peekExportVersion(),exportedAt=new Date().toISOString();
    exportScope="all";
    pendingExport={version,exportedAt};
    if(exportPreviewVersion)exportPreviewVersion.textContent=String(version);
    if(exportPreviewDate)exportPreviewDate.textContent=formatImportDate(exportedAt);
    updateExportScopeUI();
    exportPreviewModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction(`Вікно перевірки експорту відкрито: продуктів: ${products.length}, записів калькулятора: ${calculatorItems.length}, записів архіву: ${archiveItems.length}, версія ${version}.`);
  });
  exportScopeButtons.forEach(button=>button.addEventListener("click",()=>{
    if(button.disabled)return;
    exportScope=button.dataset.scope||"all";
    updateExportScopeUI();
    logAction(`Для експорту вибрано: ${exportScopeLabel(exportScope)}.`);
  }));
  exportPreviewCancel?.addEventListener("click",()=>{
    showButtonState(exportPreviewCancel,"Скасовано","error",550);
    logAction("Експорт скасовано після перевірки.");
    setTimeout(()=>{closeExportPreview();requestAnimationFrame(()=>showButtonState(exportButton,"Не експортовано","error"));},260);
  });
  exportPreviewConfirm?.addEventListener("click",()=>{
    if(!pendingExport||exportPreviewConfirm.disabled)return;
    exportPreviewConfirm.disabled=true;
    setTimeout(()=>{
      try{performPendingExport();}
      catch(error){console.error(error);showButtonState(exportButton,"Не експортовано","error");alert("Не вдалося створити резервну копію.");}
      finally{exportPreviewConfirm.disabled=false;}
    },260);
  });
  exportPreviewModal?.addEventListener("click",e=>{if(e.target===exportPreviewModal)exportPreviewCancel?.click();});

  let importDialogOpened=false;
  importButton?.addEventListener("click",()=>{importDialogOpened=true;importFile?.click();});
  window.addEventListener("focus",()=>{
    if(!importDialogOpened)return;
    setTimeout(()=>{
      if(importFile && (!importFile.files || importFile.files.length===0)){showButtonState(importButton,"Не імпортовано","error",1500);logAction("Імпорт бази скасовано.");}
      importDialogOpened=false;
    },200);
  });

  function formatImportDate(value){
    if(!value)return "Не вказано";const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  }
  function stableComparable(value){
    if(Array.isArray(value))return value.map(stableComparable);
    if(value&&typeof value==="object"){const out={};Object.keys(value).sort().forEach(k=>{if(!["created_at","updated_at"].includes(k))out[k]=stableComparable(value[k]);});return out;}
    return value;
  }
  function compareImportCollections(current,incoming,keyFn,normalizeFn=v=>v){
    const currentMap=new Map(current.map((item,i)=>[keyFn(item,i),normalizeFn(item,i)]));
    const incomingMap=new Map(incoming.map((item,i)=>[keyFn(item,i),normalizeFn(item,i)]));
    let added=0,changed=0,removed=0;
    incomingMap.forEach((value,key)=>{if(!currentMap.has(key))added++;else if(JSON.stringify(stableComparable(currentMap.get(key)))!==JSON.stringify(stableComparable(value)))changed++;});
    currentMap.forEach((_,key)=>{if(!incomingMap.has(key))removed++;});
    return {added,changed,removed};
  }
  function formatImportDiff(diff){return `+${diff.added} додано / ~${diff.changed} змінено / −${diff.removed} видалено`;}
  function productImportKey(item,index){const id=String(item?.id||"").trim();if(id)return `id:${id}`;return `name:${String(item?.name||"").trim().toLowerCase()||index}`;}
  function normalizedProductName(item){return String(item?.name||"").trim().toLocaleLowerCase("uk-UA").replace(/\s+/g," ");}
  function getOnlyNewImportedProducts(current,incoming){
    const ids=new Set(current.map(item=>String(item?.id||"").trim()).filter(Boolean));
    // Many planned rows intentionally share the same *non-editable* name.
    // Their stable IDs, not their names, distinguish them in append-only imports.
    const readyNames=new Set(current.filter(p=>!avDeferredProduct(p)).map(normalizedProductName).filter(Boolean));
    const result=[];
    incoming.forEach(item=>{
      const id=String(item?.id||"").trim(),name=normalizedProductName(item);
      if(id&&ids.has(id))return;
      if(!avDeferredProduct(item)&&name&&readyNames.has(name))return;
      result.push(item);if(id)ids.add(id);
      if(!avDeferredProduct(item)&&name)readyNames.add(name);
    });
    return result;
  }
  // Render and import archive entries newest first. Date takes precedence over
  // creation timestamp: importing an older record must not move it to the top.
  // Work on a COPY so remote snapshots, undo history and the original records
  // are never mutated merely by rendering or exporting.
  function archiveNewestFirst(items){
    return [...items].sort((a,b)=>{
      const byDate=archiveDateKey(b?.date).localeCompare(archiveDateKey(a?.date));
      if(byDate)return byDate;
      const aStamp=Date.parse(a?.created_at||"");
      const bStamp=Date.parse(b?.created_at||"");
      if(Number.isFinite(aStamp)&&Number.isFinite(bStamp))return bStamp-aStamp;
      // Stable JS sort keeps the original order for legacy records without timestamps.
      return 0;
    });
  }
  function archiveImportKey(item,index){const id=String(item?.id||"").trim();if(id)return `id:${id}`;return `fallback:${String(item?.date||"")}|${String(item?.text||"")}|${index}`;}
  function archiveImportSignature(item){
    if(!item||typeof item!=="object")return "";
    const {id,created_at,updated_at,...data}=item;
    return JSON.stringify(stableComparable(data));
  }
  function getOnlyNewImportedArchive(current,incoming){
    const ids=new Set(current.map(item=>String(item?.id||"").trim()).filter(Boolean));
    const signatures=new Set(current.map(archiveImportSignature).filter(Boolean));
    const dates=new Set(current.map(item=>archiveDateKey(item?.date)).filter(Boolean));
    const result=[];
    incoming.forEach(item=>{
      const id=String(item?.id||"").trim(),signature=archiveImportSignature(item);
      const date=archiveDateKey(item?.date);
      // Date is the unique key of a daily archive entry, including missing-day markers.
      if((id&&ids.has(id))||(signature&&signatures.has(signature))||(date&&dates.has(date)))return;
      result.push(item);if(id)ids.add(id);if(signature)signatures.add(signature);if(date)dates.add(date);
    });
    return result;
  }

  function isExactIsoDate(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match)return false;
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const probe=new Date(Date.UTC(year,month-1,day));
    return probe.getUTCFullYear()===year&&probe.getUTCMonth()===month-1&&probe.getUTCDate()===day;
  }

  // v89: Validate ALL legacy aliases before normalization, including nested rows.
  const BACKUP_NUTRITION_ALIASES=[
    "kcal","protein","proteins","fat","fats","carb","carbs",
    "sugar","sugars","salt","fiber","fibre"
  ];
  function backupNumber(value){
    if(value===undefined||value===null||value==="")return 0;
    const n=Number(String(value).trim().replace(",","."));
    return Number.isFinite(n)?n:0;
  }
  function isValidBackupNumber(value,{positive=false}={}){
    if(value===undefined||value===null||value==="")return !positive;
    if(typeof value!=="number"&&typeof value!=="string")return false;
    if(typeof value==="string"&&!value.trim())return false;
    const n=backupNumber(value);
    return Number.isFinite(Number(String(value).trim().replace(",",".")))&&(positive?n>0:n>=0);
  }
  function validBackupNutrition(item,{weight=false}={}){
    if(!item||typeof item!=="object"||Array.isArray(item))return false;
    if(BACKUP_NUTRITION_ALIASES.some(key=>!isValidBackupNumber(item[key])))return false;
    for(const [a,b] of [["protein","proteins"],["fat","fats"],["carb","carbs"],["sugar","sugars"],["fiber","fibre"]]){
      if(item[a]!==undefined&&item[a]!==null&&item[b]!==undefined&&item[b]!==null&&backupNumber(item[a])!==backupNumber(item[b]))return false;
    }
    if(weight&&!isValidBackupNumber(item.weight))return false;
    if(item.display!==undefined&&item.display!==null){
      if(typeof item.display!=="object"||Array.isArray(item.display))return false;
      if(BACKUP_NUTRITION_ALIASES.some(key=>!isValidBackupNumber(item.display[key])))return false;
    }
    return true;
  }
  function isValidImportProduct(item){
    if(!validBackupNutrition(item)||!String(item.name??"").trim())return false;
    if(!validProductGallery(item.gallery))return false;
    // A display-only number must never contradict the value used by totals.
    if(item.display){
      const canonical={
        kcal:item.kcal, protein:item.protein??item.proteins, fat:item.fat??item.fats,
        carb:item.carb??item.carbs, sugar:item.sugar??item.sugars,
        salt:item.salt, fiber:item.fiber??item.fibre
      };
      for(const key of Object.keys(canonical)){
        if(item.display[key]===undefined||item.display[key]===null||item.display[key]==="")continue;
        if(backupNumber(item.display[key])!==backupNumber(canonical[key]))return false;
      }
    }
    const weights=item.quick_weights??item.quickWeights;
    if(weights!==undefined){
      if(!Array.isArray(weights)||weights.length>4||weights.some(n=>!isValidBackupNumber(n,{positive:true})))return false;
      if(new Set(weights.map(n=>Number(String(n).replace(",",".")))).size!==weights.length)return false;
    }
    return true;
  }
  function validateImportCategoryList(items,label){
    if(items===undefined)return null;
    if(!Array.isArray(items))throw new Error(`У резервній копії пошкоджено «${label}». Дані не змінено.`);
    if(items.some(item=>!normalizeCustomCategoryItem(item)||String(item.label).trim().length>40))
      throw new Error(`У резервній копії є некоректні власні відділи «${label}». Дані не змінено.`);
    if(items.length>AV_MAX_CUSTOM_CATEGORIES)
      throw new Error("У резервній копії понад 15 власних відділів. Дані не змінено.");
    const normalized=items.map(normalizeCustomCategoryItem);
    if(new Set(normalized.map(item=>item.id)).size!==normalized.length)
      throw new Error(`У «${label}» повторюються ідентифікатори відділів. Дані не змінено.`);
    return normalized;
  }
  function validateImportSettings(settings){
    if(!settings)return;
    for(const key of ["category_order","deleted_default_categories"]){
      if(settings[key]!==undefined&&(!Array.isArray(settings[key])||settings[key].some(value=>typeof value!=="string")))
        throw new Error(`У резервній копії пошкоджене налаштування «${key}».`);
    }
    for(const key of ["departments_enabled","stats_to_today","site_data_visible","stats_goal_visible"]){
      if(settings[key]!==undefined&&typeof settings[key]!=="boolean")
        throw new Error(`У резервній копії пошкоджене налаштування «${key}».`);
    }
    if(settings.sort_mode!==undefined&&!VALID_SORT_MODES.has(settings.sort_mode))
      throw new Error("У резервній копії вказано невідомий режим сортування.");
    if(settings.active_tab!==undefined&&!(["blocks","calculator","archive","console"].includes(settings.active_tab)))
      throw new Error("У резервній копії некоректна активна вкладка.");
    validateImportCategoryList(settings.custom_categories,"settings.custom_categories");
  }
  function normalizeImportedArchiveItem(item,index){
    if(!item||typeof item!=="object"||Array.isArray(item))return null;
    const date=archiveDateKey(item.date);
    if(!date)return null;
    if(typeof item.text!=="string"||!item.text.trim())return null;
    const text=stripObsoleteCarbLabel(item.text);
    if(item.comment!==undefined&&item.comment!==null&&typeof item.comment!=="string")return null;
    if(item.day_type!==undefined&&item.day_type!==null&&
       (typeof item.day_type!=="string"||(item.day_type!==""&&!ARCHIVE_DAY_TYPE_LABELS[item.day_type])))return null;
    if(!validBackupNutrition(item))return null;
    if(item.composition!==undefined && !Array.isArray(item.composition))return null;
    if(Array.isArray(item.composition)&&item.composition.some(row=>
      typeof row==="string"?!row.trim():(!validBackupNutrition(row,{weight:true})||!String(row.text??row.name??"").trim())
    ))return null;
    const composition=Array.isArray(item.composition)?item.composition.map(row=>typeof row==="string"?{text:stripObsoleteCarbLabel(row)}:{...row,text:stripObsoleteCarbLabel(row.text||"")}):[];
    const createdRaw=String(item.created_at||"");
    if(item.created_at!==undefined&&item.created_at!==null&&item.created_at!==""&&Number.isNaN(Date.parse(createdRaw)))return null;
    const createdAt=!Number.isNaN(Date.parse(createdRaw))?createdRaw:`${date}T12:00:00.000Z`;
    return {
      ...item,
      id:String(item.id||createId(`archive-import-${index}`)),date,text,
      comment:String(item.comment||""),day_type:String(item.day_type||""),
      composition,created_at:createdAt
    };
  }

  function validateBackupEnvelope(parsed,isOldArray){
    if(isOldArray)return;
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Некоректна структура резервної копії.");
    const formats=["kbjv-full-backup-v2","kbjv-full-backup-v3"];
    if(parsed.backup_format&&!formats.includes(parsed.backup_format))throw new Error("Непідтримуваний формат резервної копії.");
    if(parsed.schema_version!==undefined){
      const schema=Number(parsed.schema_version);
      if(!Number.isInteger(schema)||schema<0)throw new Error("Пошкоджено версію формату резервної копії.");
      if(schema>3)throw new Error("Цю резервну копію створено новішою версією сайту.");
    }
    if(parsed.backup_format==="kbjv-full-backup-v3"){
      const groups={
        all:["products","blocks_settings","archive","calculator","calculator_draft","daily_goal","calculator_quick_presets","profile"],
        blocks:["products","blocks_settings"],archive:["archive"],
        calculator:["calculator","calculator_draft","daily_goal","calculator_quick_presets"],profile:["profile"]
      };
      const required=groups[parsed.export_scope];
      if(!required)throw new Error("Невідомий розділ резервної копії.");
      const missing=required.filter(key=>!Object.prototype.hasOwnProperty.call(parsed,key));
      if(missing.length)throw new Error(`Неповна резервна копія: відсутні ${missing.join(", ")}. Дані не змінено.`);
      if(required.includes("blocks_settings")){
        const blockKeys=["sort_mode","random_sort_seed","departments_enabled","category_order","custom_categories","deleted_default_categories","database_updated_at"];
        const missed=blockKeys.filter(key=>!Object.prototype.hasOwnProperty.call(parsed.blocks_settings||{},key));
        if(missed.length)throw new Error(`Неповні налаштування блоків: ${missed.join(", ")}. Дані не змінено.`);
      }
    }else if(parsed.backup_format==="kbjv-full-backup-v2"&&parsed.export_scope==="all"){
      const required=["products","archive","calculator","calculator_draft","daily_goal","profile","calculator_quick_presets","console","settings"];
      const missing=required.filter(key=>!Object.prototype.hasOwnProperty.call(parsed,key));
      if(missing.length)throw new Error(`Неповна стара резервна копія: відсутні ${missing.join(", ")}. Дані не змінено.`);
    }
  }

  function calculatorImportSignature(item){
    const row=normalizeCalculatorItem(item);
    return JSON.stringify([String(row.text||row.name||"").trim().replace(/\s+/g," "),
      ...CALCULATOR_NUMERIC_FIELDS.map(k=>Number(row[k]||0))]);
  }
  function getOnlyNewImportedCalculator(current,incoming){
    const ids=new Set(current.map(item=>String(item?.id||"").trim()).filter(Boolean));
    const signatures=new Set(current.map(calculatorImportSignature));
    const result=[];
    incoming.forEach(item=>{
      const id=String(item?.id||"").trim(),sig=calculatorImportSignature(item);
      if((id&&ids.has(id))||signatures.has(sig))return;
      result.push(item);if(id)ids.add(id);signatures.add(sig);
    });
    return result;
  }
  function getOnlyNewQuickPresets(current,incoming){
    const present=new Set(normalizeQuickPresets(current).map(item=>`${item.metric}|${item.amount}`));
    return normalizeQuickPresets(incoming).filter(item=>{
      const key=`${item.metric}|${item.amount}`;
      if(present.has(key))return false;
      present.add(key);return true;
    });
  }
  function mergeNewProfile(current,incoming){
    const original=normalizeProfile(current),next=normalizeProfile(incoming),result={...original};
    for(const field of ["display_name","full_name","birth_date","weight","height","avatar"]){
      if(!String(result[field]||"").trim()&&String(next[field]||"").trim()){
        result[field]=next[field];
        if(field==="weight")result.weight_updated_at=next.weight_updated_at;
        if(field==="height")result.height_updated_at=next.height_updated_at;
      }
    }
    return result;
  }
  function mergeNewGoal(current,incoming){
    const before=normalizeDailyGoal(current),after=normalizeDailyGoal(incoming);
    const result={...before};
    for(const field of ["kcal","protein","fat","carb","sugar","salt","fiber"]){
      if(!(result[field]>0)&&after[field]>0)result[field]=after[field];
    }
    if(!before.enabled&&!hasDailyGoalData(before)&&after.enabled)result.enabled=true;
    return result;
  }
  function mergeNewBlockSettings(incoming){
    if(!incoming)return;
    const known=getCustomCategories();
    const ids=new Set(known.map(item=>item.id));
    const labels=new Set(known.map(item=>normalizeCategorySearch(item.label)));
    const additions=[];
    for(const cat of incoming.custom_categories||[]){
      if(ids.has(cat.id)||labels.has(normalizeCategorySearch(cat.label)))continue;
      additions.push(cat);ids.add(cat.id);labels.add(normalizeCategorySearch(cat.label));
    }
    if(additions.length)saveCustomCategories([...known,...additions]);
    if(Array.isArray(incoming.category_order))saveCategoryOrder([...getCategoryOrder(),...incoming.category_order]);
    // Existing sorting, enabled departments and deleted categories are preferences, not missing records.
  }
  function importScopeParts(scope){
    const single=scope.startsWith("new-")?scope.slice(4):scope;
    return single==="all"?["blocks","archive","calculator","profile"]:[single];
  }
  function updateImportScopeUI(){
    if(!pendingImport)return;
    const p=pendingImport;
    const available={blocks:p.hasProducts,archive:p.hasArchive,calculator:p.hasFullCalculator,profile:p.hasProfile};
    const canAll=Object.values(available).every(Boolean)&&p.hasBlockSettings;
    importScopeButtons.forEach(button=>{
      const scope=button.dataset.scope,parts=importScopeParts(scope);
      const disabled=parts.some(part=>!available[part])||(parts.includes("blocks")&&!p.hasBlockSettings)||((scope==="all"||scope==="new-all")&&!canAll);
      button.disabled=disabled;
      button.classList.toggle("transfer-scope-selected",!disabled&&scope===importScope);
    });
    if(importPreviewProducts)importPreviewProducts.textContent=p.hasProducts?String(p.normalized.length):"Не містить блоків";
    if(importPreviewArchive)importPreviewArchive.textContent=p.hasArchive?String(p.importedArchive.length):"Не містить архіву";
    if(importPreviewArchiveNote)importPreviewArchiveNote.textContent=!p.hasArchive?"Не містить архіву":!p.hasArchiveNote?"Немає у файлі":!p.importedArchiveNote?"Порожня":(
      !importScopeParts(importScope).includes("archive")?"Не імпортується":importScope.startsWith("new-")&&archiveNote.trim()?"Наявна нотатка збережеться":"Присутня, буде імпортована");
    if(importPreviewCalculator)importPreviewCalculator.textContent=p.hasCalculator?String(p.importedCalculator.length):"Не містить калькулятора";
    if(importPreviewDraft)importPreviewDraft.textContent=p.hasDraft?(p.importedDraft.trim()?"Є":"Порожня"):"Не містить чернетки";
    if(importPreviewGoal)importPreviewGoal.textContent=p.hasGoal?"Присутня":"Не містить денної цілі";
    if(importPreviewProfile)importPreviewProfile.textContent=p.hasProfile?"Містить профіль":"Не містить профілю";
    if(importPreviewSettings)importPreviewSettings.textContent=p.hasBlockSettings?"Сортування й відділи":"Не містить";
    const parts=importScopeParts(importScope);
    const onlyNew=importScope.startsWith("new-");
    if(importPreviewProductsDiff){
      importPreviewProductsDiff.textContent=!p.hasProducts?"Недоступно":!parts.includes("blocks")?"Не імпортується":
        onlyNew?`+${getOnlyNewImportedProducts(products,p.normalized).length} нових` :formatImportDiff(p.productDiff);
    }
    if(importPreviewArchiveDiff){
      importPreviewArchiveDiff.textContent=!p.hasArchive?"Недоступно":!parts.includes("archive")?"Не імпортується":
        onlyNew?`+${getOnlyNewImportedArchive(archiveItems,p.importedArchive).length} нових`:formatImportDiff(p.archiveDiff);
    }
    if(importPreviewConfirm){
      const label=onlyNew?"Додати нове":"Імпортувати";
      importPreviewConfirm.textContent=label;importPreviewConfirm.dataset.originalText=label;
    }
  }

  function closeImportPreview(){
    importPreviewModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    pendingImport=null;
    // Escape/backdrop cancellation must allow choosing this same file again.
    if(importFile)importFile.value="";
    importDialogOpened=false;
  }

  function applyImportedBlockSettings(settings){
    if(!settings||typeof settings!=="object")return;
    if(Array.isArray(settings.custom_categories))saveCustomCategories(settings.custom_categories);
    if(Array.isArray(settings.deleted_default_categories))saveDeletedDefaultCategoryIds(settings.deleted_default_categories);
    populateProductCategorySelects();
    if(Array.isArray(settings.category_order))saveCategoryOrder(settings.category_order);
    if(typeof settings.departments_enabled==="boolean")saveDepartmentsEnabled(settings.departments_enabled);
    if(VALID_SORT_MODES.has(String(settings.sort_mode||""))){
      currentSort=String(settings.sort_mode);
      if(!departmentsEnabled&&currentSort==="categories")currentSort="initial";
      safeStorageSet(SORT_KEY,currentSort,{critical:true});markLocalDataChanged();
    }
    if(settings.random_sort_seed!==undefined){
      if(settings.random_sort_seed===null)safeStorageRemove(RANDOM_SORT_SEED_KEY);
      else safeStorageSet(RANDOM_SORT_SEED_KEY,String(settings.random_sort_seed),{critical:true});
      markLocalDataChanged();
    }
    if(settings.database_updated_at)safeStorageSet(DATABASE_UPDATED_KEY,String(settings.database_updated_at),{critical:true});
    updateSortOptionState();
  }
  function applyPendingImport(){
    if(!pendingImport)return;
    const p=pendingImport,onlyNew=importScope.startsWith("new-");
    const parts=importScopeParts(importScope);
    const takeBlocks=parts.includes("blocks"),takeArchive=parts.includes("archive");
    const takeCalculator=parts.includes("calculator"),takeProfile=parts.includes("profile");
    if((takeBlocks&&(!p.hasProducts||!p.hasBlockSettings))||(takeArchive&&!p.hasArchive)||
       (takeCalculator&&!p.hasFullCalculator)||(takeProfile&&!p.hasProfile))return;
    if(corruptLocalDataKeys.size){
      // Never modify a corrupt collection using append-only mode. For replacement,
      // every corrupted imported section must have a valid source. Console and
      // utility preferences have NO import path and must never be silently erased.
      const replacements=new Map([
        [PRODUCTS_KEY,takeBlocks], [ARCHIVE_KEY,takeArchive],
        [CALCULATOR_KEY,takeCalculator],[CALC_QUICK_PRESETS_KEY,takeCalculator],
        [DAILY_GOAL_KEY,takeCalculator],[PROFILE_KEY,takeProfile],
        [CUSTOM_CATEGORIES_KEY,takeBlocks],[CATEGORY_ORDER_KEY,takeBlocks],
        [DELETED_DEFAULT_CATEGORIES_KEY,takeBlocks]
      ]);
      if(onlyNew||[...corruptLocalDataKeys].some(key=>!replacements.get(key))){
        showButtonState(importButton,"Не імпортовано","error");
        alert("Є пошкоджені локальні дані. Для безпечного відновлення виберіть заміну всіх пошкоджених розділів. Консоль і «Зручності» резервними файлами не відновлюються.");
        return;
      }
    }
    // Validate an append-only category merge before modifying any local data.
    // A valid imported set (<=15) could otherwise push the combined set over 15.
    if(takeBlocks&&onlyNew){
      const known=getCustomCategories();
      const existingIds=new Set(known.map(item=>item.id));
      const existingNames=new Set(known.map(item=>normalizeCategorySearch(item.label)));
      let incomingNew=0;
      for(const category of p.importedBlockSettings?.custom_categories||[]){
        const normalizedName=normalizeCategorySearch(category.label);
        if(existingIds.has(category.id)||existingNames.has(normalizedName))continue;
        existingIds.add(category.id);existingNames.add(normalizedName);incomingNew++;
      }
      if(known.length+incomingNew>AV_MAX_CUSTOM_CATEGORIES){
        showButtonState(importButton,"Ліміт 15 відділів","error",1700);
        alert(`Обмеження: не більше 15 власних відділів разом із наявними. Після цього імпорту було б ${known.length+incomingNew}. Дані не змінено.`);
        return;
      }
    }
    const newProducts=takeBlocks&&onlyNew?getOnlyNewImportedProducts(products,p.normalized):[];
    const newArchive=takeArchive&&onlyNew?getOnlyNewImportedArchive(archiveItems,p.importedArchive):[];
    const newCalc=takeCalculator&&onlyNew?getOnlyNewImportedCalculator(calculatorItems,p.importedCalculator):[];
    const newPresets=takeCalculator&&onlyNew?getOnlyNewQuickPresets(calculatorQuickPresets,p.importedQuickPresets):[];
    // Validate the selected calculator import BEFORE starting the storage transaction.
    // Never silently truncate saved presets or overwrite local data on a failed import.
    if(takeCalculator){
      const resultingPresets=onlyNew
        ?[...normalizeQuickPresets(calculatorQuickPresets),...newPresets]
        :normalizeQuickPresets(p.importedQuickPresets);
      if(resultingPresets.length>MAX_CALCULATOR_QUICK_PRESETS){
        showButtonState(importButton,"Ліміт 50","error",1800);
        alert(`Максимум ${MAX_CALCULATOR_QUICK_PRESETS} швидких КБЖВ. Після імпорту їх було б ${resultingPresets.length}. Дані не змінено.`);
        return;
      }
    }
    // Apply the same temporary-gallery limit to JSON imports before any transaction.
    if(takeBlocks){
      const importedProducts=onlyNew?[...products,...newProducts]:p.normalized;
      if(!avDeferredQuotaOk(importedProducts)){
        showButtonState(importButton,"Ліміт 30 / 30","error",1700);
        alert("Резервна копія містить понад 30 запланованих продуктів або 30 фотографій у КБЖВ-блоках загалом. Дані не змінено. Спочатку завершіть старі відкладені продукти або імпортуйте менший набір.");
        return;
      }
    }
    const newProfile=takeProfile&&onlyNew?mergeNewProfile(profileData,p.importedProfile):null;
    const newGoal=takeCalculator&&onlyNew?mergeNewGoal(dailyGoal,p.importedGoal):null;
    const changed=!onlyNew||newProducts.length||newArchive.length||newCalc.length||newPresets.length||
      (takeCalculator&&(!String(calcInput?.value??"").trim()&&p.importedDraft.trim()))||
      (takeCalculator&&JSON.stringify(newGoal)!==JSON.stringify(normalizeDailyGoal(dailyGoal)))||
      (takeProfile&&JSON.stringify(newProfile)!==JSON.stringify(normalizeProfile(profileData)))||
      (takeProfile&&p.importedQuickScroll&&Object.entries(p.importedQuickScroll).some(([field,val])=>{
        const prefKeys={enabled:quickScrollPreferenceKey(),side:quickScrollSideKey(),height_percent:quickScrollHeightKey(),
          width_percent:quickScrollWidthKey(),size:quickScrollSizeKey()};
        return JSON.stringify(val)!==JSON.stringify(quickScrollProfilePrefs()[field])&&
          (!onlyNew||(prefKeys[field]&&localStorage.getItem(prefKeys[field])===null));
      }))||
      (takeArchive&&p.hasArchiveNote&&(
        onlyNew?(!archiveNote.trim()&&!!p.importedArchiveNote.trim()):archiveNote!==p.importedArchiveNote))||
      (takeArchive&&!onlyNew&&typeof p.parsed.stats_goal_visible==="boolean"&&p.parsed.stats_goal_visible!==statsGoalVisible)||
      (takeBlocks&&(p.importedBlockSettings?.custom_categories||[]).some(item=>
        !getCustomCategories().some(known=>known.id===item.id||normalizeCategorySearch(known.label)===normalizeCategorySearch(item.label))));
    if(!changed){
      closeImportPreview();showButtonState(importButton,"Нових немає","info");
      logAction("Імпорт «Тільки нове»: нових даних не виявлено.");return;
    }
    const description=`${onlyNew?"Додавання нових даних":"Відновлення"}: ${parts.join(", ")}`;
    beginStorageTransaction(description);
    saveUndoSnapshot(description);
    if(takeBlocks){
      products=onlyNew?[...products,...newProducts]:p.normalized;
      if(onlyNew)mergeNewBlockSettings(p.importedBlockSettings);
      else applyImportedBlockSettings(p.importedBlockSettings);
      populateProductCategorySelects();saveProductsLocal();
      if(!onlyNew&&p.importedBlockSettings?.database_updated_at)
        safeStorageSet(DATABASE_UPDATED_KEY,String(p.importedBlockSettings.database_updated_at),{critical:true});
    }
    if(takeArchive){
      archiveItems=archiveNewestFirst(onlyNew?[...archiveItems,...newArchive]:p.importedArchive);
      saveArchiveLocal();
      if(p.hasArchiveNote){
        const nextNote=onlyNew?(archiveNote.trim()?archiveNote:p.importedArchiveNote):p.importedArchiveNote;
        if(nextNote!==archiveNote){
          safeStorageSet(ARCHIVE_NOTE_KEY,nextNote,{critical:true});markLocalDataChanged();
          archiveNote=nextNote;
        }
      }
      if(!onlyNew&&typeof p.parsed.stats_goal_visible==="boolean"){
        statsGoalVisible=p.parsed.stats_goal_visible;
        if(statsChartGoal)statsChartGoal.checked=statsGoalVisible;
        safeStorageSet(STATS_GOAL_VISIBLE_KEY,statsGoalVisible?"1":"0",{critical:true});markLocalDataChanged();
      }
    }
    if(takeCalculator){
      calculatorItems=onlyNew?[...calculatorItems,...newCalc]:p.importedCalculator.map(normalizeCalculatorItem);
      saveCalculatorLocal();
      const beforeDraft=String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??"");
      const draft=onlyNew?(beforeDraft.trim()?beforeDraft:p.importedDraft):p.importedDraft;
      if(calcInput)calcInput.value=draft;
      if(draft)safeStorageSet(CALCULATOR_DRAFT_KEY,draft,{critical:true});
      else safeStorageRemove(CALCULATOR_DRAFT_KEY);
      markLocalDataChanged();
      dailyGoal=onlyNew?newGoal:normalizeDailyGoal(p.importedGoal);
      safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true});markLocalDataChanged();
      calculatorQuickPresets=onlyNew?[...normalizeQuickPresets(calculatorQuickPresets),...newPresets]:normalizeQuickPresets(p.importedQuickPresets);
      saveCalculatorQuickPresets();
      for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
      dailyGoalSettingsOpen=false;renderDailyGoal();renderCalculatorQuickPresets();renderCalculatorLog();updateTotals();
    }
    if(takeProfile){
      profileData=onlyNew?newProfile:normalizeProfile(p.importedProfile);saveProfileLocal();
      // Legacy backups contain no quick_scroll field: keep current device settings.
      // New backups carry the settings inside `profile`, never as a separate scope.
      if(p.importedQuickScroll){
        writeQuickScrollProfilePrefs(p.importedQuickScroll,{onlyIfUnset:onlyNew});
      }
    }
    if(importScope==="all"&&!Array.isArray(p.parsed)&&Number.isFinite(Number(p.parsed.version))){
      recordExportHighwater(Math.max(1,Number(p.parsed.version)));
    }
    renderProducts(searchInput?.value||"");renderArchive();renderArchiveNote();renderStatistics();updateSiteDataCounts();
    safeStorageSet(LAST_IMPORT_KEY,new Date().toISOString(),{critical:true});
    if(!finishStorageTransaction()){
      reloadPrimaryStateFromStorage();closeImportPreview();showButtonState(importButton,"Не імпортовано","error",1500);
      alert("Імпорт скасовано: браузер не дозволив повністю зберегти дані. Попередній стан відновлено.");
      return;
    }
    if(corruptLocalDataKeys.size)reloadPrimaryStateFromStorage();
    syncQuickScroll();
    closeImportPreview();showButtonState(importButton,"Імпортовано","success",1500);
    logAction(`${onlyNew?"Додано нові":"Відновлено"} дані розділів: ${parts.join(", ")}.`,{scope:importScope,backup_format:p.parsed?.backup_format||"legacy"});
  }

  importPreviewCancel?.addEventListener("click",()=>{
    closeImportPreview();if(importFile)importFile.value="";importDialogOpened=false;showButtonState(importButton,"Не імпортовано","error",1500);showButtonState(importPreviewCancel,"Скасовано","error",1000);logAction("Імпорт скасовано після перевірки файлу.");
  });
  importScopeButtons.forEach(button=>button.addEventListener("click",()=>{
    if(button.disabled)return;importScope=button.dataset.scope||"all";updateImportScopeUI();
    const importLabel=`${importScope.startsWith("new-")?"тільки нове":"повна заміна"}: ${importScopeParts(importScope).join(", ")}`;
    logAction(`Для імпорту вибрано: ${importLabel}.`);
  }));
  importPreviewConfirm?.addEventListener("click",()=>{
    if(!pendingImport||importPreviewConfirm.disabled)return;
    importPreviewConfirm.disabled=true;
    // Only applyPendingImport may display success after the storage transaction.
    setTimeout(()=>{
      try{applyPendingImport();}
      catch(error){
        console.error(error);
        if(storageTransaction)rollbackStorageTransaction();
        reloadPrimaryStateFromStorage();
        closeImportPreview();
        showButtonState(importButton,"Не імпортовано","error");
        alert("Помилка під час відновлення резервної копії. Перевірте дані та сховище.");
      }
      finally{importPreviewConfirm.disabled=false;}
    },260);
  });
  importPreviewModal?.addEventListener("click",e=>{if(e.target===importPreviewModal)importPreviewCancel?.click();});

  importFile?.addEventListener("change",async()=>{
    const file=importFile.files?.[0];if(!file)return;
    try{
      if(file.size>36*1024*1024)throw new Error("Файл резервної копії перевищує 36 МіБ.");
      const parsed=JSON.parse(await file.text());
      const isOldArray=Array.isArray(parsed);
      validateBackupEnvelope(parsed,isOldArray);
      const hasProducts=isOldArray||(!isOldArray&&Array.isArray(parsed.products));
      const hasArchive=!isOldArray&&Array.isArray(parsed.archive);
      const hasArchiveNote=!isOldArray&&Object.prototype.hasOwnProperty.call(parsed,"archive_note");
      if(hasArchiveNote&&(!hasArchive||typeof parsed.archive_note!=="string"||parsed.archive_note.length>ARCHIVE_NOTE_MAX_LENGTH))
        throw new Error("У резервній копії пошкоджено нотатку архіву. Дані не змінено.");
      if(!isOldArray){
        for(const [key,valid] of [
          ["products",v=>Array.isArray(v)],["archive",v=>Array.isArray(v)],
          ["calculator_quick_presets",v=>Array.isArray(v)],
          ["blocks_settings",v=>v&&typeof v==="object"&&!Array.isArray(v)],
          ["profile",v=>v&&typeof v==="object"&&!Array.isArray(v)],
          ["daily_goal",v=>v&&typeof v==="object"&&!Array.isArray(v)],
          ["settings",v=>v&&typeof v==="object"&&!Array.isArray(v)]
        ]){
          if(Object.prototype.hasOwnProperty.call(parsed,key)&&!valid(parsed[key])){
            throw new Error(`Пошкоджена структура «${key}» у резервній копії. Дані не змінено.`);
          }
        }
      }
      const hasGoal=!isOldArray&&parsed.daily_goal&&typeof parsed.daily_goal==="object";
      const hasProfile=!isOldArray&&parsed.profile&&typeof parsed.profile==="object"&&!Array.isArray(parsed.profile);
      const hasCalculator=!isOldArray&&Array.isArray(parsed.calculator);
      if(!isOldArray&&Object.prototype.hasOwnProperty.call(parsed,"calculator")&&!hasCalculator)throw new Error("У резервній копії некоректна структура калькулятора.");
      const hasDraft=!isOldArray&&Object.prototype.hasOwnProperty.call(parsed,"calculator_draft");
      const hasSettings=!isOldArray&&parsed.settings&&typeof parsed.settings==="object"&&!Array.isArray(parsed.settings);
      const hasConsole=false; // Legacy console field is intentionally ignored.
      if(!hasProducts&&!hasArchive&&!hasGoal&&!hasProfile&&!hasCalculator&&!hasDraft&&!hasSettings)throw new Error("Некоректний формат");

      const rawProducts=hasProducts?(isOldArray?parsed:parsed.products):[];
      if(hasProducts&&rawProducts.some(p=>!isValidImportProduct(p)))
        throw new Error("Файл містить некоректні або від’ємні показники продуктів. Дані не змінено.");
      const normalized=hasProducts?rawProducts.map((p,i)=>normalizeProduct(p,i)).filter(p=>p.name):[];
      if(hasArchive&&parsed.stats_goal_visible!==undefined&&typeof parsed.stats_goal_visible!=="boolean")
        throw new Error("У резервній копії пошкоджено налаштування цілі на графіку.");
      const importedArchive=hasArchive?parsed.archive.map(normalizeImportedArchiveItem).filter(Boolean):[];
      if(hasArchive&&importedArchive.length!==parsed.archive.length)throw new Error("Архів у резервній копії містить пошкоджені записи.");
      if(hasCalculator&&parsed.calculator.some(item=>!isValidCalculatorItem(item)))throw new Error("Резервна копія містить пошкоджені або від’ємні записи калькулятора.");
      const importedGoal=hasGoal?normalizeDailyGoal(parsed.daily_goal):null;
      if(hasProfile)validateImportedProfile(parsed.profile);
      const importedProfile=hasProfile?normalizeProfile(parsed.profile):null;
      const importedQuickScroll=hasProfile&&parsed.profile.quick_scroll!==undefined?parsed.profile.quick_scroll:null;
      const importedCalculator=hasCalculator?parsed.calculator.map(normalizeCalculatorItem).filter(Boolean):[];
      const importedDraft=hasDraft?String(parsed.calculator_draft??""):"";
      const importedSettings=hasSettings?parsed.settings:null;
      if(hasSettings)validateImportSettings(importedSettings);
      const importedBlockSettings=isOldArray?{}:!isOldArray&&parsed.blocks_settings?parsed.blocks_settings:
        (!isOldArray&&hasProducts?{
          sort_mode:importedSettings?.sort_mode,
          random_sort_seed:importedSettings?.random_sort_seed,
          departments_enabled:parsed.departments_enabled??importedSettings?.departments_enabled,
          category_order:parsed.category_order??importedSettings?.category_order,
          custom_categories:parsed.custom_categories??importedSettings?.custom_categories,
          deleted_default_categories:parsed.deleted_default_categories??importedSettings?.deleted_default_categories,
          database_updated_at:importedSettings?.database_updated_at
        }:null);
      if(importedBlockSettings)validateImportSettings(importedBlockSettings);
      const hasBlockSettings=!!importedBlockSettings||isOldArray;
      const hasFullCalculator=hasCalculator&&hasDraft&&hasGoal&&Array.isArray(parsed.calculator_quick_presets);
      if(hasGoal&&(!validBackupNutrition(parsed.daily_goal)||
        (parsed.daily_goal.enabled!==undefined&&typeof parsed.daily_goal.enabled!=="boolean")))
        throw new Error("У резервній копії некоректна денна ціль.");
      if(hasDraft&&typeof parsed.calculator_draft!=="string")
        throw new Error("У резервній копії пошкоджена чернетка калькулятора.");
      // Console and admin metadata in older files must never be restored.
      const importedConsole=[];
      const importedQuickPresets=(!isOldArray&&Array.isArray(parsed.calculator_quick_presets))?normalizeQuickPresets(parsed.calculator_quick_presets):null;
      if(importedQuickPresets&&importedQuickPresets.length!==parsed.calculator_quick_presets.length)throw new Error("Резервна копія містить некоректні швидкі значення КБЖВ.");
      if(!isOldArray){
        for(const key of ["category_order","deleted_default_categories"]){
          if(parsed[key]!==undefined&&(!Array.isArray(parsed[key])||parsed[key].some(value=>typeof value!=="string")))
            throw new Error(`У резервній копії пошкоджено «${key}».`);
        }
        if(parsed.departments_enabled!==undefined&&typeof parsed.departments_enabled!=="boolean")
          throw new Error("У резервній копії пошкоджено прапорець відділів.");
      }
      const importedCategoryOrder=Array.isArray(importedBlockSettings?.category_order)?[...importedBlockSettings.category_order]:null;
      const importedCustomCategories=importedBlockSettings?validateImportCategoryList(importedBlockSettings.custom_categories,"blocks_settings.custom_categories"):null;
      const importedDeletedDefaultCategories=Array.isArray(importedBlockSettings?.deleted_default_categories)?[...importedBlockSettings.deleted_default_categories]:null;
      const importedDepartmentsEnabled=typeof importedBlockSettings?.departments_enabled==="boolean"?importedBlockSettings.departments_enabled:null;
      const productDiff=hasProducts?compareImportCollections(products,rawProducts,productImportKey,(item,i)=>normalizeProduct(item,i)):null;
      const archiveDiff=hasArchive?compareImportCollections(archiveItems,importedArchive,archiveImportKey,item=>item):null;

      pendingImport={parsed,normalized,hasProducts,hasArchive,hasArchiveNote,importedArchiveNote:hasArchiveNote?parsed.archive_note:null,
        hasGoal,hasProfile,hasCalculator,hasDraft,hasSettings,hasConsole,hasBlockSettings,hasFullCalculator,
        hasQuickPresets:Array.isArray(parsed?.calculator_quick_presets),importedArchive,importedGoal,importedProfile,importedCalculator,importedDraft,importedSettings,
        importedBlockSettings,importedConsole,importedQuickPresets,importedQuickScroll,importedCategoryOrder,importedCustomCategories,importedDeletedDefaultCategories,importedDepartmentsEnabled,productDiff,archiveDiff};
      if(!(hasProducts||hasArchive||hasFullCalculator||hasProfile))
        throw new Error("Цей застарілий файл містить лише окрему денну ціль або налаштування. Для повного відновлення розділу потрібна копія КБЖВ Калькулятора.");
      importScope=hasProducts&&hasArchive&&hasFullCalculator&&hasProfile?"all":hasProducts?"blocks":hasArchive?"archive":hasFullCalculator?"calculator":"profile";

      if(importPreviewVersion)importPreviewVersion.textContent=!isOldArray&&parsed.version!=null?String(parsed.version):"Не вказано";
      if(importPreviewDate)importPreviewDate.textContent=!isOldArray?formatImportDate(parsed.exported_at):"Не вказано";
      updateImportScopeUI();importPreviewModal?.classList.add("active");document.body.classList.add("edit-modal-open");
      const fileContents=[hasProducts?`блоків: ${normalized.length}`:null,hasArchive?`записів архіву: ${importedArchive.length}`:null,hasCalculator?`записів калькулятора: ${importedCalculator.length}`:null,hasDraft?"чернетка калькулятора":null,hasGoal?"денна ціль":null,hasProfile?"дані профілю":null,hasBlockSettings?"сортування та відділи":null].filter(Boolean).join(", ");
      logAction(`Файл імпорту перевірено: ${fileContents}. Очікується вибір типу імпорту та підтвердження.`);
    }catch(e){
      console.error(e);
      pendingImport=null;
      showButtonState(importButton,"Не імпортовано","error",1500);
      logAction("Помилка перевірки файлу імпорту.");
      const importReason=e instanceof SyntaxError
        ?"Некоректний JSON-файл: перевірте структуру, лапки, коми та дужки."
        :(e instanceof Error&&/[А-Яа-яІіЇїЄєҐґ]/.test(e.message)?e.message:"Перевірте формат та доступність JSON-файлу.");
      alert(`Не вдалося імпортувати базу.\n\n${importReason}`);
      if(importFile)importFile.value="";
      importDialogOpened=false;
    }
  });

  function loadDailyGoal(){
    const raw=readProtectedJson(DAILY_GOAL_KEY,{},value=>value&&typeof value==="object"&&!Array.isArray(value)&&
      validBackupNutrition(value)&&(value.enabled===undefined||typeof value.enabled==="boolean"));
    dailyGoal=normalizeDailyGoal(raw);
    
    for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
    renderDailyGoal();
  }
  function renderDailyGoal(){
    if(dailyGoalContent)dailyGoalContent.classList.toggle("goal-disabled",!dailyGoal.enabled);
    if(dailyGoalToggle){
      dailyGoalToggle.textContent=dailyGoal.enabled?"Вимкнути":"Увімкнути";
      dailyGoalToggle.dataset.originalText=dailyGoalToggle.textContent;
      dailyGoalToggle.classList.toggle("is-enabled",!!dailyGoal.enabled);
    }
    if(dailyGoalSettings)dailyGoalSettings.classList.toggle("is-collapsed",!dailyGoalSettingsOpen);
    if(dailyGoalDetailsToggle){
      dailyGoalDetailsToggle.textContent=dailyGoalSettingsOpen?"Сховати налаштування":"Показати налаштування";
      dailyGoalDetailsToggle.dataset.originalText=dailyGoalDetailsToggle.textContent;
    }
    if(authUser?.id){try{localStorage.setItem(`avicularia_testing_user_${authUser.id}_goal_settings_open_v197`,dailyGoalSettingsOpen?"1":"0");}catch(_){}}
    updateDailyGoalRemaining();
  }
  function getDailyGoalActual(){return {kcal:number(kcalElement?.textContent),protein:number(proteinElement?.textContent),fat:number(fatElement?.textContent),carb:number(carbElement?.textContent),sugar:number(sugarElement?.textContent),salt:number(saltElement?.textContent),fiber:number(fiberElement?.textContent)};}
  function updateDailyGoalRemaining(){
    if(!dailyGoal.enabled)return;
    const actual=getDailyGoalActual();
    for(const key of Object.keys(remainElements)){
      const el=remainElements[key];if(!el)continue;
      const target=number(dailyGoal[key]);
      const remaining=target-actual[key];
      el.textContent=formatNumber(remaining);
      el.classList.toggle("goal-exceeded",remaining<0);
      const fill=progressElements[key],label=progressLabels[key];
      if(fill){
        const ratio=target>0?actual[key]/target:0;
        fill.style.width=`${Math.max(0,Math.min(100,ratio*80))}%`;
        fill.classList.toggle("goal-progress-over",target>0&&actual[key]>target);
      }
      if(label)label.textContent=`${formatNumber(actual[key])} / ${formatNumber(target)}${key==="kcal"?"":" г"}`;
    }
  }
  dailyGoalToggle?.addEventListener("click",()=>{
    saveUndoSnapshot(dailyGoal.enabled?"Вимкнення денної цілі КБЖВ":"Увімкнення денної цілі КБЖВ");
    dailyGoal.enabled=!dailyGoal.enabled;
    const hasSavedTargets=Object.keys(goalInputs).some(key=>number(dailyGoal[key])>0);
    if(dailyGoal.enabled&&!hasSavedTargets)dailyGoalSettingsOpen=true;
    if(!dailyGoal.enabled)dailyGoalSettingsOpen=false;
    if(!persistUserChange("Зміна денної цілі",()=>safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true}))){
      reloadPrimaryStateFromStorage();showButtonState(dailyGoalToggle,"Не збережено","error",1500);return;
    }
    renderDailyGoal();
    showButtonState(dailyGoalToggle,dailyGoal.enabled?"Увімкнено":"Вимкнено",dailyGoal.enabled?"success":"error",1200);
    logAction(dailyGoal.enabled?"Денні цілі КБЖВ увімкнено.":"Денні цілі КБЖВ вимкнено.",{daily_goal:normalizeDailyGoal(dailyGoal)});
  });
  dailyGoalSave?.addEventListener("click",()=>{for(const key of Object.keys(goalInputs)){const raw=String(goalInputs[key]?.value??"").trim().replace(",",".");if(raw&&(!Number.isFinite(Number(raw))||Number(raw)<0)){showButtonState(dailyGoalSave,"Некоректне КБЖВ","error",1800);return;}}saveUndoSnapshot("Зміна денної цілі КБЖВ");for(const key of Object.keys(goalInputs))dailyGoal[key]=Math.max(0,number(goalInputs[key]?.value));if(!persistUserChange("Зміна денної цілі",()=>safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true}))){reloadPrimaryStateFromStorage();showButtonState(dailyGoalSave,"Не збережено","error",1500);return;}dailyGoalSettingsOpen=false;renderDailyGoal();showButtonState(dailyGoalSave,"Цілі збережено","success",1400);logAction(`Денні цілі КБЖВ збережено: ${formatNumber(dailyGoal.kcal)} ккал / ${formatNumber(dailyGoal.protein)} білка / ${formatNumber(dailyGoal.fat)} жирів / ${formatNumber(dailyGoal.carb)} вуглеводів / ${formatNumber(dailyGoal.sugar)} цукрів / ${formatNumber(dailyGoal.salt)} солі / ${formatNumber(dailyGoal.fiber)} клітковини.`,{daily_goal:normalizeDailyGoal(dailyGoal)});});
  dailyGoalDetailsToggle?.addEventListener("click",()=>{dailyGoalSettingsOpen=!dailyGoalSettingsOpen;try{localStorage.setItem(`avicularia_testing_user_${authUser?.id}_goal_settings_open_v197`,dailyGoalSettingsOpen?"1":"0");}catch(error){console.warn("Не вдалося зберегти вигляд цілі",error);}renderDailyGoal();showButtonState(dailyGoalDetailsToggle,dailyGoalSettingsOpen?"Показано":"Сховано",dailyGoalSettingsOpen?"success":"error",1100);logAction(dailyGoalSettingsOpen?"Налаштування денної цілі відкрито.":"Налаштування денної цілі закрито.");});
  dailyGoalCopyRemaining?.addEventListener("click",async()=>{
    if(!dailyGoal.enabled){showButtonState(dailyGoalCopyRemaining,"Ціль вимкнена","error",1400);logAction("Копіювання залишку не виконано: денна ціль вимкнена.");return;}
    const actual=getDailyGoalActual();
    const r={};for(const key of Object.keys(actual))r[key]=number(dailyGoal[key])-actual[key];
    const text=`Залишилось до денної цілі: ${formatNumber(r.kcal)} калорій / ${formatNumber(r.protein)} білка / ${formatNumber(r.fat)} жирів / ${formatNumber(r.carb)} вуглеводів / ${formatNumber(r.sugar)} цукрів / ${formatNumber(r.salt)} солі / ${formatNumber(r.fiber)} клітковини`;
    if(await copyText(text)){showButtonState(dailyGoalCopyRemaining,"Скопійовано","success",1400);logAction("Залишок до денної цілі скопійовано.");}else showButtonState(dailyGoalCopyRemaining,"Не скопійовано","error",1200);
  });

  function calculatorNumber(value){
    if(typeof value==="number")return Number.isFinite(value)?value:0;
    const normalized=String(value??"").trim().replace(/\s+/g,"").replace(",",".");
    const n=Number(normalized);
    return Number.isFinite(n)?n:0;
  }

  function extractCalculatorNutrition(text){
    const source=String(text||"").replace(/\u00A0/g," ").replace(/\u2212/g,"-").trim();
    if(!source)return null;

    const numeric=String.raw`(?<![\d.,])([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)`;
    const get=(labels)=>{
      for(const label of labels){
        const match=source.match(new RegExp(numeric+String.raw`\s*`+label,"i"));
        if(match)return calculatorNumber(match[1]);
        // Manual nutrition labels are also frequently entered before the value:
        // «Білки: 12,5», «Калорії — 240». Previously these became zero.
        const after=source.match(new RegExp(String.raw`(?:^|[\s/,;|])`+label+String.raw`\s*(?::|=|—|–|-)?\s*`+numeric+String.raw`(?=$|[\s/,;|]|(?:ккал|г)\b)`,"i"));
        if(after)return calculatorNumber(after[1]);
      }
      return null;
    };

    // Each nutrient is extracted independently by its label.
    // One unusual word/spacing elsewhere in the line can no longer zero out fats or another macro.
    const kcal=get([
      String.raw`(?:ккал|калор(?:ій|ії|ія|ійність)?)`
    ]);
    const protein=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:білка|білку|білків|білки|білок)`
    ]);
    const fat=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:жирів|жиру|жири|жир)`
    ]);
    const carb=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:вуглеводів|вуглеводи|вуглеводу)`
    ]);
    const sugar=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:цукрів|цукру|цукри|цукор)`
    ]);
    const salt=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:солі|сіль)`
    ]);
    const fiber=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:клітковини|клітковина)`
    ]);

    const recognized=[kcal,protein,fat,carb,sugar,salt,fiber].some(v=>v!==null);
    if(!recognized)return null;

    return {
      kcal:kcal??0,
      protein:protein??0,
      fat:fat??0,
      carb:carb??0,
      sugar:sugar??0,
      salt:salt??0,
      fiber:fiber??0
    };
  }

  function parseCalculatorLine(line){
    const clean=String(line).trim().replace(/\s+/g," ");if(!clean)return null;

    const nutrition=extractCalculatorNutrition(clean);
    if(nutrition){
      const nameMatch=clean.match(/^(.+?),\s*для\s+/i);
      const weightMatch=clean.match(/,\s*для\s*([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)\s*(?:грам(?:ів|и|а)?|гр|г|мл)/i);
      return {
        id:createId("calc"),
        name:nameMatch?nameMatch[1].trim():clean,
        weight:weightMatch?calculatorNumber(weightMatch[1]):0,
        ...nutrition,
        text:clean,
        created_at:new Date().toISOString()
      };
    }

    // Do not silently turn a generated product line into all-zero nutrition
    // if its labels were not parsed. Plain unstructured notes still work.
    if(/,\s*для\s*\d+/iu.test(clean)&&/\bккал|білк|жир|вуглевод|цукр|клітковин/iu.test(clean)){
      return {id:createId('calc'),name:clean,text:clean,invalidNutrition:true};
    }
    // Preserve the existing free-text behavior.
    const km=clean.match(/^\+?\s*([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)\s*(?:ккал|калор(?:і|и|ій|ія|ійність)?)\s*$/i);
    if(km)return{id:createId("calc"),name:clean,weight:0,kcal:calculatorNumber(km[1]),protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,text:clean,created_at:new Date().toISOString()};

    return{id:createId("calc"),name:clean,weight:0,kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,text:clean,created_at:new Date().toISOString()};
  }

  const CALCULATOR_NUMERIC_FIELDS=["weight","kcal","protein","fat","carb","sugar","salt","fiber"];
  function isValidCalculatorItem(item){
    if(!item||typeof item!=="object"||Array.isArray(item)||item.invalidNutrition===true)return false;
    if(!String(item.text??item.name??"").trim())return false;
    for(const key of CALCULATOR_NUMERIC_FIELDS){
      const aliases=key==="protein"?["protein","proteins"]:key==="fat"?["fat","fats"]:key==="carb"?["carb","carbs"]:key==="sugar"?["sugar","sugars"]:key==="fiber"?["fiber","fibre"]:[key];
      const seen=[];
      for(const alias of aliases){
        if(item[alias]===undefined||item[alias]===null||item[alias]==="")continue;
        const value=Number(String(item[alias]).trim().replace(",","."));
        if(!Number.isFinite(value)||value<0)return false;
        seen.push(value);
      }
      if(seen.some(value=>value!==seen[0]))return false;
    }
    const parsed=extractCalculatorNutrition(String(item.text??item.name??""));
    if(parsed&&Object.values(parsed).some(value=>value<0||!Number.isFinite(value)))return false;
    return true;
  }

  // Legacy imports and undo snapshots may contain repeated IDs. They represent
  // distinct rows and must never be dropped or merged during synchronization.
  function uniqueCalculatorRowIds(rows){
    if(!Array.isArray(rows))return {items:rows,changed:0};
    const reserved=new Set(rows.map(row=>String(row?.id??"").trim()).filter(Boolean));
    const seen=new Set();
    let changed=0;
    const items=rows.map(row=>{
      if(!row||typeof row!=="object"||Array.isArray(row))return row;
      const oldId=String(row.id??"").trim();
      if(oldId&&!seen.has(oldId)){
        seen.add(oldId);
        return row;
      }
      let newId="";
      for(let attempt=0;attempt<20;attempt++){
        newId=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"
          ?`calc-${crypto.randomUUID()}`:createId("calc");
        if(!reserved.has(newId))break;
        newId="";
      }
      if(!newId){
        let serial=0;
        do{newId=`calc-${Date.now()}-${++serial}`;}while(reserved.has(newId));
      }
      reserved.add(newId);
      seen.add(newId);
      changed++;
      return {...row,id:newId};
    });
    return {items:changed?items:rows,changed};
  }

  function normalizeCalculatorItem(item){
    if(!item||typeof item!=="object")return item;
    const text=stripObsoleteCarbLabel(String(item.text||item.name||"").trim());
    const fromText=extractCalculatorNutrition(text);

    // For any line that contains labeled nutrition values, the visible text is the source of truth.
    // This also repairs old calculator rows that were saved with a wrong/zero fat value.
    if(fromText){
      return {
        ...item,
        ...fromText,
        text,
        id:item.id||createId("calc"),
        created_at:item.created_at||new Date().toISOString()
      };
    }

    return {
      ...item,
      text,
      kcal:calculatorNumber(item.kcal),
      protein:calculatorNumber(item.protein ?? item.proteins),
      fat:calculatorNumber(item.fat ?? item.fats),
      carb:calculatorNumber(item.carb ?? item.carbs),
      sugar:calculatorNumber(item.sugar ?? item.sugars),
      salt:calculatorNumber(item.salt),
      fiber:calculatorNumber(item.fiber ?? item.fibre)
    };
  }

  // Розрахунок готової страви із «Зручностей» -> один звичайний запис калькулятора.
  // Запис проходить ті самі перевірки, транзакцію, Undo і синхронізацію,
  // що й ручне додавання. Вхідні поля інструментів не чіпаємо.
  window.addEventListener("utilities:add-to-calculator",event=>{
    const detail=event.detail||{};
    const respond=(ok,reason="")=>{if(typeof detail.respond==="function")detail.respond({ok,reason});};
    if(!authUser||!appInitialized||!$("utilities")?.classList.contains("active")){
      respond(false,"Недоступно");return;
    }
    if(!isValidCalculatorItem(detail.item)){
      respond(false,"Некоректні дані");return;
    }
    const item=normalizeCalculatorItem({...detail.item,id:createId("calc"),created_at:new Date().toISOString()});
    saveUndoSnapshot("Додавання готового продукту із Зручностей");
    if(!beginStorageTransaction("Додавання готового продукту")){
      respond(false,"Помилка сховища");return;
    }
    calculatorItems.push(item);
    const saved=saveCalculatorLocal();
    const committed=finishStorageTransaction();
    if(!saved||!committed){
      reloadPrimaryStateFromStorage();respond(false,"Не збережено");return;
    }
    renderCalculatorLog();updateTotals();
    respond(true);
    logAction(`Із Зручностей до калькулятора додано готовий продукт: ${item.text}.`,
      {calculator_items:[{name:item.name,weight:item.weight,text:item.text,
        kcal:item.kcal,protein:item.protein,fat:item.fat,carb:item.carb,
        sugar:item.sugar,salt:item.salt,fiber:item.fiber}]});
  });

  calcPaste?.addEventListener("click",async()=>{
    if(!navigator.clipboard?.readText){showButtonState(calcPaste,"Буфер недоступний","error");return;}
    try{
      const text=await navigator.clipboard.readText();
      if(!text){showButtonState(calcPaste,"Немає що вставити","error");return;}
      calcInput.value=calcInput.value ? calcInput.value.replace(/\s*$/,'')+"\n"+text : text;
      calcInput.dispatchEvent(new Event("input",{bubbles:true}));
      showButtonState(calcPaste,"Вставлено","success");
      logAction("Текст із буфера обміну вставлено в калькулятор.");
    }catch(_){showButtonState(calcPaste,"Не вдалося вставити","error");}
  });
  calcInput?.addEventListener("input",saveCalculatorDraft);
  calcAdd?.addEventListener("click",()=>{
    const text=calcInput.value.trim();if(!text){showButtonState(calcAdd,"Немає даних","error",1500);logAction("Додавання в калькулятор не виконано: поле порожнє.");return;}
    const items=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(parseCalculatorLine).filter(Boolean);
    if(!items.every(isValidCalculatorItem)){
      showButtonState(calcAdd,"Некоректне КБЖВ","error",1800);
      alert("Від’ємні або некоректні значення КБЖВ не дозволені. Виправте текст перед додаванням.");
      return;
    }
    const normalizedItems=items.map(normalizeCalculatorItem);
    saveUndoSnapshot(`Додавання ${items.length} записів у калькулятор`);
    // Adding rows and clearing the draft must commit together. Otherwise a failure
    // to clear the draft leaves rows committed and lets a second click duplicate them.
    if(!beginStorageTransaction("Додавання записів та очищення чернетки")){
      showButtonState(calcAdd,"Не збережено","error");return;
    }
    calculatorItems.push(...normalizedItems);
    const rowsSaved=saveCalculatorLocal();
    const draftCleared=rowsSaved&&persistUserChange("Очищення чернетки",()=>safeStorageRemove(CALCULATOR_DRAFT_KEY));
    const committed=finishStorageTransaction();
    if(!rowsSaved||!draftCleared||!committed){
      reloadPrimaryStateFromStorage();
      showButtonState(calcAdd,"Не збережено","error");return;
    }
    calcInput.value="";
    renderCalculatorLog();updateTotals();
    showButtonState(calcAdd,"Додано","success",1500);
    logAction(`У калькулятор додано записів: ${items.length}: ${items.map(item=>item.text||item.name||"запис").join(" | ")}.`,{calculator_items:items.map(item=>({name:item.name,weight:item.weight,text:item.text,kcal:item.kcal,protein:item.protein,fat:item.fat,carb:item.carb,sugar:item.sugar,salt:item.salt,fiber:item.fiber}))});
  });
  calcSection?.addEventListener("click",()=>{saveUndoSnapshot("Додавання розділу в калькулятор");calculatorItems.push({id:createId("calc"),text:"/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/",kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0});if(!saveCalculatorLocal()){showButtonState(calcSection,"Не додано","error",1500);return;}renderCalculatorLog();showButtonState(calcSection,"Додано","success",1500);logAction("У калькулятор додано розділ.");});
  function quickPresetItem(metric,amount){
    const nutrition={kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0};
    nutrition[metric]=amount;
    const label=quickPresetLabel({metric,amount});
    return normalizeCalculatorItem({
      id:createId("calc"),
      name:label,
      text:label,
      weight:0,
      ...nutrition,
      created_at:new Date().toISOString()
    });
  }
  function addQuickPresetToCalculator(preset,button){
    const item=normalizeQuickPreset(preset);
    if(!item)return;
    saveUndoSnapshot(`Додавання ${quickPresetLabel(item)} у калькулятор`);
    calculatorItems.push(quickPresetItem(item.metric,item.amount));
    if(!saveCalculatorLocal()){showButtonState(button,"Не додано","error");return;}
    renderCalculatorLog();
    updateTotals();
    showButtonState(button,"Додано","success");
    logAction(`У калькулятор додано ${quickPresetLabel(item)}.`);
  }
  function renderCalculatorQuickPresets(){
    if(!calcQuickPresets)return;
    calcQuickPresets.innerHTML="";
    calculatorQuickPresets.forEach(preset=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="calc-quick-preset-button";
      button.textContent=quickPresetLabel(preset);
      button.addEventListener("click",()=>addQuickPresetToCalculator(preset,button));
      calcQuickPresets.append(button);
    });
    calcQuickPresets.hidden=!calculatorQuickPresets.length;
  }
  function renderCalculatorQuickPresetList(){
    if(!calcQuickList)return;
    calcQuickList.innerHTML="";
    if(!calculatorQuickPresets.length){
      const empty=document.createElement("div");
      empty.className="calc-quick-empty";
      empty.textContent="Швидких КБЖВ ще немає";
      calcQuickList.append(empty);
      return;
    }
    calculatorQuickPresets.forEach(preset=>{
      const row=document.createElement("div");
      row.className="calc-quick-row";
      const name=document.createElement("div");
      name.className="calc-quick-row-name";
      name.textContent=quickPresetLabel(preset);
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="calc-quick-remove";
      remove.textContent="Видалити";
      remove.addEventListener("click",()=>{
        saveUndoSnapshot("Видалення швидкого КБЖВ");
        calculatorQuickPresets=calculatorQuickPresets.filter(item=>item.id!==preset.id);
        if(!saveCalculatorQuickPresets()){showButtonState(remove,"Не видалено","error");return;}
        renderCalculatorQuickPresetList();
        showButtonState(remove,"Видалено","success");
        logAction(`Швидке КБЖВ «${quickPresetLabel(preset)}» видалено.`);
      });
      row.append(name,remove);
      calcQuickList.append(row);
    });
  }
  function openCalculatorQuickModal(){
    renderCalculatorQuickPresetList();
    if(calcQuickValue)calcQuickValue.value="";
    calcQuickModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    setTimeout(()=>calcQuickValue?.focus(),50);
    logAction("Відкрито налаштування швидких КБЖВ.");
  }
  function closeCalculatorQuickModal(){
    calcQuickModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
  }
  calcQuickManage?.addEventListener("click",openCalculatorQuickModal);
  calcQuickClose?.addEventListener("click",()=>{
    showButtonState(calcQuickClose,"Закрито","success");
    setTimeout(closeCalculatorQuickModal,260);
  });
  calcQuickModal?.addEventListener("click",event=>{if(event.target===calcQuickModal)closeCalculatorQuickModal();});
  calcQuickAdd?.addEventListener("click",()=>{
    const metric=String(calcQuickMetric?.value||"");
    const amount=calculatorNumber(calcQuickValue?.value);
    if(!QUICK_METRICS.has(metric)||!(amount>0)){
      showButtonState(calcQuickAdd,"Вкажіть значення","error");
      calcQuickValue?.focus();
      return;
    }
    const duplicate=calculatorQuickPresets.some(item=>item.metric===metric&&Math.abs(item.amount-amount)<0.0005);
    if(duplicate){
      showButtonState(calcQuickAdd,"Вже є","error");
      return;
    }
    if(calculatorQuickPresets.length>=MAX_CALCULATOR_QUICK_PRESETS){
      showButtonState(calcQuickAdd,"Ліміт 50","error",1800);
      logAction("Швидке КБЖВ не додано: досягнуто ліміту 50 значень.");
      return;
    }
    saveUndoSnapshot("Додавання швидкого КБЖВ");
    const preset={id:createId("quick"),metric,amount:Math.round((amount+Number.EPSILON)*1000)/1000};
    calculatorQuickPresets.push(preset);
    if(!saveCalculatorQuickPresets()){showButtonState(calcQuickAdd,"Не додано","error");return;}
    renderCalculatorQuickPresetList();
    if(calcQuickValue)calcQuickValue.value="";
    showButtonState(calcQuickAdd,"Додано","success");
    logAction(`Створено швидке КБЖВ «${quickPresetLabel(preset)}».`);
  });
  calcQuickValue?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();calcQuickAdd?.click();}});
  calcClearText?.addEventListener("click",()=>{
    if(!calcInput.value.trim()&&!String(localStorage.getItem(CALCULATOR_DRAFT_KEY)||"").trim()){
      showButtonState(calcClearText,"Немає що очищати","error",1500);
      logAction("Очищення тексту не виконано: поле вже порожнє.");return;
    }
    saveUndoSnapshot("Очищення тексту калькулятора");
    if(!persistUserChange("Очищення тексту калькулятора",()=>safeStorageRemove(CALCULATOR_DRAFT_KEY))){
      showButtonState(calcClearText,"Не очищено","error",1500);return;
    }
    calcInput.value="";
    showButtonState(calcClearText,"Очищено","success",1500);
    logAction("Поле введення калькулятора очищено.");
  });
  calcClearBlocks?.addEventListener("click",()=>{if(!calculatorItems.length){showButtonState(calcClearBlocks,"Немає даних","error",1500);logAction("Очищення історії калькулятора не виконано: історія порожня.");return;}if(!confirm("Очистити всю історію калькулятора?")){showButtonState(calcClearBlocks,"Не очищено","error",1500);logAction("Очищення історії калькулятора скасовано.");return;}saveUndoSnapshot("Очищення історії калькулятора");calculatorItems=[];if(!saveCalculatorLocal()){showButtonState(calcClearBlocks,"Не очищено","error",1500);return;}renderCalculatorLog();updateTotals();showButtonState(calcClearBlocks,"Очищено","success",1500);logAction("Історію калькулятора очищено.");});
  function updateTotals(){
    let repaired=false;
    const t=calculatorItems.reduce((a,raw,index)=>{
      const i=normalizeCalculatorItem(raw);
      if(i&&raw&&JSON.stringify(i)!==JSON.stringify(raw)){calculatorItems[index]=i;repaired=true;}
      for(const k of ["kcal","protein","fat","carb","sugar","salt","fiber"])a[k]+=calculatorNumber(i?.[k]);
      return a;
    },{kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0});
    if(repaired)saveCalculatorLocal();
    kcalElement.textContent=formatNumber(t.kcal);proteinElement.textContent=formatNumber(t.protein);fatElement.textContent=formatNumber(t.fat);carbElement.textContent=formatNumber(t.carb);sugarElement.textContent=formatNumber(t.sugar);saltElement.textContent=formatNumber(t.salt);fiberElement.textContent=formatNumber(t.fiber);updateDailyGoalRemaining();
  }
  function renderCalculatorLog(){
    calcLog.innerHTML="";
    calcLog.classList.toggle("calc-history-reorder-mode",calculatorReorderMode);
    if(!calculatorItems.length){calcLog.innerHTML='<div style="padding:10px 0;">Історія порожня.</div>';return;}
    calculatorItems.forEach((item,index)=>{
      const row=document.createElement("div");row.className="log-item calc-log-item";row.dataset.index=String(index);
      const text=document.createElement("span");text.className="calc-log-text";text.textContent=stripObsoleteCarbLabel(item.text||item.name||"");
      const remove=document.createElement("button");remove.className="remove";remove.textContent="Видалити";remove.onclick=()=>{const removed=calculatorItems[index];saveUndoSnapshot(`Видалення запису з калькулятора`);calculatorItems.splice(index,1);if(!saveCalculatorLocal()){showButtonState(remove,"Не видалено","error");return;}renderCalculatorLog();updateTotals();logAction(`З калькулятора видалено: ${removed?.text||removed?.name||"запис"}.`);};
      const move=document.createElement("div");move.className="calc-history-move";
      const up=document.createElement("button");up.className="calc-move-button";up.textContent="↑";up.title="Перемістити вище";up.disabled=index===0;
      const down=document.createElement("button");down.className="calc-move-button";down.textContent="↓";down.title="Перемістити нижче";down.disabled=index===calculatorItems.length-1;
      up.onclick=()=>{if(index<=0)return;if(!calculatorReorderChanged)saveUndoSnapshot("Зміна розташування історії калькулятора");[calculatorItems[index-1],calculatorItems[index]]=[calculatorItems[index],calculatorItems[index-1]];calculatorReorderChanged=true;renderCalculatorLog();};
      down.onclick=()=>{if(index>=calculatorItems.length-1)return;if(!calculatorReorderChanged)saveUndoSnapshot("Зміна розташування історії калькулятора");[calculatorItems[index],calculatorItems[index+1]]=[calculatorItems[index+1],calculatorItems[index]];calculatorReorderChanged=true;renderCalculatorLog();};
      move.append(up,down);
      const actions=document.createElement("div");actions.className="calc-log-actions";actions.append(remove,move);
      row.append(text,actions);calcLog.append(row);
    });
  }
  reorderCalculatorHistory?.addEventListener("click",()=>{
    if(!calculatorItems.length){showButtonState(reorderCalculatorHistory,"Немає історії","error",1600);logAction("Зміну розташування історії не розпочато: історія порожня.");return;}
    if(!calculatorReorderMode){
      calculatorReorderMode=true;calculatorReorderChanged=false;
      setButtonStatusPermanent(reorderCalculatorHistory,"Готово","info");
      renderCalculatorLog();
      logAction("Розпочато зміну розташування історії калькулятора.");
      return;
    }
    calculatorReorderMode=false;
    if(calculatorReorderChanged){
      if(!saveCalculatorLocal()){calculatorReorderChanged=false;renderCalculatorLog();showButtonState(reorderCalculatorHistory,"Не збережено","error",1800);return;}
      updateTotals();renderCalculatorLog();
      showButtonState(reorderCalculatorHistory,"Розташування змінено","success",1800);
      logAction("Розташування історії калькулятора змінено.");
    }else{
      renderCalculatorLog();
      showButtonState(reorderCalculatorHistory,"Не змінено","error",1800);
      logAction("Зміну розташування історії калькулятора завершено без змін.");
    }
  });
  function getTotalSummary(){return `Денний підсумок: ${kcalElement.textContent} калорій / ${proteinElement.textContent} білка / ${fatElement.textContent} жирів / ${carbElement.textContent} вуглеводів / ${sugarElement.textContent} цукрів / ${saltElement.textContent} солі / ${fiberElement.textContent} клітковини`;}
  copyTotal?.addEventListener("click",async()=>{
    if(!calculatorItems.length){showButtonState(copyTotal,"Немає що копіювати","error");return;}
    if(await copyText(getTotalSummary())){
      showButtonState(copyTotal,"Скопійовано","success",1500);
      logAction("Денний підсумок скопійовано.");
    }else showButtonState(copyTotal,"Не скопійовано","error",1500);
  });
  function getCurrentDate(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}
  function snapshotCalculatorComposition(){
    return calculatorItems.map(item=>({
      text:String(item?.text||item?.name||"").trim(),
      name:String(item?.name||"").trim(),
      weight:number(item?.weight)
    })).filter(item=>item.text||item.name);
  }

  // Архів уже збережено: це запит лише щодо необов'язкового очищення калькулятора.
  const afterArchiveModal=$("calc-after-archive-modal");
  const afterArchiveKeep=$("calc-after-archive-keep");
  const afterArchiveClear=$("calc-after-archive-clear");
  function closeCalculatorArchiveChoice(){
    afterArchiveModal?.classList.remove("active");
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
  }
  function openCalculatorArchiveChoice(){
    clearSharedButtonState(afterArchiveKeep);clearSharedButtonState(afterArchiveClear);
    afterArchiveModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }
  afterArchiveKeep?.addEventListener("click",()=>{
    showButtonState(afterArchiveKeep,"Залишено","success");
    logAction("Після збереження в архів калькулятор залишено без змін.");
    setTimeout(closeCalculatorArchiveChoice,300);
  });
  afterArchiveClear?.addEventListener("click",()=>{
    if(!calculatorItems.length){showButtonState(afterArchiveClear,"Немає що очищати","error");return;}
    saveUndoSnapshot("Очищення калькулятора після збереження в архів");
    const before=calculatorItems.slice();
    calculatorItems=[];
    if(!saveCalculatorLocal()){
      calculatorItems=before;
      showButtonState(afterArchiveClear,"Не очищено","error");
      logAction("Очищення калькулятора після архівування не виконано.");return;
    }
    renderCalculatorLog();updateTotals();
    showButtonState(afterArchiveClear,"Очищено","success");
    logAction("Після збереження в архів калькулятор очищено за підтвердженням користувача.");
    setTimeout(closeCalculatorArchiveChoice,300);
  });
  afterArchiveModal?.addEventListener("click",event=>{
    if(event.target===afterArchiveModal)closeCalculatorArchiveChoice();
  });

  // Never create a second daily entry. Existing missing-day markers count too;
  // the user explicitly deletes the original entry before recording that date.
  const duplicateDateModal=$("archive-duplicate-date-modal");
  const duplicateDateMessage=$("archive-duplicate-date-message");
  const duplicateDateAck=$("archive-duplicate-date-ack");
  function archiveDateTaken(date,excludeId=null){
    return archiveItems.some(item=>archiveDateKey(item?.date)===date&&(excludeId===null||String(item.id)!==String(excludeId)));
  }
  function showArchiveDateExists(date){
    duplicateDateMessage.textContent=`Запис за ${formatArchiveDate(date)} уже існує. Новий запис не додано. Якщо потрібно замінити дані, спочатку видаліть наявний запис цієї дати в архіві.`;
    clearSharedButtonState(duplicateDateAck);
    duplicateDateModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction(`Збереження архіву за ${date} відхилено: запис за цю дату вже існує.`);
  }
  function closeArchiveDateExists(){
    duplicateDateModal.classList.remove("active");
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
  }
  duplicateDateAck?.addEventListener("click",()=>{
    showButtonState(duplicateDateAck,"Зрозуміло","success",500);
    setTimeout(closeArchiveDateExists,320);
  });
  duplicateDateModal?.addEventListener("click",e=>{if(e.target===duplicateDateModal)closeArchiveDateExists();});
  saveArchive?.addEventListener("click",()=>{
    const date=getCurrentDate();
    if(archiveDateTaken(date)){
      showButtonState(saveArchive,"Запис існує","error",1600);
      showArchiveDateExists(date);
      return;
    }
    if(!calculatorItems.length){
      showButtonState(saveArchive,"Немає даних","error",1500);
      logAction("Збереження в архів не виконано: калькулятор порожній.");
      return alert("Немає даних для збереження в архів.");
    }
    saveUndoSnapshot("Збереження денного підсумку в архів");
    const previous=archiveItems;
    const composition=snapshotCalculatorComposition();
    archiveItems=[{
      id:createId("archive"),date,text:getTotalSummary(),comment:"",day_type:"",
      kcal:number(kcalElement.textContent),protein:number(proteinElement.textContent),fat:number(fatElement.textContent),
      carb:number(carbElement.textContent),sugar:number(sugarElement.textContent),salt:number(saltElement.textContent),
      fiber:number(fiberElement.textContent),composition,created_at:new Date().toISOString()
    },...archiveItems];
    if(!saveArchiveLocal()){
      archiveItems=previous;
      showButtonState(saveArchive,"Не збережено","error");return;
    }
    renderArchive();renderStatistics();
    showButtonState(saveArchive,"Збережено","success",1500);
    logAction(`Денний підсумок збережено в архів разом зі складом (записів: ${calculatorItems.length}): ${composition.map(item=>item.text||item.name).join(" | ")}.`,{archive_composition:composition,total:getTotalSummary()});
    openCalculatorArchiveChoice();
  });
  function stripObsoleteCarbLabel(value){
    return String(value??"")
      .replace(/\s*\(\s*з них повільні\s*:[^)]*\)/giu,"")
      .replace(/\s*\/\s*з них повільні\s*(?::|—|-)?\s*[^/\n]*(\/)?/giu,(_,slash)=>slash?" /":"")
      .replace(/\s*\/\s*Вуглі повільні\s*(?::|—|-)?\s*[^/\n]*(\/)?/giu,(_,slash)=>slash?" /":"")
      .trim();
  }
  function formatArchiveDate(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:v;}
  // Пошук по всіх видимих полях: дати, коментарі, КБЖВ, склад, тип дня.
  // Ключові англійські назви типу дня включено до індексу без зміни самих записів.
  function normalizeArchiveSearch(value){
    return String(value??"").normalize("NFKC").toLocaleLowerCase("uk-UA")
      .replace(/[’‘`´]/g,"'").replace(/\s+/g," ").trim();
  }
  const ARCHIVE_SEARCH_DAY_SYNONYMS={
    rest:"відпочинок відпочинку відпочивав відпочивала вихідний rest recovery day",
    training:"тренування тренувався тренувалася тренував тренувала тренуваннях треніровка тренировка workout training gym спорт",
    cheatmeal:"чітміл читміл читмил чіт міл чит міл чит мил cheatmeal cheat meal cheat day cheatmealday cheat"
  };
  const ARCHIVE_SEARCH_METRICS=[
    ["kcal","калорії калорій калорійність ккал kcal calories"],
    ["protein","білки білків білку протеїн protein"],
    ["fat","жири жирів жир fat"],
    ["carb","вуглеводи вуглеводів вуглевод carbs carbohydrates"],
    ["sugar","цукри цукрів цукор sugar"],
    ["salt","сіль солі salt"],
    ["fiber","клітковина клітковини fiber"]
  ];
  function archiveItemSearchText(item){
    const composition=(Array.isArray(item?.composition)?item.composition:[]).map(archiveCompositionLine).join(" ");
    const dayType=String(item?.day_type||"");
    const metrics=ARCHIVE_SEARCH_METRICS.flatMap(([field,aliases])=>{
      const value=item?.[field];
      if(value===null||value===undefined||value==="")return [];
      const numeric=String(value).replace(".",",");
      return [`${aliases} ${numeric} ${String(value)}`];
    });
    const day=String(item?.date||"");
    const dateVariants=[day,formatArchiveDate(day)];
    const dateMatch=/^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    if(dateMatch)dateVariants.push(`${dateMatch[3]}.${dateMatch[2]}.${dateMatch[1].slice(2)}`,`${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`);
    return normalizeArchiveSearch([
      ...dateVariants,stripObsoleteCarbLabel(item?.text),item?.comment,isMissingArchiveDay(item)?"немає даних не записано пропущений день":"",archiveDayTypeLabel(dayType),
      ARCHIVE_SEARCH_DAY_SYNONYMS[dayType]||"",composition,...metrics
    ].filter(Boolean).join(" "));
  }
  function filteredArchiveItems(){
    const query=normalizeArchiveSearch(archiveSearch?.value||"");
    if(!query)return archiveNewestFirst(archiveItems);
    // Підтримує і суцільну фразу, і кілька умов, наприклад «читміл 09.10».
    const words=query.split(" ").filter(Boolean);
    return archiveNewestFirst(archiveItems.filter(item=>{
      const searchText=archiveItemSearchText(item);
      return searchText.includes(query)||words.every(word=>searchText.includes(word));
    }));
  }
  function renderArchive(){
    updateSiteDataCounts();
    if(!archiveLog)return;
    archiveLog.innerHTML="";
    const query=normalizeArchiveSearch(archiveSearch?.value||"");
    const items=filteredArchiveItems();
    if(archiveSearchStatus){
      archiveSearchStatus.textContent=query
        ? `Знайдено: ${items.length} із ${archiveItems.length}. Пошук за датою, КБЖВ, складом, коментарем і типом дня.`
        : `Показано всі записи: ${archiveItems.length}.`;
    }
    syncAvSearchClear(archiveSearchClear,archiveSearch?.value);
    if(!archiveItems.length){archiveLog.innerHTML='<div style="padding:10px 0;">Архів порожній.</div>';return;}
    if(!items.length){archiveLog.innerHTML='<div style="padding:10px 0;">За цим запитом записів не знайдено.</div>';return;}
    items.forEach(item=>{
      const row=document.createElement("div");row.className="log-item archive-item";
      const content=document.createElement("div");content.className="archive-content";
      const date=document.createElement("div");date.style.fontWeight="600";date.style.color="var(--text-main)";date.textContent=formatArchiveDate(item.date);
      const text=document.createElement("div");
      // Historical derived-only labels are suppressed without changing the source record.
      // This avoids destructively rewriting a user's archive on page load.
      const archivedText=stripObsoleteCarbLabel(String(item.text||""));
      text.textContent=archivedText;
      content.append(date,text);

      const commentText=String(item.comment||"").trim();
      if(isMissingArchiveDay(item))row.classList.add("archive-missing-day");
      if(commentText){
        const comment=document.createElement("div");
        comment.className="archive-comment-preview";
        const label=document.createElement("strong");
        label.textContent="Коментар:";
        const value=document.createElement("span");
        value.textContent=commentText;
        comment.append(label,value);
        content.append(comment);
      }
      const typeText=archiveDayTypeLabel(item.day_type);
      if(typeText){
        const type=document.createElement("div");type.className="archive-day-type-preview";
        type.textContent=`✓ ${typeText}`;
        content.append(type);
      }
      const actions=document.createElement("div");actions.className="archive-actions";
      const composition=document.createElement("button");composition.className="archive-composition-button";composition.textContent="Переглянути склад";if(!Array.isArray(item.composition)||!item.composition.length){composition.classList.add("archive-action-unavailable");composition.title="Склад для цього запису не був збережений";}
      const ed=document.createElement("button");ed.className="edit-date";ed.dataset.archiveId=String(item.id);ed.textContent="Змінити дату";
      const et=document.createElement("button");et.className="edit-text";et.textContent="Змінити текст";et.dataset.archiveId=String(item.id);
      const commentButton=document.createElement("button");commentButton.className="archive-comment-button";commentButton.textContent="Додати коментар";commentButton.dataset.archiveId=String(item.id);
      const rm=document.createElement("button");rm.className="remove";rm.textContent="Видалити";
      composition.onclick=()=>openArchiveComposition(item,composition);
      ed.onclick=()=>editArchiveDate(item,date,ed);
      et.onclick=()=>openArchiveTextModal(item,et);
      commentButton.onclick=()=>openArchiveCommentModal(item,commentButton);
      rm.onclick=()=>{if(confirm("Видалити цей запис з архіву?")){saveUndoSnapshot("Видалення запису з архіву");if(isMissingArchiveDay(item)){const last=localStorage.getItem(MISSING_ARCHIVE_CHECK_KEY());if(!last||last<item.date)safeStorageSet(MISSING_ARCHIVE_CHECK_KEY(),item.date);}archiveItems=archiveItems.filter(a=>a.id!==item.id);if(!saveArchiveLocal()){showButtonState(rm,"Не видалено","error");return;}renderArchive();renderStatistics();logAction("Запис видалено з архіву.");}else{showButtonState(rm,"Видалити","error",900);logAction("Видалення запису з архіву скасовано.");}};
      actions.append(ed,et,composition,commentButton,rm);row.append(content,actions);archiveLog.append(row);
    });
  }

  function archiveCompositionLine(entry){
    if(typeof entry==="string")return stripObsoleteCarbLabel(entry);
    if(!entry||typeof entry!=="object")return "";
    const text=stripObsoleteCarbLabel(String(entry.text||"").trim());
    const name=String(entry.name||"").trim();
    const weight=number(entry.weight);
    if(weight>0&&name)return `${name} — ${formatNumber(weight)} г`;
    return text||name;
  }
  function openArchiveComposition(item,button){
    if(!archiveCompositionModal||!archiveCompositionList)return;
    archiveCompositionSourceButton=button||null;
    const composition=Array.isArray(item?.composition)?item.composition:[];
    archiveCompositionList.innerHTML="";
    if(archiveCompositionDate)archiveCompositionDate.textContent=formatArchiveDate(item?.date||"");

    if(!composition.length){
      const empty=document.createElement("div");
      empty.className="archive-composition-empty";
      empty.textContent="Склад для цього запису не був збережений";
      archiveCompositionList.append(empty);
      clearButtonStatus(button);
      button.textContent=button.dataset.originalText||"Переглянути склад";
      logAction(`Перегляд складу архіву за ${formatArchiveDate(item?.date||"")} — даних немає.`);
    }else{
      composition.forEach(entry=>{
        const line=archiveCompositionLine(entry);
        if(!line)return;
        if(/^\/-\/-/.test(line)){
          const divider=document.createElement("div");
          divider.className="archive-composition-divider";
          archiveCompositionList.append(divider);
          return;
        }
        const row=document.createElement("div");
        row.className="archive-composition-entry";
        row.textContent=line;
        archiveCompositionList.append(row);
      });
      clearButtonStatus(button);
      button.textContent=button.dataset.originalText||"Переглянути склад";
      logAction(`Відкрито склад денного підсумку за ${formatArchiveDate(item?.date||"")} (${composition.length} записів).`);
    }

    archiveCompositionModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }
  function closeArchiveComposition(logClose=true,acknowledged=false){
    const sourceButton=archiveCompositionSourceButton;
    archiveCompositionSourceButton=null;
    archiveCompositionModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");

    if(sourceButton){
      if(acknowledged){
        requestAnimationFrame(()=>showButtonState(sourceButton,"Переглянуто","success"));
      }else{
        requestAnimationFrame(()=>showButtonState(sourceButton,"Закрито","success",900));
      }
    }

    if(logClose)logAction(acknowledged?"Перегляд складу денного підсумку підтверджено.":"Перегляд складу денного підсумку закрито без підтвердження.");
  }
  archiveCompositionClose?.addEventListener("click",()=>{
    showButtonState(archiveCompositionClose,"Зрозуміло","success");
    setTimeout(()=>closeArchiveComposition(true,true),360);
  });
  archiveCompositionModal?.addEventListener("click",e=>{
    if(e.target===archiveCompositionModal)closeArchiveComposition(true,false);
  });

  function editArchiveDate(item,dateElement,actionButton){
    if(dateElement.querySelector("input"))return;
    logAction(`Відкрито зміну дати запису архіву за ${formatArchiveDate(item.date||"")}.`);
    const original=item.date||"";
    const input=document.createElement("input");
    input.type="date";
    input.className="archive-date-input";
    input.value=original||getCurrentDate();
    dateElement.textContent="";
    dateElement.append(input);
    input.focus();

    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      if(input.value&&input.value!==original){
        if(archiveDateTaken(archiveDateKey(input.value),item.id)){
          dateElement.textContent=formatArchiveDate(original);
          showButtonState(actionButton,"Запис існує","error",1400);
          showArchiveDateExists(archiveDateKey(input.value));
          return;
        }
        saveUndoSnapshot("Зміна дати запису архіву");
        item.date=input.value;
        if(!saveArchiveLocal()){dateElement.textContent=formatArchiveDate(original);showButtonState(actionButton,"Не збережено","error",1200);return;}
        renderStatistics();
        // Rebuild in its new chronological position immediately after the edit.
        renderArchive();
        const updatedAction=[...archiveLog.querySelectorAll(".edit-date")].find(button=>button.dataset.archiveId===String(item.id));
        showButtonState(updatedAction,"Змінено","success",900);
        logAction(`Дата запису архіву змінена з ${original} на ${input.value}.`);
      }else{
        dateElement.textContent=formatArchiveDate(original);
        showButtonState(actionButton,"Без змін","error",900);
        logAction(input.value?"Зміну дати архіву завершено без змін.":"Зміну дати архіву скинуто/скасовано без збереження.");
      }
    };
    input.addEventListener("change",finish,{once:true});
    input.addEventListener("blur",finish,{once:true});
  }
  function openArchiveTextModal(item,actionButton){archiveEditingId=item.id;archiveOriginalText=item.text||"";archiveEditingButton=actionButton||null;archiveTextInput.value=item.text||"";archiveTextModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction(`Відкрито редагування тексту запису архіву за ${formatArchiveDate(item.date||"")}.`);setTimeout(()=>archiveTextInput.focus(),50);}
  function closeArchiveTextModal(){archiveEditingId=null;archiveOriginalText=null;archiveEditingButton=null;archiveTextModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  // Text editing remains a draft until «Зберегти»; Paste/Clear do not persist.
  archiveTextPaste?.addEventListener("click",async()=>{
    try{
      const text=await navigator.clipboard.readText();
      if(!text){showButtonState(archiveTextPaste,"Немає що вставити","error");return;}
      const start=archiveTextInput.selectionStart,end=archiveTextInput.selectionEnd;
      archiveTextInput.setRangeText(text,start,end,'end');
      archiveTextInput.dispatchEvent(new Event('input',{bubbles:true}));
      showButtonState(archiveTextPaste,"Вставлено","success");
    }catch(_){showButtonState(archiveTextPaste,"Не вдалося вставити","error");}
  });
  archiveTextClear?.addEventListener("click",()=>{
    if(!archiveTextInput.value){showButtonState(archiveTextClear,"Немає що очищати","error");return;}
    archiveTextInput.value="";
    archiveTextInput.dispatchEvent(new Event('input',{bubbles:true}));
    showButtonState(archiveTextClear,"Очищено","success");
  });
  archiveTextCopy?.addEventListener("click",async()=>{
    if(!archiveTextInput.value){showButtonState(archiveTextCopy,"Немає що копіювати","error");return;}
    try{await navigator.clipboard.writeText(archiveTextInput.value);showButtonState(archiveTextCopy,"Скопійовано","success");}
    catch(_){showButtonState(archiveTextCopy,"Не вдалося","error");}
  });
  archiveTextCancel?.addEventListener("click",()=>{const outer=archiveEditingButton;showButtonState(archiveTextCancel,"Скасовано","error",500);closeArchiveTextModal();showButtonState(outer,"Не змінено","error",900);logAction("Редагування тексту архіву скасовано.");});
  archiveTextModal?.addEventListener("click",e=>{if(e.target===archiveTextModal){const outer=archiveEditingButton;closeArchiveTextModal();showButtonState(outer,"Не змінено","error",900);logAction("Редагування тексту архіву закрито без збереження.");}});
  archiveTextSave?.addEventListener("click",()=>{const item=archiveItems.find(a=>a.id===archiveEditingId);const outer=archiveEditingButton;if(!item)return closeArchiveTextModal();const text=archiveTextInput.value.trim();if(!text){showButtonState(archiveTextSave,"Немає тексту","error");archiveTextInput.focus({preventScroll:true});return;}if(text!==archiveOriginalText){saveUndoSnapshot("Зміна тексту запису архіву");item.text=text;if(!saveArchiveLocal()){showButtonState(archiveTextSave,"Не збережено","error");return;}showButtonState(archiveTextSave,"Збережено","success");logAction("Текст запису архіву змінено.");closeArchiveTextModal();renderArchive();const refreshedOuter=[...archiveLog.querySelectorAll(".edit-text")].find(button=>button.dataset.archiveId===String(item.id));showButtonState(refreshedOuter,"Змінено","success");}else{showButtonState(archiveTextSave,"Не змінено","error");showButtonState(outer,"Не змінено","error");logAction("Текст запису архіву залишено без змін.");closeArchiveTextModal();}});

  const ARCHIVE_DAY_TYPE_LABELS={rest:"Відпочинок",training:"Тренування",cheatmeal:"Чітміл"};
  function archiveDayTypeLabel(value){return ARCHIVE_DAY_TYPE_LABELS[String(value||"")]||"";}
  archiveDayTypeInputs.forEach(input=>input.addEventListener("change",()=>{
    if(input.checked)archiveDayTypeInputs.forEach(other=>{if(other!==input)other.checked=false;});
  }));
  function selectedArchiveDayType(){return archiveDayTypeInputs.find(input=>input.checked)?.value||"";}
  function updateArchiveCommentLimit(){
    if(!archiveCommentInput||!archiveCommentLimit)return 0;
    const over=Math.max(0,Array.from(archiveCommentInput.value).length-500);
    archiveCommentLimit.textContent=over?`Перевищено ліміт на ${over} символів.`:"";
    archiveCommentLimit.classList.toggle("active",over>0);
    return over;
  }
  function openArchiveCommentModal(item,actionButton){
    archiveCommentEditingId=item.id;
    archiveCommentOriginal=String(item.comment||"");
    archiveDayTypeOriginal=Object.hasOwn(ARCHIVE_DAY_TYPE_LABELS,String(item.day_type||""))?String(item.day_type):"";
    archiveDayTypeInputs.forEach(input=>{input.checked=input.value===archiveDayTypeOriginal;});
    archiveCommentEditingButton=actionButton||null;
    archiveCommentInput.value=archiveCommentOriginal;
    // The comment form is editable as soon as it opens. Only Save persists.
    archiveCommentInput.readOnly=false;
    updateArchiveCommentLimit();
    archiveCommentModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction(`Відкрито коментар до запису архіву за ${formatArchiveDate(item.date||"")}.`);
    setTimeout(()=>archiveCommentInput?.focus(),50);
  }
  function closeArchiveCommentModal(){
    archiveCommentEditingId=null;
    archiveCommentOriginal="";
    archiveDayTypeOriginal="";
    archiveDayTypeInputs.forEach(input=>{input.checked=false;});
    archiveCommentEditingButton=null;
    archiveCommentModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    if(archiveCommentLimit){archiveCommentLimit.textContent="";archiveCommentLimit.classList.remove("active");}
  }
  archiveCommentInput?.addEventListener("input",updateArchiveCommentLimit);
  archiveCommentPaste?.addEventListener("click",async()=>{
    if(archiveCommentInput?.readOnly){showButtonState(archiveCommentPaste,"Спочатку редагуйте","error");return;}
    try{
      const text=await navigator.clipboard.readText();
      if(!text){showButtonState(archiveCommentPaste,"Немає що вставити","error");return;}
      const start=archiveCommentInput.selectionStart,end=archiveCommentInput.selectionEnd;
      archiveCommentInput.setRangeText(text,start,end,'end');archiveCommentInput.dispatchEvent(new Event('input',{bubbles:true}));
      showButtonState(archiveCommentPaste,"Вставлено","success");
    }catch(_){showButtonState(archiveCommentPaste,"Не вдалося вставити","error");}
  });
  archiveCommentClear?.addEventListener("click",()=>{
    if(archiveCommentInput?.readOnly){showButtonState(archiveCommentClear,"Спочатку редагуйте","error");return;}
    if(!archiveCommentInput.value){showButtonState(archiveCommentClear,"Немає що очищати","error");return;}
    archiveCommentInput.value="";archiveCommentInput.dispatchEvent(new Event('input',{bubbles:true}));
    showButtonState(archiveCommentClear,"Очищено","success");
  });
  archiveCommentCopy?.addEventListener("click",async()=>{
    const value=archiveCommentInput?.value||"";
    if(!value){showButtonState(archiveCommentCopy,"Немає що копіювати","error");return;}
    try{await navigator.clipboard.writeText(value);showButtonState(archiveCommentCopy,"Скопійовано","success");}
    catch(_){showButtonState(archiveCommentCopy,"Не вдалося","error");}
  });
  archiveCommentCancel?.addEventListener("click",()=>{
    const outer=archiveCommentEditingButton;
    showButtonState(archiveCommentCancel,"Скасовано","error");
    closeArchiveCommentModal();
    showButtonState(outer,"Не змінено","error");
    logAction("Редагування коментаря архіву скасовано.");
  });
  archiveCommentModal?.addEventListener("click",event=>{
    if(event.target===archiveCommentModal){
      const outer=archiveCommentEditingButton;
      closeArchiveCommentModal();
      showButtonState(outer,"Не змінено","error");
      logAction("Коментар архіву закрито без збереження.");
    }
  });
  archiveCommentSave?.addEventListener("click",()=>{
    const item=archiveItems.find(entry=>entry.id===archiveCommentEditingId);
    const outer=archiveCommentEditingButton;
    if(!item)return closeArchiveCommentModal();
    if(updateArchiveCommentLimit()>0){
      showButtonState(archiveCommentSave,"Забагато символів","error");
      archiveCommentInput?.focus();
      return;
    }
    const comment=String(archiveCommentInput?.value||"").trim();
    const dayType=selectedArchiveDayType();
    if(comment!==archiveCommentOriginal||dayType!==archiveDayTypeOriginal){
      saveUndoSnapshot("Зміна коментаря запису архіву");
      item.comment=comment;
      item.day_type=dayType;
      if(!saveArchiveLocal()){showButtonState(archiveCommentSave,"Не збережено","error");return;}
      showButtonState(archiveCommentSave,"Збережено","success");
      logAction(`Позначку дня та коментар архіву збережено: ${archiveDayTypeLabel(dayType)||"без позначки"}.`);
      closeArchiveCommentModal();
      renderArchive();
      const refreshed=[...archiveLog.querySelectorAll(".archive-comment-button")].find(button=>button.dataset.archiveId===String(item.id));
      showButtonState(refreshed,"Збережено","success");
    }else{
      showButtonState(archiveCommentSave,"Не змінено","error");
      showButtonState(outer,"Не змінено","error");
      logAction("Коментар архіву залишено без змін.");
      closeArchiveCommentModal();
    }
  });

  function parseArchiveMetrics(item){
    if(isMissingArchiveDay(item))return {kcal:null,protein:null,fat:null,carb:null,sugar:null,salt:null,fiber:null};
    const t=String(item?.text||"");
    const aliases={protein:"proteins",fat:"fats",carb:"carbs",sugar:"sugars",fiber:"fibre"};
    const patterns={kcal:/([\d\s.,]+)\s*(?:калорій|ккал)/i,protein:/([\d\s.,]+)\s*білка/i,fat:/([\d\s.,]+)\s*жирів/i,carb:/([\d\s.,]+)\s*вуглеводів/i,sugar:/([\d\s.,]+)\s*цукрів/i,salt:/([\d\s.,]+)\s*солі/i,fiber:/([\d\s.,]+)\s*клітковини/i};
    const result={};
    for(const [key,re] of Object.entries(patterns)){
      const raw=item?.[key]??item?.[aliases[key]];
      if(raw!==undefined&&raw!==null&&String(raw).trim()!==""){
        result[key]=number(String(raw).replace(/\s/g,"").replace(",","."));
      }else{
        const match=t.match(re);
        result[key]=match?number(match[1].replace(/\s/g,"").replace(",",".")):0;
      }
    }
    return result;
  }
  function syncStatsToToday(render=true){
    if(!statsToToday||!statsTo)return;
    statsToToday.checked=statsToTodayEnabled;
    statsTo.disabled=statsToTodayEnabled;
    if(statsToTodayEnabled)statsTo.value=getCurrentDate();
    if(render)renderStatistics();
  }
  function archiveDateKey(value){
    const date=String(value||"").trim();
    if(isExactIsoDate(date))return date;
    const local=date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(local){const iso=`${local[3]}-${local[2]}-${local[1]}`;if(isExactIsoDate(iso))return iso;}
    if(date.length>=10&&isExactIsoDate(date.slice(0,10)))return date.slice(0,10);
    return "";
  }
  function shiftStatsDate(iso,days){
    const date=new Date(String(iso)+"T12:00:00Z");
    if(!Number.isFinite(date.getTime()))return iso;
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }
  function limitRegularStatsRange(){
    if(!statsTo||!statsFrom)return;
    const to=statsToTodayEnabled?getCurrentDate():(statsTo.value||getCurrentDate());
    const earliest=shiftStatsDate(to,-29);
    const originalFrom=statsFrom.value;
    statsTo.value=to;
    if(!originalFrom||originalFrom<earliest)statsFrom.value=earliest;
    else if(originalFrom>to)statsFrom.value=to;
  }
  function setupStatisticsDates(){
    // The small graph is a 30-calendar-day view, never an unbounded plot.
    // The fullscreen graph keeps independent dates for historical analysis.
    limitRegularStatsRange();
  }
  function statsMetricLabel(){
    return ({kcal:"Калорії",protein:"Білки",fat:"Жири",carb:"Вуглеводи",sugar:"Цукри",salt:"Сіль",fiber:"Клітковина"})[statsMetric]||statsMetric;
  }
  // The absence of a day applies to the metric currently shown in the graph.
  // Do not substitute numerical zeroes: this is a visual label only.
  function missingStatsMetricLabel(){
    return ({
      kcal:"Калорійність не записана",
      protein:"Білки не записані",
      fat:"Жири не записані",
      carb:"Вуглеводи не записані",
      sugar:"Цукри не записані",
      salt:"Сіль не записана",
      fiber:"Клітковина не записана"
    })[statsMetric]||"Дані не записані";
  }
  function formatStatsDate(iso){const [y,m,d]=String(iso).split("-");return `${d}.${m}.${y}`;}
  function latestArchiveItemsByDate(){
    const map=new Map();
    archiveItems.forEach((item,index)=>{
      const date=archiveDateKey(item?.date);
      if(!date)return;
      const stamp=Number.isFinite(Date.parse(item?.created_at||""))?Date.parse(item.created_at):-index;
      const existing=map.get(date);
      if(!existing||stamp>existing.stamp)map.set(date,{item:{...item,date},stamp});
    });
    return [...map.values()].map(entry=>entry.item).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function localDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
  function renderArchiveAverages(){
    const entries=latestArchiveItemsByDate().filter(item=>!isMissingArchiveDay(item));
    if(statsAverageLabel)statsAverageLabel.textContent=`Середнє значення: ${statsMetricLabel()}`;
    const today=new Date();today.setHours(0,0,0,0);
    const configs=[[7,avgKcal7,avgKcal7Note],[14,avgKcal14,avgKcal14Note],[30,avgKcal30,avgKcal30Note]];
    configs.forEach(([days,valueEl,noteEl])=>{
      if(!valueEl||!noteEl)return;
      const start=new Date(today);start.setDate(start.getDate()-(days-1));
      const from=localDateKey(start),to=localDateKey(today);
      const matching=entries.filter(item=>item.date>=from&&item.date<=to&&parseArchiveMetrics(item)[statsMetric]!==null);
      if(!matching.length){valueEl.textContent="—";noteEl.textContent=`Записано 0/${days} днів`;return;}
      const average=matching.reduce((sum,item)=>sum+parseArchiveMetrics(item)[statsMetric],0)/matching.length;
      // Назва замість скорочення одиниці. Значення в даних як і раніше у ккал / грамах.
      const metricNames={protein:"білків",fat:"жирів",carb:"вуглеводів",sugar:"цукрів",salt:"солі",fiber:"клітковини"};
      valueEl.textContent=statsMetric==="kcal"?`${formatNumber(average)} калорій`:`${formatNumber(average)} ${metricNames[statsMetric]||statsMetricLabel().toLowerCase()}`;
      noteEl.textContent=`Записано ${matching.length}/${days} днів`;
    });
  }
  function renderMonthlyArchiveSummary(){
    if(!statsMonthSummary)return;
    const now=new Date(),year=now.getFullYear(),month=now.getMonth();
    const prefix=`${year}-${String(month+1).padStart(2,"0")}-`;
    const recordedDays=new Set(archiveItems.filter(i=>!isMissingArchiveDay(i)).map(i=>archiveDateKey(i.date)).filter(d=>d.startsWith(prefix))).size;
    const daysInMonth=new Date(year,month+1,0).getDate();
    const monthLabel=new Intl.DateTimeFormat("uk-UA",{month:"long"}).format(now).toLowerCase();
    statsMonthSummary.textContent=`${year} рік, ${monthLabel}: записано ${recordedDays} ${dayCountWord(recordedDays)} з ${daysInMonth}.`;
  }
  function archiveRecordWord(count){const n=Math.abs(count)%100,d=n%10;return n>=11&&n<=14?"записів":d===1?"запис":d>=2&&d<=4?"записи":"записів";}
  function renderStatistics(targetCanvas=statsChart){
    if(statsMetric==='slow')statsMetric='kcal';
    const isMain=targetCanvas===statsChart;
    if(isMain){renderMonthlyArchiveSummary();renderArchiveAverages();}
    if(!targetCanvas)return;
    const archivePage=document.getElementById("archive");
    if(!archivePage?.classList.contains("active"))return;
    if(isMain)setupStatisticsDates();
    const from=isMain?(statsFrom?.value||"0000-01-01"):(fullscreenFrom||"0000-01-01");
    const to=isMain?(statsTo?.value||"9999-12-31"):(fullscreenTo||"9999-12-31");
    const points=latestArchiveItemsByDate().map((item,index)=>({
      date:archiveDateKey(item?.date),value:isMissingArchiveDay(item)?null:parseArchiveMetrics(item)[statsMetric],
      created:Date.parse(item?.created_at||"")||0,index
    })).filter(item=>item.date&&item.date>=from&&item.date<=to)
      .sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created||b.index-a.index);
    if(isMain&&statsRangeSummary){
      const dates=new Set(points.filter(p=>p.value!==null).map(p=>p.date)).size;
      const missing=new Set(points.filter(p=>p.value===null).map(p=>p.date)).size;
      statsRangeSummary.textContent=`За вибраний період: ${points.length} ${archiveRecordWord(points.length)}, записано ${dates} ${dayCountWord(dates)}${missing?`, без даних: ${missing}`:""}.`;
    }
    const ctx=targetCanvas.getContext("2d"),rect=targetCanvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    // Respect real CSS width: min 300 previously clipped left axis on narrow screens.
    const w=Math.max(160,targetCanvas.clientWidth||rect.width||300);
    const h=Math.max(180,targetCanvas.clientHeight||rect.height||300);
    targetCanvas.width=Math.ceil(w*dpr);targetCanvas.height=Math.ceil(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(isMain){statsRenderedPoints=[];statsChartGeometry=null;statsTooltip?.classList.remove("active");}
    else {fullscreenRenderedPoints=[];fullscreenChartGeometry=null;}
    if(isMain&&statsEmpty)statsEmpty.style.display=points.length?"none":"flex";
    if(!points.length)return;
    let rawMin=Infinity,rawMax=-Infinity;
    for(const point of points)if(point.value!==null&&Number.isFinite(point.value)){
      rawMin=Math.min(rawMin,point.value);rawMax=Math.max(rawMax,point.value);
    }
    const chartGoal=dailyGoal.enabled&&statsGoalVisible?Number(dailyGoal[statsMetric]):NaN;
    const showGoal=Number.isFinite(chartGoal)&&chartGoal>0;
    if(showGoal){rawMin=Math.min(rawMin,chartGoal);rawMax=Math.max(rawMax,chartGoal);}
    const hasNumbers=Number.isFinite(rawMin)&&Number.isFinite(rawMax);
    if(!hasNumbers){rawMin=0;rawMax=1;}
    const rawRange=rawMax-rawMin||Math.max(Math.abs(rawMax)*.1,1),margin=rawRange*.12;
    const min=Math.max(0,rawMin-margin),max=rawMax+margin,range=max-min||1;
    const css=getComputedStyle(document.documentElement),primary=css.getPropertyValue("--primary-color").trim(),secondary=css.getPropertyValue("--text-secondary").trim(),gridColor=css.getPropertyValue("--bg-card").trim(),bodyStyle=getComputedStyle(document.body);
    const fontFamily=bodyStyle.fontFamily;
    const archivePointColor=css.getPropertyValue("--archive-point-color").trim()||"#ac80ff";
    const archivePointGlow=css.getPropertyValue("--archive-point-glow").trim()||"rgba(167,117,255,.58)";
    ctx.font=`11px ${fontFamily}`;
    // Dynamic tick padding prevents clipped leading digits in either orientation.
    const maxTickWidth=Math.max(...Array.from({length:7},(_,i)=>ctx.measureText(hasNumbers?formatNumber(max-range*i/6):"—").width));
    const pad={l:Math.ceil(maxTickWidth+19),r:22,t:32,b:42};
    const cw=Math.max(1,w-pad.l-pad.r),ch=Math.max(1,h-pad.t-pad.b);
    ctx.lineWidth=1;ctx.strokeStyle=gridColor;ctx.fillStyle=secondary;
    for(let i=0;i<=6;i++){
      const y=pad.t+ch*i/6;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
      ctx.textAlign="right";ctx.fillStyle=secondary;ctx.fillText(hasNumbers?formatNumber(max-range*i/6):"—",pad.l-8,y+4);
    }
    const coords=points.map((p,i)=>({
      x:pad.l+(points.length===1?cw/2:cw*i/(points.length-1)),
      // A missing day has NO numeric value. Put its red marker just above the
      // x-axis for visualization, and connect it without entering statistics.
      y:p.value===null?pad.t+ch-7:pad.t+ch*(max-p.value)/range,...p
    }));
    const xStep=Math.max(1,Math.ceil(points.length/(w<520?4:Math.min(14,Math.max(7,w/115)))));
    coords.forEach((p,i)=>{
      if(i%xStep===0||i===coords.length-1){
        ctx.strokeStyle=gridColor;ctx.beginPath();ctx.moveTo(p.x,pad.t);ctx.lineTo(p.x,h-pad.b);ctx.stroke();
        ctx.fillStyle=secondary;ctx.textAlign="center";
        const label=p.date.slice(8,10)+"."+p.date.slice(5,7);
        const textWidth=ctx.measureText(label).width;
        const labelX=Math.max(textWidth/2+2,Math.min(w-textWidth/2-2,p.x));
        ctx.fillText(label,labelX,h-13);
      }
    });
    // Connect recorded purple points and missing red markers visually.
    // Missing markers never become zeros or enter averages, exports or goals.
    ctx.strokeStyle=primary;ctx.lineWidth=2;ctx.beginPath();
    coords.forEach((p,i)=>{if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
    ctx.stroke();
    if(showGoal){
      const goalY=pad.t+ch*(max-chartGoal)/range;
      ctx.save();ctx.setLineDash([]);ctx.lineCap="round";ctx.strokeStyle="#43ff77";
      ctx.shadowColor="rgba(40,255,100,.85)";ctx.shadowBlur=11;
      ctx.globalAlpha=.32;ctx.lineWidth=2.8;
      ctx.beginPath();ctx.moveTo(pad.l,goalY);ctx.lineTo(w-pad.r,goalY);ctx.stroke();
      ctx.globalAlpha=1;ctx.lineWidth=1.35;ctx.shadowBlur=6;ctx.stroke();
      const label=`Ціль: ${formatNumber(chartGoal)} ${statsMetric==="kcal"?"ккал":"г"}`;
      ctx.font=`bold 11px ${fontFamily}`;
      const labelWidth=ctx.measureText(label).width;
      const labelX=Math.max(pad.l+5,w-pad.r-labelWidth-6),labelY=goalY<pad.t+15?goalY+13:goalY-7;
      ctx.shadowBlur=9;ctx.shadowColor="#35ff75";ctx.fillStyle="#75ffa0";ctx.textAlign="left";ctx.fillText(label,labelX,labelY);
      ctx.restore();
    }
    ctx.save();
    coords.forEach(p=>{
      const missing=p.value===null;
      ctx.fillStyle=missing?"#fa5264":archivePointColor;
      ctx.shadowColor=missing?"rgba(255,66,89,.60)":archivePointGlow;
      ctx.shadowBlur=missing?5:6;
      ctx.beginPath();ctx.arc(p.x,p.y,missing?4.4:4.2,0,Math.PI*2);ctx.fill();
    });ctx.restore();
    if(isMain){statsRenderedPoints=coords;statsChartGeometry={w,h,pad};}
    else {fullscreenRenderedPoints=coords;fullscreenChartGeometry={w,h,pad};}
  }
  function refreshBothStatistics(){
    renderStatistics();
    if(statsFullscreen&&!statsFullscreen.hidden)renderStatistics(statsFullscreenCanvas);
  }
  function drawFullscreenChart(){
    if(!statsFullscreenCanvas||!statsFullscreenViewport||statsFullscreen?.hidden)return;
    const w=Math.max(300,Math.floor(statsFullscreenViewport.clientWidth-2)*fullscreenZoom);
    statsFullscreenCanvas.style.width=`${w}px`;
    statsFullscreenCanvas.style.height=`${Math.max(250,statsFullscreenViewport.clientHeight-3)}px`;
    renderStatistics(statsFullscreenCanvas);
    if(statsFullscreenTitle)statsFullscreenTitle.textContent=statsMetricLabel();
    // A selected point tooltip is only valid for the previous rendering.
    statsFullscreenTooltip?.classList.remove("active");
    if(statsFullscreenReset)statsFullscreenReset.textContent=Math.round(fullscreenZoom*100)+"%";
  }
  function setFullscreenZoom(next){
    const previous=fullscreenZoom;
    const viewport=statsFullscreenViewport;
    const focus=viewport?viewport.scrollLeft+viewport.clientWidth/2:0;
    fullscreenZoom=Math.max(1,Math.min(8,Number(next)||1));
    drawFullscreenChart();
    if(viewport&&previous>0){
      const nextLeft=focus*fullscreenZoom/previous-viewport.clientWidth/2;
      viewport.scrollLeft=Math.max(0,Math.min(nextLeft,viewport.scrollWidth-viewport.clientWidth));
    }
  }
  function closeStatisticsFullscreen(){
    if(!statsFullscreen||statsFullscreen.hidden)return;
    statsFullscreen.hidden=true;document.body.classList.remove("stats-fullscreen-active");
    if(statsFullscreenInspection){statsFullscreenInspection.textContent="";statsFullscreenInspection.hidden=true;}
    statsFullscreenTooltip?.classList.remove("active");
    renderStatistics();
  }
  statsFullscreenOpen?.addEventListener("click",()=>{
    statsFullscreen.hidden=false;document.body.classList.add("stats-fullscreen-active");
    fullscreenFrom=statsFrom?.value||shiftStatsDate(getCurrentDate(),-29);
    fullscreenTo=statsTo?.value||getCurrentDate();
    if(statsFullscreenFrom)statsFullscreenFrom.value=fullscreenFrom;
    if(statsFullscreenTo)statsFullscreenTo.value=fullscreenTo;
    fullscreenZoom=1;
    if(statsFullscreenViewport){statsFullscreenViewport.scrollLeft=0;statsFullscreenViewport.scrollTop=0;}
    drawFullscreenChart();
    statsFullscreenClose?.focus({preventScroll:true});
  });
  statsFullscreenClose?.addEventListener("click",()=>{
    showButtonState(statsFullscreenClose,"Закрито","success");
    setTimeout(closeStatisticsFullscreen,360);
  });
  [statsFullscreenFrom,statsFullscreenTo].forEach(input=>input?.addEventListener("change",()=>{
    const from=statsFullscreenFrom?.value||fullscreenFrom,to=statsFullscreenTo?.value||fullscreenTo;
    if(from&&to&&from>to){
      if(statsFullscreenFrom)statsFullscreenFrom.value=fullscreenFrom;
      if(statsFullscreenTo)statsFullscreenTo.value=fullscreenTo;
      if(statsFullscreenInspection){statsFullscreenInspection.textContent="Дата «Від» не може бути пізніше дати «До»";statsFullscreenInspection.hidden=false;}
      return;
    }
    fullscreenFrom=from;fullscreenTo=to;fullscreenZoom=1;
    statsFullscreenTooltip?.classList.remove("active");
    if(statsFullscreenViewport)statsFullscreenViewport.scrollLeft=0;
    if(statsFullscreenInspection)statsFullscreenInspection.hidden=true;
    drawFullscreenChart();
  }));
  statsFullscreenPlus?.addEventListener("click",()=>setFullscreenZoom(fullscreenZoom*1.4));
  statsFullscreenMinus?.addEventListener("click",()=>setFullscreenZoom(fullscreenZoom/1.4));
  statsFullscreenReset?.addEventListener("click",()=>setFullscreenZoom(1));
  window.addEventListener("keydown",event=>{if(event.key==="Escape"&&statsFullscreen&&!statsFullscreen.hidden)closeStatisticsFullscreen();});
  statsFullscreenViewport?.addEventListener("touchstart",event=>{
    if(event.touches.length===2)fullscreenLastPinch=Math.hypot(event.touches[0].clientX-event.touches[1].clientX,event.touches[0].clientY-event.touches[1].clientY);
  },{passive:true});
  statsFullscreenViewport?.addEventListener("touchmove",event=>{
    if(event.touches.length!==2||!fullscreenLastPinch)return;
    event.preventDefault();
    const distance=Math.hypot(event.touches[0].clientX-event.touches[1].clientX,event.touches[0].clientY-event.touches[1].clientY);
    if(Math.abs(distance-fullscreenLastPinch)>9){setFullscreenZoom(fullscreenZoom*distance/fullscreenLastPinch);fullscreenLastPinch=distance;}
  },{passive:false});
  statsFullscreenViewport?.addEventListener("touchend",event=>{if(event.touches.length<2)fullscreenLastPinch=0;},{passive:true});
  function inspectFullscreenStatisticsPoint(clientX,clientY){
    if(!statsFullscreenCanvas||!statsFullscreenTooltip||!fullscreenRenderedPoints.length)return;
    const rect=statsFullscreenCanvas.getBoundingClientRect();
    const portraitRotated=matchMedia("(orientation:portrait) and (max-width:900px)").matches;
    // In portrait PWA the entire fullscreen dialog is rotated by 90 degrees.
    const x=portraitRotated?clientY-rect.top:clientX-rect.left;
    const y=portraitRotated?rect.right-clientX:clientY-rect.top;
    let nearest=fullscreenRenderedPoints[0],distance=Infinity;
    fullscreenRenderedPoints.forEach(point=>{
      const next=Math.hypot(point.x-x,point.y-y);
      if(next<distance){distance=next;nearest=point;}
    });
    // Repaint the same crosshair and colored selected marker as the small chart.
    renderStatistics(statsFullscreenCanvas);
    const ctx=statsFullscreenCanvas.getContext("2d");
    const geometry=fullscreenChartGeometry;
    if(!geometry)return;
    // Same crosshair bounds as the small chart: never draw over axis labels.
    ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle="rgba(220,221,222,.65)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(nearest.x,geometry.pad.t);ctx.lineTo(nearest.x,geometry.h-geometry.pad.b);
    ctx.moveTo(geometry.pad.l,nearest.y);ctx.lineTo(geometry.w-geometry.pad.r,nearest.y);ctx.stroke();ctx.restore();
    ctx.save();ctx.fillStyle=nearest.value===null?"#fa5264":(getComputedStyle(document.documentElement).getPropertyValue("--archive-point-color").trim()||"#ac80ff");
    ctx.shadowColor=nearest.value===null?"rgba(255,66,89,.55)":(getComputedStyle(document.documentElement).getPropertyValue("--archive-point-glow").trim()||"rgba(167,117,255,.60)");
    ctx.shadowBlur=8;ctx.beginPath();ctx.arc(nearest.x,nearest.y,6.5,0,Math.PI*2);ctx.fill();ctx.restore();
    statsFullscreenTooltip.innerHTML=nearest.value===null
      ?`<strong>${missingStatsMetricLabel()}</strong><span>${formatStatsDate(nearest.date)}</span>`
      :`<strong>${formatNumber(nearest.value)} ${statsMetric==="kcal"?"калорій":"г"}</strong><span>${formatStatsDate(nearest.date)} · ${statsMetricLabel()}</span>`;
    statsFullscreenTooltip.classList.add("active");
    const tw=statsFullscreenTooltip.offsetWidth||160,th=statsFullscreenTooltip.offsetHeight||54;
    const chartW=statsFullscreenCanvas.clientWidth,chartH=statsFullscreenCanvas.clientHeight;
    const tooltipX=Math.max(6,Math.min(chartW-tw-6,nearest.x+14));
    const preferredTop=nearest.y-th-10;
    const tooltipY=Math.max(6,Math.min(chartH-th-6,preferredTop<6?nearest.y+13:preferredTop));
    statsFullscreenTooltip.style.left=`${tooltipX}px`;
    statsFullscreenTooltip.style.top=`${tooltipY}px`;
    if(statsFullscreenInspection)statsFullscreenInspection.hidden=true;
  }
  statsFullscreenCanvas?.addEventListener("click",event=>inspectFullscreenStatisticsPoint(event.clientX,event.clientY));
  window.addEventListener("resize",()=>{if(statsFullscreen&&!statsFullscreen.hidden)drawFullscreenChart();});
  function inspectStatisticsPoint(clientX,clientY){
    if(!statsRenderedPoints.length||!statsTooltip)return;
    const rect=statsChart.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    let nearest=statsRenderedPoints[0],dist=Infinity;
    statsRenderedPoints.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;nearest=p;}});
    const ctx=statsChart.getContext("2d"),g=statsChartGeometry;if(!g)return;
    renderStatistics();
    ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle="rgba(220,221,222,.65)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nearest.x,g.pad.t);ctx.lineTo(nearest.x,g.h-g.pad.b);ctx.moveTo(g.pad.l,nearest.y);ctx.lineTo(g.w-g.pad.r,nearest.y);ctx.stroke();ctx.restore();
    // Active marker stays purple (recorded) or red (missing), never becomes red by selection.
    ctx.save();ctx.fillStyle=nearest.value===null?"#fa5264":(getComputedStyle(document.documentElement).getPropertyValue("--archive-point-color").trim()||"#ac80ff");
    ctx.shadowColor=nearest.value===null?"rgba(255,66,89,.55)":(getComputedStyle(document.documentElement).getPropertyValue("--archive-point-glow").trim()||"rgba(167,117,255,.60)");
    ctx.shadowBlur=8;ctx.beginPath();ctx.arc(nearest.x,nearest.y,6.5,0,Math.PI*2);ctx.fill();ctx.restore();
    statsTooltip.innerHTML=nearest.value===null
      ?`<strong>${missingStatsMetricLabel()}</strong><span>${formatStatsDate(nearest.date)}</span>`
      :`<strong>${formatNumber(nearest.value)} ${statsMetric==="kcal"?"калорій":"г"}</strong><span>${formatStatsDate(nearest.date)} · ${statsMetricLabel()}</span>`;
    const wrap=statsChart.parentElement,tw=statsTooltip.offsetWidth||160,th=statsTooltip.offsetHeight||54;
    statsTooltip.style.left=`${Math.max(8,Math.min(wrap.clientWidth-tw-8,nearest.x+14))}px`;
    statsTooltip.style.top=`${Math.max(8,Math.min(wrap.clientHeight-th-8,nearest.y-th-10))}px`;statsTooltip.classList.add("active");
  }
  statsChart?.addEventListener("mousemove",e=>inspectStatisticsPoint(e.clientX,e.clientY));
  statsChart?.addEventListener("mouseleave",()=>{statsTooltip?.classList.remove("active");renderStatistics();});
  statsChart?.addEventListener("click",e=>inspectStatisticsPoint(e.clientX,e.clientY));
  statsChart?.addEventListener("touchstart",e=>{const t=e.touches[0];if(t)inspectStatisticsPoint(t.clientX,t.clientY);},{passive:true});
  statsMetricButtons.forEach(button=>button.addEventListener("click",()=>{statsMetric=button.dataset.metric;statsMetricButtons.forEach(b=>b.classList.toggle("active",b===button));refreshBothStatistics();showButtonState(button,button.dataset.originalText||button.textContent,"success",800);logAction(`Статистику перемкнено на показник «${button.dataset.originalText||button.textContent}».`);}));
  archiveSearch?.addEventListener("input",renderArchive);
  archiveSearchClear?.addEventListener("click",()=>{
    if(!archiveSearch?.value)return;
    archiveSearch.value="";renderArchive();
    flashAvSearchClear(archiveSearchClear);
    archiveSearch.focus({preventScroll:true});
    logAction("Пошук в архіві очищено.");
  });
  archiveNoteToggle?.addEventListener("click",()=>{
    if(archiveNoteEditing&&!confirm("Скасувати незбережені зміни нотатки?"))return;
    const next=!archiveNoteVisible;
    if(!persistUserChange("Видимість нотатки",()=>safeStorageSet(ARCHIVE_NOTE_VISIBLE_KEY,next?"1":"0",{critical:true}))){
      showButtonState(archiveNoteToggle,"Не збережено","error",1500);return;
    }
    archiveNoteVisible=next;archiveNoteEditing=false;
    renderArchiveNote();
    showButtonState(archiveNoteToggle,next?"Показано":"Сховано",next?"success":"error",1200);
    logAction(next?"Нотатку архіву показано.":"Нотатку архіву приховано.");
  });
  // Display-only note may receive focus/outline, but never native text selection
  // or iOS long-press callouts. Copying is available exclusively via the button.
  archiveNoteDisplay?.addEventListener("contextmenu",event=>event.preventDefault());
  archiveNoteDisplay?.addEventListener("dragstart",event=>event.preventDefault());
  archiveNoteText?.addEventListener("input",()=>{
    resizeArchiveNoteEditor();
    if(archiveNoteText.value.length<ARCHIVE_NOTE_MAX_LENGTH)hideArchiveNoteLimitWarning();
  });
  archiveNoteText?.addEventListener("beforeinput",event=>{
    if(!archiveNoteEditing||!String(event.inputType||"").startsWith("insert"))return;
    const selected=Math.max(0,archiveNoteText.selectionEnd-archiveNoteText.selectionStart);
    const insertion=typeof event.data==="string"?event.data:(event.dataTransfer?.getData("text")??null);
    const incomingSize=insertion===null?1:insertion.length;
    if(archiveNoteText.value.length-selected+incomingSize>ARCHIVE_NOTE_MAX_LENGTH){
      showArchiveNoteLimitWarning();
      // At capacity, prevent insertion entirely; otherwise let the native
      // maxlength attribute accept only characters that still fit.
      if(archiveNoteText.value.length-selected>=ARCHIVE_NOTE_MAX_LENGTH&&event.cancelable)event.preventDefault();
    }
  });
  archiveNoteText?.addEventListener("paste",event=>{
    if(!archiveNoteEditing)return;
    const incoming=event.clipboardData?.getData("text")||"";
    const selected=Math.max(0,archiveNoteText.selectionEnd-archiveNoteText.selectionStart);
    if(archiveNoteText.value.length-selected+incoming.length>ARCHIVE_NOTE_MAX_LENGTH)showArchiveNoteLimitWarning();
  });
  archiveNoteText?.addEventListener("keydown",event=>{
    if(!archiveNoteEditing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key.length!==1&&event.key!=="Enter")return;
    if(archiveNoteText.value.length>=ARCHIVE_NOTE_MAX_LENGTH&&archiveNoteText.selectionStart===archiveNoteText.selectionEnd)
      showArchiveNoteLimitWarning();
  });
  window.addEventListener("resize",()=>{
    if(archiveNoteEditing)requestAnimationFrame(resizeArchiveNoteEditor);
  },{passive:true});
  archiveNoteEdit?.addEventListener("click",()=>{
    clearSharedButtonState(archiveNoteEdit);
    if(!archiveNoteEditing){
      archiveNoteEditing=true;renderArchiveNote();
      if(archiveNoteText){archiveNoteText.focus();try{archiveNoteText.setSelectionRange(archiveNoteText.value.length,archiveNoteText.value.length);}catch(_){}}
      if(archiveNote.length>ARCHIVE_NOTE_MAX_LENGTH){
        showArchiveNoteLimitWarning();
        logAction("Стара нотатка перевищує 500 символів; перед збереженням її потрібно скоротити.");
      }
      logAction("Відкрито редагування нотатки архіву.");return;
    }
    const value=String(archiveNoteText?.value||"");
    if(value.length>ARCHIVE_NOTE_MAX_LENGTH){
      showButtonState(archiveNoteEdit,"Макс. 500","error",1500);
      logAction("Нотатку не збережено: перевищено 500 символів.");return;
    }
    if(value===archiveNote){
      archiveNoteEditing=false;renderArchiveNote();
      showButtonState(archiveNoteEdit,"Без змін","error",1450);
      logAction("Нотатку архіву не змінено.");return;
    }
    saveUndoSnapshot("Зміна нотатки архіву");
    if(!persistUserChange("Збереження нотатки архіву",()=>safeStorageSet(ARCHIVE_NOTE_KEY,value,{critical:true}))){
      showButtonState(archiveNoteEdit,"Не збережено","error",1500);return;
    }
    archiveNote=value;archiveNoteEditing=false;renderArchiveNote();
    showButtonState(archiveNoteEdit,"Збережено","success",1450);
    logAction("Нотатку архіву збережено.");
  });
  archiveNotePaste?.addEventListener("click",async()=>{
    if(!archiveNoteEditing||!archiveNoteText){showButtonState(archiveNotePaste,"Спочатку редагуйте","error");return;}
    try{
      if(!navigator.clipboard?.readText)throw new Error("Буфер недоступний");
      const text=await navigator.clipboard.readText();
      if(!text){showButtonState(archiveNotePaste,"Немає що вставити","error");return;}
      const start=archiveNoteText.selectionStart,end=archiveNoteText.selectionEnd;
      if(archiveNoteText.value.length-(end-start)+text.length>ARCHIVE_NOTE_MAX_LENGTH){
        showArchiveNoteLimitWarning();showButtonState(archiveNotePaste,"Макс. 500","error");return;
      }
      archiveNoteText.setRangeText(text,start,end,"end");
      archiveNoteText.dispatchEvent(new Event("input",{bubbles:true}));
      showButtonState(archiveNotePaste,"Вставлено","success");
    }catch(_){showButtonState(archiveNotePaste,"Не вдалося вставити","error");}
  });
  archiveNoteClear?.addEventListener("click",()=>{
    if(!archiveNote&&!String(archiveNoteText?.value||"")){
      showButtonState(archiveNoteClear,"Немає що очищати","error",1450);return;
    }
    if(!confirm("Бажаєте очистити нотатку?")){
      showButtonState(archiveNoteClear,"Не очищено","error",1450);return;
    }
    if(archiveNote){
      saveUndoSnapshot("Очищення нотатки архіву");
      if(!persistUserChange("Очищення нотатки архіву",()=>safeStorageSet(ARCHIVE_NOTE_KEY,"",{critical:true}))){
        showButtonState(archiveNoteClear,"Не очищено","error",1450);return;
      }
    }
    archiveNote="";archiveNoteEditing=false;renderArchiveNote();
    showButtonState(archiveNoteClear,"Очищено","success",1450);
    logAction("Нотатку архіву очищено.");
  });
  archiveNoteCopy?.addEventListener("click",async()=>{
    const value=String(archiveNoteEditing?archiveNoteText?.value:archiveNote||"");
    if(!value){showButtonState(archiveNoteCopy,"Немає що копіювати","error",1450);return;}
    if(await copyText(value)){
      showButtonState(archiveNoteCopy,"Скопійовано","success",1450);
      logAction("Вміст нотатки архіву скопійовано.");
    }else showButtonState(archiveNoteCopy,"Не скопійовано","error",1450);
  });

  siteDataToggle?.addEventListener("click",()=>{
    const next=!siteDataVisible;
    if(!persistUserChange("Видимість поточних даних",()=>safeStorageSet(SITE_DATA_VISIBLE_KEY,next?"1":"0",{critical:true}))){
      showButtonState(siteDataToggle,"Не збережено","error",1500);return;
    }
    siteDataVisible=next;
    renderSiteDataVisibility();
    showButtonState(siteDataToggle,siteDataVisible?"Показано":"Сховано",siteDataVisible?"success":"error",900);
    logAction(siteDataVisible?"Поточні дані сайту показано.":"Поточні дані сайту приховано.");
  });

  function rememberValidStatsRange(){lastValidStatsFrom=statsFrom?.value||"";lastValidStatsTo=statsTo?.value||"";}
  [statsFrom,statsTo].forEach(input=>input?.addEventListener("focus",rememberValidStatsRange));
  [statsFrom,statsTo].forEach(input=>input?.addEventListener("change",()=>{
    if(statsFrom.value&&statsTo.value){
      const fromDate=new Date(`${statsFrom.value}T00:00:00`),toDate=new Date(`${statsTo.value}T00:00:00`);
      const days=Math.round((toDate-fromDate)/86400000);
      if(days<0){
        statsFrom.value=lastValidStatsFrom;statsTo.value=lastValidStatsTo;
        showButtonState(statsMetricButtons[0],"Некоректний період","error",1200);
        logAction("Період статистики не змінено: початкова дата пізніше кінцевої.");return;
      }
      // Allow a single day: a history with one or two records is still valid.
    }
    limitRegularStatsRange();
    rememberValidStatsRange();renderStatistics();logAction(`Період статистики змінено: ${statsFrom.value||"початок"} — ${statsTo.value||"кінець"} (до 30 днів).`);
  }));
  statsToToday?.addEventListener("change",()=>{
    const next=!!statsToToday.checked;
    if(!persistUserChange("Дата статистики",()=>safeStorageSet(STATS_TO_TODAY_KEY,next?"1":"0",{critical:true}))){
      statsToToday.checked=statsToTodayEnabled;return;
    }
    statsToTodayEnabled=next;syncStatsToToday(true);
    logAction(statsToTodayEnabled?"Статистику встановлено до поточного дня.":"Автоматичну дату «До поточного дня» вимкнено.");
  });
  statsChartGoal?.addEventListener("change",()=>{
    const next=!!statsChartGoal.checked;
    if(next===statsGoalVisible)return;
    saveUndoSnapshot(next?"Показ лінії цілі на графіку":"Приховування лінії цілі на графіку");
    if(!persistUserChange("Видимість цілі на графіку",()=>safeStorageSet(STATS_GOAL_VISIBLE_KEY,next?"1":"0",{critical:true}))){
      statsChartGoal.checked=statsGoalVisible;return;
    }
    statsGoalVisible=next;
    renderStatistics();
    logAction(next?"Лінію цілі на графіку показано.":"Лінію цілі на графіку приховано.");
  });
  window.addEventListener("resize",()=>{if(document.getElementById("archive")?.classList.contains("active"))renderStatistics();});


  showRegister?.addEventListener("click",()=>switchAuthMode("register"));
  showLogin?.addEventListener("click",()=>switchAuthMode("login"));
  showForgotPassword?.addEventListener("click",async()=>{
    const username=String(loginUsername?.value||"").trim();
    if(!username){setAuthMessage("Спочатку введіть логін акаунта, доступ до якого потрібно відновити.","error");loginUsername?.focus();return;}
    if(recoveryRequestUsername)recoveryRequestUsername.textContent=username;
    switchAuthMode("forgot");
    await loadPublicRecoveryContact();
  });
  forgotPasswordBack?.addEventListener("click",()=>switchAuthMode("login"));
  registerPassword?.addEventListener("input",renderPasswordStrength);

  loginForm?.addEventListener("submit",async event=>{
    event.preventDefault();const username=String(loginUsername?.value||"").trim(),password=String(loginPassword?.value||""),rememberMe=!!loginRemember?.checked;
    if(!username||!password){setAuthMessage("Введіть логін і пароль.","error");return;}
    loginSubmit.disabled=true;setAuthMessage("Вхід...","info");
    try{const session=await authApi("/auth/login",{method:"POST",body:{username,password,rememberMe},token:""});await completeAuthentication(session,rememberMe);}
    catch(error){setAuthMessage(error?.message||"Не вдалося увійти.","error");}
    finally{loginSubmit.disabled=false;}
  });

  registerForm?.addEventListener("submit",async event=>{
    event.preventDefault();const username=String(registerUsername?.value||"").trim(),password=String(registerPassword?.value||""),confirmation=String(registerPasswordConfirm?.value||""),rememberMe=!!registerRemember?.checked;
    if(username.length<3||username.length>32){setAuthMessage("Логін повинен містити від 3 до 32 символів.","error");return;}
    const passwordError=validateRegistrationPassword(password);if(passwordError){setAuthMessage(passwordError,"error");return;}
    if(password!==confirmation){setAuthMessage("Паролі не збігаються.","error");return;}
    registerSubmit.disabled=true;setAuthMessage("Створення акаунта...","info");
    try{
      const session=await authApi("/auth/register",{method:"POST",body:{username,password,rememberMe},token:""});
      await completeAuthentication(session,rememberMe);
    }
    catch(error){setAuthMessage(error?.message||"Не вдалося зареєструватися.","error");}
    finally{registerSubmit.disabled=false;}
  });

  forgotPasswordForm?.addEventListener("submit",async event=>{
    event.preventDefault();
    const username=String(loginUsername?.value||"").trim();
    if(!username){switchAuthMode("login");setAuthMessage("Спочатку введіть логін акаунта.","error");loginUsername?.focus();return;}
    forgotPasswordSubmit.disabled=true;setAuthMessage("Надсилання запиту...","info");
    try{
      const data=await authApi("/auth/recovery/request",{method:"POST",body:{username},token:""});
      setAuthMessage(data?.message||"Запит власнику сайту надіслано. Зв’яжіться з ним через Telegram або телефон.","success");
      await loadPublicRecoveryContact();
    }catch(error){setAuthMessage(error?.message||"Не вдалося надіслати запит на відновлення.","error");}
    finally{forgotPasswordSubmit.disabled=false;}
  });

  logoutAccount?.addEventListener("click",async()=>{
    const ok=confirm("Ви справді бажаєте покинути сайт та вийти з акаунта?");
    if(!ok){showButtonState(logoutAccount,"Скасовано","error");return;}
    logAction("Вихід: виконано вихід з акаунта.");
    showButtonState(logoutAccount,"Вихід...","error",0);
    try{await flushAuditQueue();}catch(_){}
    performLogout();
  });
  deleteAccountButton?.addEventListener("click",async()=>{
    if(!authUser){showButtonState(deleteAccountButton,"Немає акаунта","error");return;}
    if(authUser.is_owner){
      showButtonState(deleteAccountButton,"Недоступно","error",1500);
      alert("Головний адміністратор не може видалити свій акаунт, доки OWNER_USERNAME або OWNER_USER_ID вказує на нього.");
      return;
    }

    const username=String(authUser.username||"");
    const ok=confirm(
      `Ви справді бажаєте НАЗАВЖДИ видалити акаунт «${username}»?\n\n`+
      "Буде видалено сам акаунт, серверні сесії та історію входів. "+
      "Локальні дані цього акаунта на цьому пристрої також буде стерто. "+
      "Цю дію неможливо скасувати."
    );
    if(!ok){showButtonState(deleteAccountButton,"Скасовано","error");return;}

    const typed=prompt(`Для підтвердження введіть логін акаунта:\n${username}`);
    if(typed===null){showButtonState(deleteAccountButton,"Скасовано","error");return;}
    if(String(typed).trim()!==username){
      showButtonState(deleteAccountButton,"Логін не збігається","error");
      return;
    }

    deleteAccountButton.disabled=true;
    showButtonState(deleteAccountButton,"Видалення...","error",0);

    try{
      const deletingUserId=authUser.id;
      try{await flushAuditQueue();}catch(_){}
      await authApi("/auth/account",{method:"DELETE"});

      const prefix=`avicularia_testing_user_${String(deletingUserId)}_`;
      const removeKeys=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key&&key.startsWith(prefix))removeKeys.push(key);
      }
      removeKeys.forEach(key=>localStorage.removeItem(key));
      localStorage.removeItem(`avicularia_testing_legacy_migrated_v47_${deletingUserId}`);
      await clearAuditQueueForUser(deletingUserId);

      clearAuthSession();
      alert("Акаунт видалено.");
      window.location.reload();
    }catch(error){
      deleteAccountButton.disabled=false;
      showButtonState(deleteAccountButton,error?.status===0?"Немає мережі":"Помилка","error");
      alert(error?.message||"Не вдалося видалити акаунт.");
    }
  });
  adminRefresh?.addEventListener("click",()=>loadAdminUsers(true));
  adminOpenUsers?.addEventListener("click",()=>{showButtonState(adminOpenUsers,"Відкрито","success");setTimeout(()=>void openAdminUsersModal(),210);});
  adminTempPasswordCopy?.addEventListener("click",async()=>{
    const value=String(adminTempPasswordValue?.textContent||"").trim();
    if(!value||value==="—")return;
    if(await copyText(value))showButtonState(adminTempPasswordCopy,"Скопійовано","success",1000);
    else showButtonState(adminTempPasswordCopy,"Не скопійовано","error",1200);
  });
  adminTempPasswordClose?.addEventListener("click",()=>{showButtonState(adminTempPasswordClose,"Закрито","success",450);setTimeout(closeAdminTempPassword,180);});
  adminTempPasswordModal?.addEventListener("click",event=>{if(event.target===adminTempPasswordModal)closeAdminTempPassword();});
  adminUsersModalClose?.addEventListener("click",()=>{showButtonState(adminUsersModalClose,"Закрито","success");setTimeout(closeAdminUsersModal,260);});
  adminUsersModal?.addEventListener("click",event=>{if(event.target===adminUsersModal)closeAdminUsersModal();});
  adminOpenActionTypes?.addEventListener("click",openAdminActionTypes);
  adminActionTypesClose?.addEventListener("click",()=>{showButtonState(adminActionTypesClose,"Закрито","success");setTimeout(closeAdminActionTypes,260);});
  adminActionTypesModal?.addEventListener("click",event=>{if(event.target===adminActionTypesModal)closeAdminActionTypes();});
  adminFullStateSearch?.addEventListener("input",renderAdminStateSearch);
  adminLoginsClose?.addEventListener("click",()=>{
    showButtonState(adminLoginsClose,"Закрито","success");
    setTimeout(closeAdminLoginHistory,260);
  });
  adminLoginsModal?.addEventListener("click",event=>{if(event.target===adminLoginsModal)closeAdminLoginHistory();});
  adminFullClose?.addEventListener("click",()=>{
    showButtonState(adminFullClose,"Закрито","success");
    setTimeout(closeAdminFullInfo,260);
  });
  adminFullModal?.addEventListener("click",event=>{if(event.target===adminFullModal)closeAdminFullInfo();});

  // v83: зафіксований фон без position:fixed на body.
  // Модальні вікна — прямі нащадки body, тому фіксація body на iOS
  // зсувала ВСІ модалки вгору на попереднє window.scrollY.
  // Фіксуємо лише #main-app, залишаючи модалки прив’язаними до viewport.
  let modalLockedScrollY=0;
  let modalLockedScrollX=0;
  let modalPagePreviousStyles=null;
  const modalPage=document.getElementById("main-app");
  function syncModalScrollLock(){
    const activeModal=[...document.querySelectorAll(".product-modal.active")].some(modal=>getComputedStyle(modal).display!=="none");
    const locked=document.body.classList.contains("modal-scroll-locked");
    if(activeModal&&!locked){
      modalLockedScrollY=window.scrollY||window.pageYOffset||0;
      modalLockedScrollX=window.scrollX||window.pageXOffset||0;
      if(modalPage&&!modalPage.hidden){
        const rect=modalPage.getBoundingClientRect();
        modalPagePreviousStyles={
          top:modalPage.style.top,
          left:modalPage.style.left,
          width:modalPage.style.width
        };
        // Вимірюємо розміри ДО фіксації. Не міняємо масштаб і розкладку.
        modalPage.style.top=`${rect.top}px`;
        modalPage.style.left=`${rect.left}px`;
        modalPage.style.width=`${rect.width}px`;
        modalPage.classList.add("modal-page-locked");
      }
      document.documentElement.classList.add("modal-scroll-locked");
      document.body.classList.add("modal-scroll-locked");
    }else if(!activeModal&&locked){
      const restoreX=modalLockedScrollX;
      const restoreY=modalLockedScrollY;
      document.body.classList.remove("modal-scroll-locked");
      document.documentElement.classList.remove("modal-scroll-locked");
      if(modalPage){
        modalPage.classList.remove("modal-page-locked");
        if(modalPagePreviousStyles){
          modalPage.style.top=modalPagePreviousStyles.top;
          modalPage.style.left=modalPagePreviousStyles.left;
          modalPage.style.width=modalPagePreviousStyles.width;
        }
      }
      modalPagePreviousStyles=null;
      window.scrollTo(restoreX,restoreY);
    }else if(activeModal){
      document.documentElement.classList.add("modal-scroll-locked");
    }
  }

  window.addEventListener("online",()=>{recordSiteVisit();void flushAuditQueue();void syncStateNow({silent:true}).then(()=>ensureMissingArchiveDays());void refreshSystemStatus({checkWorker:true});});
  window.addEventListener("training:stats",()=>{breakdownAt=0;renderSystemStatus();});
  window.addEventListener("offline",()=>renderSystemStatus());
  window.addEventListener("pageshow",()=>{recordSiteVisit();void syncStateNow({silent:true}).then(()=>ensureMissingArchiveDays());});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){recordSiteVisit();void syncStateNow({silent:true}).then(()=>ensureMissingArchiveDays());}});
  window.addEventListener("storage",event=>{
    if(!authUser||!event.key)return;
    const coreKeys=new Set([PRODUCTS_KEY,CALCULATOR_KEY,ARCHIVE_KEY,CALCULATOR_DRAFT_KEY,SORT_KEY,RANDOM_SORT_SEED_KEY,CATEGORY_ORDER_KEY,CUSTOM_CATEGORIES_KEY,DELETED_DEFAULT_CATEGORIES_KEY,DEPARTMENTS_ENABLED_KEY,PROFILE_KEY,CALC_QUICK_PRESETS_KEY,DAILY_GOAL_KEY,STATS_TO_TODAY_KEY,SITE_DATA_VISIBLE_KEY,ARCHIVE_NOTE_KEY,ARCHIVE_NOTE_VISIBLE_KEY,STATS_GOAL_VISIBLE_KEY]);
    if(coreKeys.has(event.key))scheduleExternalReload();
    if([SYNC_DIRTY_KEY,SYNC_REVISION_KEY,SYNC_LAST_AT_KEY].includes(event.key))renderSystemStatus();
  });
  window.addEventListener("resize",scheduleTopTabFit);
  window.addEventListener("orientationchange",()=>setTimeout(scheduleTopTabFit,120));

  // v86: однакова верхня/нижня safe area для всіх модальних вікон.
  // Короткі діалоги залишаються по центру, довгі — під Dynamic Island.
  // Зміна active проходить до кадру рендерингу, тому немає стрибка вікна.
  const tallProductModalIds=new Set(["add-product-modal","edit-product-modal","delete-product-modal","product-order-modal"]);
  function syncModalLayout(modal){
    if(!modal.classList.contains("active"))return;
    const box=modal.querySelector(".product-modal-box");
    if(!box || !window.matchMedia("(max-width:768px)").matches)return;
    const css=getComputedStyle(modal);
    const available=modal.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
    if(available<=0)return;
    const overflowed=box.scrollHeight>box.clientHeight+2;
    const nearlyFull=box.clientHeight>=available*0.76;
    const tall=tallProductModalIds.has(modal.id)||overflowed||nearlyFull;
    modal.classList.toggle("modal-content-tall",tall);
  }
  // v104: stacking can open an earlier DOM dialog over a later one.
  // Activation order, not markup order, decides which modal is foreground.
  let modalOpenSequence=0;
  function syncModalStack(){
    const active=[...document.querySelectorAll(".product-modal.active")];
    active.sort((a,b)=>Number(a.dataset.modalOpenOrder||0)-Number(b.dataset.modalOpenOrder||0));
    const front=active[active.length-1]||null;
    for(const modal of document.querySelectorAll(".product-modal")){
      const visible=modal.classList.contains("active");
      const isFront=visible&&modal===front;
      modal.classList.toggle("modal-topmost",isFront);
      if(visible){
        modal.style.zIndex=String(10000+Number(modal.dataset.modalOpenOrder||0));
        modal.inert=!isFront;
        if(!isFront)modal.setAttribute("aria-hidden","true");
        else modal.removeAttribute("aria-hidden");
      }else{
        modal.inert=false;
        modal.style.removeProperty("z-index");
        modal.removeAttribute("aria-hidden");
      }
    }
  }
  const modalScrollObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      const modal=mutation.target;
      const wasActive=(mutation.oldValue||"").split(/\s+/).includes("active");
      const active=modal.classList.contains("active");
      if(active&&!wasActive){
        modal.dataset.modalOpenOrder=String(++modalOpenSequence);
        const box=modal.querySelector(".product-modal-box");
        if(box)box.scrollTop=0;
        // Internally scrolling panels should also open from their beginning.
        modal.querySelectorAll(".product-order-list,.admin-full-list,.admin-logins-list,.admin-recovery-list").forEach(panel=>panel.scrollTop=0);
        syncModalLayout(modal);
      }else if(!active&&wasActive){
        modal.classList.remove("modal-content-tall");
      }
    }
    syncModalStack();
    syncModalScrollLock();
  });
  const modalSizeObserver=typeof ResizeObserver==="function" ? new ResizeObserver(entries=>{
    for(const entry of entries){
      const modal=entry.target.closest(".product-modal");
      if(modal?.classList.contains("active"))syncModalLayout(modal);
    }
  }) : null;
  document.querySelectorAll(".product-modal").forEach(modal=>{
    modalScrollObserver.observe(modal,{attributes:true,attributeFilter:["class"],attributeOldValue:true});
    const box=modal.querySelector(".product-modal-box");
    if(box)modalSizeObserver?.observe(box);
  });
  window.addEventListener("resize",()=>document.querySelectorAll(".product-modal.active").forEach(syncModalLayout));
  syncModalStack();
  syncModalScrollLock();

  refreshSiteButton?.addEventListener("click",async()=>{
    showButtonState(refreshSiteButton,"Оновлення...","success",0);
    logAction("Оновлення: запущено перевірку актуальної версії сайту.");
    safeStorageSet(ACTIVE_TAB_KEY,"blocks");
    rememberLastPage("blocks");
    try{
      if("serviceWorker" in navigator){
        const previous=navigator.serviceWorker.controller;
        const registration=await navigator.serviceWorker.getRegistration();
        if(registration){
          await registration.update();
          // Wait briefly for the new worker to take control. Avoid reloading while
          // an older service worker still owns this document.
          if(previous&&registration.installing){
            await Promise.race([
              new Promise(resolve=>navigator.serviceWorker.addEventListener("controllerchange",resolve,{once:true})),
              new Promise(resolve=>setTimeout(resolve,2500))
            ]);
          }
        }
      }
      await fetch(`./index.html?refresh=${Date.now()}`,{cache:"no-store"}).catch(()=>{});
    }catch(error){
      console.warn("Refresh update check failed:",error);
    }
    window.location.reload();
  });

  undoLastAction?.addEventListener("click",applyUndoSnapshot);
  // Details are a read-only display; opening them does not choose between copies.
  const avSyncDetailsModal=$('system-sync-details-modal');
  const avSyncDetailsOpen=$('system-sync-details-open');
  const avSyncDetailsClose=$('system-sync-details-close');
  let avSyncDetailsClosing=false;
  avSyncDetailsOpen?.addEventListener('click',async()=>{
    if(!avSyncDetailsModal||avSyncDetailsModal.classList.contains('active'))return;
    clearSharedButtonState(avSyncDetailsClose);
    showButtonState(avSyncDetailsOpen,'Відкрито','success',350);
    avSyncDetailsModal.classList.add('active');
    document.body.classList.add('edit-modal-open');
    renderSystemStatus();
    avSyncDetailsClose?.focus({preventScroll:true});
    logAction('Відкрито деталі синхронізації та резервних копій');
    if(navigator.onLine&&authUser){
      try{await getRemoteSyncState();}catch(e){
        avSyncAudit={user:String(authUser.id),groups:null,checkedAt:0,reason:'Сервер недоступний'};
        renderAvSyncIndicators();
      }
    }
  });
  function closeAvSyncDetails(){
    if(avSyncDetailsClosing||!avSyncDetailsModal?.classList.contains('active'))return;
    avSyncDetailsClosing=true;
    showButtonState(avSyncDetailsClose,'Зрозуміло','success',0);
    setTimeout(()=>{
      avSyncDetailsModal.classList.remove('active');
      if(!document.querySelector('.product-modal.active'))document.body.classList.remove('edit-modal-open');
      avSyncDetailsClosing=false;
      avSyncDetailsOpen?.focus({preventScroll:true});
    },260);
  }
  avSyncDetailsClose?.addEventListener('click',closeAvSyncDetails);
  avSyncDetailsModal?.addEventListener('click',e=>{if(e.target===avSyncDetailsModal)closeAvSyncDetails();});
  let systemHelpClosing=false;
  systemHelpOpen?.addEventListener("click",()=>{
    if(systemHelpClosing || systemHelpModal?.classList.contains("active"))return;
    clearSharedButtonState(systemHelpClose);
    showButtonState(systemHelpOpen,"Відкрито","success",0);
    systemHelpModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    systemHelpClose?.focus({preventScroll:true});
    logAction("Відкрито загальні інструкції Avicularia");
  });
  function closeSystemHelp(){
    if(systemHelpClosing || !systemHelpModal?.classList.contains("active"))return;
    systemHelpClosing=true;
    logAction("Закрито загальні інструкції Avicularia");
    showButtonState(systemHelpClose,"Закрито","success",0);
    showButtonState(systemHelpOpen,"Закрито","success");
    // Positive state is shown briefly inside the dialog before closing.
    setTimeout(()=>{
      instructionPickerHide();
      systemHelpModal?.classList.remove("active");
      if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
      systemHelpClosing=false;
      systemHelpOpen?.focus({preventScroll:true});
    },340);
  }
  systemHelpClose?.addEventListener("click",closeSystemHelp);
  systemHelpModal?.addEventListener("click",event=>{if(event.target===systemHelpModal)closeSystemHelp();});
  // v173: Jump to one topic inside the single Instructions dialog.
  const instructionPickerModal=$('instruction-picker-modal');
  const instructionPickerOpen=$('instruction-picker-open');
  const instructionPickerClose=$('instruction-picker-close');
  const instructionGuideScroll=$('instruction-guide-scroll');
  let instructionPickerBusy=false;
  function instructionPickerHide(){
    instructionPickerModal?.classList.remove('active','modal-topmost');
    instructionPickerBusy=false;
    if(!document.querySelector('.product-modal.active'))document.body.classList.remove('edit-modal-open');
    instructionPickerOpen?.focus({preventScroll:true});
  }
  instructionPickerOpen?.addEventListener('click',()=>{
    if(!systemHelpModal?.classList.contains('active')||instructionPickerBusy||instructionPickerModal?.classList.contains('active'))return;
    instructionPickerBusy=true;
    logAction("Відкрито вибір потрібної інструкції");
    clearSharedButtonState(instructionPickerClose);
    showButtonState(instructionPickerOpen,'Відкрито','success',220);
    setTimeout(()=>{
      instructionPickerModal?.classList.add('active','modal-topmost');
      document.body.classList.add('edit-modal-open');
      instructionPickerBusy=false;
      instructionPickerModal?.querySelector('[data-instruction-target]')?.focus({preventScroll:true});
    },240);
  });
  instructionPickerClose?.addEventListener('click',()=>{
    if(instructionPickerBusy)return;
    instructionPickerBusy=true;
    logAction("Закрито вибір потрібної інструкції");
    showButtonState(instructionPickerClose,'Закрито','success',260);
    setTimeout(instructionPickerHide,290);
  });
  instructionPickerModal?.addEventListener('click',event=>{
    if(event.target===instructionPickerModal&&!instructionPickerBusy)instructionPickerClose?.click();
  });
  instructionPickerModal?.querySelectorAll('[data-instruction-target]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(instructionPickerBusy)return;
      const target=$(button.dataset.instructionTarget);
      if(!target||!instructionGuideScroll)return;
      instructionPickerBusy=true;
      showButtonState(button,'Відкрито','success',240);
      setTimeout(()=>{
        instructionPickerHide();
        // v175: leave an inset above the selected card so its top border and
        // highlight ring are fully visible inside the manual's scroll viewport.
        // Only the manual scrolls; the page underneath stays in place.
        const targetTop=target.getBoundingClientRect().top;
        const viewportTop=instructionGuideScroll.getBoundingClientRect().top;
        const inset=18;
        const scrollTop=instructionGuideScroll.scrollTop + targetTop - viewportTop - inset;
        const maxScroll=Math.max(0,instructionGuideScroll.scrollHeight-instructionGuideScroll.clientHeight);
        instructionGuideScroll.scrollTo({top:Math.max(0,Math.min(scrollTop,maxScroll)),behavior:'auto'});
        target.classList.add('instruction-topic-highlight');
        setTimeout(()=>target.classList.remove('instruction-topic-highlight'),1000);
        target.focus({preventScroll:true});
        logAction('Відкрито розділ інструкцій: '+target.getAttribute('aria-label'));
      },265);
    });
  });
  systemStatusRefresh?.addEventListener("click",async()=>{
    showButtonState(systemStatusRefresh,"Оновлення...","info",0);breakdownAt=0;scheduleStorageBreakdown(true);
    const results=await Promise.allSettled([refreshSystemStatus({checkWorker:true}),renderAviculariaSessions(false)]);
    const ok=results[1].status==="fulfilled"&&results[1].value===true;
    showButtonState(systemStatusRefresh,ok?"Оновлено":"Частково оновлено",ok?"success":"error");
  });
  syncCheckButton?.addEventListener('click',async()=>{
    if(syncCheckInProgress||syncInProgress){showButtonState(syncCheckButton,'Зачекайте','info');return;}
    if(!authUser||!authToken||!appInitialized){showButtonState(syncCheckButton,'Увійдіть','error');return;}
    if(!navigator.onLine){showButtonState(syncCheckButton,'Немає мережі','error');return;}
    syncCheckInProgress=true;
    logAction("Запущено перевірку синхронізації без змін даних.");
    syncCheckButton.disabled=true;
    showButtonState(syncCheckButton,'Перевірка...','info',0);
    try{
      await window.KBJVStorage.whenIdle();
      if(corruptLocalDataKeys.size)throw new Error('Пошкоджено локальні дані');
      // GET/read endpoints only. No upload, no conflict resolution, no revision writes.
      const userId=String(authUser.id);
      const status=await authApi('/sync/v2/status').catch(error=>{
        if(error?.status===404)return null;
        throw error;
      });
      if(String(authUser?.id)!==userId)throw new Error('Акаунт змінився');
      setMigrationButtonVisibility(status);
      await getRemoteSyncState();
      if(String(authUser?.id)!==userId)throw new Error('Акаунт змінився');
      syncLastCheckError="";
      renderSystemStatus();
      const audit=avSyncAudit?.user===userId?avSyncAudit:null;
      const equal=!!audit?.groups&&Object.values(audit.groups).every(Boolean);
      const revEqual=Number(localStorage.getItem(SYNC_REVISION_KEY)||0)===Number(remoteSyncOverview?.revision||0);
      const clean=localStorage.getItem(SYNC_DIRTY_KEY)!=='1'&&!syncConflict;
      showButtonState(syncCheckButton,equal&&revEqual&&clean?'Перевірено':
        localStorage.getItem(SYNC_DIRTY_KEY)==='1'?'Не синхронізовано':'Є відмінності',
        equal&&revEqual&&clean?'success':'error');
      logAction(equal&&revEqual&&clean?"Перевірка синхронізації: копії збігаються.":"Перевірка синхронізації: є непідтверджені або різні дані.");
    }catch(error){
      syncLastCheckError=syncExplainError(error);
      remoteSyncOverview=null;
      avSyncAudit={user:String(authUser?.id||''),groups:null,checkedAt:0,reason:syncLastCheckError};
      renderSystemStatus();
      showButtonState(syncCheckButton,localStorage.getItem(SYNC_DIRTY_KEY)==='1'?'Не синхронізовано':'Помилка перевірки','error');
      console.warn('Read-only sync check failed:',error);
      logAction('Перевірка синхронізації завершилася помилкою без зміни даних.');
    }finally{
      syncCheckInProgress=false;
      syncCheckButton.disabled=false;
    }
  });
  syncV2MigrationButton?.addEventListener('click',async()=>{
    if(!authUser||!navigator.onLine){showButtonState(syncV2MigrationButton,'Немає мережі','error');return;}
    if(!confirm('Експериментальна поштучна синхронізація КБЖВ.\n\nСпочатку експортуйте повний JSON і ZIP тренувань. Випробовуйте лише на тестовій D1. Почати перевірку міграції?')){
      showButtonState(syncV2MigrationButton,'Скасовано','error');return;
    }
    const secret=prompt('Підтвердіть, що резервні копії збережені: введіть ПЕРЕНЕСТИ');
    if(secret!=='ПЕРЕНЕСТИ'){showButtonState(syncV2MigrationButton,'Скасовано','error');return;}
    syncV2MigrationButton.disabled=true;
    showButtonState(syncV2MigrationButton,'Підготовка...','info',0);
    try{
      let status=await authApi('/sync/v2/status');
      if(status.active)throw new Error('Протокол v2 вже активовано.');
      if(status.migration_pending){
        if(!confirm('Виявлено незавершене перенесення. Скасувати ТІЛЬКИ тимчасові записи нового протоколу та повторити? Стара база залишиться.'))return;
        await authApi('/sync/v2/abort',{method:'POST',body:{epoch:status.epoch}});
      }
      // Reconcile old data and require exact local-v1 server match.
      if(!await syncStateNow({silent:false}))throw new Error('Спочатку усуньте розбіжності у старій синхронізації.');
      if(localStorage.getItem(SYNC_DIRTY_KEY)==='1')throw new Error('Залишилися несинхронізовані зміни.');
      const local=buildSyncSnapshot();
      const server=await getRemoteSyncState();
      if(syncFingerprint(local)!==syncFingerprint(server.snapshot))
        throw new Error('Локальні дані не тотожні серверним. Міграцію зупинено.');
      const fingerprint=syncFingerprint(local);
      const marker=localStorage.getItem(SYNC_LOCAL_UPDATED_KEY);
      const result=await window.AviculariaIncrementalSync.startMigration({
        api:authApi,userId:Number(authUser.id),legacyRevision:Number(server.revision||0),
        build:buildSyncSnapshot,validate:validateSyncSnapshotV91,
        localUnchanged:()=>fingerprint===syncFingerprint(buildSyncSnapshot())
          && marker===localStorage.getItem(SYNC_LOCAL_UPDATED_KEY)
      });
      if(!setSyncMeta(result.revision,result.updated_at,{status:'Синхронізовано v2'}))
        throw new Error('Сервер активував v2, але локальний маркер не збережено. Не закривайте сайт, експортуйте базу.');
      showButtonState(syncV2MigrationButton,'Перенесено','success');
      confirmedIncrementalMode=true;
      setTimeout(()=>{if(confirmedIncrementalMode)syncV2MigrationButton.hidden=true;},850);
      syncStatusMessage='Активна поштучна синхронізація v2';renderSystemStatus();
    }catch(error){
      syncStatusMessage=String(error?.message||'Помилка перенесення');
      renderSystemStatus();showButtonState(syncV2MigrationButton,'Не перенесено','error');
    }finally{syncV2MigrationButton.disabled=false;}
  });
  syncNowButton?.addEventListener("click",async()=>{
    if(syncInProgress||syncCheckInProgress){showButtonState(syncNowButton,"Зачекайте","info");return;}
    if(!authUser||!authToken||!appInitialized){showButtonState(syncNowButton,"Увійдіть","error");return;}
    syncNowButton.disabled=true;
    logAction("Запущено синхронізацію КБЖВ.");
    showButtonState(syncNowButton,"Синхронізація...","info",0);
    try{
      const ok=await syncStateNow();
      const pending=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
      const label=ok?"Синхронізовано":syncConflict?"Конфлікт даних":pending?"Не синхронізовано":"Помилка синхронізації";
      showButtonState(syncNowButton,label,ok?"success":"error");
      logAction(ok?"Синхронізація КБЖВ завершена.":"Синхронізація КБЖВ не завершена; дані не перезаписано примусово.");
    }finally{syncNowButton.disabled=false;}
  });
  syncUseServer?.addEventListener("click",async()=>{
    if(syncInProgress||syncCheckInProgress){showButtonState(syncUseServer,"Зачекайте","info");return;}
    if(!confirm("Замінити локальні дані цього пристрою актуальною версією із сервера?\n\nУсі локальні зміни, яких немає на сервері, буде втрачено. Перед підтвердженням збережіть повний JSON-експорт."))return;
    logAction("Користувач підтвердив отримання серверної копії.");
    const ok=await syncStateNow({preferServer:true});
    showButtonState(syncUseServer,ok?"Отримано":"Помилка",ok?"success":"error");
    logAction(ok?"Серверну копію застосовано на пристрої.":"Отримання серверної копії не завершилося.");
  });
  syncUseLocal?.addEventListener("click",async()=>{
    if(syncInProgress||syncCheckInProgress){showButtonState(syncUseLocal,"Зачекайте","info");return;}
    if(confirmedIncrementalMode){
      showButtonState(syncUseLocal,"Потрібна перевірка","error",2000);
      syncStatusMessage="Поштучна v2 не дозволяє примусовий перезапис конфліктних записів";
      if(systemSyncNote)systemSyncNote.textContent="Спочатку експортуйте локальні й серверні дані. Для v2 примусове перезаписування іншого пристрою заблоковано задля захисту записів.";
      renderSystemStatus();
      logAction("Примусовий перезапис v2 не виконано: захист від втрати даних.");
      return;
    }
    if(!confirm("Зберегти дані цього пристрою як основну серверну версію?\n\nНовіша версія з іншого пристрою буде замінена."))return;
    logAction("Користувач підтвердив збереження даних пристрою на сервері.");
    const ok=await syncStateNow({forceLocal:true});
    showButtonState(syncUseLocal,ok?"Збережено":"Помилка",ok?"success":"error");
    logAction(ok?"Дані пристрою записано на сервер.":"Запис даних пристрою на сервер не завершився.");
  });

  clearSiteButton?.addEventListener("click",()=>{
    const ok=confirm("Ви справді бажаєте повністю очистити сайт для поточного акаунта?\n\nБуде видалено блоки КБЖВ, калькулятор, архів, статистику, консоль, денну ціль та локальні налаштування. Акаунт залишиться авторизованим.");
    if(!ok){showButtonState(clearSiteButton,"Скасовано","error",1600);return;}
    const utilityDraftKey=`avicularia_testing_user_${String(authUser.id)}_utilities_draft_v101`;
    const keys=[PRODUCTS_KEY,CALCULATOR_KEY,ARCHIVE_KEY,ACTIVE_TAB_KEY,lastPageStorageKey(),filterDraftKey(),`avicularia_testing_training_${authUser?.id}_comments_hidden_v197`,`avicularia_testing_training_${authUser?.id}_comment_drafts_v197`,`avicularia_testing_user_${authUser?.id}_goal_settings_open_v197`,CALCULATOR_DRAFT_KEY,SORT_KEY,SORT_SCHEMA_KEY,RANDOM_SORT_SEED_KEY,CATEGORY_ORDER_KEY,CUSTOM_CATEGORIES_KEY,DELETED_DEFAULT_CATEGORIES_KEY,DEPARTMENTS_ENABLED_KEY,PROFILE_KEY,CALC_QUICK_PRESETS_KEY,CONSOLE_KEY,EXPORT_VERSION_KEY,DATABASE_UPDATED_KEY,EXPORT_FINGERPRINT_KEY,DAILY_GOAL_KEY,LAST_EXPORT_KEY,LAST_IMPORT_KEY,UNDO_KEY,STATS_TO_TODAY_KEY,SITE_DATA_VISIBLE_KEY,ARCHIVE_NOTE_KEY,ARCHIVE_NOTE_VISIBLE_KEY,STATS_GOAL_VISIBLE_KEY,utilityDraftKey,profileDraftKey()];
    // Local interface preference resets to ON after an explicit full-site clear.
    const quickScrollKey=quickScrollPreferenceKey();
    if(quickScrollKey)keys.push(quickScrollKey);
    // Full-site clear also restores the default LEFT position.
    const quickScrollPositionKey=quickScrollSideKey();
    if(quickScrollPositionKey)keys.push(quickScrollPositionKey);
    const quickScrollHeightStorageKey=quickScrollHeightKey();
    if(quickScrollHeightStorageKey)keys.push(quickScrollHeightStorageKey);
    if(quickScrollWidthKey())keys.push(quickScrollWidthKey());
    if(quickScrollSizeKey())keys.push(quickScrollSizeKey());
    beginStorageTransaction("Повне очищення сайту");
    keys.forEach(key=>safeStorageRemove(key));
    safeStorageSet(ACTIVE_TAB_KEY,"blocks",{critical:true});
    markLocalDataChanged();
    if(!finishStorageTransaction()){
      showButtonState(clearSiteButton,"Не очищено","error",1800);
      alert(`Не вдалося повністю очистити дані. ${storageLastError||"Перевірте доступ до сховища браузера."}`);
      reloadPrimaryStateFromStorage();
      return;
    }
    // Stop the utilities pagehide/beforeunload handlers from re-saving its deleted draft.
    window.dispatchEvent(new Event("utilities:forget"));
    queueAuditAction("Очищено локальні дані сайту для поточного акаунта.");
    try{sessionStorage.setItem("avicularia_testing_skip_login_log_once","1");}catch(_){}
    showButtonState(clearSiteButton,"Очищено","success",0);
    setTimeout(()=>window.location.reload(),450);
  });

  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    const openModals=[...document.querySelectorAll(".product-modal.active")];
    if(!openModals.length)return;
    e.preventDefault();
    // One Escape dismisses the topmost dialog; keeps stacked dialogs intact.
    const modal=openModals.reduce((top,item)=>!top||Number(item.dataset.modalOpenOrder||0)>Number(top.dataset.modalOpenOrder||0)?item:top,null);
    if(modal===adminTempPasswordModal)closeAdminTempPassword();
    else if(modal===importPreviewModal)closeImportPreview();
    else if(modal===avQuickModal)avCloseQuickModal();
    else {modal.classList.remove("active");if(modal===exportPreviewModal)pendingExport=null;}
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
    if(modal===productModal)selectedProduct=null;
    if(modal===editProductModal)editingProduct=null;
    if([archiveTextModal,archiveCommentModal,archiveCompositionModal].includes(modal))archiveEditingId=null;
  });
  productWeight?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();productCopy.click();}});
  [newProductName,newProductKcal,newProductProtein,newProductFat,newProductCarb,newProductSugar,newProductSalt,newProductFiber,...newProductQuickWeights].forEach(i=>i?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addProductSave.click();}}));
  [editProductName,editProductKcal,editProductProtein,editProductFat,editProductCarb,editProductSugar,editProductSalt,editProductFiber,...editProductQuickWeights].forEach(i=>i?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();editProductSave.click();}}));

  // Safe filter drafts: never include password fields, authentication or admin data.
  const filterDraftInputs=["search","archive-search"].map(id=>$(id)).filter(Boolean);
  const filterDraftKey=()=>authUser?.id?`avicularia_testing_user_${authUser.id}_filters_v197`:null;
  function restoreFilterDrafts(){
    try{
      const draft=JSON.parse(localStorage.getItem(filterDraftKey())||"{}");
      for(const field of filterDraftInputs){
        const value=draft?.[field.id];
        if(typeof value==="string"&&value.length<=500)field.value=value;
      }
    }catch(error){console.warn("Пошукові чернетки недоступні",error);}
  }
  function installFilterDrafts(){
    for(const field of filterDraftInputs){
      field.addEventListener("input",()=>{
        const key=filterDraftKey();if(!key)return;
        try{
          const values=Object.fromEntries(filterDraftInputs.map(node=>[node.id,node.value.slice(0,500)]));
          localStorage.setItem(key,JSON.stringify(values));
        }catch(error){console.warn("Не вдалося зберегти пошук",error);}
      });
    }
  }
  function initializeAuthenticatedApp(){
    if(appInitialized)return;appInitialized=true;
    departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)==="1"; // v241: restore saved per-user preference
    populateProductCategorySelects();
    currentSort=localStorage.getItem(SORT_KEY)||"categories";
    if(!localStorage.getItem(SORT_SCHEMA_KEY)){if(currentSort==="manual")currentSort="categories";safeStorageSet(SORT_KEY,currentSort,{critical:true});safeStorageSet(SORT_SCHEMA_KEY,"1",{critical:true});}
    if(!VALID_SORT_MODES.has(currentSort)){currentSort="categories";safeStorageSet(SORT_KEY,currentSort,{critical:true});}
    if(!departmentsEnabled&&currentSort==="categories")currentSort="initial";
    updateSortOptionState();
    statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
    statsGoalVisible=localStorage.getItem(STATS_GOAL_VISIBLE_KEY)!=="0";
    if(statsChartGoal)statsChartGoal.checked=statsGoalVisible;
    siteDataVisible=localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0";
    archiveNote=String(localStorage.getItem(ARCHIVE_NOTE_KEY)||"");
    archiveNoteVisible=localStorage.getItem(ARCHIVE_NOTE_VISIBLE_KEY)==="1";
    archiveNoteEditing=false;renderArchiveNote();
    try{dailyGoalSettingsOpen=localStorage.getItem(`avicularia_testing_user_${authUser?.id}_goal_settings_open_v197`)==="1";}catch(_){dailyGoalSettingsOpen=false;}
    products=loadArray(PRODUCTS_KEY).map((p,i)=>normalizeProduct(p,i));syncStatsToToday(false);calculatorItems=loadArray(CALCULATOR_KEY).map(normalizeCalculatorItem);archiveItems=loadArray(ARCHIVE_KEY);consoleItems=loadArray(CONSOLE_KEY).slice(-MAX_CONSOLE_ITEMS);trimLocalConsoleHistory();
    repairStoredCalculatorIds();
    const draft=localStorage.getItem(CALCULATOR_DRAFT_KEY);if(draft!==null&&calcInput)calcInput.value=draft;
    restoreFilterDrafts();installFilterDrafts();
    loadProfile();loadCalculatorQuickPresets();loadDailyGoal();
    // Перший запуск версійної синхронізації на старому пристрої: якщо локальні дані є,
    // не дозволяємо новішій серверній ревізії мовчки їх перезаписати.
    if(localStorage.getItem(SYNC_REVISION_KEY)===null&&localSnapshotHasData())safeStorageSet(SYNC_DIRTY_KEY,"1");
    syncStatusMessage=localStorage.getItem(SYNC_DIRTY_KEY)==="1"?"Є локальні зміни":(localStorage.getItem(SYNC_LAST_AT_KEY)?"Синхронізовано":"Ще не виконувалася");
    renderProducts();renderCalculatorLog();updateTotals();renderArchive();renderConsole();renderStatistics();updateSiteDataCounts();renderSystemStatus();void measureBrowserStorageQuota();void refreshSystemStatus({checkWorker:true});setInterval(()=>{if(trimLocalConsoleHistory())renderConsole();void pruneLocalAuditQueue();updateSiteDataCounts();void measureBrowserStorageQuota();renderSystemStatus();if(document.visibilityState==="visible")void syncStateNow({silent:true}).then(()=>ensureMissingArchiveDays());},60000);
    // Return to the user's last visible page instead of reopening Blocks automatically.
    activateAppPage(restoreLastPage(),{save:false,remember:false});
    if(sessionStorage.getItem("avicularia_testing_skip_login_log_once")==="1")sessionStorage.removeItem("avicularia_testing_skip_login_log_once");
  }

  bootstrapAuthentication();
});
