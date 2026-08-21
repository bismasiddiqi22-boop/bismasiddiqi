(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      themeToggle.setAttribute("aria-label", "Switch to dark theme");
    } else {
      root.removeAttribute("data-theme");
      themeToggle.setAttribute("aria-label", "Switch to light theme");
    }
  }

  var savedTheme = localStorage.getItem("bisma-theme");
  applyTheme(savedTheme === "light" ? "light" : "dark");

  themeToggle.addEventListener("click", function () {
    var isLight = root.getAttribute("data-theme") === "light";
    var next = isLight ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("bisma-theme", next);
  });

  /* ---------- Nav docking on scroll ---------- */
  var nav = document.getElementById("nav");
  function updateNav() {
    if (window.scrollY > 80) {
      nav.classList.add("docked");
    } else {
      nav.classList.remove("docked");
    }
  }
  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function closeMobileNav() {
    nav.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }
  function openMobileNav() {
    nav.classList.add("nav-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
  }

  navToggle.addEventListener("click", function () {
    if (nav.classList.contains("nav-open")) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMobileNav);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("nav-open")) {
      closeMobileNav();
      navToggle.focus();
    }
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("nav-open") && !nav.contains(e.target)) {
      closeMobileNav();
    }
  });

  /* ---------- Hero text reveal ---------- */
  var heroTitle = document.querySelector(".hero-title");
  requestAnimationFrame(function () {
    setTimeout(function () {
      heroTitle.classList.add("in-view");
      document.querySelector(".hero-top .reveal-line").classList.add("in-view");
    }, 150);
  });

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Marquee speed via data-speed ---------- */
  document.querySelectorAll(".marquee[data-speed]").forEach(function (m) {
    var track = m.querySelector(".marquee-track");
    if (track) track.style.animationDuration = m.getAttribute("data-speed") + "s";
  });

  /* ---------- Cursor label on project cards ---------- */
  var cursorLabel = document.getElementById("cursorLabel");
  var hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (hasFinePointer) {
    document.addEventListener("mousemove", function (e) {
      cursorLabel.style.left = e.clientX + "px";
      cursorLabel.style.top = e.clientY + "px";
    });

    document.querySelectorAll(".pcard").forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        document.body.classList.add("is-hovering");
      });
      card.addEventListener("mouseleave", function () {
        document.body.classList.remove("is-hovering");
      });
    });
  }

  /* ---------- Smooth-scroll for nav / in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length > 1) {
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }
    });
  });

  /* ---------- Number roll-up on scroll ---------- */
  var numbersSection = document.querySelector(".numbers-section");
  if (numbersSection) {
    var countEls = numbersSection.querySelectorAll(".count[data-to]");

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function runCountUp() {
      var duration = reduceMotion ? 0 : 1400;
      countEls.forEach(function (el, i) {
        var target = parseInt(el.getAttribute("data-to"), 10) || 0;
        if (duration === 0) {
          el.textContent = target;
          return;
        }
        var delay = i * 80;
        var start = null;
        setTimeout(function () {
          function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            el.textContent = Math.round(target * easeOutExpo(progress));
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }, delay);
      });
    }

    if ("IntersectionObserver" in window && countEls.length) {
      var countIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              runCountUp();
              countIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      countIo.observe(numbersSection);
    } else {
      countEls.forEach(function (el) { el.textContent = el.getAttribute("data-to"); });
    }
  }

  /* ---------- Contact modal ---------- */
  var letsTalkBtns = document.querySelectorAll(".js-open-contact");
  var modalBackdrop = document.getElementById("contactModalBackdrop");
  var modalClose = document.getElementById("contactModalClose");
  var contactForm = document.getElementById("contactForm");
  var lastFocusedEl = null;

  function openContactModal(e) {
    if (e) e.preventDefault();
    lastFocusedEl = document.activeElement;
    modalBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(function () {
      modalBackdrop.classList.add("open");
    });
    var firstField = document.getElementById("cfName");
    setTimeout(function () { firstField.focus(); }, 50);
  }

  function closeContactModal() {
    modalBackdrop.classList.remove("open");
    document.body.classList.remove("modal-open");
    setTimeout(function () { modalBackdrop.hidden = true; }, reduceMotion ? 0 : 350);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  if (letsTalkBtns.length && modalBackdrop) {
    letsTalkBtns.forEach(function (btn) {
      btn.addEventListener("click", openContactModal);
    });
    modalClose.addEventListener("click", closeContactModal);
    modalBackdrop.addEventListener("click", function (e) {
      if (e.target === modalBackdrop) closeContactModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalBackdrop.classList.contains("open")) {
        closeContactModal();
      }
    });

    // Basic focus trap while the modal is open.
    modalBackdrop.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusables = modalBackdrop.querySelectorAll('input, textarea, button, [href]');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("cfName").value.trim();
      var phone = document.getElementById("cfPhone").value.trim();
      var email = document.getElementById("cfEmail").value.trim();
      var message = document.getElementById("cfMessage").value.trim();

      var subject = encodeURIComponent("New inquiry from " + name);
      var bodyLines = [
        "Name: " + name,
        "Phone: " + (phone || "—"),
        "Email: " + email,
        "",
        message
      ];
      var body = encodeURIComponent(bodyLines.join("\n"));

      window.location.href = "mailto:bismasiddiqi22@gmail.com?subject=" + subject + "&body=" + body;
      closeContactModal();
      contactForm.reset();
    });
  }
})();
