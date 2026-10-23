/* v113. Локальна чернетка зручностей за акаунтом; паролі ніколи не зберігаються. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const passwordLength = $("utility-password-length");
  if (!passwordLength) return;

  const flags = [
    {node: $("utility-chars-lower"), chars: "abcdefghijklmnopqrstuvwxyz"},
    {node: $("utility-chars-upper"), chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {node: $("utility-chars-digits"), chars: "0123456789"},
    {node: $("utility-chars-special"), chars: "!@#$%^&*()-_=+[]{};:,.?/"}
  ];
  const generateButton = $("utility-password-generate");
  const output = $("utility-password-result");
  const copyButton = $("utility-password-copy");
  const strengthFill = $("utility-strength-fill");
  const strengthLabel = $("utility-strength-label");
  const message = $("utility-password-message");
  const bodyWeight = $("utility-bodyweight");
  const liftWeight = $("utility-liftweight");
  const ratioResult = $("utility-ratio-result");
  const ratioNote = $("utility-ratio-note");
  const ratioCopy = $("utility-ratio-copy");
  const direction = $("utility-convert-direction");
  const convertCategory = $("utility-convert-category");
  const convertFrom = $("utility-convert-from");
  const convertTo = $("utility-convert-to");
  const convertSearch = $("utility-convert-search");
  const convertSearchResults = $("utility-convert-search-results");
  const convertInput = $("utility-convert-input");
  const convertResult = $("utility-convert-result");
  const convertNote = $("utility-convert-note");
  const convertCopy = $("utility-convert-copy");
  const convertMore = $("utility-convert-more");
  const clockDisplay = $("utility-clock-time");
  const clockDate = $("utility-clock-date");
  const clockZone = $("utility-clock-zone");
  const clockNote = $("utility-clock-note");
  let clockTimer = null;
  let clockActive = false;
  function record(type, details = {}) {
    // Надсилаємо лише визначену подію; пароль, довжина, символи та ваги тут відсутні.
    window.dispatchEvent(new CustomEvent("utilities:action", { detail: {type, ...details} }));
  }
  // Ті самі позитивні/негативні стани, що у КБЖВ Блоках, Калькуляторі та Архіві.
  // Основна логіка розташована в script.js: тут немає власної палітри та таймерів.
  function showUtilityButtonState(button, label, status) {
    window.kbjvButtonFeedback?.show(button, label, status);
  }
  function clearUtilityButtonState(button) {
    window.kbjvButtonFeedback?.clear(button);
  }

  function setMessage(value = "", error = false) {
    message.textContent = value;
    message.dataset.error = String(error);
  }

  function clearGenerated() {
    output.value = "";
    clearUtilityButtonState(copyButton);
    strengthFill.style.width = "0";
    strengthFill.removeAttribute("data-grade");
    strengthLabel.textContent = "Надійність: ще не розраховано";
    setMessage();
  }

  // Рівномірний вибір без модульного зміщення; Math.random() не використовується.
  function secureIndex(maxExclusive) {
    const bound = 4294967296;
    const cutoff = bound - (bound % maxExclusive);
    const random = new Uint32Array(1);
    do {
      crypto.getRandomValues(random);
    } while (random[0] >= cutoff);
    return random[0] % maxExclusive;
  }

  function generatePassword() {
    clearGenerated();
    clearUtilityButtonState(generateButton);
    const count = Number(passwordLength.value);
    if (!Number.isInteger(count) || count < 1 || count > 128) {
      setMessage("Вкажіть цілу довжину пароля від 1 до 128 символів.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    const groups = flags.filter(option => option.node.checked).map(option => option.chars);
    if (!groups.length) {
      setMessage("Виберіть хоча б один тип символів.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    if (count < groups.length) {
      setMessage(`Довжина повинна бути не меншою за ${groups.length}: по одному символу кожного вибраного типу.`, true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    if (!globalThis.crypto || typeof crypto.getRandomValues !== "function") {
      setMessage("Захищений генератор випадкових чисел недоступний у цьому браузері.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }

    try {
      const all = groups.join("");
      // Включаємо щонайменше один символ із кожної увімкненої групи.
      const result = groups.map(group => group[secureIndex(group.length)]);
      while (result.length < count) result.push(all[secureIndex(all.length)]);
      // Криптографічно рівномірне перемішування Фішера — Єйтса.
      for (let i = result.length - 1; i > 0; i--) {
        const j = secureIndex(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      output.value = result.join("");
      const approxBits = count * Math.log2(all.length);
      const grade = approxBits < 40 ? "weak" : approxBits < 60 ? "fair" : approxBits < 80 ? "good" : "strong";
      const captions = {weak: "Низька", fair: "Помірна", good: "Висока", strong: "Дуже висока"};
      const widths = {weak: 24, fair: 50, good: 75, strong: 100};
      strengthFill.dataset.grade = grade;
      strengthFill.style.width = `${widths[grade]}%`;
      strengthLabel.textContent = `Орієнтовна надійність: ${captions[grade]} (≈ ${approxBits.toFixed(1).replace(".", ",")} біт)`;
      setMessage("Оцінка враховує лише довжину та набір символів, а не перевірку витоків.");
      showUtilityButtonState(generateButton, "Згенеровано", "success");
      record("password_generated");
    } catch (_) {
      clearGenerated();
      setMessage("Не вдалося створити пароль. Спробуйте ще раз.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
    }
  }

  // У всіх розрахунках використовуємо десяткові раціональні числа BigInt,
  // щоб уникати похибок двійкових дробів (0.1, 0.45359237 тощо).
  function decimalValue(raw, allowNegative = false) {
    const value = String(raw).trim().replace(/\s/g, "").replace(",", ".");
    if (!(allowNegative ? /^-?\d{1,12}(?:\.\d{1,9})?$/ : /^\d{1,12}(?:\.\d{1,9})?$/).test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return {
      numerator: BigInt(whole + fraction),
      denominator: 10n ** BigInt(fraction.length)
    };
  }

  // Десяткове округлення half-up. Без небезпечного перетворення BigInt у Number.
  function renderFraction(num, den, places = 10) {
    const scale = 10n ** BigInt(places);
    if (den === 0n) throw new RangeError("Ділення на нуль");
    const negative = (num < 0n) !== (den < 0n);
    const positiveNum = num < 0n ? -num : num;
    const positiveDen = den < 0n ? -den : den;
    const rounded = (positiveNum * scale * 2n + positiveDen) / (2n * positiveDen);
    const integer = rounded / scale;
    const frac = (rounded % scale).toString().padStart(places, "0").replace(/0+$/, "");
    return (negative && rounded !== 0n ? "-" : "") + integer.toLocaleString("uk-UA") + (frac ? "," + frac : "");
  }

  function updateRatio() {
    const first = bodyWeight.value.trim();
    const second = liftWeight.value.trim();
    if (!first || !second) {
      ratioResult.textContent = "—";
      ratioNote.textContent = "Вкажіть обидві ваги";
      clearUtilityButtonState(ratioCopy);
      return;
    }
    const body = decimalValue(first);
    const lifted = decimalValue(second);
    if (!body || !lifted || body.numerator <= 0n || lifted.numerator <= 0n) {
      ratioResult.textContent = "—";
      ratioNote.textContent = "Введіть додатні числа (кома або крапка допустимі)";
      clearUtilityButtonState(ratioCopy);
      return;
    }
    ratioResult.textContent = renderFraction(lifted.numerator * body.denominator, body.numerator * lifted.denominator, 10) + "×";
    ratioNote.textContent = "Піднята вага ÷ власна вага; округлено до 10 знаків";
  }

  // Групи сумісних фізичних та цифрових одиниць. Масштаб до базової одиниці
  // зберігається десятковим дробом або точним раціональним числом (BigInt).
  // MB=1 000 000 байтів, MiB=1 048 576 байтів (SI та IEC не плутаються).
  const unit = (id, title, symbol, factor, aliases = "", shift = "0", mode = "linear", approx = false) =>
    ({id,title,symbol,factor,aliases,shift,mode,approx});
  const CATALOG = [
    {id:"mass",title:"Маса",units:[
      unit("lb","Фунти","lbs","0.45359237","паунди фунт pound pounds"),
      unit("kg","Кілограми","кг","1","кілограм kilogram kg"),
      unit("g","Грами","г","0.001","грам grams"),
      unit("mg","Міліграми","мг","0.000001","міліграм"),
      unit("mcg","Мікрограми","мкг","0.000000001","мікрограм"),
      unit("ton","Тонни метричні","т","1000","тонна tonne"),
      unit("oz","Унції","oz","0.028349523125","унція ounce"),
      unit("st","Стоуни","st","6.35029318","stone"),
      unit("ct","Карати","ct","0.0002","карат carat")
    ]},
    {id:"length",title:"Довжина та відстань",units:[
      unit("m","Метри","м","1","метр meter"),
      unit("km","Кілометри","км","1000","кілометр kilometer"),
      unit("mi","Милі","mi","1609.344","миля mile miles"),
      unit("cm","Сантиметри","см","0.01","сантиметр"),
      unit("mm","Міліметри","мм","0.001","міліметр"),
      unit("dm","Дециметри","дм","0.1","дециметр"),
      unit("um","Мікрометри","мкм","0.000001","мікрометр micron µm"),
      unit("nm","Нанометри","нм","0.000000001","нанометр"),
      unit("in","Дюйми","in","0.0254","дюйм inch inches"),
      unit("ft","Фути","ft","0.3048","фут foot feet"),
      unit("yd","Ярди","yd","0.9144","ярд yard"),
      unit("nmi","Морські милі","nmi","1852","морська миля nautical")
    ]},
    {id:"data",title:"Обсяг цифрових даних",units:[
      unit("B","Байти","B","8","байт byte bytes"),
      unit("kB","Кілобайти","kB","8000","кілобайт kilobyte"),
      unit("MB","Мегабайти","MB","8000000","мегабайт megabyte"),
      unit("GB","Гігабайти","GB","8000000000","гігабайт gigabyte"),
      unit("TB","Терабайти","TB","8000000000000","терабайт terabyte"),
      unit("PB","Петабайти","PB","8000000000000000","петабайт petabyte"),
      unit("bit","Біти","bit","1","біт bit bits"),
      unit("kbit","Кілобіти","kbit","1000","кілобіт"),
      unit("Mbit","Мегабіти","Mbit","1000000","мегабіт"),
      unit("Gbit","Гігабіти","Gbit","1000000000","гігабіт"),
      unit("KiB","Кібібайти (1024 B)","KiB","8192","кібібайт kibibyte"),
      unit("MiB","Мебібайти (1024 KiB)","MiB","8388608","мебібайт mebibyte"),
      unit("GiB","Гібібайти (1024 MiB)","GiB","8589934592","гібібайт gibibyte"),
      unit("TiB","Тебібайти (1024 GiB)","TiB","8796093022208","тебібайт tebibyte")
    ]},
    {id:"temp",title:"Температура",units:[
      unit("C","Градуси Цельсія","°C","1","цельсій цельсій celsius градуси","273.15"),
      unit("F","Градуси Фаренгейта","°F","5/9","фаренгейт fahrenheit","459.67"),
      unit("K","Кельвіни","K","1","кельвін kelvin"),
      unit("R","Градуси Ранкіна","°R","5/9","ранкін rankine")
    ]},
    {id:"area",title:"Площа",units:[
      unit("sqm","Квадратні метри","м²","1","метр квадратний"),
      unit("sqkm","Квадратні кілометри","км²","1000000","кілометр квадратний"),
      unit("sqcm","Квадратні сантиметри","см²","0.0001","сантиметр квадратний"),
      unit("sqmm","Квадратні міліметри","мм²","0.000001","міліметр квадратний"),
      unit("ha","Гектари","га","10000","гектар"),
      unit("a","Ари (сотки)","ар","100","ар сотка"),
      unit("sqft","Квадратні фути","ft²","0.09290304","фут квадратний"),
      unit("sqin","Квадратні дюйми","in²","0.00064516","дюйм квадратний"),
      unit("acre","Акри","ac","4046.8564224","акр"),
      unit("sqmi","Квадратні милі","mi²","2589988.110336","миля квадратна")
    ]},
    {id:"volume",title:"Об’єм",units:[
      unit("l","Літри","л","1","літр liter litre"),
      unit("ml","Мілілітри","мл","0.001","мілілітр"),
      unit("cl","Сантилітри","сл","0.01","сантилітр"),
      unit("m3","Кубічні метри","м³","1000","метр кубічний"),
      unit("cm3","Кубічні сантиметри","см³","0.001","сантиметр кубічний"),
      unit("galus","Галони США","gal (US)","3.785411784","галон gallon us"),
      unit("galuk","Галони британські","gal (UK)","4.54609","галон imperial uk"),
      unit("ptus","Пінти США","pt (US)","0.473176473","пінта pint us"),
      unit("floz","Рідкі унції США","fl oz","0.0295735295625","рідка унція fluid ounce"),
      unit("cup","Чашки США","cup","0.2365882365","чашка cup us"),
      unit("tbsp","Столові ложки США","tbsp","0.01478676478125","столова ложка tablespoon"),
      unit("tsp","Чайні ложки США","tsp","0.00492892159375","чайна ложка teaspoon")
    ]},
    {id:"speed",title:"Швидкість",units:[
      unit("kmh","Кілометри на годину","км/год","5/18","км год kmh kph"),
      unit("ms","Метри на секунду","м/с","1","метр секунда"),
      unit("mph","Милі на годину","mph","0.44704","миль миля година"),
      unit("kn","Вузли","kn","1852/3600","вузол knot"),
      unit("fts","Фути на секунду","ft/s","0.3048","фут секунда")
    ]},
    {id:"time",title:"Час і тривалість",units:[
      unit("s","Секунди","с","1","секунда seconds"),
      unit("min","Хвилини","хв","60","хвилина minute"),
      unit("h","Години","год","3600","година hour"),
      unit("d","Доби","д","86400","доба день day"),
      unit("wk","Тижні","тиж","604800","тиждень week"),
      unit("ms","Мілісекунди","мс","0.001","мілісекунда"),
      unit("us","Мікросекунди","мкс","0.000001","мікросекунда"),
      unit("ns","Наносекунди","нс","0.000000001","наносекунда"),
      unit("year","Роки (365 діб)","рік","31536000","рік year умовний")
    ]},
    {id:"pressure",title:"Тиск",units:[
      unit("Pa","Паскалі","Па","1","паскаль pascal"),
      unit("kPa","Кілопаскалі","кПа","1000","кілопаскаль"),
      unit("MPa","Мегапаскалі","МПа","1000000","мегапаскаль"),
      unit("bar","Бари","bar","100000","бар"),
      unit("mbar","Мілібари","mbar","100","мілібар"),
      unit("atm","Атмосфери","атм","101325","атмосфера standard"),
      unit("psi","Фунти на кв. дюйм","psi","6894.757293168","фунт дюйм"),
      unit("mmHg","Міліметри ртутного стовпа","мм рт. ст.","133.322387415","мм ртутного тиск mmhg")
    ]},
    {id:"energy",title:"Енергія та теплота",units:[
      unit("J","Джоулі","Дж","1","джоуль joule"),
      unit("kJ","Кілоджоулі","кДж","1000","кілоджоуль"),
      unit("MJ","Мегаджоулі","МДж","1000000","мегаджоуль"),
      unit("cal","Калорії (термохімічні)","cal","4.184","калорія calorie"),
      unit("kcal","Кілокалорії","ккал","4184","кілокалорія kcal харчові"),
      unit("Wh","Ват-години","Вт·год","3600","ват година"),
      unit("kWh","Кіловат-години","кВт·год","3600000","кіловат година"),
      unit("BTU","Британські теплові одиниці","BTU","1055.05585262","британська теплова", "0", "linear", true)
    ]},
    {id:"power",title:"Потужність",units:[
      unit("W","Вати","Вт","1","ват watt"),
      unit("kW","Кіловати","кВт","1000","кіловат"),
      unit("MW","Мегавати","МВт","1000000","мегават"),
      unit("hp","Кінські сили механічні","hp","745.69987158227022","horsepower mechanical", "0", "linear", true),
      unit("PS","Метричні кінські сили","PS","735.49875","кінська сила метрична пс ps")
    ]},
    {id:"frequency",title:"Частота",units:[
      unit("Hz","Герци","Гц","1","герц hertz"),
      unit("kHz","Кілогерци","кГц","1000","кілогерц"),
      unit("MHz","Мегагерци","МГц","1000000","мегагерц"),
      unit("GHz","Гігагерци","ГГц","1000000000","гігагерц"),
      unit("rpm","Обертів на хвилину","об/хв","1/60","оберти rpm")
    ]},
    {id:"angle",title:"Плоский кут",units:[
      unit("deg","Градуси","°","0.017453292519943295769236907684886","кут degree", "0", "linear", true),
      unit("rad","Радіани","rad","1","радіан radians"),
      unit("turn","Повні оберти","об","6.283185307179586476925286766559005","оберт turn", "0", "linear", true),
      unit("arcmin","Кутові мінути","′","0.00029088820866572159615394846141477","кутова мінута", "0", "linear", true),
      unit("arcsec","Кутові секунди","″","0.00000484813681109535993589914102358","кутова секунда", "0", "linear", true)
    ]},
    {id:"force",title:"Сила",units:[
      unit("N","Ньютони","Н","1","ньютон newton"),
      unit("kN","Кілоньютони","кН","1000","кілоньютон"),
      unit("dyn","Дини","dyn","0.00001","дина"),
      unit("kgf","Кілограм-сили","кгс","9.80665","кілограма сила"),
      unit("lbf","Фунт-сили","lbf","4.4482216152605","фунт сила pound force")
    ]},
    {id:"torque",title:"Крутний момент",units:[
      unit("Nm","Ньютон-метри","Н·м","1","ньютон метр крутний"),
      unit("kNm","Кілоньютон-метри","кН·м","1000","кілоньютон метр"),
      unit("lbft","Фунт-фути","lbf·ft","1.3558179483314004","фунт фут"),
      unit("kgfm","Кілограм-сила метри","кгс·м","9.80665","кілограм метр сила")
    ]},
    {id:"data-rate",title:"Швидкість передавання даних",units:[
      unit("bps","Біти за секунду","bit/s","1","біт секунда"),
      unit("kbps","Кілобіти за секунду","kbit/s","1000","кілобіт секунда"),
      unit("Mbps","Мегабіти за секунду","Mbit/s","1000000","мегабіт секунда"),
      unit("Gbps","Гігабіти за секунду","Gbit/s","1000000000","гігабіт секунда"),
      unit("Bs","Байти за секунду","B/s","8","байт секунда"),
      unit("MBs","Мегабайти за секунду","MB/s","8000000","мегабайт секунда"),
      unit("MiBs","Мебібайти за секунду","MiB/s","8388608","мебібайт секунда")
    ]},
    {id:"fuel",title:"Витрата пального / економічність",units:[
      unit("L100","Літри на 100 км","л/100 км","100","витрата пального літри 100", "0", "inverse"),
      unit("kmL","Кілометри на літр","км/л","1","кілометр літр економічність"),
      unit("mpgUS","Милі на галон США","mpg (US)","1.609344/3.785411784","миль галон mpg us"),
      unit("mpgUK","Милі на галон UK","mpg (UK)","1.609344/4.54609","миль галон imperial")
    ]},
    {id:"current",title:"Електричний струм",units:[
      unit("A","Ампери","А","1","ампер ampere"),
      unit("mA","Міліампери","мА","0.001","міліампер"),
      unit("uA","Мікроампери","мкА","0.000001","мікроампер"),
      unit("kA","Кілоампери","кА","1000","кілоампер")
    ]},
    {id:"voltage",title:"Напруга",units:[
      unit("V","Вольти","В","1","вольт voltage"),
      unit("mV","Мілівольти","мВ","0.001","мілівольт"),
      unit("kV","Кіловольти","кВ","1000","кіловольт")
    ]},
    {id:"resistance",title:"Електричний опір",units:[
      unit("ohm","Оми","Ω","1","ом ohm"),
      unit("kohm","Кілооми","кΩ","1000","кілоом"),
      unit("Mohm","Мегаоми","МΩ","1000000","мегаом")
    ]}
  ];

  const POPULAR = [
    ["mass","lb","kg"],["mass","kg","lb"],
    ["length","mi","km"],["length","km","mi"],
    ["temp","C","F"],["temp","F","C"],
    ["data","MB","B"],["data","B","MB"],
    ["length","km","m"],["length","m","km"],
    ["length","cm","mm"],["length","m","dm"],
    ["mass","g","kg"],["mass","kg","g"],
    ["speed","mph","kmh"],["speed","kmh","mph"],
    ["volume","l","ml"],["volume","ml","l"],
    ["area","ha","sqm"],["data","GB","MB"],
    ["data","MiB","B"],["time","h","min"],
    ["energy","kcal","kJ"],["fuel","L100","mpgUS"]
  ];
  const getCat = id => CATALOG.find(group => group.id === id);
  const getUnit = (catId, id) => getCat(catId)?.units.find(item => item.id === id);
  let lastConvertedValue = "";
  let lastConvertedUnit = "";
  let approximateConversion = false;
  function parseRational(raw) {
    const str = String(raw);
    if (str.includes("/")) {
      const [top,bottom] = str.split("/");
      return rationalDivide(parseRational(top), parseRational(bottom));
    }
    const matched = /^(-?)(\d+)(?:\.(\d+))?$/.exec(str);
    if (!matched) throw new RangeError("Некоректний коефіцієнт одиниці");
    const den = 10n ** BigInt((matched[3] || "").length);
    return {numerator: BigInt((matched[1] || "") + matched[2] + (matched[3] || "")), denominator:den};
  }
  function rationalMultiply(a,b) {return {numerator:a.numerator*b.numerator,denominator:a.denominator*b.denominator};}
  function rationalDivide(a,b) {
    if (b.numerator===0n) throw new RangeError("Ділення на нуль");
    let n=a.numerator*b.denominator, d=a.denominator*b.numerator;
    if(d<0n){n=-n;d=-d;}
    return {numerator:n,denominator:d};
  }
  function rationalAdd(a,b) {return {numerator:a.numerator*b.denominator+b.numerator*a.denominator,denominator:a.denominator*b.denominator};}
  function rationalSub(a,b) {return {numerator:a.numerator*b.denominator-b.numerator*a.denominator,denominator:a.denominator*b.denominator};}
  const rationalZero = {numerator:0n,denominator:1n};
  // Обчислення в точних раціональних числах (крім позначених наближених визначень).
  function convertRational(value,from,to) {
    const fromFactor=parseRational(from.factor),toFactor=parseRational(to.factor);
    let base;
    if(from.mode==="inverse") base=rationalDivide(fromFactor,value);
    else base=rationalMultiply(rationalAdd(value,parseRational(from.shift)),fromFactor);
    if(base.numerator<0n) throw new RangeError("Значення поза фізичним діапазоном");
    if(to.mode==="inverse")return rationalDivide(toFactor,base);
    return rationalSub(rationalDivide(base,toFactor),parseRational(to.shift));
  }
  function formatConverted(result) {
    // Для дуже дрібних результатів підвищуємо точність до 18 знаків.
    let display=renderFraction(result.numerator,result.denominator,12);
    if(display==="0"&&result.numerator!==0n) display=renderFraction(result.numerator,result.denominator,18);
    return display;
  }
  function currentUnitPair() {return {catId:convertCategory.value,from:getUnit(convertCategory.value,convertFrom.value),to:getUnit(convertCategory.value,convertTo.value)};}
  function populateUnitSelectors(catId,fromId,toId) {
    const group=getCat(catId)||CATALOG[0];
    const opts=group.units.map(item=>new Option(`${item.title} (${item.symbol})`,item.id));
    convertCategory.value=group.id;
    convertFrom.replaceChildren(...opts);
    convertTo.replaceChildren(...group.units.map(item=>new Option(`${item.title} (${item.symbol})`,item.id)));
    convertFrom.value=group.units.some(item=>item.id===fromId)?fromId:group.units[0].id;
    convertTo.value=group.units.some(item=>item.id===toId)?toId:(group.units[1]||group.units[0]).id;
    syncPopularChoice();
    updateConversion();
  }
  function syncPopularChoice() {
    const val=`${convertCategory.value}:${convertFrom.value}:${convertTo.value}`;
    direction.value=[...direction.options].some(item=>item.value===val)?val:"custom";
  }
  function selectPopular(value) {
    const [catId,from,to]=value.split(":");
    if(!getUnit(catId,from)||!getUnit(catId,to))return;
    populateUnitSelectors(catId,from,to);
  }
  function initConversion() {
    convertCategory.replaceChildren(...CATALOG.map(group=>new Option(group.title,group.id)));
    direction.replaceChildren(...POPULAR.map(([catId,fromId,toId])=>{
      const from=getUnit(catId,fromId),to=getUnit(catId,toId);
      return new Option(`${from.title} (${from.symbol}) → ${to.title.toLowerCase()} (${to.symbol})`,`${catId}:${fromId}:${toId}`);
    }),new Option("Власний напрям — виберіть одиниці нижче", "custom"));
    populateUnitSelectors("mass","lb","kg");
  }
  function normalizeSearch(text) {
    return String(text).toLocaleLowerCase("uk-UA").normalize("NFKD").replace(/[’'`]/g, "").replace(/[^\p{L}\p{N}°µΩ]+/gu, " ").trim();
  }
  function renderConverterSearchResults() {
    const search=normalizeSearch(convertSearch.value);
    convertSearchResults.replaceChildren();
    if(search.length<2){convertSearchResults.hidden=true;return;}
    const matches=[];
    for(const group of CATALOG) for(const item of group.units){
      if(normalizeSearch(`${item.title} ${item.symbol} ${item.aliases} ${item.id} ${group.title}`).includes(search)) matches.push({group,item});
    }
    for(const {group,item} of matches.slice(0,14)){
      const option=document.createElement("button");
      option.type="button";
      option.setAttribute("role","listitem");
      const label=document.createElement("span"),category=document.createElement("small");
      label.textContent=`${item.title} (${item.symbol})`;
      category.textContent=group.title;
      option.append(label,category);
      option.addEventListener("click",()=>{
        const from=convertCategory.value===group.id?convertFrom.value:null;
        const next=group.units.find(unitItem=>unitItem.id!==item.id)?.id||item.id;
        // Пошук вибирає вихідну одиницю. Результат шукаємо у правому списку.
        populateUnitSelectors(group.id,item.id,from&&from!==item.id?from:next);
        convertSearch.value="";
        convertSearchResults.hidden=true;
        convertSearchResults.replaceChildren();
        convertTo.focus({preventScroll:true});
      });
      convertSearchResults.append(option);
    }
    if(!matches.length){
      const empty=document.createElement("div");
      empty.className="utility-message";
      empty.textContent="Нічого не знайдено. Спробуйте іншу назву або скорочення";
      convertSearchResults.append(empty);
    }
    convertSearchResults.hidden=false;
  }

  function updateConversion() {
    const raw = convertInput.value.trim();
    lastConvertedValue="";lastConvertedUnit="";
    if(!raw){
      convertResult.textContent="—";
      convertNote.textContent="Введіть значення для конвертації";
      clearUtilityButtonState(convertCopy);
      return;
    }
    const {catId,from,to}=currentUnitPair();
    if(!from||!to){
      convertResult.textContent="—";convertNote.textContent="Оберіть одиниці одного типу";return;
    }
    const value=decimalValue(raw,catId==="temp");
    if(!value){
      convertResult.textContent="—";
      convertNote.textContent=catId==="temp"?"Введіть число (можна від’ємне), до 9 знаків після коми":"Введіть невід’ємне число (до 9 знаків після коми)";
      clearUtilityButtonState(convertCopy);
      return;
    }
    try {
      const result=convertRational(value,from,to);
      approximateConversion=!!(from.approx||to.approx);
      const formatted=formatConverted(result);
      lastConvertedValue=formatted.replace(/\s/g,"");
      lastConvertedUnit=to.symbol;
      convertResult.textContent=`${formatted} ${to.symbol}`;
      convertNote.textContent=approximateConversion?"Орієнтовно: коефіцієнт містить наближення.":"Розраховано за визначеннями одиниць; можливе округлення відображення.";
    } catch(error) {
      convertResult.textContent="—";
      convertNote.textContent=catId==="fuel"?"Нульова економічність або витрата тут не визначається.":"Значення поза допустимим діапазоном (наприклад, нижче 0 K).";
      clearUtilityButtonState(convertCopy);
    }
  }
  initConversion();
  direction.addEventListener("change",()=>{
    if(direction.value!=="custom"){
      selectPopular(direction.value);
      if(convertMore)convertMore.open=false;
    }else{
      if(convertMore)convertMore.open=true;
      convertCategory.focus({preventScroll:true});
    }
  });
  convertCategory.addEventListener("change",()=>populateUnitSelectors(convertCategory.value));
  convertFrom.addEventListener("change",()=>{syncPopularChoice();updateConversion();});
  convertTo.addEventListener("change",()=>{syncPopularChoice();updateConversion();});
  convertSearch.addEventListener("input",renderConverterSearchResults);
  convertSearch.addEventListener("keydown",event=>{
    if(event.key==="Escape"){convertSearch.value="";renderConverterSearchResults();}
    if(event.key==="Enter"&&!convertSearchResults.hidden){
      const first=convertSearchResults.querySelector("button");
      if(first){event.preventDefault();first.click();}
    }
  });

  generateButton.addEventListener("click", generatePassword);
  const resetPasswordPreview = () => { clearGenerated(); clearUtilityButtonState(generateButton); };
  passwordLength.addEventListener("input", resetPasswordPreview);
  passwordLength.addEventListener("change", () => record("password_settings_changed"));
  flags.forEach(flag => flag.node.addEventListener("change", () => {
    resetPasswordPreview();
    record("password_settings_changed");
  }));
  // Копіювання ініціюється виключно натисканням користувача.
  async function copyToClipboard(value) {
    let temporary = null;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(value); copied = true; }
        catch (_) { /* У Safari спробуємо резервне копіювання. */ }
      }
      if (!copied) {
        temporary = document.createElement("textarea");
        temporary.value = value;
        temporary.setAttribute("readonly", "");
        temporary.style.cssText = "position:fixed;left:-10000px;top:0;opacity:0";
        document.body.append(temporary);
        temporary.select();
        copied = document.execCommand("copy") === true;
      }
    } catch (_) {
      copied = false;
    } finally {
      temporary?.remove();
    }
    return copied;
  }
  // Кнопки копіювання завжди доступні, як «Очистити». За відсутності
  // готового результату показуємо коротку червону відповідь (1450 мс).
  function hasNothingToCopy(button, value) {
    if (typeof value === "string" && value.trim() && value.trim() !== "—") return false;
    showUtilityButtonState(button, "Немає що копіювати", "error");
    return true;
  }
  copyButton.addEventListener("click", async () => {
    if (hasNothingToCopy(copyButton, output.value)) return;
    const copied = await copyToClipboard(output.value);
    showUtilityButtonState(copyButton, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    setMessage(copied ? "Пароль скопійовано до буфера обміну." : "Копіювання недоступне. Виділіть пароль вручну.", !copied);
    record(copied ? "password_copied" : "password_copy_failed");
  });

  // Розрахунки оновлюються миттєво, але журналюємо ТІЛЬКИ
  // успішне копіювання результату — без введених користувачем ваг.
  bodyWeight.addEventListener("input", updateRatio);
  liftWeight.addEventListener("input", updateRatio);
  convertInput.addEventListener("input", updateConversion);

  ratioCopy.addEventListener("click", async () => {
    const value = ratioResult.textContent.replace(/×$/, "");
    if (hasNothingToCopy(ratioCopy, value)) return;
    const copied = await copyToClipboard(value);
    showUtilityButtonState(ratioCopy, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    record(copied ? "ratio_copied" : "ratio_copy_failed", copied ? {value} : {});
  });
  convertCopy.addEventListener("click", async () => {
    const value = lastConvertedValue;
    const resultUnit = lastConvertedUnit;
    if (hasNothingToCopy(convertCopy, value)) return;
    const copied = await copyToClipboard(value);
    showUtilityButtonState(convertCopy, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    record(copied ? "conversion_copied" : "conversion_copy_failed", copied ? {value,unit:resultUnit} : {});
  });

  // Час визначається тільки локальним годинником; Intl коректно враховує
  // літній/зимовий час і дату в обраному IANA часовому поясі.
  function clockFormat(zone, options) {
    return new Intl.DateTimeFormat("uk-UA", { ...options, ...(zone === "local" ? {} : { timeZone: zone }) });
  }
  function drawClock() {
    if (!clockDisplay || !clockDate) return;
    try {
      const now = new Date();
      const zone = clockZone?.value || "local";
      const parts = clockFormat(zone, {hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"}).formatToParts(now);
      const get = key => parts.find(part => part.type === key)?.value || "00";
      clockDisplay.textContent = `${get("hour")}:${get("minute")}:${get("second")}`;
      clockDate.textContent = clockFormat(zone, {day: "2-digit", month: "long", year: "numeric"}).format(now);
      clockDisplay.dateTime = now.toISOString();
      clockNote.textContent = zone === "local"
        ? "Місцевий час за налаштуваннями пристрою."
        : `Часовий пояс: ${clockZone.selectedOptions[0]?.textContent || zone}.`;
    } catch (_) {
      clockDisplay.textContent = "--:--:--";
      clockDate.textContent = "Час недоступний";
      clockNote.textContent = "Цей часовий пояс не підтримується вашим браузером";
    }
  }
  function scheduleClock() {
    clearTimeout(clockTimer);
    if (!clockActive) return;
    drawClock();
    // Перерахунок на межі наступної секунди, а не накопичення похибок setInterval.
    clockTimer = setTimeout(scheduleClock, 1000 - (Date.now() % 1000) + 12);
  }
  function stopClock() { clockActive = false; clearTimeout(clockTimer); clockTimer = null; }
  function startClock() { clockActive = true; scheduleClock(); }
  clockZone?.addEventListener("change", () => {
    drawClock();
    record("timezone_changed", {zone: clockZone.selectedOptions[0]?.textContent?.trim() || "Часовий пояс пристрою"});
  });
  document.addEventListener("visibilitychange", () => { if (clockActive && !document.hidden) scheduleClock(); });
  // Повний список IANA зон, якщо браузер підтримує цей стандарт (без збереження).
  try {
    const others = $("utility-clock-other-zones");
    const builtIn = new Set(Array.from(clockZone.options, option => option.value));
    for (const zone of (Intl.supportedValuesOf?.("timeZone") || [])) {
      if (builtIn.has(zone)) continue;
      others.appendChild(new Option(zone.replaceAll("_", " "), zone));
    }
    if (!others?.children.length) others?.remove();
  } catch (_) { /* У старіших браузерах доступні вибрані основні часові пояси. */ }
  window.addEventListener("utilities:open", startClock);

  // v99. Порівняння товарів за рівною кількістю. Числа раціональні,
  // тому 700 грн/кг і 200 грн/100 г не залежать від IEEE 754.
  const priceKind = $("utility-price-kind");
  const priceACost = $("utility-price-a-cost");
  const priceAQty = $("utility-price-a-qty");
  const priceAUnit = $("utility-price-a-unit");
  const priceBCost = $("utility-price-b-cost");
  const priceBQty = $("utility-price-b-qty");
  const priceBUnit = $("utility-price-b-unit");
  const priceRefQty = $("utility-price-ref-qty");
  const priceRefUnit = $("utility-price-ref-unit");
  const priceWinner = $("utility-price-winner");
  const priceAResult = $("utility-price-a-result");
  const priceBResult = $("utility-price-b-result");
  const priceNote = $("utility-price-note");
  const priceCopy = $("utility-price-copy");
  let priceClipboard = "";
  const PRICE_GROUPS = {
    mass: {units:[["g","г","1"],["kg","кг","1000"],["mg","мг","0.001"],["t","т","1000000"]],defaults:["kg","g","g","100"]},
    volume: {units:[["ml","мл","1"],["l","л","1000"],["cl","сл","10"]],defaults:["l","ml","ml","100"]},
    count: {units:[["pcs","шт.","1"],["dozen","десятків","10"]],defaults:["pcs","pcs","pcs","1"]},
    length: {units:[["m","м","1"],["cm","см","0.01"],["km","км","1000"]],defaults:["m","m","m","1"]},
    area: {units:[["sqm","м²","1"],["sqcm","см²","0.0001"]],defaults:["sqm","sqm","sqm","1"]}
  };
  function selectPriceGroup() {
    const group=PRICE_GROUPS[priceKind.value]||PRICE_GROUPS.mass;
    const selects=[priceAUnit,priceBUnit,priceRefUnit];
    selects.forEach((select,index)=>{
      select.replaceChildren(...group.units.map(unit=>new Option(unit[1],unit[0])));
      select.value=group.defaults[index];
    });
    priceRefQty.value=group.defaults[3];
    updatePriceComparison();
  }
  function priceUnitFactor(unitId) {
    const unit=PRICE_GROUPS[priceKind.value]?.units.find(item=>item[0]===unitId);
    return unit?parseRational(unit[2]):null;
  }
  function rationalCompare(a,b) {
    const delta=a.numerator*b.denominator-b.numerator*a.denominator;
    return delta<0n?-1:delta>0n?1:0;
  }
  function pricePerReference(cost,quantity,unitId,refQuantity,refUnitId) {
    return rationalDivide(
      rationalMultiply(rationalMultiply(cost,refQuantity),priceUnitFactor(refUnitId)),
      rationalMultiply(quantity,priceUnitFactor(unitId))
    );
  }
  function priceAmountDisplay(value) {
    const str=renderFraction(value.numerator,value.denominator,2);
    if(value.numerator!==0n&&str.replace(/\s/g,"")==="0")return "< 0,01";
    return str;
  }
  function updatePriceComparison() {
    priceClipboard="";
    clearUtilityButtonState(priceCopy);
    priceWinner.textContent="—";
    priceAResult.textContent="—";
    priceBResult.textContent="—";
    const raw=[priceACost,priceAQty,priceBCost,priceBQty,priceRefQty].map(el=>el.value.trim());
    if(raw.some(item=>!item)){
      priceNote.textContent="Вкажіть ціну та кількість для обох варіантів";
      return;
    }
    const [costA,qtyA,costB,qtyB,refQty]=raw.map(item=>decimalValue(item));
    if([costA,qtyA,costB,qtyB,refQty].some(item=>!item)||qtyA.numerator<=0n||qtyB.numerator<=0n||refQty.numerator<=0n){
      priceNote.textContent="Введіть коректні числа: ціни від 0, кількості більше 0";
      return;
    }
    try {
      const first=pricePerReference(costA,qtyA,priceAUnit.value,refQty,priceRefUnit.value);
      const second=pricePerReference(costB,qtyB,priceBUnit.value,refQty,priceRefUnit.value);
      const unit=priceRefUnit.selectedOptions[0].textContent;
      const per=`за ${priceRefQty.value.replace(".",",")} ${unit}`;
      const firstText=`${priceAmountDisplay(first)} грн`;
      const secondText=`${priceAmountDisplay(second)} грн`;
      priceAResult.textContent=firstText;
      priceBResult.textContent=secondText;
      const order=rationalCompare(first,second);
      let winner;
      if(order===0)winner="Однакова ціна";
      else {
        const lower=order<0?first:second, higher=order<0?second:first;
        const percent=rationalMultiply(rationalDivide(rationalSub(higher,lower),higher),parseRational("100"));
        winner=`Вигідніший варіант ${order<0?1:2} (дешевше на ${renderFraction(percent.numerator,percent.denominator,2)}%)`;
      }
      priceWinner.textContent=winner;
      priceNote.textContent=`Обидві ціни приведено до однакової кількості: ${per}.`;
      priceClipboard=`${per}: варіант 1 — ${firstText}; варіант 2 — ${secondText}. ${winner}.`;
    }catch(_){priceNote.textContent="Не вдалося виконати розрахунок. Перевірте кількості";}
  }
  if(priceKind){
    priceKind.addEventListener("change",selectPriceGroup);
    [priceACost,priceAQty,priceBCost,priceBQty,priceRefQty].forEach(input=>input.addEventListener("input",updatePriceComparison));
    [priceAUnit,priceBUnit,priceRefUnit].forEach(select=>select.addEventListener("change",updatePriceComparison));
    selectPriceGroup();
    priceCopy.addEventListener("click",async()=>{
      if(hasNothingToCopy(priceCopy,priceClipboard))return;
      const copied=await copyToClipboard(priceClipboard);
      showUtilityButtonState(priceCopy,copied?"Скопійовано":"Не скопійовано",copied?"success":"error");
      record(copied?"price_comparison_copied":"copy_failed");
    });
  }

  // Календарна різниця за григоріанським календарем, точність до секунди.
  // Використовуємо UTC, тобто календарна доба завжди 24 год без DST.
  const dateStart=$("utility-date-start"),dateEnd=$("utility-date-end");
  const dateStartTime=$("utility-date-start-time"),dateEndTime=$("utility-date-end-time");
  const dateResult=$("utility-date-result"),dateTotals=$("utility-date-totals");
  const dateNote=$("utility-date-note"),dateCopy=$("utility-date-copy");
  let dateClipboard="";
  function parseCalendarDate(dateRaw,timeRaw) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw))return null;
    const [year,month,day]=dateRaw.split("-").map(Number);
    if(year<100||year>9999||month<1||month>12||day<1||day>31)return null;
    const time=/^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeRaw||"00:00:00");
    if(!time)return null;
    const [,h,m,s]=time;
    const hour=Number(h),minute=Number(m),second=Number(s||0);
    if(hour>23||minute>59||second>59)return null;
    const date=new Date(0);
    date.setUTCFullYear(year,month-1,day);
    date.setUTCHours(hour,minute,second,0);
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
    return date;
  }
  function calendarMonthsAfter(start,months) {
    const date=new Date(0);
    date.setUTCFullYear(start.getUTCFullYear(),start.getUTCMonth()+months,1);
    const finalDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
    date.setUTCDate(Math.min(start.getUTCDate(),finalDay));
    date.setUTCHours(start.getUTCHours(),start.getUTCMinutes(),start.getUTCSeconds(),0);
    return date;
  }
  function timeTotalLine(label,value){
    const element=document.createElement("div");
    element.append(document.createTextNode(`${label}: `));
    const number=document.createElement("b");
    number.textContent=Number(value).toLocaleString("uk-UA");
    element.append(number);
    return element;
  }
  function updateDatePickerLabels(){
    for(const input of [dateStart,dateEnd,dateStartTime,dateEndTime]){
      if(!input)continue;
      const output=$(input.id+"-display");
      if(!output)continue;
      if(input.type==="date"){
        output.textContent=/^\d{4}-\d{2}-\d{2}$/.test(input.value)
          ? input.value.split("-").reverse().join("."):"Оберіть дату";
      }else{
        output.textContent=input.value ? input.value : "Оберіть час";
      }
    }
  }
  function updateDateDifference() {
    updateDatePickerLabels();
    dateClipboard="";
    clearUtilityButtonState(dateCopy);
    dateResult.textContent="—";
    dateTotals.replaceChildren();
    if(!dateStart.value||!dateEnd.value){
      dateNote.textContent="Вкажіть обидві дати. Без часу використовується 00:00:00";
      return;
    }
    const a=parseCalendarDate(dateStart.value,dateStartTime.value);
    const b=parseCalendarDate(dateEnd.value,dateEndTime.value);
    if(!a||!b){dateNote.textContent="Перевірте коректність дат і часу";return;}
    const [earlier,later]=a.getTime()<=b.getTime()?[a,b]:[b,a];
    const totalSeconds=Math.round((later.getTime()-earlier.getTime())/1000);
    let years=later.getUTCFullYear()-earlier.getUTCFullYear();
    if(calendarMonthsAfter(earlier,years*12)>later)years--;
    let months=(later.getUTCFullYear()-earlier.getUTCFullYear())*12+later.getUTCMonth()-earlier.getUTCMonth()-years*12;
    if(calendarMonthsAfter(earlier,years*12+months)>later)months--;
    const baseline=calendarMonthsAfter(earlier,years*12+months);
    let remainder=Math.round((later.getTime()-baseline.getTime())/1000);
    const days=Math.floor(remainder/86400);remainder%=86400;
    const hours=Math.floor(remainder/3600);remainder%=3600;
    const minutes=Math.floor(remainder/60);const seconds=remainder%60;
    const human=`${years} р., ${months} міс., ${days} дн., ${hours} год, ${minutes} хв, ${seconds} с`;
    dateResult.textContent=human;
    const totalDays=Math.floor(totalSeconds/86400);
    dateTotals.append(
      timeTotalLine("Повних діб",totalDays),
      timeTotalLine("Усього годин",Math.floor(totalSeconds/3600)),
      timeTotalLine("Усього хвилин",Math.floor(totalSeconds/60)),
      timeTotalLine("Усього секунд",totalSeconds)
    );
    dateNote.textContent="Календарна різниця без урахування часових поясів: 1 доба = 24 години. Порядок дат неважливий";
    dateClipboard=`Між датами: ${human}. Повних діб: ${totalDays}; годин: ${Math.floor(totalSeconds/3600)}; хвилин: ${Math.floor(totalSeconds/60)}; секунд: ${totalSeconds}.`;
    }
  if(dateStart){
    [dateStart,dateEnd,dateStartTime,dateEndTime].forEach(input=>{
      input.addEventListener("input",updateDateDifference);
      input.addEventListener("change",updateDateDifference);
    });
    updateDateDifference();
    dateCopy.addEventListener("click",async()=>{
      if(hasNothingToCopy(dateCopy,dateClipboard))return;
      const copied=await copyToClipboard(dateClipboard);
      showUtilityButtonState(dateCopy,copied?"Скопійовано":"Не скопійовано",copied?"success":"error");
      record(copied?"date_difference_copied":"copy_failed");
    });
  }

  // v100. Сирий продукт -> готовий: раціональні дроби без похибок IEEE 754.
  // Розрахунок не враховує зміну макросів у процесі теплової обробки.
  const cookedRaw=$("utility-cooked-raw-weight"),cookedReady=$("utility-cooked-ready-weight");
  const cookedPer100=$("utility-cooked-per100"),cookedPer100Macros=$("utility-cooked-per100-macros");
  const cookedNote=$("utility-cooked-note"),cookedPortion=$("utility-cooked-portion");
  const cookedTarget=$("utility-cooked-target"),cookedPortionResult=$("utility-cooked-portion-result");
  const cookedPortionMacros=$("utility-cooked-portion-macros");
  const cookedTargetResult=$("utility-cooked-target-result"),cookedTargetNote=$("utility-cooked-target-note");
  const cookedCopy=$("utility-cooked-copy"),cookedAdd=$("utility-cooked-add");
  const COOKED_NUTRIENTS=[
    ["kcal","Калорії","ккал"],["protein","Білки","г"],["fat","Жири","г"],
    ["carb","Вуглеводи","г"],["sugar","Цукри","г"],["salt","Сіль","г"],["fiber","Клітковина","г"]
  ];
  const cookedNutrientInputs=COOKED_NUTRIENTS.map(([key,label,unit])=>({key,label,unit,node:$("utility-cooked-"+key)}));
  let cookedClipboard="";
  function cookedFractionDisplay(val,places=3){return renderFraction(val.numerator,val.denominator,places);}
  function nutrientRows(container,values,places=3){
    container.replaceChildren();
    for(const nutrient of cookedNutrientInputs){
      const row=document.createElement("div");
      const value=document.createElement("b");
      const computed=values.get(nutrient.key);
      value.textContent=computed?`${cookedFractionDisplay(computed,places)} ${nutrient.unit}`:"немає даних";
      row.append(document.createTextNode(`${nutrient.label}: `),value);
      container.append(row);
    }
  }
  function cookedNutrientValues(multiplier,nutrients){
    const result=new Map();
    for(const [key,n] of nutrients.entries()) if(n!==null)result.set(key,rationalMultiply(n,multiplier));
    return result;
  }
  function updateCookedNutrition(){
    if(!cookedRaw)return;
    cookedClipboard="";
    clearUtilityButtonState(cookedCopy);
    clearUtilityButtonState(cookedAdd);
    cookedPer100.textContent="—";
    cookedPortionResult.textContent="—";
    cookedTargetResult.textContent="—";
    cookedTargetNote.textContent="Введіть бажану калорійність";
    cookedPer100Macros.replaceChildren();
    cookedPortionMacros.replaceChildren();
    const rawText=cookedRaw.value.trim(),readyText=cookedReady.value.trim();
    if(!rawText||!readyText){cookedNote.textContent="Вкажіть вагу сирого й готового продукту без посуду";return;}
    const raw=decimalValue(rawText),ready=decimalValue(readyText);
    if(!raw||!ready||raw.numerator<=0n||ready.numerator<=0n){
      cookedNote.textContent="Вага повинна бути додатним числом (кома або крапка)";return;
    }
    const nutrients=new Map();
    for(const {key,node} of cookedNutrientInputs){
      if(!node.value.trim()){nutrients.set(key,null);continue;}
      const val=decimalValue(node.value.trim());
      if(!val){cookedNote.textContent="Некоректні дані КБЖВ. Введіть невід’ємні числа";return;}
      nutrients.set(key,val);
    }
    const sourceToCooked100=rationalDivide(raw,ready); // (N на 100 г сирого) × (сирі г / готові г)
    const readyValues=cookedNutrientValues(sourceToCooked100,nutrients);
    const kcal100=readyValues.get("kcal");
    cookedPer100.textContent=kcal100?`${cookedFractionDisplay(kcal100,3)} ккал`:"Калорійність не вказана";
    nutrientRows(cookedPer100Macros,readyValues);
    const cookedFactor=rationalDivide(ready,raw);
    cookedNote.textContent=`Коефіцієнт зміни маси: ${cookedFractionDisplay(cookedFactor,5)}×. Дані перераховано на 100 г готового продукту.`;
    const log=[`Сирого: ${rawText.replace(".",",")} г; готового: ${readyText.replace(".",",")} г.`,
      `На 100 г готового: ${cookedNutrientInputs.map(({key,label,unit})=>`${label} — ${readyValues.has(key)?cookedFractionDisplay(readyValues.get(key),3)+" "+unit:"немає даних"}`).join("; ")}.`];
    const portionText=cookedPortion.value.trim();
    if(portionText){
      const portion=decimalValue(portionText);
      if(!portion||portion.numerator<=0n||rationalCompare(portion,ready)>0){
        cookedPortionResult.textContent="Перевірте вагу порції (не більше всієї страви)";
      }else{
        const factor=rationalDivide(portion,parseRational("100"));
        const values=cookedNutrientValues(factor,readyValues);
        cookedPortionResult.textContent=values.has("kcal")?`${cookedFractionDisplay(values.get("kcal"),3)} ккал`:"Калорійність не вказана";
        nutrientRows(cookedPortionMacros,values);
        log.push(`Порція ${portionText.replace(".",",")} г: ${cookedNutrientInputs.map(({key,label,unit})=>`${label} — ${values.has(key)?cookedFractionDisplay(values.get(key),3)+" "+unit:"немає даних"}`).join("; ")}.`);
      }
    }
    const targetText=cookedTarget.value.trim();
    if(targetText){
      const target=decimalValue(targetText);
      if(!target||target.numerator<=0n){cookedTargetNote.textContent="Введіть додатну калорійність";}
      else if(!kcal100||kcal100.numerator===0n){cookedTargetNote.textContent="Спочатку вкажіть калорійність сирого продукту більше нуля";}
      else {
        const portion=rationalDivide(rationalMultiply(target,parseRational("100")),kcal100);
        const exceeds=rationalCompare(portion,ready)>0;
        cookedTargetResult.textContent=`${cookedFractionDisplay(portion,3)} г`;
        cookedTargetNote.textContent=exceeds?"Потрібно більше готового продукту, ніж є в цій партії.":"Маса готової порції для заданої калорійності.";
        log.push(`Для ${targetText.replace(".",",")} ккал потрібно ${cookedFractionDisplay(portion,3)} г готового продукту${exceeds?" (більше за наявну кількість)":""}.`);
      }
    }
    cookedClipboard=log.join(" ");
    }
  // Тільки явний результат передається калькулятору через подію: чернетка
  // «Зручностей» не експортується, не імпортується і не потрапляє до D1.
  function makeCookedCalculatorEntry(){
    const raw=decimalValue(cookedRaw.value),ready=decimalValue(cookedReady.value);
    if(!raw||!ready||raw.numerator<=0n||ready.numerator<=0n)
      return {error:"Вкажіть правильну вагу"};

    const nutrients=new Map();
    for(const {key,node} of cookedNutrientInputs){
      const value=String(node.value||"").trim();
      if(!value){nutrients.set(key,null);continue;}
      const parsed=decimalValue(value);
      if(!parsed)return {error:"Некоректне КБЖВ"};
      nutrients.set(key,parsed);
    }
    if(![...nutrients.values()].some(value=>value!==null))
      return {error:"Вкажіть КБЖВ"};

    let portion,source;
    if(cookedPortion.value.trim()){
      portion=decimalValue(cookedPortion.value);
      source="порція";
    }else if(cookedTarget.value.trim()){
      const target=decimalValue(cookedTarget.value);
      const kcal=nutrients.get("kcal");
      if(!target||target.numerator<=0n||!kcal||kcal.numerator<=0n)
        return {error:"Некоректна калорійність"};
      // порція = цільові ккал × 100 × маса готового / (ккал сирого × маса сирого)
      portion=rationalDivide(rationalMultiply(rationalMultiply(target,parseRational("100")),ready),rationalMultiply(kcal,raw));
      source="цільова калорійність";
    }else{
      const hundred=parseRational("100");
      portion=rationalCompare(ready,hundred)<0?ready:hundred;
      source="100 г або вся партія";
    }
    if(!portion||portion.numerator<=0n||rationalCompare(portion,ready)>0)
      return {error:"Перевірте вагу порції"};

    const factor=rationalDivide(rationalMultiply(raw,portion),rationalMultiply(ready,parseRational("100")));
    const labels={kcal:"ккал",protein:"білка",fat:"жирів",carb:"вуглеводів",sugar:"цукрів",salt:"солі",fiber:"клітковини"};
    const fields={};
    const parts=[];
    const toDecimal=value=>cookedFractionDisplay(value,3).replace(/[\s\u00a0\u202f]/g,"").replace(",",".");
    for(const {key} of cookedNutrientInputs){
      const input=nutrients.get(key);
      if(input===null){fields[key]=0;parts.push(`${labels[key]} — немає даних`);continue;}
      const calculated=rationalMultiply(input,factor);
      const number=Number(toDecimal(calculated));
      if(!Number.isFinite(number)||number<0||number>1e12)
        return {error:"Завелике значення"};
      fields[key]=number;
      parts.push(`${cookedFractionDisplay(calculated,3)} ${labels[key]}`);
    }
    const weight=Number(toDecimal(portion));
    if(!Number.isFinite(weight)||weight<=0||weight>1e12)
      return {error:"Некоректна порція"};
    const chosen=selectedProductName?.textContent?.match(/Вибрано «([^»]+)»/);
    const name=(chosen?chosen[1]:"Готовий продукт").replace(/\s+/g," ").trim().slice(0,150);
    const weightText=cookedFractionDisplay(portion,3);
    return {item:{name,weight,...fields,
      text:`${name}, для ${weightText} грам — ${parts.join(", ")}`},source};
  }

  if(cookedAdd)cookedAdd.addEventListener("click",()=>{
    const prepared=makeCookedCalculatorEntry();
    if(prepared.error){
      showUtilityButtonState(cookedAdd,prepared.error,"error");
      return;
    }
    let response=null;
    try{
      window.dispatchEvent(new CustomEvent("utilities:add-to-calculator",{
        detail:{item:prepared.item,source:prepared.source,
          respond:result=>{response=result;}}
      }));
    }catch(error){console.error("Помилка перенесення КБЖВ",error);}
    showUtilityButtonState(cookedAdd,response?.ok?"Додано":"Не додано",response?.ok?"success":"error");
  });

  if(cookedRaw){
    [cookedRaw,cookedReady,cookedPortion,cookedTarget,...cookedNutrientInputs.map(n=>n.node)].forEach(node=>node?.addEventListener("input",updateCookedNutrition));
    updateCookedNutrition();
    cookedCopy.addEventListener("click",async()=>{
      if(hasNothingToCopy(cookedCopy,cookedClipboard))return;
      const copied=await copyToClipboard(cookedClipboard);
      showUtilityButtonState(cookedCopy,copied?"Скопійовано":"Не скопійовано",copied?"success":"error");
      record(copied?"cooked_nutrition_copied":"copy_failed");
    });
  }

  // v227: independent read-only calculation of carbohydrates excluding sugars.
  const sugarlessCarb=$("utility-sugarless-carb"),sugarlessSugar=$("utility-sugarless-sugar");
  const sugarlessResult=$("utility-sugarless-result"),sugarlessNote=$("utility-sugarless-note");
  const sugarlessSource=$("utility-sugarless-source");
  const sugarlessCopy=$("utility-sugarless-copy");
  const sugarlessArchiveOpen=$("utility-sugarless-archive");
  const archiveModal=$("utility-archive-modal"),archiveClose=$("utility-archive-close");
  const archiveSearch=$("utility-archive-search"),archiveList=$("utility-archive-list");
  const archiveCount=$("utility-archive-count");
  let archiveChoices=[],sugarlessClipboard="";
  function updateSugarless(){
    sugarlessClipboard="";
    clearUtilityButtonState(sugarlessCopy);
    const carbs=String(sugarlessCarb.value||"").trim();
    const sugars=String(sugarlessSugar.value||"").trim();
    if(!carbs||!sugars){
      sugarlessResult.textContent="—";
      sugarlessNote.textContent="Вкажіть обидва значення за однакову кількість продукту або за один день";
      return;
    }
    const c=decimalValue(carbs),s=decimalValue(sugars);
    if(!c||!s){
      sugarlessResult.textContent="—";
      sugarlessNote.textContent="Введіть коректні невід’ємні числа (кома або крапка допустимі)";
      return;
    }
    const delta=c.numerator*s.denominator-s.numerator*c.denominator;
    if(delta<0n){
      sugarlessResult.textContent="—";
      sugarlessNote.textContent="Цукри не можуть перевищувати загальні вуглеводи — перевірте дані";
      return;
    }
    const number=renderFraction(delta,c.denominator*s.denominator,9);
    sugarlessResult.textContent=number+" г";
    sugarlessNote.textContent="Вуглеводи мінус цукри (не тотожне «повільним вуглеводам»)";
    sugarlessClipboard=`Вуглеводи без цукрів: ${number} г (вуглеводи: ${carbs} г; цукри: ${sugars} г)`;
  }
  [sugarlessCarb,sugarlessSugar].forEach(node=>node.addEventListener("input",()=>{
    sugarlessSource.textContent="Введено вручну";
    updateSugarless();
  }));
  sugarlessCopy.addEventListener("click",async()=>{
    if(!sugarlessClipboard){showUtilityButtonState(sugarlessCopy,"Немає що копіювати","error");return;}
    const ok=await copyToClipboard(sugarlessClipboard);
    showUtilityButtonState(sugarlessCopy,ok?"Скопійовано":"Не скопійовано",ok?"success":"error");
    record(ok?"sugarless_copied":"copy_failed");
  });
  function shortArchiveDate(value){
    const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}.${m[2]}.${m[1]}`:String(value||"Дата невідома");
  }
  function renderArchiveChoices(){
    const term=String(archiveSearch.value||"").trim().toLocaleLowerCase("uk-UA");
    const matches=archiveChoices.filter(entry=>{
      const iso=entry.date,display=shortArchiveDate(iso);
      return iso.toLocaleLowerCase("uk-UA").includes(term)||display.includes(term);
    });
    archiveList.replaceChildren();
    archiveCount.textContent=!archiveChoices.length?"Немає архівних днів з обома числовими показниками":
      matches.length?`Знайдено: ${matches.length} із ${archiveChoices.length}.`:
      "Записів із такою датою не знайдено.";
    for(const entry of matches.slice(0,250)){
      const button=document.createElement("button");button.type="button";
      const date=document.createElement("span");date.textContent=shortArchiveDate(entry.date);
      const sub=document.createElement("small");sub.className="utility-product-subtitle";
      sub.textContent=`Вуглеводи ${entry.carb} г · цукри ${entry.sugar} г`;
      button.append(date,sub);
      button.addEventListener("click",()=>{
        sugarlessCarb.value=entry.carb;sugarlessSugar.value=entry.sugar;
        sugarlessSource.textContent=`Вибрано день ${shortArchiveDate(entry.date)} з КБЖВ Архіву`;
        updateSugarless();
        refreshClearButtons();persistUtilities();
        closePicker(archiveModal,sugarlessArchiveOpen);
        showUtilityButtonState(sugarlessArchiveOpen,"День вибрано","success");
      });
      archiveList.append(button);
    }
    if(matches.length>250){
      const more=document.createElement("p");more.className="utility-description";
      more.textContent="Показано перші 250 записів. Уточніть дату";archiveList.append(more);
    }
  }
  sugarlessArchiveOpen.addEventListener("click",()=>{
    archiveChoices=[];
    window.dispatchEvent(new CustomEvent("utilities:archive-request",{
      detail:{deliver:items=>{if(Array.isArray(items))archiveChoices=items;}}
    }));
    archiveChoices.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    archiveSearch.value="";renderArchiveChoices();
    showUtilityButtonState(sugarlessArchiveOpen,"Відкрито","success");
    setTimeout(()=>openPicker(archiveModal),280);
  });
  archiveSearch.addEventListener("input",renderArchiveChoices);
  archiveClose.addEventListener("click",()=>{
    showUtilityButtonState(archiveClose,"Закрито","success");
    setTimeout(()=>closePicker(archiveModal,sugarlessArchiveOpen),340);
  });

  // v101: інструменти відкриваються зі спільної навігації та не створюють нової бази.
  const jumpModal=$("utility-jump-modal"),jumpOpen=$("utility-jump-open"),jumpClose=$("utility-jump-close");
  const jumpOptions=$("utility-jump-options");
  const toolDestinations=[
    ["clock","Поточний час"],["password","Генератор паролів"],
    ["ratio","Коефіцієнт піднятої ваги"],["convert","Конвертер"],
    ["cooked","Перерахунок КБЖВ сирого продукту на готовий"],
    ["sugarless","Вуглеводи без цукрів"],
    ["price","Порівняння цін товарів"],["dates","Калькулятор дат"]
  ];
  const productModal=$("utility-product-modal"),productOpen=$("utility-cooked-select-product");
  const productClose=$("utility-product-close"),productSearch=$("utility-product-search");
  const productList=$("utility-product-list"),productCount=$("utility-product-count");
  const selectedProductName=$("utility-cooked-selected-name");
  let productChoices=[];
  function closePicker(modal,trigger){
    if(!modal?.classList.contains("active"))return;
    modal.classList.remove("active");
    // Обробник модальних вікон сайту синхронізує фіксацію прокрутки.
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
    trigger?.focus({preventScroll:true});
  }
  function openPicker(modal,focusTarget){
    if(!modal)return;
    // Reset an interrupted close-button animation before each new display.
    clearUtilityButtonState(modal===productModal?productClose:modal===archiveModal?archiveClose:jumpClose);
    modal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    // Do not auto-focus search fields: only a user's tap should show an active halo.
    // Focus the dialog itself for keyboard accessibility, without opening iOS keyboard.
    const box=modal.querySelector(".product-modal-box");
    if(box){box.setAttribute("tabindex","-1");requestAnimationFrame(()=>box.focus({preventScroll:true}));}
  }
  for(const [id,label] of toolDestinations){
    const button=document.createElement("button");
    button.type="button";button.textContent=id==="cooked"?"Перерахунок КБЖВ сирого...":label;button.title=label;button.setAttribute("aria-label",label);
    button.addEventListener("click",()=>{
      closePicker(jumpModal,jumpOpen);
      const section=$("utility-section-"+id);
      if(!section)return;
      // Дочекаємося відновлення прокрутки після зняття modal lock.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        section.scrollIntoView({behavior:"auto",block:"start"});
        section.classList.add("utility-jump-highlight");
        setTimeout(()=>section.classList.remove("utility-jump-highlight"),950);
      }));
    });
    jumpOptions?.append(button);
  }
  jumpOpen?.addEventListener("click",()=>{
    showUtilityButtonState(jumpOpen,"Відкрито","success");
    setTimeout(()=>openPicker(jumpModal,jumpOptions?.querySelector("button")),280);
  });
  jumpClose?.addEventListener("click",()=>{
    showUtilityButtonState(jumpClose,"Закрито","success");
    setTimeout(()=>closePicker(jumpModal,jumpOpen),340);
  });
  productClose?.addEventListener("click",()=>{
    showUtilityButtonState(productClose,"Закрито","success");
    setTimeout(()=>closePicker(productModal,productOpen),340);
  });
  for(const [modal,trigger] of [[jumpModal,jumpOpen],[productModal,productOpen],[archiveModal,sugarlessArchiveOpen]]){
    modal?.addEventListener("click",event=>{if(event.target===modal)closePicker(modal,trigger);});
  }
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    const modal=archiveModal?.classList.contains("active")?archiveModal:productModal?.classList.contains("active")?productModal:jumpModal?.classList.contains("active")?jumpModal:null;
    if(!modal)return;
    event.preventDefault();event.stopImmediatePropagation();
    closePicker(modal,modal===archiveModal?sugarlessArchiveOpen:modal===productModal?productOpen:jumpOpen);
  },true);
  function normalProductSearch(value){
    return String(value||"").toLocaleLowerCase("uk-UA").normalize("NFKD").replace(/\s+/g," ").trim();
  }
  function renderProductChoices(){
    if(!productList)return;
    const term=normalProductSearch(productSearch?.value);
    const results=productChoices.filter(item=>normalProductSearch(item.name).includes(term));
    productList.replaceChildren();
    productCount.textContent=!productChoices.length?"У КБЖВ Блоках ще немає продуктів.":
      results.length?`Знайдено: ${results.length} із ${productChoices.length}.`:
      "Продуктів із такою назвою не знайдено.";
    for(const item of results.slice(0,250)){
      const button=document.createElement("button");button.type="button";
      const title=document.createElement("span");title.textContent=item.name;
      const sub=document.createElement("small");sub.className="utility-product-subtitle";
      sub.textContent=item.unit==="мл"?"На 100 мл":"На 100 г";
      button.append(title,sub);
      button.addEventListener("click",()=>{
        for(const {key,node} of cookedNutrientInputs){
          // «Немає даних» не підмінюємо нулем, а залишаємо поле порожнім.
          node.value=item[key]===null||item[key]===undefined?"":String(item[key]);
        }
        selectedProductName.textContent=item.unit==="мл"
          ?`Вибрано «${item.name}» (на 100 мл). Для перерахунку за грамами використовуйте дані на 100 г.`
          :`Вибрано «${item.name}» — КБЖВ на 100 г підставлено автоматично.`;
        // Продукти на 100 мл не прирівнюємо до 100 г: така підміна помилкова.
        if(item.unit==="мл"){
          cookedNutrientInputs.forEach(({node})=>node.value="");
          selectedProductName.textContent+= " Введіть коректні значення на 100 г вручну.";
        }
        updateCookedNutrition();
        refreshClearButtons();
        persistUtilities();
        closePicker(productModal,productOpen);
        showUtilityButtonState(productOpen,"Обрано продукт","success");
      });
      productList.append(button);
    }
    if(results.length>250){
      const more=document.createElement("p");more.className="utility-description";
      more.textContent="Показано перші 250 продуктів. Уточніть пошук";
      productList.append(more);
    }
  }
  productOpen?.addEventListener("click",()=>{
    productChoices=[];
    window.dispatchEvent(new CustomEvent("utilities:products-request",{
      detail:{deliver:items=>{if(Array.isArray(items))productChoices=items;}}
    }));
    productSearch.value="";
    renderProductChoices();
    showUtilityButtonState(productOpen,"Відкрито","success");
    setTimeout(()=>openPicker(productModal,productChoices.length?productSearch:productClose),280);
  });
  productSearch?.addEventListener("input",renderProductChoices);
  // Дозволяємо швидкий пошук без жодної копії даних КБЖВ Блоків.

  // v227: clearing is available for seven calculation blocks, not for the clock.
  // The selected time zone persists until the person explicitly changes it.
  // Generated passwords are ephemeral and are NEVER written into the draft or journal.
  const clearButtons=Object.fromEntries(["password","ratio","convert","cooked","sugarless","price","date"]
    .map(name=>[name,$("utility-"+name+"-clear")]));
  const isFilled=(node)=>Boolean(node&&String(node.value||"").trim());
  function isClearable(name){
    switch(name){
      case "password":return Boolean(output.value)||passwordLength.value!=="15"||flags.some(flag=>!flag.node.checked);
      case "ratio":return isFilled(bodyWeight)||isFilled(liftWeight);
      case "convert":return isFilled(convertInput)||direction.value!=="mass:lb:kg"||Boolean(convertSearch?.value)||Boolean(convertMore?.open);
      case "cooked":return [cookedRaw,cookedReady,cookedPortion,cookedTarget,...cookedNutrientInputs.map(n=>n.node)].some(isFilled)||
        Boolean(selectedProductName?.textContent&&!selectedProductName.textContent.startsWith("Або введіть"));
      case "sugarless":return isFilled(sugarlessCarb)||isFilled(sugarlessSugar);
      case "price":return [priceACost,priceAQty,priceBCost,priceBQty].some(isFilled)||priceKind.value!=="mass"||priceRefQty.value!=="100"||priceAUnit.value!=="kg"||priceBUnit.value!=="g"||priceRefUnit.value!=="g";
      case "date":return [dateStart,dateEnd,dateStartTime,dateEndTime].some(isFilled);
      default:return false;
    }
  }
  // Як і в КБЖВ Блоках та Архіві, кнопки дії залишаються доступними.
  // Порожнє поле — це не disabled, а явна червона відповідь на натискання.
  function refreshClearButtons(){
    for(const button of Object.values(clearButtons)){
      if(button?.disabled)button.disabled=false;
    }
  }
  const allUtilityFieldInputs=[...$("utilities").querySelectorAll("input,select,textarea")];
  for(const input of allUtilityFieldInputs){
    input.addEventListener("input",refreshClearButtons);
    input.addEventListener("change",refreshClearButtons);
  }
  convertMore?.addEventListener("toggle",refreshClearButtons);
  generateButton.addEventListener("click",()=>requestAnimationFrame(refreshClearButtons));
  for(const button of [copyButton,productOpen])button?.addEventListener("click",()=>requestAnimationFrame(refreshClearButtons));
  function clearUtilityCard(name){
    clearTimeout(saveTimer);
    const button=clearButtons[name];
    if(!button)return;
    if(!isClearable(name)){
      showUtilityButtonState(button,"Немає що очищати","error");
      return;
    }
    const empty=node=>{if(node)node.value="";};
    switch(name){
      case "password":clearPrivatePassword();break;
      case "ratio":empty(bodyWeight);empty(liftWeight);updateRatio();break;
      case "convert":
        selectPopular("mass:lb:kg");empty(convertInput);empty(convertSearch);
        convertSearchResults.replaceChildren();convertSearchResults.hidden=true;
        convertMore.open=false;updateConversion();break;
      case "cooked":
        [cookedRaw,cookedReady,cookedPortion,cookedTarget,...cookedNutrientInputs.map(n=>n.node)].forEach(empty);
        selectedProductName.textContent="Або введіть показники КБЖВ вручну";
        updateCookedNutrition();break;
      case "sugarless":
        empty(sugarlessCarb);empty(sugarlessSugar);
        sugarlessSource.textContent="Або введіть значення вручну";updateSugarless();break;
      case "price":
        priceKind.value="mass";selectPriceGroup();
        [priceACost,priceAQty,priceBCost,priceBQty].forEach(empty);
        updatePriceComparison();break;
      case "date":
        [dateStart,dateEnd,dateStartTime,dateEndTime].forEach(empty);
        updateDateDifference();break;
    }
    // Однаковий із кнопками інших вкладок відгук: зелений успіх (1450 мс).
    showUtilityButtonState(button,"Очищено","success");
    persistUtilities();
    record(name==="password"?"password_cleared":"utility_cleared",name==="password"?{}:{section:name});
  }
  for(const [name,button] of Object.entries(clearButtons))
    button?.addEventListener("click",()=>clearUtilityCard(name));
  refreshClearButtons();

  // v101: тільки дані поточної сторінки зручностей у локальній чернетці користувача.
  // Не додаємо чернетку до експорту/імпорту, Worker, D1 чи консолі.
  const utilitiesPanel=$("utilities");
  const PERSISTED_FIELDS=[...utilitiesPanel.querySelectorAll("input[id],select[id]")]
    .filter(node=>!/^utility-(password|chars-)/.test(node.id) && !node.readOnly);
  const savedElements=[...PERSISTED_FIELDS,$("utility-convert-more")].filter(Boolean);
  let draftKey="",restoringDraft=false,saveTimer=null,draftSaveErrorShown=false;
  function persistUtilities(){
    if(!draftKey||restoringDraft)return;
    const values={};
    for(const node of savedElements){
      values[node.id]=node.type==="checkbox"?node.checked:node.tagName==="DETAILS"?node.open:node.value;
    }
    const draft={version:1,values,
      cookedProductLabel:selectedProductName?.textContent||""};
    try{
      localStorage.setItem(draftKey,JSON.stringify(draft));
      draftSaveErrorShown=false;
    }catch(error){
      // Не обіцяємо автозбереження, якщо сховище браузера відмовило.
      console.error("Не вдалося зберегти чернетку зручностей",error);
      if(!draftSaveErrorShown){
        draftSaveErrorShown=true;
        window.alert("Не вдалося зберегти дані вкладки «Зручності» на цьому пристрої. Після оновлення сторінки вони можуть зникнути. Перевірте вільне місце та налаштування браузера.");
      }
    }
  }
  function queuePersist(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(persistUtilities,130);
  }
  utilitiesPanel?.addEventListener("input",queuePersist);
  utilitiesPanel?.addEventListener("change",queuePersist);
  convertMore?.addEventListener("toggle",queuePersist);
  function restoreUtilities(){
    if(!draftKey)return;
    let draft;
    try{draft=JSON.parse(localStorage.getItem(draftKey)||"null");}catch(_){return;}
    if(!draft||draft.version!==1||!draft.values)return;
    restoringDraft=true;
    const values=draft.values;
    // Спершу категорії, від яких залежать решта <select>.
    if(typeof values["utility-price-kind"]==="string" && PRICE_GROUPS[values["utility-price-kind"]]){
      priceKind.value=values["utility-price-kind"];
      selectPriceGroup();
    }
    if(typeof values["utility-convert-category"]==="string"&&getCat(values["utility-convert-category"])){
      populateUnitSelectors(values["utility-convert-category"],values["utility-convert-from"],values["utility-convert-to"]);
    }
    for(const node of savedElements){
      if(!Object.prototype.hasOwnProperty.call(values,node.id))continue;
      const value=values[node.id];
      if(node.tagName==="DETAILS"){node.open=Boolean(value);continue;}
      if(node.type==="checkbox"){node.checked=Boolean(value);continue;}
      if(typeof value!=="string"||value.length>5000)continue;
      // Не створюємо новий варіант у списку: тільки офіційні значення.
      if(node.tagName==="SELECT"&&!Array.from(node.options).some(opt=>opt.value===value))continue;
      node.value=value;
    }
    if(selectedProductName&&typeof draft.cookedProductLabel==="string")
      selectedProductName.textContent=draft.cookedProductLabel.slice(0,300);
    updateRatio();updateConversion();updatePriceComparison();updateDateDifference();updateCookedNutrition();updateSugarless();
    drawClock();
    restoringDraft=false;refreshClearButtons();
  }
  window.addEventListener("utilities:user",event=>{
    const id=String(event.detail?.id||"");
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return;
    const newKey=`avicularia_testing_user_${id}_utilities_draft_v101`;
    if(draftKey===newKey)return;
    clearTimeout(saveTimer);
    archiveChoices=[];archiveList?.replaceChildren();closePicker(archiveModal);
    if(draftKey){ // Never show another account's unsaved calculations.
      clockZone.value="local";bodyWeight.value="";liftWeight.value="";
      selectPopular("mass:lb:kg");convertInput.value="";convertSearch.value="";
      convertMore.open=false;
      priceKind.value="mass";selectPriceGroup();
      sugarlessCarb.value="";sugarlessSugar.value="";sugarlessSource.textContent="Або введіть значення вручну";
      [priceACost,priceAQty,priceBCost,priceBQty,cookedRaw,cookedReady,cookedPortion,cookedTarget,
        ...cookedNutrientInputs.map(item=>item.node),dateStart,dateEnd,dateStartTime,dateEndTime].forEach(node=>{if(node)node.value="";});
      selectedProductName.textContent="Або введіть показники КБЖВ вручну";
      sugarlessSource.textContent="Або введіть значення вручну";
      updateRatio();updateConversion();updatePriceComparison();updateDateDifference();updateCookedNutrition();updateSugarless();drawClock();
      clearPrivatePassword();
    }
    draftKey=newKey;
    restoreUtilities();refreshClearButtons();
  });
  // Passwords are always destroyed on leaving/re-entering, navigating away or BFCache.
  function clearPrivatePassword(){
    passwordLength.value="15";
    flags.forEach(flag=>{flag.node.checked=true;});
    clearGenerated();
    clearUtilityButtonState(generateButton);
    refreshClearButtons();
  }
  function leaveUtilities(){
    clearTimeout(saveTimer);persistUtilities();stopClock();clearPrivatePassword();
    closePicker(productModal);closePicker(jumpModal);closePicker(archiveModal);
    // Other fields and calculated results stay available when returning.
  }
  window.addEventListener("utilities:reset",leaveUtilities);
  // “Повністю очистити сайт” must not resurrect the old draft on pagehide.
  window.addEventListener("utilities:forget",()=>{
    clearTimeout(saveTimer);
    draftKey="";archiveChoices=[];archiveList?.replaceChildren();closePicker(archiveModal);
    clearPrivatePassword();
  });
  // Flush the pending draft synchronously whenever the tab is backgrounded or closed.
  // This does not make storage infallible (private mode/quota/storage removal).
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden"){
      clearTimeout(saveTimer);persistUtilities();clearPrivatePassword();
    }
  });
  window.addEventListener("beforeunload",()=>{clearTimeout(saveTimer);persistUtilities();clearPrivatePassword();});
  window.addEventListener("pageshow",event=>{if(event.persisted){clearPrivatePassword();restoreUtilities();}});
  window.addEventListener("pagehide",()=>{clearPrivatePassword();persistUtilities();});
})();
