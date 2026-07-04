(function () {
  "use strict";

  const WEEKDAY_SLUGS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const SECTION_KEYS = ["marche", "verdure", "potages", "entrees"];

  const sectionMap = {
    marche: ["le marché", "le marche"],
    verdure: ["plats du jour", "verdure"],
    potages: ["potages du jour", "potages"],
    entrees: ["plats principaux", "entrees"],
  };

  function resolveSectionKey(heading) {
    if (heading.id) {
      for (let i = 0; i < SECTION_KEYS.length; i++) {
        const key = SECTION_KEYS[i];
        if (heading.id === key || heading.id.endsWith("-" + key)) {
          return key;
        }
      }
    }

    const text = normalize(heading.textContent);
    for (let i = 0; i < SECTION_KEYS.length; i++) {
      const key = SECTION_KEYS[i];
      if (sectionMap[key].some(function (match) { return text.includes(match); })) {
        return key;
      }
    }

    return null;
  }

  function normalize(text) {
    return text.trim().toLowerCase();
  }

  function isTodayPage() {
    const segments = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    return segments[segments.length - 1] === "today";
  }

  function getTodaySlug() {
    const weekday = new Date().getDay();
    if (weekday === 0 || weekday === 6) {
      return null;
    }
    return WEEKDAY_SLUGS[weekday];
  }

  function slugFromPath() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "") {
      return "monday";
    }

    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last === "today") {
      return null;
    }
    if (WEEKDAY_SLUGS.indexOf(last) !== -1) {
      return last;
    }

    return null;
  }

  function setActiveNav(slug) {
    document.querySelectorAll(".section-nav__link[data-day]").forEach(function (link) {
      const isActive = slug && link.dataset.day === slug;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function assignSectionIds(root) {
    const scope = root || document;
    const headings = scope.querySelectorAll("h3");
    headings.forEach(function (heading) {
      const sectionKey = resolveSectionKey(heading);
      if (!sectionKey) {
        return;
      }

      if (!heading.id) {
        heading.id = sectionKey;
      }
      if (heading.parentElement.classList.contains("menu-section")) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "menu-section menu-section--" + sectionKey;
      heading.parentNode.insertBefore(wrapper, heading);
      let sibling = heading;
      while (sibling) {
        const next = sibling.nextElementSibling;
        wrapper.appendChild(sibling);
        if (next && (next.tagName === "H3" || next.tagName === "HR")) {
          break;
        }
        sibling = next;
      }
    });
  }

  function layoutVerdurePotagesRow(root) {
    const scope = root || document;
    if (scope.querySelector(".menu-row-duo")) {
      return;
    }

    const verdure = scope.querySelector(".menu-section--verdure");
    const potages = scope.querySelector(".menu-section--potages");
    if (!verdure || !potages) {
      return;
    }

    let node = verdure.nextSibling;
    while (node && node !== potages) {
      const next = node.nextSibling;
      if (node.nodeType === 1 && node.tagName === "HR") {
        node.remove();
      }
      node = next;
    }

    const row = document.createElement("div");
    row.className = "menu-row-duo menu-row-duo--verdure-potages";
    verdure.parentNode.insertBefore(row, verdure);
    row.appendChild(verdure);
    row.appendChild(potages);
  }

  function enhanceMenuPanel(panel) {
    assignSectionIds(panel);
    layoutVerdurePotagesRow(panel);
  }

  function initTodayView() {
    const todayRoot = document.querySelector(".menu-today");
    if (!todayRoot) return;

    const panels = todayRoot.querySelectorAll(".menu-day-panel");
    const teaserStack = document.getElementById("menu-teaser-stack");
    const teaserPanels = teaserStack
      ? teaserStack.querySelectorAll(".menu-teaser-panel")
      : [];
    const resetMs = Number(todayRoot.dataset.resetMs) || 30000;
    let overrideUntil = 0;
    let visibleSlug = null;

    panels.forEach(function (panel) {
      enhanceMenuPanel(panel);
    });

    teaserPanels.forEach(function (panel) {
      const body = panel.querySelector(".menu-teaser__body");
      if (body) {
        enhanceMenuPanel(body);
      }
    });

    function fallbackSlug() {
      return "monday";
    }

    function updateTeaser(activeSlug) {
      if (!teaserStack) return;

      let hasTeaser = false;
      teaserPanels.forEach(function (panel) {
        const show = panel.dataset.forDay === activeSlug;
        panel.hidden = !show;
        if (show) {
          hasTeaser = true;
        }
      });
      teaserStack.hidden = !hasTeaser;
    }

    function showDay(slug, options) {
      const opts = options || {};
      const panelSlug = slug || fallbackSlug();

      if (panelSlug === visibleSlug && opts.updateNav !== false) {
        setActiveNav(slug);
        updateTeaser(panelSlug);
        return;
      }

      if (panelSlug === visibleSlug) {
        return;
      }

      panels.forEach(function (panel) {
        const isMatch = panel.dataset.day === panelSlug;
        panel.hidden = !isMatch;
        panel.classList.toggle("is-active", isMatch);
      });

      visibleSlug = panelSlug;
      updateTeaser(panelSlug);

      if (opts.updateNav !== false) {
        setActiveNav(slug);
      }

      if (opts.scrollTop) {
        window.scrollTo(0, 0);
      }
    }

    function selectDay(slug, manual) {
      showDay(slug, { scrollTop: true });
      if (manual) {
        overrideUntil = Date.now() + resetMs;
      }
    }

    function restoreToday() {
      overrideUntil = 0;
      const todaySlug = getTodaySlug();
      showDay(todaySlug || fallbackSlug(), { scrollTop: false });
      setActiveNav(todaySlug);
    }

    document.querySelectorAll(".section-nav__link[data-day]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        selectDay(link.dataset.day, true);
      });
    });

    restoreToday();

    window.setInterval(function () {
      if (overrideUntil && Date.now() >= overrideUntil) {
        restoreToday();
      }
    }, 1000);
  }

  function applyWeekdaySelection() {
    if (isTodayPage()) {
      return true;
    }

    const weekday = new Date().getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    setActiveNav(null);

    if (isWeekend) {
      return true;
    }

    const todaySlug = WEEKDAY_SLUGS[weekday];
    const todayLink = document.querySelector('.section-nav__link[data-day="' + todaySlug + '"]');
    const currentSlug = slugFromPath();

    if (todayLink && currentSlug !== todaySlug) {
      window.location.replace(todayLink.href);
      return false;
    }

    setActiveNav(todaySlug);
    return true;
  }

  function initStaticPage() {
    const content = document.querySelector(".menu-content");
    if (content) {
      assignSectionIds(content);
      layoutVerdurePotagesRow(content);
    }

    const teaserBody = document.querySelector(".menu-teaser__body");
    if (teaserBody) {
      enhanceMenuPanel(teaserBody);
    }
  }

  if (isTodayPage()) {
    initTodayView();
    return;
  }

  if (!applyWeekdaySelection()) {
    return;
  }

  initStaticPage();
})();