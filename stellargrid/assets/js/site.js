/* Stellar Grid — shared site behaviour (nav, theme, reveals, carousel, lead form). */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Lead form delivery.
     Paste a Formspree / Getform / Web3Forms endpoint here to receive
     enquiries by email. While it's empty, the form opens WhatsApp with
     the visitor's details pre-filled, so no lead is ever lost.
     ------------------------------------------------------------------ */
  var FORM_ENDPOINT = "";
  var WHATSAPP_NUMBER = "919777529953";

  var root = document.documentElement;
  root.classList.remove("no-js");

  /* ---------- Theme toggle (light / dark, remembers choice) ---------- */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- Mobile nav ---------- */
  var nav = document.querySelector(".gnav");
  var menuBtn = document.querySelector(".menu-btn");
  if (nav && menuBtn) {
    var setMenu = function (open) {
      nav.classList.toggle("open", open);
      document.body.classList.toggle("nav-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.querySelectorAll(".gnav-links a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 860) setMenu(false); });
  }

  /* ---------- Reveal on scroll + animated counters ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateCounter(el) {
    var target = Number(el.dataset.count);
    var suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target.toLocaleString("en-IN") + suffix; return; }
    var duration = 1600;
    var start = performance.now();
    function frame(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-IN") + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var watched = document.querySelectorAll(".reveal, [data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("show");
        if (entry.target.hasAttribute("data-count")) animateCounter(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    watched.forEach(function (el) { io.observe(el); });
  } else {
    watched.forEach(function (el) {
      el.classList.add("show");
      if (el.hasAttribute("data-count")) animateCounter(el);
    });
  }

  /* ---------- Hero: gentle zoom-out on scroll, video fallback ---------- */
  var heroImg = document.querySelector(".hero-media img");
  if (heroImg && !reduceMotion) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var p = Math.min(window.scrollY / window.innerHeight, 1);
        heroImg.style.setProperty("--hero-scale", (1.08 - p * 0.08).toFixed(4));
        ticking = false;
      });
    }, { passive: true });
  }
  var heroVideo = document.querySelector(".hero-media video");
  if (heroVideo) {
    var hideVideo = function () { heroVideo.style.display = "none"; };
    heroVideo.addEventListener("error", hideVideo, true);
    heroVideo.querySelectorAll("source").forEach(function (s) {
      s.addEventListener("error", function () { if (s === heroVideo.querySelector("source:last-of-type")) hideVideo(); });
    });
    if (reduceMotion) { heroVideo.pause(); hideVideo(); }
  }

  /* ---------- Highlights carousel (dots + autoplay) ---------- */
  document.querySelectorAll("[data-carousel]").forEach(function (section) {
    var rail = section.querySelector(".rail");
    var cards = Array.prototype.slice.call(section.querySelectorAll(".hl-card"));
    var dotsWrap = section.querySelector(".dots");
    var playBtn = section.querySelector(".play-btn");
    if (!rail || !cards.length || !dotsWrap) return;

    var dots = cards.map(function (_, i) {
      var b = document.createElement("button");
      b.className = "dot";
      b.type = "button";
      b.setAttribute("aria-label", "Go to highlight " + (i + 1));
      b.addEventListener("click", function () { stop(); go(i); });
      dotsWrap.appendChild(b);
      return b;
    });

    var active = 0;
    function go(i) {
      var card = cards[i];
      var pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      rail.scrollTo({ left: card.offsetLeft - pad, behavior: reduceMotion ? "auto" : "smooth" });
    }
    function update() {
      var pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      var x = rail.scrollLeft + pad;
      var best = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft - x);
        if (d < best) { best = d; active = i; }
      });
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) active = cards.length - 1;
      dots.forEach(function (d, i) { d.classList.toggle("active", i === active); });
    }
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    var timer = null;
    var playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    var pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>';
    function setBtn(playing) {
      if (!playBtn) return;
      playBtn.innerHTML = playing ? pauseIcon : playIcon;
      playBtn.setAttribute("aria-label", playing ? "Pause highlights" : "Play highlights");
    }
    function start() {
      if (timer) return;
      timer = setInterval(function () { go((active + 1) % cards.length); }, 5000);
      setBtn(true);
    }
    function stop() { clearInterval(timer); timer = null; setBtn(false); }
    if (playBtn) playBtn.addEventListener("click", function () { timer ? stop() : start(); });
    rail.addEventListener("pointerdown", stop);
    setBtn(false);
    if (!reduceMotion && "IntersectionObserver" in window) {
      var once = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { start(); once.disconnect(); }
      }, { threshold: 0.4 });
      once.observe(rail);
    }
  });

  /* ---------- Project filters ---------- */
  var filterBar = document.querySelector("[data-filters]");
  if (filterBar) {
    var items = document.querySelectorAll("[data-category]");
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (!btn) return;
      var f = btn.dataset.filter;
      filterBar.querySelectorAll(".filter").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      items.forEach(function (it) {
        var cats = it.dataset.category.split(" ");
        it.hidden = !(f === "all" || cats.indexOf(f) !== -1);
      });
    });
  }

  /* ---------- Lead form ---------- */
  var lead = document.querySelector("#leadForm");
  if (lead) {
    var status = lead.querySelector(".form-status");
    var show = function (msg, ok) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form-status show " + (ok ? "ok" : "err");
    };
    lead.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lead.checkValidity()) { lead.reportValidity(); return; }
      var data = new FormData(lead);
      var btn = lead.querySelector("button[type=submit]");

      if (FORM_ENDPOINT) {
        btn.disabled = true;
        fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error("bad status");
            lead.reset();
            show("Thank you. The Stellar Grid team will get back to you shortly.", true);
          })
          .catch(function () {
            show("Something went wrong sending the form. Please message us on WhatsApp instead.", false);
          })
          .finally(function () { btn.disabled = false; });
        return;
      }

      var bill = Number(data.get("monthly-electricity-bill") || 0).toLocaleString("en-IN");
      var msg = "Hi Stellar Grid, I'd like a solar proposal.\n\n" +
        "Name: " + data.get("name") + "\n" +
        "Monthly electricity bill: ₹" + bill + "\n" +
        "City: " + data.get("city") + "\n" +
        "State: " + data.get("state") + "\n" +
        "Pincode: " + data.get("pincode");
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
      show("Opening WhatsApp with your details. Just press send and the team will reply.", true);
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
