/* =========================================================
   FAQ BTicino – Core + Modal + EmailJS (riutilizzabile)
   Version: 1.0
   Richiede: EmailJS browser lib già caricata nella pagina
   Config: window.FAQ_BTICINO_CONFIG (vedi index.html)
========================================================= */

(function () {
  const C = window.FAQ_BTICINO_CONFIG || {};

  // ---------- Util ----------
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, html = "") => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (html) n.innerHTML = html;
    return n;
  };

  function normalizeEmail(email){
    return (email || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\u00A0/g, "");
  }

  function escapeHtml(str){
    return (str || "").replace(/[&<>"']/g, s => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[s]));
  }

  function uniq(arr){
    return [...new Set(arr)].sort((a,b)=>a.localeCompare(b,"it"));
  }

  // ---------- Inject CSS (modal + toast + ok dialog) ----------
  function injectCss(){
    if ($("#btFaqCss")) return;
    const css = `
      /* Modal overlay */
      .bt-modal-overlay{
        position:fixed; inset:0;
        background: rgba(15,15,16,.55);
        display:none;
        align-items:center;
        justify-content:center;
        padding: 18px;
        z-index: 9999;
      }
      .bt-modal-overlay.open{ display:flex; }
      .bt-modal{
        width:100%;
        max-width: 820px;
        background:#fff;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
        border: 1px solid rgba(15,15,16,.12);
        overflow:hidden;
      }
      .bt-modal-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding: 12px 16px;
        background:#fff;
        border-bottom: 6px solid ${C.brand_orange || "#ff6a00"};
      }
      .bt-modal-title{ font-weight:800; font-size:16px; }
      .bt-modal-close{
        background: transparent;
        border: 1px solid rgba(15,15,16,.18);
        color: #111;
        width: 42px;
        height: 38px;
        border-radius: 10px;
        cursor:pointer;
        position:relative;
        overflow:hidden;
        transition: transform .18s ease;
      }
      .bt-modal-close span{
        position:absolute;
        left: 50%;
        top: 50%;
        width: 18px;
        height: 2px;
        background: #111;
        border-radius: 999px;
        transform-origin:center;
      }
      .bt-modal-close span:nth-child(1){ transform: translate(-50%,-50%) rotate(45deg); }
      .bt-modal-close span:nth-child(2){ transform: translate(-50%,-50%) rotate(-45deg); }
      .bt-modal-close:hover{
        transform: rotate(8deg) scale(1.03);
        border-color: rgba(255,106,0,.65);
        box-shadow: 0 0 0 3px rgba(255,106,0,.12);
      }
      .bt-modal-body{
        padding: 16px;
        max-height: calc(100vh - 140px);
        overflow:auto;
      }
      .bt-msg{
        display:none;
        padding:10px;
        border-radius:12px;
        margin-bottom: 12px;
        font-weight:700;
      }
      .bt-msg.ok{ background:#e9fff0; border:1px solid #b7f0c9; color:#064e1a; display:block; }
      .bt-msg.err{ background:#ffecec; border:1px solid #ffbcbc; color:#7a0b0b; display:block; }

      /* Toast (auto-hide 4s) */
      .bt-toast{
        position:fixed;
        top:18px;
        right:18px;
        z-index: 10000;
        background:#fff;
        border:1px solid rgba(15,15,16,.12);
        box-shadow: 0 16px 40px rgba(0,0,0,.18);
        border-left: 6px solid ${C.brand_orange || "#ff6a00"};
        border-radius: 14px;
        padding: 12px 14px;
        min-width: 260px;
        max-width: 360px;
        opacity:0;
        transform: translateY(-8px);
        pointer-events:none;
        transition: opacity .18s ease, transform .18s ease;
      }
      .bt-toast.show{ opacity:1; transform: translateY(0); }
      .bt-toast strong{ display:block; font-size:14px; margin-bottom:4px; }
      .bt-toast p{ margin:0; font-size:12px; opacity:.8; }

      /* OK dialog (blocca chiusura finché OK) */
      .bt-ok-overlay{
        position:fixed; inset:0;
        background: rgba(15,15,16,.55);
        display:none;
        align-items:center;
        justify-content:center;
        padding:18px;
        z-index: 10001;
      }
      .bt-ok-overlay.open{ display:flex; }
      .bt-ok-card{
        width:100%;
        max-width: 520px;
        background:#fff;
        border-radius: 14px;
        border:1px solid rgba(15,15,16,.12);
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
        padding: 14px;
      }
      .bt-ok-card h4{ margin:0; font-size:16px; font-weight:900; }
      .bt-ok-card p{ margin:8px 0 12px; font-size:13px; opacity:.85; line-height:1.35; }
      .bt-ok-actions{ display:flex; justify-content:flex-end; }
      .bt-ok-btn{
        border:0;
        border-radius: 12px;
        padding:10px 14px;
        cursor:pointer;
        font-weight: 900;
        background:${C.brand_orange || "#ff6a00"};
        color:#111;
      }
    `;
    const style = el("style", { id: "btFaqCss" }, css);
    document.head.appendChild(style);
  }

  // ---------- Inject Modal HTML (riutilizzabile) ----------
  function injectModalHtml(){
    if ($("#btModalOverlay")) return;

    // Toast
    const toast = el("div", { class: "bt-toast", id: "btToast" }, `<strong></strong><p></p>`);
    document.body.appendChild(toast);

    // OK dialog
    const ok = el("div", { class: "bt-ok-overlay", id: "btOkOverlay", "aria-hidden":"true" }, `
      <div class="bt-ok-card">
        <h4 id="btOkTitle">Messaggio inviato</h4>
        <p id="btOkText">Grazie! Abbiamo ricevuto la tua richiesta. Ti risponderemo via email.</p>
        <div class="bt-ok-actions">
          <button class="bt-ok-btn" id="btOkBtn" type="button">OK</button>
        </div>
      </div>
    `);
    document.body.appendChild(ok);

    // Modal
    const modal = el("div", { class:"bt-modal-overlay", id:"btModalOverlay", "aria-hidden":"true" }, `
      <div class="bt-modal" role="dialog" aria-modal="true" aria-labelledby="btModalTitle">
        <div class="bt-modal-header">
          <div class="bt-modal-title" id="btModalTitle">${escapeHtml(C.modal_title || "Invia una domanda al team")}</div>
          <button type="button" class="bt-modal-close" id="btCloseModalBtn" aria-label="Chiudi">
            <span></span><span></span>
          </button>
        </div>
        <div class="bt-modal-body">
          <div id="btMsgBox" class="bt-msg"></div>

          <form id="btAskForm">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <input id="btName" name="name" placeholder="Nome e Cognome" required />
              <input id="btEmail" name="email" type="email" placeholder="Email" required />
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
              <select id="btRole" name="role" required>
                <option value="">Ruolo…</option>
              </select>

              <select id="btCategory" name="category" required>
                <option value="">Categoria…</option>
              </select>
            </div>

            <textarea id="btMessage" name="message" placeholder="Scrivi qui la tua domanda…" rows="4" style="margin-top:10px;" required></textarea>

            <div style="display:flex; gap:10px; margin-top:10px; align-items:center;">
              <button id="btSendBtn" type="submit" style="border:0;border-radius:12px;padding:10px 14px;font-weight:900;background:${C.brand_orange || "#ff6a00"};color:#111;cursor:pointer;">
                Invia
              </button>
              <span style="font-size:12px; opacity:.75;" id="btSendHint"></span>
            </div>
          </form>
        </div>
      </div>
    `);
    document.body.appendChild(modal);
  }

  // ---------- Toast + OK dialog ----------
  let toastTimer = null;
  function showToast(title, message, ms = 4000){
    const t = $("#btToast");
    if(!t) return;
    t.querySelector("strong").textContent = title || "";
    t.querySelector("p").textContent = message || "";
    t.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  function openOkDialog(){
    const o = $("#btOkOverlay");
    if(!o) return;
    o.classList.add("open");
    o.setAttribute("aria-hidden","false");
  }
  function closeOkDialog(){
    const o = $("#btOkOverlay");
    if(!o) return;
    o.classList.remove("open");
    o.setAttribute("aria-hidden","true");
  }

  // ---------- Modal open/close ----------
  let lockClose = false; // blocca chiusura mentre aspetti OK
  function openModal(){
    const overlay = $("#btModalOverlay");
    const msg = $("#btMsgBox");
    if(!overlay) return;
    if(msg){ msg.className="bt-msg"; msg.style.display="none"; msg.textContent=""; }
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    setTimeout(() => $("#btName")?.focus(), 80);
  }
  function closeModal(){
    if(lockClose) return;
    const overlay = $("#btModalOverlay");
    if(!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
  }

  function showMsg(type, text){
    const msg = $("#btMsgBox");
    if(!msg) return;
    msg.className = "bt-msg " + (type === "ok" ? "ok" : "err");
    msg.textContent = text || "";
  }

  // ---------- Allowed emails (whitelist) ----------
  let allowedReady = false;
  let ALLOWED = new Set();

  async function loadAllowedEmails(){
    allowedReady = false;
    ALLOWED = new Set();
    if(!C.allowed_emails_url) { allowedReady = true; return; }

    try{
      const res = await fetch(C.allowed_emails_url + "?v=" + Date.now(), { cache:"no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status);
      const list = await res.json();
      if(!Array.isArray(list)) throw new Error("allowed_emails.json non è un array");
      ALLOWED = new Set(list.map(normalizeEmail));
      allowedReady = true;
    }catch(e){
      // fallback: puoi decidere se bloccare o no
      allowedReady = false;
      console.error("Errore loadAllowedEmails:", e);
    }
  }

  function isAllowedDomain(email){
    const domain = (email.split("@")[1] || "").toLowerCase();
    return (C.allowed_domains || ["bticino.com","legrand.com","legrand-ext.com"]).includes(domain);
  }

  function isAllowedEmail(email){
    const n = normalizeEmail(email);
    if(!n) return false;

    // se whitelist caricata e NON vuota -> deve esserci
    if(ALLOWED.size > 0){
      return ALLOWED.has(n);
    }
    // se whitelist non usata o vuota -> dominio
    return isAllowedDomain(n);
  }

  // ---------- Populate roles/categories ----------
  function fillSelect(selectEl, items, placeholder){
    if(!selectEl) return;
    selectEl.innerHTML = `<option value="">${escapeHtml(placeholder || "Seleziona…")}</option>` +
      items.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  }

  // ---------- Public API per pagina: setCategories, setRoles ----------
  let currentCategories = [];
  let currentRoles = [];

  function setCategories(categories){
    currentCategories = categories || [];
    fillSelect($("#btCategory"), currentCategories, "Categoria…");
  }
  function setRoles(roles){
    currentRoles = roles || [];
    fillSelect($("#btRole"), currentRoles, "Ruolo…");
  }

  // ---------- EmailJS init + send ----------
  function initEmailJs(){
    if(!window.emailjs) return;
    if(!C.emailjs_public_key) return;
    window.emailjs.init({ publicKey: C.emailjs_public_key });
  }

  async function sendEmail(payload){
    if(!window.emailjs) throw new Error("EmailJS non caricato");
    if(!C.emailjs_service_id || !C.emailjs_template_id) throw new Error("EmailJS service/template non configurati");
    return window.emailjs.send(C.emailjs_service_id, C.emailjs_template_id, payload);
  }

  // ---------- Hook UI triggers ----------
  function hookTriggers(){
    const openBtn = $(C.open_button_selector || "#openAskBtn");
    if(openBtn){
      openBtn.addEventListener("click", openModal);
    }

    $("#btCloseModalBtn")?.addEventListener("click", closeModal);

    // click fuori chiude (solo se non lockClose)
    $("#btModalOverlay")?.addEventListener("click", (e) => {
      if(e.target && e.target.id === "btModalOverlay") closeModal();
    });

    // ESC chiude
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && $("#btModalOverlay")?.classList.contains("open")) closeModal();
    });

    // OK dialog button
    $("#btOkBtn")?.addEventListener("click", () => {
      closeOkDialog();
      lockClose = false;
      closeModal();
      $("#btAskForm")?.reset();
    });
  }

  // ---------- Form submit (1:1 con Sicuri e Connessi) ----------
  function hookForm(){
    const form = $("#btAskForm");
    const sendBtn = $("#btSendBtn");
    const sendHint = $("#btSendHint");

    if(!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // blocco invio se whitelist richiesta ma non pronta
      if(C.allowed_emails_url && !allowedReady){
        showMsg("err", "Attendi un secondo: sto caricando la lista utenti autorizzati. Riprova tra 2 secondi.");
        return;
      }

      const from_name = ($("#btName")?.value || "").trim();
      const from_email = normalizeEmail($("#btEmail")?.value || "");
      const role = ($("#btRole")?.value || "");
      const category = ($("#btCategory")?.value || "");
      const message = ($("#btMessage")?.value || "").trim();

      if(!from_name || !from_email || !role || !category || !message){
        showMsg("err", "Compila tutti i campi del form.");
        return;
      }

      if(!isAllowedEmail(from_email)){
        showMsg("err", "Invio non consentito: questa email non è autorizzata. Usa la tua email aziendale BTicino/Legrand.");
        return;
      }

      // payload STANDARD (uguale per tutte le FAQ)
      const payload = {
        to_email: C.admin_to_email || "",
        from_name,
        from_email,
        role,
        category,
        message,
        time: new Date().toLocaleString("it-IT"),
        faq_area: C.faq_area || (document.title || "FAQ")
      };

      try{
        if(sendBtn) sendBtn.disabled = true;
        if(sendHint) sendHint.textContent = "Invio in corso…";

        await sendEmail(payload);

        // 1:1 Sicuri e Connessi
        showMsg("ok", "Grazie! La tua domanda è stata inviata correttamente.");
        showToast("Domanda inviata", "Riceverai riscontro via email.", 4000);

        // blocco chiusura finché non OK
        lockClose = true;
        openOkDialog();

      }catch(err){
        console.error(err);
        showMsg("err", "Errore durante l’invio. Controlla configurazione EmailJS e riprova.");
      }finally{
        if(sendBtn) sendBtn.disabled = false;
        if(sendHint) sendHint.textContent = "";
      }
    });
  }

  // ---------- BOOT ----------
  async function boot(){
    injectCss();
    injectModalHtml();
    initEmailJs();
    hookTriggers();

    // carico whitelist (se presente)
    await loadAllowedEmails();

    // disabilita invio se whitelist richiesta e non caricata
    if(C.allowed_emails_url && !allowedReady){
      // non blocco apertura, ma blocco invio con messaggio
      console.warn("Whitelist non caricata, invio sarà bloccato finché non disponibile.");
    }

    // set iniziali (roles/cats)
    if(Array.isArray(C.roles)) setRoles(C.roles);
    if(Array.isArray(C.categories)) setCategories(C.categories);

    hookForm();
  }

  // espongo API per pagina (così ogni pagina può aggiornare categorie in runtime)
  window.BTFAQ = {
    boot,
    setCategories,
    setRoles,
    openModal,
    closeModal
  };

})();
