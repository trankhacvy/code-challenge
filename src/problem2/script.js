(function () {
  "use strict";

  const PRICES_URL = "https://interview.switcheo.com/prices.json";
  const ICON_URL = (currency) =>
    `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/${currency}.svg`;

  const DEBOUNCE_MS = 300;

  const state = {
    tokens: [],
    from: { token: null, balance: null, loadingBalance: false },
    to: { token: null, balance: null, loadingBalance: false },
    amount: "",
    quote: null,       // { amount, rate, slippage }
    loadingQuote: false,
    swapping: false,
    modalSide: null,   // "from" | "to"
    quoteVersion: 0,   // version counter to discard stale quotes
  };

  const elements = {
    form:            document.getElementById("swap-form"),
    fromAmountInput: document.getElementById("from-amount"),
    fromTokenBtn:    document.getElementById("from-token-btn"),
    fromBalanceEl:   document.getElementById("from-balance"),
    fromMaxBtn:      document.getElementById("from-max"),
    fromUsdEl:       document.getElementById("from-usd"),
    toAmountEl:      document.getElementById("to-amount"),
    toTokenBtn:      document.getElementById("to-token-btn"),
    toBalanceEl:     document.getElementById("to-balance"),
    toUsdEl:         document.getElementById("to-usd"),
    quoteSpinner:    document.getElementById("quote-spinner"),
    swapDirBtn:      document.getElementById("swap-dir"),
    rateEl:          document.getElementById("rate"),
    messageEl:       document.getElementById("msg"),
    submitBtn:       document.getElementById("submit"),
    modal:           document.getElementById("modal"),
    modalCloseBtn:   document.getElementById("modal-close"),
    modalSearchInput: document.getElementById("modal-input"),
    modalListEl:     document.getElementById("modal-list"),
  };

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Deterministic pseudo-random from a string (for stable fake balances)
  function seedRandom(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++)
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
    return (hash % 10000) / 10000;
  }

  // Number formatting — adapts decimal places to magnitude
  function formatAmount(num) {
    if (!num || isNaN(num) || num === 0) return "0";
    const abs = Math.abs(num);
    if (abs >= 1e9)  return num.toExponential(2);
    if (abs >= 1e6)  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (abs >= 1e3)  return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
    if (abs >= 1)    return stripTrailingZeros(num.toFixed(6));
    if (abs >= 1e-6) return stripTrailingZeros(num.toFixed(10));
    return num.toExponential(4);
  }

  function formatRate(num) {
    if (!num || isNaN(num)) return "0";
    const abs = Math.abs(num);
    if (abs >= 1e3) return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (abs >= 1)   return stripTrailingZeros(num.toFixed(6));
    if (abs >= 1e-6) return stripTrailingZeros(num.toFixed(10));
    return num.toExponential(4);
  }

  function formatUsd(num) {
    if (!num || isNaN(num)) return "";
    return "\u2248 $" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatTokenPrice(price) {
    if (price >= 1)    return "$" + price.toFixed(2);
    if (price >= 0.01) return "$" + price.toFixed(4);
    return "$" + price.toPrecision(4);
  }

  function stripTrailingZeros(str) {
    return str.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  // Convert a number to a clean input-friendly string (no commas)
  function numberToInputValue(num) {
    if (!num || isNaN(num)) return "";
    return stripTrailingZeros(parseFloat(num.toPrecision(10)).toFixed(12));
  }

  // Simulates GET /api/balance?token=XXX
  // Returns a deterministic fake balance based on token name & price tier
  function simulateFetchBalance(token) {
    return delay(400 + Math.random() * 600).then(() => {
      const rand = seedRandom(token.currency);
      if (token.price > 1000) return +(0.05 + rand * 4.95).toFixed(6);   // expensive (ETH, WBTC)
      if (token.price > 10)   return +(5 + rand * 495).toFixed(4);       // mid-range (ATOM, OKB)
      if (token.price > 0.1)  return +(100 + rand * 49900).toFixed(2);   // cheap (OSMO, STRD)
      return +(10000 + rand * 4990000).toFixed(0);                        // very cheap (SWTH, ZIL)
    });
  }

  // Simulates POST /api/quote { from, to, amount }
  // Returns a quote with slight slippage, like a real DEX aggregator
  function simulateFetchQuote(fromToken, toToken, amount) {
    return delay(600 + Math.random() * 900).then(() => {
      const baseRate = fromToken.price / toToken.price;
      const slippageFactor = 0.997 + Math.random() * 0.004; // 0.1% – 0.7%
      const effectiveRate = baseRate * slippageFactor;
      return {
        amount: amount * effectiveRate,
        rate: effectiveRate,
        slippage: ((1 - slippageFactor) * 100).toFixed(2),
      };
    });
  }

  function loadTokens() {
    return fetch(PRICES_URL)
      .then((response) => response.json())
      .then((data) => {
        // Deduplicate: keep latest entry per currency, skip zero-price
        const tokenMap = {};
        data.forEach((entry) => {
          if (!entry.price || entry.price <= 0) return;
          const existing = tokenMap[entry.currency];
          if (!existing || new Date(entry.date) > new Date(existing.date)) {
            tokenMap[entry.currency] = entry;
          }
        });
        state.tokens = Object.keys(tokenMap)
          .map((key) => ({
            currency: key,
            price: tokenMap[key].price,
            icon: ICON_URL(key),
          }))
          .sort((a, b) => a.currency.localeCompare(b.currency));
      });
  }

  // Render helpers
  function buildTokenBtnHTML(token) {
    if (!token) {
      return '<span class="token-placeholder">Select token</span>' +
        '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    }
    return `<img class="icon" src="${token.icon}" alt="${token.currency}" ` +
      `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` +
      `<span class="icon-fallback" style="display:none">${token.currency.slice(0, 2)}</span>` +
      `<span>${token.currency}</span>` +
      '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  }

  function renderTokenButton(side) {
    const button = side === "from" ? elements.fromTokenBtn : elements.toTokenBtn;
    button.innerHTML = buildTokenBtnHTML(state[side].token);
  }

  function renderBalance(side) {
    const sideState = state[side];
    const balanceEl = side === "from" ? elements.fromBalanceEl : elements.toBalanceEl;

    if (!sideState.token) {
      balanceEl.textContent = "";
      if (side === "from") elements.fromMaxBtn.hidden = true;
      return;
    }
    if (sideState.loadingBalance) {
      balanceEl.innerHTML = '<span class="skeleton">Balance: 0000.00</span>';
      if (side === "from") elements.fromMaxBtn.hidden = true;
      return;
    }
    if (sideState.balance !== null) {
      balanceEl.textContent = "Balance: " + formatAmount(sideState.balance);
      if (side === "from") elements.fromMaxBtn.hidden = false;
    }
  }

  function renderReceiveAmount() {
    if (state.loadingQuote) {
      elements.toAmountEl.textContent = "";
      elements.quoteSpinner.hidden = false;
      elements.toUsdEl.textContent = "";
      return;
    }
    elements.quoteSpinner.hidden = true;
    if (!state.quote || !state.amount) {
      elements.toAmountEl.textContent = "0";
      elements.toUsdEl.textContent = "";
      return;
    }
    elements.toAmountEl.textContent = formatAmount(state.quote.amount);
    if (state.to.token) {
      elements.toUsdEl.textContent = formatUsd(state.quote.amount * state.to.token.price);
    }
  }

  function renderFromUsd() {
    const num = parseFloat(state.amount);
    if (!state.from.token || !num || isNaN(num)) {
      elements.fromUsdEl.textContent = "";
      return;
    }
    elements.fromUsdEl.textContent = formatUsd(num * state.from.token.price);
  }

  function renderExchangeRate() {
    if (!state.from.token || !state.to.token || !state.quote) {
      elements.rateEl.textContent = "";
      return;
    }
    elements.rateEl.textContent =
      `1 ${state.from.token.currency} = ${formatRate(state.quote.rate)} ` +
      `${state.to.token.currency}  (${state.quote.slippage}% slippage)`;
  }

  // Dynamic submit-button text
  function updateSubmitButton() {
    if (state.swapping) return;
    const button = elements.submitBtn;
    if (!state.from.token || !state.to.token) {
      button.textContent = "Select tokens";
      button.disabled = true;
      return;
    }
    if (state.from.token.currency === state.to.token.currency) {
      button.textContent = "Select different tokens";
      button.disabled = true;
      return;
    }
    const num = parseFloat(state.amount);
    if (!state.amount || isNaN(num) || num <= 0) {
      button.textContent = "Enter an amount";
      button.disabled = true;
      return;
    }
    if (state.from.balance !== null && num > state.from.balance) {
      button.textContent = `Insufficient ${state.from.token.currency} balance`;
      button.disabled = true;
      return;
    }
    if (state.loadingQuote) {
      button.textContent = "Fetching quote\u2026";
      button.disabled = true;
      return;
    }
    if (!state.quote) {
      button.textContent = "Enter an amount";
      button.disabled = true;
      return;
    }
    button.textContent = "Confirm Swap";
    button.disabled = false;
  }

  function showMessage(text, type) {
    elements.messageEl.textContent = text;
    elements.messageEl.className = "msg msg-" + type;
    elements.messageEl.hidden = false;
  }

  function clearMessage() {
    elements.messageEl.hidden = true;
  }

  // Token modal
  function openModal(side) {
    state.modalSide = side;
    elements.modalSearchInput.value = "";
    renderTokenList("");
    elements.modal.classList.add("open");
    setTimeout(() => elements.modalSearchInput.focus(), 50);
  }

  function closeModal() {
    elements.modal.classList.remove("open");
    state.modalSide = null;
  }

  function renderTokenList(filter) {
    const query = filter.toLowerCase();
    const matches = state.tokens.filter((token) =>
      token.currency.toLowerCase().includes(query)
    );

    if (!matches.length) {
      elements.modalListEl.innerHTML = '<div class="modal-empty">No tokens found</div>';
      return;
    }

    elements.modalListEl.innerHTML = matches.map((token) =>
      `<button type="button" class="modal-item" data-currency="${token.currency}">` +
      `<img class="icon" src="${token.icon}" alt="${token.currency}" ` +
      `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` +
      `<span class="icon-fallback" style="display:none">${token.currency.slice(0, 2)}</span>` +
      `<div class="modal-item-info"><span class="modal-item-name">${token.currency}</span>` +
      `<span class="modal-item-price">${formatTokenPrice(token.price)}</span></div></button>`
    ).join("");
  }

  function selectToken(side, currency) {
    const token = state.tokens.find((t) => t.currency === currency);
    if (!token) return;

    state[side].token = token;
    state[side].balance = null;
    state[side].loadingBalance = true;

    renderTokenButton(side);
    renderBalance(side);
    closeModal();
    clearMessage();
    updateSubmitButton();

    simulateFetchBalance(token).then((balance) => {
      if (state[side].token && state[side].token.currency === currency) {
        state[side].balance = balance;
        state[side].loadingBalance = false;
        renderBalance(side);
        updateSubmitButton();
      }
    });

    requestQuote();
  }

  // Quote fetching with debounce
  // The input handler is debounced so we don't call requestQuote on every keystroke.
  // Inside requestQuote, a version counter discards stale responses.
  function requestQuote() {
    const num = parseFloat(state.amount);

    if (!state.from.token || !state.to.token || !num || isNaN(num) || num <= 0 ||
        state.from.token.currency === state.to.token.currency) {
      state.quote = null;
      state.loadingQuote = false;
      renderReceiveAmount();
      renderExchangeRate();
      updateSubmitButton();
      return;
    }

    state.loadingQuote = true;
    state.quote = null;
    renderReceiveAmount();
    updateSubmitButton();

    const version = ++state.quoteVersion;

    simulateFetchQuote(state.from.token, state.to.token, num).then((quote) => {
      if (version !== state.quoteVersion) return; // stale, discard
      state.quote = quote;
      state.loadingQuote = false;
      renderReceiveAmount();
      renderExchangeRate();
      updateSubmitButton();
    });
  }

  // Debounced wrapper: waits for user to stop typing before fetching a quote
  const debouncedRequestQuote = debounce(requestQuote, DEBOUNCE_MS);

  elements.fromAmountInput.addEventListener("input", (event) => {
    const value = event.target.value.replace(/,/g, "");
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      state.amount = value;
      event.target.value = value;
      clearMessage();
      renderFromUsd();
      debouncedRequestQuote();
    } else {
      event.target.value = state.amount;
    }
  });

  elements.fromTokenBtn.addEventListener("click", () => openModal("from"));
  elements.toTokenBtn.addEventListener("click", () => openModal("to"));

  elements.swapDirBtn.addEventListener("click", () => {
    const previousQuote = state.quote;
    const temp = state.from;
    state.from = state.to;
    state.to = temp;

    if (previousQuote && previousQuote.amount) {
      state.amount = numberToInputValue(previousQuote.amount);
      elements.fromAmountInput.value = state.amount;
    }

    state.quote = null;
    renderTokenButton("from");
    renderTokenButton("to");
    renderBalance("from");
    renderBalance("to");
    renderFromUsd();
    renderReceiveAmount();
    renderExchangeRate();
    clearMessage();
    requestQuote();
  });

  elements.fromMaxBtn.addEventListener("click", () => {
    if (state.from.balance !== null) {
      state.amount = numberToInputValue(state.from.balance);
      elements.fromAmountInput.value = state.amount;
      clearMessage();
      renderFromUsd();
      requestQuote();
    }
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (elements.submitBtn.disabled || state.swapping) return;

    state.swapping = true;
    elements.submitBtn.disabled = true;
    elements.submitBtn.innerHTML = '<span class="btn-spinner"></span> Swapping\u2026';
    clearMessage();

    delay(2000).then(() => {
      state.swapping = false;
      state.amount = "";
      state.quote = null;
      elements.fromAmountInput.value = "";
      renderFromUsd();
      renderReceiveAmount();
      renderExchangeRate();
      updateSubmitButton();
      showMessage("Swap completed successfully!", "success");
    });
  });

  elements.modalCloseBtn.addEventListener("click", closeModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });
  elements.modalSearchInput.addEventListener("input", (event) => {
    renderTokenList(event.target.value);
  });
  elements.modalListEl.addEventListener("click", (event) => {
    const item = event.target.closest(".modal-item");
    if (item) selectToken(state.modalSide, item.dataset.currency);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.modal.classList.contains("open")) closeModal();
  });

  // Init
  (function init() {
    elements.submitBtn.textContent = "Loading tokens\u2026";
    elements.submitBtn.disabled = true;
    loadTokens()
      .then(() => updateSubmitButton())
      .catch(() => {
        showMessage("Failed to load tokens. Please refresh the page.", "error");
        elements.submitBtn.textContent = "Unable to load";
      });
  })();
})();
