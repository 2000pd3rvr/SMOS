(function () {
  const THEME_KEY = "corner-cafe-theme";
  const SERVICE_KEY = "corner-cafe-order-service";
  const MODE_KEY = "corner-cafe-order-mode";
  const CART_KEY = "corner-cafe-cart";

  const serviceLabels = {
    delivery: "Delivery",
    collection: "Collection",
    "sitting-in": "Sitting in",
  };

  const modeLabels = {
    menu: "Browse menu",
    know: "I know what I want",
  };

  const root = document.documentElement;
  const metaTheme = document.getElementById("meta-theme-color");
  const toggle = document.querySelector("[data-theme-toggle]");

  const applyTheme = (theme) => {
    const next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    if (metaTheme) metaTheme.setAttribute("content", next === "light" ? "#f6f3ee" : "#070707");
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        next === "light" ? "Switch to dark theme" : "Switch to light theme"
      );
    }
  };

  try {
    applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  } catch (e) {
    applyTheme("dark");
  }

  toggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* ignore */
    }
  });

  const params = new URLSearchParams(window.location.search);

  const money = (n) => `£${Number(n).toFixed(2)}`;
  const priceText = (item) => item.priceDisplay || money(item.price);

  const readCart = () => {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const writeCart = (next) => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore */
    }
  };

  let cart = readCart();
  let menuRenderList = null;

  const cartCount = () => cart.reduce((n, line) => n + line.qty, 0);
  const cartTotal = () => cart.reduce((n, line) => n + line.qty * line.price, 0);
  const qtyOf = (id) => cart.find((line) => line.id === id)?.qty || 0;

  const setQty = (item, qty) => {
    const next = Math.max(0, Math.floor(qty));
    const idx = cart.findIndex((line) => line.id === item.id);
    if (next <= 0) {
      if (idx >= 0) cart.splice(idx, 1);
    } else if (idx >= 0) {
      cart[idx].qty = next;
    } else {
      cart.push({ id: item.id, name: item.name, price: item.price, qty: next });
    }
    writeCart(cart);
    renderCartChrome();
    if (typeof menuRenderList === "function") menuRenderList();
  };

  const addToCart = (item) => setQty(item, qtyOf(item.id) + 1);
  const removeOne = (item) => setQty(item, qtyOf(item.id) - 1);

  const clearCart = () => {
    cart = [];
    writeCart(cart);
    renderCartChrome();
    if (typeof menuRenderList === "function") menuRenderList();
  };

  const qtyControlsHtml = (item, qty) => {
    if (qty <= 0) {
      return `<button type="button" class="qty-add" data-add="${item.id}" aria-label="Add ${item.name}">Add</button>`;
    }
    return `
      <div class="qty-stepper" role="group" aria-label="Quantity for ${item.name}">
        <button type="button" class="qty-btn" data-dec="${item.id}" aria-label="Remove one">−</button>
        <span class="qty-val" aria-live="polite">${qty}</span>
        <button type="button" class="qty-btn" data-inc="${item.id}" aria-label="Add one">+</button>
      </div>
    `;
  };

  const bindQtyControls = (rootEl, findItem) => {
    rootEl.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = findItem(btn.getAttribute("data-add"));
        if (item) addToCart(item);
      });
    });
    rootEl.querySelectorAll("[data-inc]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = findItem(btn.getAttribute("data-inc"));
        if (item) addToCart(item);
      });
    });
    rootEl.querySelectorAll("[data-dec]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = findItem(btn.getAttribute("data-dec"));
        if (item) removeOne(item);
      });
    });
  };

  const renderCartChrome = () => {
    const bar = document.querySelector("[data-cart-bar]");
    const countEl = document.querySelector("[data-cart-count]");
    const totalEl = document.querySelector("[data-cart-total]");
    const linesEl = document.querySelector("[data-cart-lines]");
    const dialogTotal = document.querySelector("[data-cart-dialog-total]");
    if (!bar) return;

    const count = cartCount();
    if (countEl) countEl.textContent = count === 1 ? "1 item" : `${count} items`;
    if (totalEl) totalEl.textContent = money(cartTotal());
    if (dialogTotal) dialogTotal.textContent = money(cartTotal());
    bar.hidden = count === 0;

    if (linesEl) {
      linesEl.innerHTML = "";
      const menu = window.CornerCafeMenu || [];
      cart.forEach((line) => {
        const item = menu.find((m) => m.id === line.id) || line;
        const li = document.createElement("li");
        li.className = "cart-line cart-line--edit";
        li.innerHTML = `
          <span class="cart-line__copy">
            <span class="cart-line__name">${line.name}</span>
            <span class="cart-line__price">${money(line.qty * line.price)}</span>
          </span>
          ${qtyControlsHtml(item, line.qty)}
        `;
        bindQtyControls(li, (id) => menu.find((m) => m.id === id) || (id === line.id ? line : null));
        linesEl.appendChild(li);
      });
    }
  };

  document.querySelector("[data-cart-review]")?.addEventListener("click", () => {
    document.querySelector("[data-cart-dialog]")?.showModal();
  });

  document.querySelector("[data-cart-clear]")?.addEventListener("click", () => {
    clearCart();
    document.querySelector("[data-cart-dialog]")?.close();
  });

  const goCheckout = () => {
    if (cartCount() <= 0) return;
    const service = params.get("service") || sessionStorage.getItem(SERVICE_KEY) || "";
    const mode = params.get("mode") || sessionStorage.getItem(MODE_KEY) || "menu";
    if (!serviceLabels[service]) {
      window.location.replace("./");
      return;
    }
    document.querySelector("[data-cart-dialog]")?.close();
    window.location.href = `checkout.html?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}`;
  };

  document.querySelectorAll("[data-cart-checkout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      goCheckout();
    });
  });

  const pathLinks = document.querySelectorAll("[data-path-link]");
  if (pathLinks.length) {
    const service = params.get("service") || "";
    if (!serviceLabels[service]) {
      window.location.replace("./");
      return;
    }
    try {
      sessionStorage.setItem(SERVICE_KEY, service);
    } catch (e) {
      /* ignore */
    }

    const serviceEl = document.querySelector("[data-order-service]");
    if (serviceEl) serviceEl.textContent = serviceLabels[service];

    pathLinks.forEach((link) => {
      const mode = link.getAttribute("data-mode");
      link.href = `order.html?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}`;
    });
  }

  const serviceEl = document.querySelector("[data-order-service]");
  const modeEl = document.querySelector("[data-order-mode]");
  const panelMenu = document.querySelector("[data-panel-menu]");
  const panelKnow = document.querySelector("[data-panel-know]");

  if (serviceEl && (panelMenu || panelKnow)) {
    const service = params.get("service") || "";
    const mode = params.get("mode") || "";

    if (!serviceLabels[service]) {
      window.location.replace("./");
      return;
    }
    if (!modeLabels[mode]) {
      window.location.replace(`path.html?service=${encodeURIComponent(service)}`);
      return;
    }

    try {
      sessionStorage.setItem(SERVICE_KEY, service);
      sessionStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      /* ignore */
    }

    serviceEl.textContent = serviceLabels[service];
    if (modeEl) modeEl.textContent = modeLabels[mode];

    const back = document.querySelector("[data-back-path]");
    if (back) back.href = `path.html?service=${encodeURIComponent(service)}`;

    const heading = document.querySelector("[data-order-heading]");
    const lead = document.querySelector("[data-order-lead]");

    if (mode === "menu") {
      if (heading) heading.textContent = "Menu";
      if (lead) lead.textContent = "Add dishes to your basket. Change quantities anytime.";
      if (panelMenu) panelMenu.hidden = false;
      if (panelKnow) panelKnow.hidden = true;
      initMenuPanel();
    } else {
      if (heading) heading.textContent = "What would you like?";
      if (lead) lead.textContent = "Describe your order — we’ll match dishes from the menu.";
      if (panelMenu) panelMenu.hidden = true;
      if (panelKnow) panelKnow.hidden = false;
      initKnowPanel();
    }

    renderCartChrome();
  }

  function initMenuPanel() {
    const menu = window.CornerCafeMenu || [];
    const filters = document.querySelector("[data-menu-filters]");
    const list = document.querySelector("[data-menu-list]");
    if (!filters || !list) return;

    const sections = ["Breakfast", "Lunch", "Tea", "Drinks", "Indian", "Kebab", "Pizza"].filter((s) =>
      menu.some((item) => item.section === s)
    );
    let active = sections[0] || "Breakfast";

    const findItem = (id) => menu.find((m) => m.id === id);

    const renderFilters = () => {
      filters.innerHTML = "";
      sections.forEach((section) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "menu-filter" + (section === active ? " is-active" : "");
        btn.textContent = section;
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", section === active ? "true" : "false");
        btn.addEventListener("click", () => {
          active = section;
          renderFilters();
          renderList();
        });
        filters.appendChild(btn);
      });
    };

    const renderList = () => {
      list.innerHTML = "";
      const items = menu.filter((item) => item.section === active);
      let lastGroup = "";
      items.forEach((item) => {
        const group = item.group || "";
        if (group && group !== lastGroup) {
          const h = document.createElement("h3");
          h.className = "menu-group";
          h.textContent = group;
          list.appendChild(h);
          lastGroup = group;
        }
        const row = document.createElement("div");
        row.className = "menu-item" + (qtyOf(item.id) > 0 ? " is-in-basket" : "");
        const qty = qtyOf(item.id);
        row.innerHTML = `
          <span class="menu-item__copy">
            <span class="menu-item__name">${item.name}</span>
            ${item.desc ? `<span class="menu-item__desc">${item.desc}</span>` : ""}
          </span>
          <span class="menu-item__actions">
            <span class="menu-item__price">${priceText(item)}</span>
            ${qtyControlsHtml(item, qty)}
          </span>
        `;
        bindQtyControls(row, findItem);
        list.appendChild(row);
      });
    };

    menuRenderList = renderList;
    renderFilters();
    renderList();
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s&']/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !["and", "the", "with", "for", "please", "want", "like", "some", "a", "an", "of", "my", "me"].includes(t));
  }

  function scoreItem(item, tokens) {
    const hay = `${item.name} ${item.desc} ${(item.tags || []).join(" ")}`.toLowerCase();
    let score = 0;
    tokens.forEach((token) => {
      if (hay.includes(token)) score += token.length > 4 ? 3 : 2;
      (item.tags || []).forEach((tag) => {
        if (tag === token) score += 4;
        else if (tag.startsWith(token) || token.startsWith(tag)) score += 2;
      });
      if (item.name.toLowerCase().includes(token)) score += 2;
    });
    return score;
  }

  function matchOrder(query) {
    const menu = window.CornerCafeMenu || [];
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    const chunks = String(query)
      .split(/,| and |&|\+| then | also /i)
      .map((c) => c.trim())
      .filter(Boolean);

    const results = [];
    const used = new Set();

    const pushBest = (chunkTokens) => {
      let best = null;
      let bestScore = 0;
      menu.forEach((item) => {
        if (used.has(item.id)) return;
        const s = scoreItem(item, chunkTokens);
        if (s > bestScore) {
          bestScore = s;
          best = item;
        }
      });
      if (best && bestScore >= 3) {
        used.add(best.id);
        results.push({ item: best, score: bestScore });
      }
    };

    if (chunks.length > 1) {
      chunks.forEach((chunk) => pushBest(tokenize(chunk)));
    }

    if (!results.length) {
      menu
        .map((item) => ({ item, score: scoreItem(item, tokens) }))
        .filter((r) => r.score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .forEach((r) => results.push(r));
    }

    return results;
  }

  function initKnowPanel() {
    const form = document.querySelector("[data-know-form]");
    const results = document.querySelector("[data-know-results]");
    if (!form || !results) return;

    const findItem = (id) => (window.CornerCafeMenu || []).find((m) => m.id === id);

    const renderMatches = (matches) => {
      results.hidden = false;
      results.innerHTML = "";
      const status = document.createElement("p");
      status.className = "know-status";

      if (!matches.length) {
        status.textContent = "No clear match — try a dish name from the menu.";
        results.appendChild(status);
        return;
      }

      status.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"}`;
      results.appendChild(status);

      const list = document.createElement("div");
      list.className = "know-match-list";
      matches.forEach(({ item }) => {
        const row = document.createElement("div");
        row.className = "know-match";
        const qty = qtyOf(item.id);
        row.innerHTML = `
          <span class="know-match__copy">
            <span class="know-match__name">${item.name}</span>
            <span class="know-match__meta">${item.section}${item.desc ? ` · ${item.desc}` : ""} · ${priceText(item)}</span>
          </span>
          ${qtyControlsHtml(item, qty)}
        `;
        bindQtyControls(row, findItem);
        list.appendChild(row);
      });
      results.appendChild(list);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("[name=want]");
      const query = (input?.value || "").trim();
      renderMatches(matchOrder(query));
    });
  }

  function orderReference() {
    const cfg = window.SmOS_CC_Payments || {};
    const prefix = cfg.referencePrefix || "CC";
    let ref = "";
    try {
      ref = sessionStorage.getItem("corner-cafe-pay-ref") || "";
    } catch (e) {
      /* ignore */
    }
    if (!ref) {
      const stamp = Date.now().toString(36).toUpperCase().slice(-6);
      const rand = Math.floor(Math.random() * 90 + 10);
      ref = `${prefix}-${stamp}${rand}`;
      try {
        sessionStorage.setItem("corner-cafe-pay-ref", ref);
      } catch (e) {
        /* ignore */
      }
    }
    return ref;
  }

  function initCheckout() {
    const rootEl = document.querySelector("[data-checkout]");
    if (!rootEl) return;

    const service = params.get("service") || "";
    const mode = params.get("mode") || "menu";
    if (!serviceLabels[service] || cartCount() <= 0) {
      window.location.replace(serviceLabels[service] ? `order.html?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}` : "./");
      return;
    }

    try {
      sessionStorage.setItem(SERVICE_KEY, service);
      sessionStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      /* ignore */
    }

    const serviceEl = document.querySelector("[data-order-service]");
    if (serviceEl) serviceEl.textContent = serviceLabels[service];

    const back = document.querySelector("[data-back-order]");
    if (back) back.href = `order.html?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}`;

    const addressField = document.querySelector("[data-field-address]");
    if (addressField) {
      addressField.hidden = service !== "delivery";
      const ta = addressField.querySelector("textarea");
      if (ta) ta.required = service === "delivery";
    }

    const linesEl = document.querySelector("[data-checkout-lines]");
    const totalEl = document.querySelector("[data-checkout-total]");
    const refEl = document.querySelector("[data-checkout-ref]");
    const ref = orderReference();
    if (refEl) refEl.textContent = ref;
    if (totalEl) totalEl.textContent = money(cartTotal());
    if (linesEl) {
      linesEl.innerHTML = "";
      cart.forEach((line) => {
        const li = document.createElement("li");
        li.className = "checkout-line";
        li.innerHTML = `<span>${line.qty}× ${line.name}</span><span>${money(line.qty * line.price)}</span>`;
        linesEl.appendChild(li);
      });
    }

    const cfg = window.SmOS_CC_Payments || { options: [] };
    const optionsRoot = document.querySelector("[data-pay-options]");
    const detailEl = document.querySelector("[data-pay-detail]");
    const placeBtn = document.querySelector("[data-place-order]");
    let selectedPay = null;

    const available = (cfg.options || []).filter((opt) =>
      (opt.availableFor || []).includes(service)
    );

    const bankBlock = (amount, payRef) => `
      <dl class="pay-bank">
        <div><dt>Payee</dt><dd>${cfg.payeeName || cfg.businessName || "The Corner Cafe"}</dd></div>
        <div><dt>Sort code</dt><dd>${cfg.sortCode || "—"}</dd></div>
        <div><dt>Account number</dt><dd>${cfg.accountNumber || "—"}</dd></div>
        <div><dt>Amount</dt><dd>${money(amount)}</dd></div>
        <div><dt>Reference</dt><dd><strong>${payRef}</strong></dd></div>
      </dl>
      <p class="pay-hint">Transfer the exact total and use this reference so the cafe can match your payment.</p>
    `;

    const showDetail = (opt) => {
      if (!detailEl) return;
      detailEl.hidden = false;
      if (opt.id === "bank-transfer") {
        detailEl.innerHTML = `<p class="pay-detail__summary">${opt.summary}</p>${bankBlock(cartTotal(), ref)}`;
      } else {
        detailEl.innerHTML = `<p class="pay-detail__summary">${opt.summary}</p>`;
      }
    };

    if (optionsRoot) {
      optionsRoot.innerHTML = "";
      available.forEach((opt, idx) => {
        const label = document.createElement("label");
        label.className = "pay-option";
        label.innerHTML = `
          <input type="radio" name="pay" value="${opt.id}" ${idx === 0 ? "checked" : ""}>
          <span class="pay-option__body">
            <span class="pay-option__name">${opt.name}</span>
            <span class="pay-option__fee">${opt.feeNote}</span>
          </span>
        `;
        const input = label.querySelector("input");
        input.addEventListener("change", () => {
          if (!input.checked) return;
          selectedPay = opt;
          showDetail(opt);
          if (placeBtn) placeBtn.disabled = false;
        });
        optionsRoot.appendChild(label);
      });

      if (available[0]) {
        selectedPay = available[0];
        showDetail(available[0]);
        if (placeBtn) placeBtn.disabled = false;
      }
    }

    document.querySelector("[data-checkout-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selectedPay || cartCount() <= 0) return;
      const form = event.target;
      const data = new FormData(form);
      const order = {
        ref,
        service,
        mode,
        payment: selectedPay.id,
        paymentName: selectedPay.name,
        total: cartTotal(),
        items: cart.slice(),
        name: String(data.get("name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        address: String(data.get("address") || "").trim(),
        notes: String(data.get("notes") || "").trim(),
        placedAt: new Date().toISOString(),
      };

      try {
        const history = JSON.parse(sessionStorage.getItem("corner-cafe-orders") || "[]");
        history.unshift(order);
        sessionStorage.setItem("corner-cafe-orders", JSON.stringify(history.slice(0, 20)));
        sessionStorage.removeItem("corner-cafe-pay-ref");
      } catch (e) {
        /* ignore */
      }

      clearCart();

      rootEl.querySelectorAll("[data-checkout-hide-on-done]").forEach((el) => {
        el.hidden = true;
      });

      const done = document.querySelector("[data-checkout-done]");
      const lead = document.querySelector("[data-done-lead]");
      const donePay = document.querySelector("[data-done-pay]");
      if (done) done.hidden = false;
      if (lead) {
        lead.textContent = `Thanks ${order.name}. Order ${order.ref} · ${serviceLabels[service]} · ${money(order.total)} · ${selectedPay.name}.`;
      }
      if (donePay) {
        if (selectedPay.id === "bank-transfer") {
          donePay.innerHTML = `<p class="pay-detail__summary">Complete your bank transfer now so the kitchen can prepare your order.</p>${bankBlock(order.total, order.ref)}`;
        } else if (selectedPay.id === "cash-collection") {
          donePay.innerHTML = `<p class="pay-detail__summary">Bring ${money(order.total)} in cash when you collect. Quote reference <strong>${order.ref}</strong>.</p>`;
        } else {
          donePay.innerHTML = `<p class="pay-detail__summary">Pay ${money(order.total)} at the cafe. Quote reference <strong>${order.ref}</strong>.</p>`;
        }
      }

      const heroLead = document.querySelector(".app-hero__lead");
      if (heroLead) heroLead.textContent = "Use the payment reference below when you pay.";
    });
  }

  initCheckout();
})();
