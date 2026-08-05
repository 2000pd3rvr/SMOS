const state = {
  config: null,
  orders: [],
  recognition: null,
  listening: false,
  imageTimer: null,
  translationTimer: null,
  socket: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  modeButtons: $$(".mode-button"),
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
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
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
    button.classList.toggle("active", button.dataset.view === view);
  });
  elements.guestView.classList.toggle("active", view === "guest");
  elements.kitchenView.classList.toggle("active", view === "kitchen");
  if (view === "kitchen") loadOrders();
  window.history.replaceState(null, "", view === "kitchen" ? "#kitchen" : "#order");
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
  document.body.innerHTML = `<main class="dashboard"><h1>SMOS could not start</h1><p>${error.message}</p></main>`;
});
