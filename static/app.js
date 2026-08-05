const state = {
  config: null,
  orders: [],
  localMode: false,
  recognition: null,
  listening: false,
  imageTimer: null,
  translationTimer: null,
  socket: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const staticLanguages = [
  ["en", "English", "en-GB"], ["tr", "Türkçe · Turkish — optimised", "tr-TR"],
  ["ar", "العربية · Arabic", "ar-SA"],
  ["bn", "বাংলা · Bengali", "bn-BD"], ["zh-CN", "中文 · Chinese", "zh-CN"],
  ["cs", "Čeština · Czech", "cs-CZ"], ["da", "Dansk · Danish", "da-DK"],
  ["nl", "Nederlands · Dutch", "nl-NL"], ["fi", "Suomi · Finnish", "fi-FI"],
  ["fr", "Français · French", "fr-FR"], ["de", "Deutsch · German", "de-DE"],
  ["el", "Ελληνικά · Greek", "el-GR"], ["hi", "हिन्दी · Hindi", "hi-IN"],
  ["hu", "Magyar · Hungarian", "hu-HU"], ["id", "Bahasa Indonesia", "id-ID"],
  ["it", "Italiano · Italian", "it-IT"], ["ja", "日本語 · Japanese", "ja-JP"],
  ["ko", "한국어 · Korean", "ko-KR"], ["ms", "Bahasa Melayu · Malay", "ms-MY"],
  ["no", "Norsk · Norwegian", "nb-NO"], ["pl", "Polski · Polish", "pl-PL"],
  ["pt", "Português · Portuguese", "pt-PT"], ["ro", "Română · Romanian", "ro-RO"],
  ["ru", "Русский · Russian", "ru-RU"], ["es", "Español · Spanish", "es-ES"],
  ["sw", "Kiswahili · Swahili", "sw-KE"], ["sv", "Svenska · Swedish", "sv-SE"],
  ["ta", "தமிழ் · Tamil", "ta-IN"], ["th", "ไทย · Thai", "th-TH"],
  ["uk", "Українська · Ukrainian", "uk-UA"],
  ["ur", "اردو · Urdu", "ur-PK"], ["vi", "Tiếng Việt · Vietnamese", "vi-VN"],
].map(([code, name, locale]) => ({ code, name, locale }));

const turkishSafetyTerms = {
  "tr-en": {
    "alerjim var": ["I have an allergy", ["allergy", "allergic"]],
    "glütensiz": ["gluten-free", ["gluten-free", "without gluten"]],
    "laktozsuz": ["lactose-free", ["lactose-free", "without lactose"]],
    "süt ürünü olmasın": ["no dairy", ["no dairy", "dairy-free", "without dairy"]],
    "fıstık alerjisi": ["peanut allergy", ["peanut allergy", "allergic to peanuts"]],
    "fıstık alerjim var": ["peanut allergy", ["peanut allergy", "allergic to peanuts"]],
    "fıstığa alerjim var": ["peanut allergy", ["peanut allergy", "allergic to peanuts"]],
    "kuruyemiş alerjisi": ["nut allergy", ["nut allergy", "allergic to nuts"]],
    "kuruyemişe alerjim var": ["nut allergy", ["nut allergy", "allergic to nuts"]],
    "domuz eti olmasın": ["no pork", ["no pork", "without pork"]],
    "soğansız": ["no onion", ["no onion", "without onion", "onion-free"]],
    "sarımsaksız": ["no garlic", ["no garlic", "without garlic", "garlic-free"]],
    "acısız": ["not spicy", ["not spicy", "non-spicy", "without spice"]],
  },
  "en-tr": {
    "i have an allergy": ["alerjim var", ["alerjim var", "alerjim bulunuyor"]],
    "gluten-free": ["glütensiz", ["glütensiz", "glutensiz"]],
    "lactose-free": ["laktozsuz", ["laktozsuz"]],
    "no dairy": ["süt ürünü olmasın", ["süt ürünü olmasın", "süt ürünsüz"]],
    "peanut allergy": [
      "fıstık alerjisi",
      ["fıstık alerjisi", "fıstığa alerjim var", "yer fıstığına alerjim var"],
    ],
    "nut allergy": ["kuruyemiş alerjisi", ["kuruyemiş alerjisi"]],
    "no pork": ["domuz eti olmasın", ["domuz eti olmasın", "domuz etsiz"]],
    "no onion": ["soğansız", ["soğansız", "soğan olmasın"]],
    "no garlic": ["sarımsaksız", ["sarımsaksız", "sarımsak olmasın"]],
    "not spicy": ["acısız", ["acısız", "acı olmasın", "baharatlı değil"]],
  },
};

const elements = {
  modeButtons: $$(".nav [data-view]"),
  themeToggle: $("[data-theme-toggle]"),
  themeMeta: $("#meta-theme-color"),
  guestView: $("#guest-view"),
  kitchenView: $("#kitchen-view"),
  guestLanguage: $("#guest-language"),
  kitchenLanguage: $("#kitchen-language"),
  orderForm: $("#order-form"),
  customerName: $("#customer-name"),
  tableNumber: $("#table-number"),
  orderText: $("#order-text"),
  voiceButton: $("#voice-button"),
  voiceLabel: $(".voice-label"),
  listeningStatus: $("#listening-status"),
  previewButton: $("#preview-button"),
  translatedPreview: $("#translated-preview"),
  translationCard: $("#translation-card"),
  speakTranslation: $("#speak-translation"),
  dishImage: $("#dish-image"),
  imagePlaceholder: $("#image-placeholder"),
  imageLoading: $("#image-loading"),
  submitOrder: $("#submit-order"),
  formMessage: $("#form-message"),
  kitchenLanguage: $("#kitchen-language"),
  includeClosed: $("#include-closed"),
  ordersGrid: $("#orders-grid"),
  emptyOrders: $("#empty-orders"),
  orderTemplate: $("#order-template"),
  statusSummary: $("#status-summary"),
  newCount: $("#new-count"),
  connection: $("#connection"),
  version: $("#version"),
};

async function api(path, options = {}) {
  if (state.localMode) return localApi(path, options);
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (
    path === "/api/config" &&
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    state.localMode = true;
    return localApi(path, options);
  }
  if (!response.ok) {
    if (path === "/api/config" && response.status === 404) {
      state.localMode = true;
      return localApi(path, options);
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

function preserveTurkishSafetyTerms(sourceText, translatedText, source, target) {
  const terms = turkishSafetyTerms[`${source}-${target}`] || {};
  const sourceLower = sourceText.toLocaleLowerCase(source === "tr" ? "tr-TR" : "en-GB");
  const translatedLower = translatedText.toLocaleLowerCase(target === "tr" ? "tr-TR" : "en-GB");
  const missing = [];
  const containsWholePhrase = (value, phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`, "u").test(value);
  };
  Object.entries(terms).forEach(([phrase, [canonical, accepted]]) => {
    if (
      containsWholePhrase(sourceLower, phrase) &&
      !accepted.some((term) =>
        containsWholePhrase(translatedLower, term.toLocaleLowerCase(target === "tr" ? "tr-TR" : "en-GB"))
      )
    ) {
      missing.push(canonical);
    }
  });
  if (!missing.length) return translatedText;
  const label = target === "en" ? "Order note" : "Sipariş notu";
  return `${translatedText} — ${label}: ${missing.join(", ")}`;
}

function correctTurkishRestaurantContext(sourceText, translatedText, source, target) {
  if (source === "tr" && target === "en" && sourceText.toLocaleLowerCase("tr-TR").includes("acısız")) {
    return translatedText.replace(
      /\b(?:without\s+pain|no\s+pain|pain[\s-]?free|painless)\b/gi,
      "not spicy",
    );
  }
  return translatedText;
}

async function browserGoogleTranslate(text, source, target) {
  if (!text.trim() || source === target) return text;
  const normalised = text.normalize("NFC").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
    `&sl=${encodeURIComponent(source || "auto")}&tl=${encodeURIComponent(target)}` +
    `&q=${encodeURIComponent(normalised)}`;
  let translated;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Google translation failed.");
    const data = await response.json();
    translated = data[0].map((part) => part[0]).join("");
  } catch {
    const memoryUrl =
      "https://api.mymemory.translated.net/get" +
      `?q=${encodeURIComponent(normalised)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
    const response = await fetch(memoryUrl);
    if (!response.ok) throw new Error("Translation is temporarily unavailable.");
    const data = await response.json();
    translated = data.responseData?.translatedText;
    if (!translated) throw new Error("Translation is temporarily unavailable.");
  }
  if (new Set([source, target]).has("tr") && new Set([source, target]).has("en")) {
    translated = correctTurkishRestaurantContext(normalised, translated, source, target);
    return preserveTurkishSafetyTerms(normalised, translated, source, target);
  }
  return translated;
}

function localOrders() {
  return JSON.parse(localStorage.getItem("smos-orders") || "[]");
}

function saveLocalOrders(orders) {
  localStorage.setItem("smos-orders", JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent("smos-orders-changed"));
}

async function localApi(path, options = {}) {
  if (path === "/api/config") {
    return { name: "SMOS", version: "0.1.4", languages: staticLanguages };
  }

  if (path === "/api/translate") {
    const body = JSON.parse(options.body);
    return {
      translated_text: await browserGoogleTranslate(body.text, body.source, body.target),
      source: body.source,
      target: body.target,
    };
  }

  if (path.startsWith("/api/image")) {
    const params = new URL(path, window.location.origin).searchParams;
    const description = params.get("description");
    const language = params.get("language") || "en";
    const english =
      language === "en" ? description : await browserGoogleTranslate(description, language, "en");
    const prompt =
      `professional appetizing restaurant food photography, plated dish, ${english}, ` +
      "warm natural light, realistic, no text, no logo";
    return {
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
        "?width=768&height=512&nologo=true&enhance=true",
      prompt: english,
    };
  }

  if (path === "/api/orders" && options.method === "POST") {
    const body = JSON.parse(options.body);
    const orders = localOrders();
    const english = await browserGoogleTranslate(body.order_text, body.language, "en");
    const now = new Date().toISOString();
    const order = {
      id: crypto.randomUUID(),
      order_number: Math.max(100, ...orders.map((item) => item.order_number)) + 1,
      customer_name: body.customer_name,
      table_number: body.table_number,
      original_text: body.order_text,
      original_language: body.language,
      kitchen_text: english,
      display_text: english,
      status: "new",
      created_at: now,
      updated_at: now,
    };
    saveLocalOrders([order, ...orders]);
    return order;
  }

  if (path.startsWith("/api/orders?")) {
    const params = new URL(path, window.location.origin).searchParams;
    const language = params.get("language") || "en";
    const includeClosed = params.get("include_closed") === "true";
    const orders = localOrders().filter(
      (order) => includeClosed || !["served", "cancelled"].includes(order.status),
    );
    return Promise.all(
      orders.map(async (order) => ({
        ...order,
        display_text:
          language === "en"
            ? order.kitchen_text
            : await browserGoogleTranslate(order.kitchen_text, "en", language),
      })),
    );
  }

  if (path.startsWith("/api/orders/") && options.method === "PATCH") {
    const id = path.split("/").pop();
    const { status } = JSON.parse(options.body);
    const orders = localOrders();
    const order = orders.find((item) => item.id === id);
    if (!order) throw new Error("Order not found.");
    order.status = status;
    order.updated_at = new Date().toISOString();
    saveLocalOrders(orders);
    return order;
  }

  throw new Error("This action is unavailable in static demo mode.");
}

function fillLanguageSelect(select, preferred = "en") {
  select.innerHTML = "";
  state.config.languages.forEach(({ code, name, locale }) => {
    const option = new Option(name, code, code === preferred, code === preferred);
    option.dataset.locale = locale;
    select.add(option);
  });
}

function selectedLocale(select) {
  return select.selectedOptions[0]?.dataset.locale || "en-GB";
}

function speak(text, locale) {
  if (!("speechSynthesis" in window)) {
    showMessage("Text-to-speech is not supported by this browser.", "error");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function showMessage(message, type = "success") {
  elements.formMessage.textContent = message;
  elements.formMessage.className = `form-message ${type}`;
}

function switchView(view) {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  elements.guestView.classList.toggle("is-active", view === "guest");
  elements.kitchenView.classList.toggle("is-active", view === "kitchen");
  if (view === "kitchen") loadOrders();
  window.history.replaceState(null, "", view === "kitchen" ? "#kitchen" : "#order");
}

const THEME_KEY = "smos-theme";

function setTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* Private browsing blocks persistence; the theme still applies for this session. */
  }
  elements.themeMeta?.setAttribute("content", next === "light" ? "#f6f3ee" : "#070707");
  const goLight = next === "dark";
  elements.themeToggle?.setAttribute(
    "aria-label",
    goLight ? "Switch to light theme" : "Switch to dark theme",
  );
  elements.themeToggle?.setAttribute("title", goLight ? "Light theme" : "Dark theme");
}

function setupTheme() {
  setTheme(document.documentElement.getAttribute("data-theme"));
  elements.themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceButton.disabled = true;
    elements.voiceLabel.textContent = "Voice unavailable";
    elements.listeningStatus.textContent = "Try Chrome, Edge, or Safari";
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;

  state.recognition.onstart = () => {
    state.listening = true;
    elements.voiceButton.classList.add("listening");
    elements.voiceLabel.textContent = "Stop listening";
    elements.listeningStatus.textContent = "Listening…";
  };

  state.recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalText += transcript;
      else interimText += transcript;
    }
    if (finalText) {
      const spacer = elements.orderText.value.trim() ? " " : "";
      elements.orderText.value = `${elements.orderText.value.trim()}${spacer}${finalText.trim()}`;
      elements.orderText.dispatchEvent(new Event("input"));
    }
    elements.listeningStatus.textContent = interimText || (state.listening ? "Listening…" : "");
  };

  state.recognition.onerror = (event) => {
    elements.listeningStatus.textContent =
      event.error === "not-allowed" ? "Microphone permission was denied" : `Voice error: ${event.error}`;
  };

  state.recognition.onend = () => {
    state.listening = false;
    elements.voiceButton.classList.remove("listening");
    elements.voiceLabel.textContent = "Tap to speak";
    if (elements.listeningStatus.textContent === "Listening…") {
      elements.listeningStatus.textContent = "";
    }
  };
}

function toggleListening() {
  if (!state.recognition) return;
  if (state.listening) {
    state.recognition.stop();
    return;
  }
  state.recognition.lang = selectedLocale(elements.guestLanguage);
  try {
    state.recognition.start();
  } catch {
    state.recognition.stop();
  }
}

async function previewTranslation() {
  const text = elements.orderText.value.trim();
  const source = elements.guestLanguage.value;
  if (text.length < 2) {
    elements.translationCard.classList.add("hidden");
    return "";
  }
  if (source === "en") {
    elements.translatedPreview.textContent = text;
    elements.translationCard.classList.remove("hidden");
    return text;
  }
  try {
    const result = await api("/api/translate", {
      method: "POST",
      body: JSON.stringify({ text, source, target: "en" }),
    });
    elements.translatedPreview.textContent = result.translated_text;
    elements.translationCard.classList.remove("hidden");
    return result.translated_text;
  } catch (error) {
    showMessage(error.message, "error");
    return "";
  }
}

async function visualiseDish() {
  const description = elements.orderText.value.trim();
  if (description.length < 4) return;

  elements.imageLoading.classList.remove("hidden");
  elements.previewButton.disabled = true;
  try {
    const result = await api(
      `/api/image?description=${encodeURIComponent(description)}&language=${encodeURIComponent(
        elements.guestLanguage.value,
      )}`,
    );
    elements.dishImage.onload = () => {
      elements.imageLoading.classList.add("hidden");
      elements.imagePlaceholder.classList.add("hidden");
      elements.dishImage.classList.add("visible");
      elements.previewButton.disabled = false;
    };
    elements.dishImage.onerror = () => {
      elements.imageLoading.classList.add("hidden");
      elements.previewButton.disabled = false;
      showMessage("The food visual could not be generated. Your order can still be sent.", "error");
    };
    elements.dishImage.src = `${result.url}&seed=${Date.now()}`;
  } catch (error) {
    elements.imageLoading.classList.add("hidden");
    elements.previewButton.disabled = false;
    showMessage(error.message, "error");
  }
}

async function submitOrder(event) {
  event.preventDefault();
  const originalLabel = elements.submitOrder.innerHTML;
  elements.submitOrder.disabled = true;
  elements.submitOrder.innerHTML = "<span>Translating &amp; sending…</span><b>···</b>";
  try {
    const order = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_name: elements.customerName.value.trim() || "Guest",
        table_number: elements.tableNumber.value.trim(),
        order_text: elements.orderText.value.trim(),
        language: elements.guestLanguage.value,
      }),
    });
    showMessage(`Order #${order.order_number} is with the kitchen.`, "success");
    elements.orderText.value = "";
    elements.translationCard.classList.add("hidden");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    elements.submitOrder.disabled = false;
    elements.submitOrder.innerHTML = originalLabel;
  }
}

const statusLabels = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

function relativeTime(timestamp) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} mins ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderOrders() {
  elements.ordersGrid.innerHTML = "";
  const counts = {};
  state.orders.forEach((order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    const card = elements.orderTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.status = order.status;
    $(".order-number", card).textContent = `Order #${order.order_number}`;
    $("time", card).textContent = relativeTime(order.created_at);
    $("time", card).dateTime = order.created_at;
    $(".status-pill", card).textContent = statusLabels[order.status];
    $(".status-pill", card).dataset.status = order.status;
    $(".table-value", card).textContent = `Table ${order.table_number}`;
    $(".customer-value", card).textContent = order.customer_name;
    $(".order-copy", card).textContent = order.display_text || order.kitchen_text;
    $(".original-copy", card).textContent = order.original_text;
    const statusSelect = $(".status-select", card);
    statusSelect.value = order.status;
    statusSelect.addEventListener("change", () => updateStatus(order.id, statusSelect.value));
    $(".speak-order", card).addEventListener("click", () => {
      speak(order.display_text || order.kitchen_text, selectedLocale(elements.kitchenLanguage));
    });
    elements.ordersGrid.append(card);
  });

  const newOrders = counts.new || 0;
  elements.newCount.textContent = newOrders;
  elements.newCount.classList.toggle("hidden", newOrders === 0);
  elements.statusSummary.innerHTML = Object.entries(statusLabels)
    .filter(([key]) => counts[key])
    .map(([key, label]) => `<span class="summary-chip"><b>${counts[key]}</b>${label}</span>`)
    .join("");
  elements.emptyOrders.classList.toggle("hidden", state.orders.length !== 0);
}

async function loadOrders() {
  try {
    state.orders = await api(
      `/api/orders?language=${encodeURIComponent(elements.kitchenLanguage.value)}&include_closed=${
        elements.includeClosed.checked
      }`,
    );
    renderOrders();
  } catch (error) {
    elements.ordersGrid.innerHTML = `<p class="form-message error">${error.message}</p>`;
  }
}

async function updateStatus(orderId, status) {
  try {
    await api(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadOrders();
  } catch (error) {
    alert(error.message);
    await loadOrders();
  }
}

function connectSocket() {
  if (state.localMode) {
    elements.connection.innerHTML = "<i></i> Live demo";
    window.addEventListener("storage", loadOrders);
    window.addEventListener("smos-orders-changed", loadOrders);
    return;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  state.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  state.socket.onopen = () => {
    elements.connection.classList.remove("offline");
    elements.connection.innerHTML = "<i></i> Live";
  };
  state.socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type?.startsWith("order.")) loadOrders();
  };
  state.socket.onclose = () => {
    elements.connection.classList.add("offline");
    elements.connection.innerHTML = "<i></i> Reconnecting";
    window.setTimeout(connectSocket, 2500);
  };
}

async function initialise() {
  state.config = await api("/api/config");
  elements.version.textContent = `v${state.config.version}`;
  fillLanguageSelect(elements.guestLanguage, "en");
  fillLanguageSelect(elements.kitchenLanguage, "en");
  setupTheme();
  setupSpeechRecognition();
  connectSocket();
  await loadOrders();

  elements.modeButtons.forEach((button) =>
    button.addEventListener("click", () => switchView(button.dataset.view)),
  );
  elements.voiceButton.addEventListener("click", toggleListening);
  elements.previewButton.addEventListener("click", visualiseDish);
  elements.orderForm.addEventListener("submit", submitOrder);
  elements.speakTranslation.addEventListener("click", () =>
    speak(elements.translatedPreview.textContent, "en-GB"),
  );
  elements.kitchenLanguage.addEventListener("change", loadOrders);
  elements.includeClosed.addEventListener("change", loadOrders);
  elements.guestLanguage.addEventListener("change", () => {
    if (state.listening) state.recognition.stop();
    previewTranslation();
  });
  elements.orderText.addEventListener("input", () => {
    clearTimeout(state.translationTimer);
    clearTimeout(state.imageTimer);
    state.translationTimer = setTimeout(previewTranslation, 700);
    if (elements.orderText.value.trim().length >= 12) {
      state.imageTimer = setTimeout(visualiseDish, 1800);
    }
  });

  if (window.location.hash === "#kitchen") switchView("kitchen");
}

initialise().catch((error) => {
  document.body.innerHTML =
    `<main class="section"><div class="container"><p class="eyebrow">Startup error</p>` +
    `<h1>SMOS could not start</h1><p class="section-lede">${error.message}</p></div></main>`;
});
