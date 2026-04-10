(function () {
  const btnYes = document.getElementById("btn-yes");
  const btnNo = document.getElementById("btn-no");
  const runawayWrap = document.getElementById("runaway-wrap");
  const btnPremeetNext = document.getElementById("btn-premeet-next");
  const btnNext = document.getElementById("btn-next");
  const btnFilmNext = document.getElementById("btn-film-next");
  const btnHome = document.getElementById("btn-home");

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mqCoarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
  const mqPortrait = window.matchMedia("(orientation: portrait)");

  const TEXT_BTN_YES = "Приду";
  const TEXT_BTN_YES_PLAYING = "Что меня ждёт?";

  const inviteSection = document.getElementById("invite");
  const matryoshka = document.getElementById("invite-matryoshka");
  const inviteHeading = inviteSection?.querySelector(".screen__head--invite");
  const inviteBlock = inviteSection?.querySelector(".invite__block");
  const videoYes = matryoshka?.querySelector(".invite__matryoshka-video--yes");
  const videoCry = matryoshka?.querySelector(".invite__matryoshka-video--cry");

  let yesPlayingFromClick = false;
  let yesStoppedAtEnd = false;

  function seekYesToLastFrame() {
    if (!videoYes) return;
    if (Number.isFinite(videoYes.duration) && videoYes.duration > 0.05) {
      videoYes.currentTime = videoYes.duration - 0.05;
    }
  }

  function setRunawayHidden(hidden) {
    const on = Boolean(hidden);
    inviteSection?.classList.toggle("invite--hideno-runaway", on);
    if (runawayWrap) {
      runawayWrap.toggleAttribute("inert", on);
      runawayWrap.setAttribute("aria-hidden", on ? "true" : "false");
    }
  }

  function isRunawayHidden() {
    return inviteSection?.classList.contains("invite--hideno-runaway");
  }

  function setInviteScrollLocked(locked) {
    document.documentElement.classList.toggle("invite-scroll-locked", Boolean(locked));
  }

  function isInviteScrollLocked() {
    return document.documentElement.classList.contains("invite-scroll-locked");
  }

  function syncInviteLockOnRestore() {
    const navEntry = performance.getEntriesByType("navigation")[0];
    const navType = navEntry?.type;
    if (navType === "reload") {
      setInviteScrollLocked(true);
      window.scrollTo(0, 0);
      return;
    }
    if (!isInviteScrollLocked()) return;
    const inviteBottomInViewport = inviteSection?.getBoundingClientRect().bottom ?? window.innerHeight;
    const restoredAwayFromTop = window.scrollY > 12 || inviteBottomInViewport <= window.innerHeight * 0.55;
    if (restoredAwayFromTop) {
      setInviteScrollLocked(false);
    }
  }

  function onWheelInviteLock(e) {
    if (!isInviteScrollLocked() || e.ctrlKey || e.metaKey) return;
    if (e.deltaY > 0) e.preventDefault();
  }

  function onKeyDownInviteLock(e) {
    if (!isInviteScrollLocked() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.closest && t.closest("button, a, [href], input, textarea, select, [contenteditable='true']"))) {
      return;
    }
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "End") {
      e.preventDefault();
    }
  }

  function alignMatryoshkaToInviteHeading() {
    if (!matryoshka || !inviteHeading || !inviteBlock) return;
    if (window.getComputedStyle(matryoshka).position !== "absolute") return;
    const headingRect = inviteHeading.getBoundingClientRect();
    const blockRect = inviteBlock.getBoundingClientRect();
    const centerY = headingRect.top + headingRect.height / 2 - blockRect.top;
    matryoshka.style.top = `${Math.round(centerY)}px`;
  }

  window.addEventListener("wheel", onWheelInviteLock, { passive: false });
  window.addEventListener("keydown", onKeyDownInviteLock);
  window.addEventListener("pageshow", syncInviteLockOnRestore);
  window.addEventListener("load", syncInviteLockOnRestore);
  requestAnimationFrame(syncInviteLockOnRestore);
  setTimeout(syncInviteLockOnRestore, 120);
  setTimeout(syncInviteLockOnRestore, 420);
  setTimeout(syncInviteLockOnRestore, 900);
  window.addEventListener("resize", alignMatryoshkaToInviteHeading);
  requestAnimationFrame(() => {
    alignMatryoshkaToInviteHeading();
    requestAnimationFrame(alignMatryoshkaToInviteHeading);
  });

  function setMatryoshkaState(state) {
    if (!matryoshka || !videoYes || !videoCry) return;
    matryoshka.dataset.state = state;
    if (state === "cry") {
      yesPlayingFromClick = false;
      videoYes.pause();
      videoCry.play().catch(() => {});
    } else {
      videoCry.pause();
      if (yesPlayingFromClick) {
        return;
      } else if (yesStoppedAtEnd) {
        try {
          videoYes.pause();
          seekYesToLastFrame();
        } catch (_) {}
      } else {
        videoYes.pause();
        videoYes.currentTime = 0;
      }
    }
  }

  if (matryoshka && videoYes && videoCry && btnYes && btnNo) {
    function freezeYesFirstFrame() {
      if (yesPlayingFromClick || yesStoppedAtEnd) return;
      try {
        videoYes.pause();
        videoYes.currentTime = 0;
      } catch (_) {}
    }

    videoYes.addEventListener("loadedmetadata", freezeYesFirstFrame, { once: true });
    videoYes.addEventListener("loadeddata", freezeYesFirstFrame, { once: true });
    freezeYesFirstFrame();

    btnNo.addEventListener("mouseenter", () => setMatryoshkaState("cry"));
    btnNo.addEventListener("mouseleave", () => setMatryoshkaState("idle"));
  }

  let scrollToIdAnim = 0;

  function smoothScrollToY(targetY, opts = {}) {
    const fast = opts.fast === true;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const end = Math.max(0, Math.min(targetY, maxY));
    if (mqReduce.matches) {
      window.scrollTo(0, end);
      return;
    }
    const start = window.scrollY;
    const dist = Math.abs(end - start);
    if (dist < 0.5) return;

    scrollToIdAnim += 1;
    const animId = scrollToIdAnim;
    const durationMs = fast
      ? Math.min(650, Math.max(200, dist * 0.3))
      : Math.min(1400, Math.max(520, dist * 0.65));

    const t0 = performance.now();
    function frame(now) {
      if (animId !== scrollToIdAnim) return;
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / durationMs);
      const y = start + (end - start) * t;
      window.scrollTo(0, y);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function scrollToId(id, fast) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "premeet-taxi") {
      const y = el.getBoundingClientRect().top + window.scrollY;
      smoothScrollToY(Math.max(0, y - 8), { fast: Boolean(fast) });
      return;
    }
    const stageAnchor = el.querySelector("[data-stage-time]");
    const stageRect = stageAnchor?.getBoundingClientRect();
    if (stageRect) {
      // Align chosen stage marker with the same scan line used by sticky-clock logic.
      const fallbackScanOffset = window.innerHeight * 0.5;
      const clockRect = stickyClockEl?.getBoundingClientRect();
      const scanOffset =
        clockRect && clockRect.height > 0 && !stickyClockEl?.classList.contains("sticky-clock--hidden")
          ? clockRect.top + clockRect.height / 2
          : fallbackScanOffset;
      const stageCenterDocY = stageRect.top + stageRect.height / 2 + window.scrollY;
      const targetY = stageCenterDocY - scanOffset;
      smoothScrollToY(targetY, { fast: Boolean(fast) });
      return;
    }
    const y = el.getBoundingClientRect().top + window.scrollY;
    smoothScrollToY(y, { fast: Boolean(fast) });
  }

  btnYes.addEventListener("click", () => {
    if (btnYes.textContent.trim() === TEXT_BTN_YES_PLAYING) {
      scrollToId("premeet-taxi");
      return;
    }

    setInviteScrollLocked(false);
    setRunawayHidden(true);

    if (mqReduce.matches) {
      btnYes.textContent = TEXT_BTN_YES_PLAYING;
      btnYes.setAttribute("aria-label", TEXT_BTN_YES_PLAYING);
      return;
    }

    btnYes.textContent = TEXT_BTN_YES_PLAYING;
    btnYes.setAttribute("aria-label", TEXT_BTN_YES_PLAYING);
    if (!videoYes) return;
    yesPlayingFromClick = true;
    yesStoppedAtEnd = false;
    if (matryoshka) matryoshka.dataset.state = "idle";
    videoCry?.pause();
    videoYes.currentTime = 0;
    const onEnd = () => {
      yesPlayingFromClick = false;
      yesStoppedAtEnd = true;
      videoYes.removeEventListener("ended", onEnd);
      try {
        videoYes.pause();
        seekYesToLastFrame();
      } catch (_) {}
    };
    videoYes.addEventListener("ended", onEnd, { once: true });
    videoYes.play().catch(() => {
      yesPlayingFromClick = false;
      btnYes.textContent = TEXT_BTN_YES;
      btnYes.setAttribute("aria-label", TEXT_BTN_YES);
    });
  });
  btnPremeetNext?.addEventListener("click", () => scrollToId("restaurant"));
  btnNext.addEventListener("click", () => scrollToId("film"));
  btnFilmNext.addEventListener("click", () => scrollToId("taxi"));
  btnHome.addEventListener("click", () => {
    yesPlayingFromClick = false;
    try {
      videoYes?.pause();
      videoYes.currentTime = 0;
    } catch (_) {}
    if (btnYes) {
      btnYes.textContent = TEXT_BTN_YES;
      btnYes.setAttribute("aria-label", TEXT_BTN_YES);
    }
    yesStoppedAtEnd = false;
    setRunawayHidden(false);
    expandWrapIfNeeded();
    setInviteScrollLocked(false);
    const el = document.getElementById("invite");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY;
      const pad = 8;
      window.scrollTo(0, Math.max(0, y - pad));
    }
    setInviteScrollLocked(true);
  });

  const margin = 10;
  const dangerRadius = 240;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function distPointToRect(px, py, r) {
    const cx = clamp(px, r.left, r.right);
    const cy = clamp(py, r.top, r.bottom);
    return Math.hypot(px - cx, py - cy);
  }

  function placeButtonFarthestFrom(clientX, clientY) {
    if (isRunawayHidden() || !runawayWrap || mqCoarsePointer.matches) return;
    const btn = btnNo;
    const wrap = runawayWrap;
    const wr = wrap.getBoundingClientRect();
    const bw = btn.offsetWidth;
    const bh = btn.offsetHeight;
    const halfW = bw / 2;
    const halfH = bh / 2;

    const minCx = wr.left + halfW + margin;
    const maxCx = wr.right - halfW - margin;
    const minCy = wr.top + halfH + margin;
    const maxCy = wr.bottom - halfH - margin;

    if (maxCx < minCx || maxCy < minCy) return;

    const candidates = [
      [minCx, minCy],
      [maxCx, minCy],
      [minCx, maxCy],
      [maxCx, maxCy],
      [(minCx + maxCx) / 2, minCy],
      [(minCx + maxCx) / 2, maxCy],
      [minCx, (minCy + maxCy) / 2],
      [maxCx, (minCy + maxCy) / 2],
    ];

    let bestX = minCx;
    let bestY = minCy;
    let bestD = -1;
    for (let i = 0; i < candidates.length; i++) {
      const [x, y] = candidates[i];
      const d = Math.hypot(clientX - x, clientY - y);
      if (d > bestD) {
        bestD = d;
        bestX = x;
        bestY = y;
      }
    }

    let left = bestX - wr.left - halfW;
    let top = bestY - wr.top - halfH;
    const maxLeft = Math.max(0, wrap.clientWidth - bw);
    const maxTop = Math.max(0, wrap.clientHeight - bh);
    left = clamp(left, 0, maxLeft);
    top = clamp(top, 0, maxTop);
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.style.transform = "none";
  }

  function centerRunawayButton() {
    if (isRunawayHidden() || !runawayWrap || !btnNo) return;
    const wrap = runawayWrap;
    const bw = btnNo.offsetWidth;
    if (bw < 1) return;
    const maxLeft = Math.max(0, wrap.clientWidth - bw);
    btnNo.style.left = `${maxLeft / 2}px`;
    btnNo.style.top = "0px";
    btnNo.style.transform = "none";
  }

  function maybeFlee(clientX, clientY) {
    if (isRunawayHidden() || !runawayWrap || !btnNo || mqCoarsePointer.matches) return;
    const wr = runawayWrap.getBoundingClientRect();
    if (
      clientX < wr.left ||
      clientX > wr.right ||
      clientY < wr.top ||
      clientY > wr.bottom
    ) {
      return;
    }
    const br = btnNo.getBoundingClientRect();
    const d = distPointToRect(clientX, clientY, br);
    if (d < dangerRadius) {
      placeButtonFarthestFrom(clientX, clientY);
    }
  }

  function expandWrapIfNeeded() {
    if (isRunawayHidden() || !runawayWrap) return;
    if (mqCoarsePointer.matches) {
      runawayWrap.style.width = "100%";
      runawayWrap.style.maxWidth = "100%";
      runawayWrap.style.boxSizing = "border-box";
      runawayWrap.style.height = "";
      if (btnNo) {
        btnNo.style.left = "";
        btnNo.style.top = "";
        btnNo.style.transform = "";
      }
      return;
    }
    const vh = window.innerHeight;
    runawayWrap.style.width = "100%";
    runawayWrap.style.maxWidth = "100%";
    runawayWrap.style.boxSizing = "border-box";
    runawayWrap.style.height = `${Math.min(vh * 0.34, 260)}px`;
    centerRunawayButton();
    requestAnimationFrame(() => centerRunawayButton());
  }

  function onPointerMove(e) {
    maybeFlee(e.clientX, e.clientY);
  }

  function onRunawayPointerEnter(e) {
    if (isRunawayHidden()) return;
    placeButtonFarthestFrom(e.clientX, e.clientY);
  }

  expandWrapIfNeeded();
  window.addEventListener("resize", expandWrapIfNeeded);

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  btnNo.addEventListener("pointerenter", onRunawayPointerEnter);

  const stickyClockEl = document.getElementById("sticky-clock");
  const stickyTimeEl = document.getElementById("sticky-clock-time");
  const stickyHhEl = stickyTimeEl?.querySelector(".sticky-clock__hh");
  const stickyMmEl = stickyTimeEl?.querySelector(".sticky-clock__mm");

  function parseStageTimeToMinutes(stageAnchorEl) {
    const dt = stageAnchorEl.getAttribute("data-stage-time");
    if (!dt) return 0;
    const parts = dt.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1] ?? 0);
    return h * 60 + m;
  }

  function stageTimeCenterDocY(stageAnchorEl) {
    const r = stageAnchorEl.getBoundingClientRect();
    return r.top + r.height / 2 + window.scrollY;
  }

  function updateStickyClock() {
    if (!stickyTimeEl) return;
    const stageTimeAnchors = document.querySelectorAll("main [data-stage-time]");
    if (!stageTimeAnchors.length) return;

    const fallbackScanY = window.scrollY + window.innerHeight * 0.5;
    const clockRect = stickyClockEl?.getBoundingClientRect();
    const scanY =
      clockRect && clockRect.height > 0
        ? window.scrollY + clockRect.top + clockRect.height / 2
        : fallbackScanY;

    const milestones = Array.from(stageTimeAnchors).map((el) => ({
      y: stageTimeCenterDocY(el),
      min: parseStageTimeToMinutes(el),
    }));
    milestones.sort((a, b) => a.y - b.y);

    /** Порог: центр последней метки перед первым сегментом, где минуты «листаются» между разными временами. */
    let interpolationThresholdY = milestones[0].y;
    for (let i = 0; i < milestones.length - 1; i++) {
      if (milestones[i + 1].min !== milestones[i].min) {
        interpolationThresholdY = milestones[i].y;
        break;
      }
    }
    const showStickyClock = fallbackScanY >= interpolationThresholdY;
    if (stickyClockEl) {
      stickyClockEl.classList.toggle("sticky-clock--hidden", !showStickyClock);
      stickyClockEl.setAttribute("aria-hidden", showStickyClock ? "false" : "true");
    }

    let minutesFloat;

    if (scanY <= milestones[0].y) {
      minutesFloat = milestones[0].min;
    } else if (scanY >= milestones[milestones.length - 1].y) {
      minutesFloat = milestones[milestones.length - 1].min;
    } else {
      let found = false;
      for (let i = 0; i < milestones.length - 1; i++) {
        const a = milestones[i];
        const b = milestones[i + 1];
        if (scanY >= a.y && scanY <= b.y) {
          const span = b.y - a.y;
          if (span <= 0.5) {
            minutesFloat = b.min;
          } else {
            const t = (scanY - a.y) / span;
            minutesFloat = a.min + t * (b.min - a.min);
          }
          found = true;
          break;
        }
      }
      if (!found) {
        let best = milestones[0].min;
        let bestD = Infinity;
        for (let k = 0; k < milestones.length; k++) {
          const d = Math.abs(scanY - milestones[k].y);
          if (d < bestD) {
            bestD = d;
            best = milestones[k].min;
          }
        }
        minutesFloat = best;
      }
    }

    const rounded = Math.round(minutesFloat);
    const h = Math.floor(rounded / 60) % 24;
    const m = ((rounded % 60) + 60) % 60;
    const hhStr = String(h).padStart(2, "0");
    const mmStr = String(m).padStart(2, "0");
    const text = `${hhStr}:${mmStr}`;

    if (stickyHhEl) stickyHhEl.textContent = hhStr;
    if (stickyMmEl) stickyMmEl.textContent = mmStr;

    stickyTimeEl.setAttribute("data-time", text);
    stickyTimeEl.setAttribute("aria-label", text);
  }

  let stickyClockTicking = false;
  function onScrollOrResizeForClock() {
    if (stickyClockTicking) return;
    stickyClockTicking = true;
    requestAnimationFrame(() => {
      updateStickyClock();
      stickyClockTicking = false;
    });
  }

  window.addEventListener("scroll", onScrollOrResizeForClock, { passive: true });
  window.addEventListener("resize", onScrollOrResizeForClock);
  updateStickyClock();

  function initInlineCarousel(rootId, trackId, slideRatio = 0.85) {
    const root = document.getElementById(rootId);
    if (!root) return;
    const viewport = root.querySelector(".restaurant-carousel__viewport");
    const track = document.getElementById(trackId);
    const slides = root.querySelectorAll("[data-carousel-slide]");
    const btnPrev = root.querySelector(".restaurant-carousel__btn--prev");
    const btnNext = root.querySelector(".restaurant-carousel__btn--next");
    const dots = root.querySelectorAll(".restaurant-carousel__dot");
    const n = slides.length;
    let carouselIndex = 0;

    const CAROUSEL_GAP_PX = 12;

    function layout() {
      if (!viewport || !track || n < 1) return;
      const w = viewport.clientWidth;
      if (w < 1) return;
      const isCompact = mqCoarsePointer.matches || mqPortrait.matches;
      const effectiveRatio = isCompact ? 1 : slideRatio;
      const effectiveGap = isCompact ? 0 : CAROUSEL_GAP_PX;
      const slideW = Math.max(1, Math.floor(w * effectiveRatio));
      track.style.gap = `${effectiveGap}px`;
      slides.forEach((slide) => {
        slide.style.flex = `0 0 ${slideW}px`;
        slide.style.width = `${slideW}px`;
      });
      goTo(carouselIndex);
    }

    function goTo(i) {
      if (!track || n < 1) return;
      carouselIndex = ((i % n) + n) % n;
      const slideW = slides[0]?.offsetWidth ?? 0;
      const isCompact = mqCoarsePointer.matches || mqPortrait.matches;
      const effectiveGap = isCompact ? 0 : CAROUSEL_GAP_PX;
      const offset = carouselIndex * (slideW + effectiveGap);
      track.style.transform = `translateX(-${offset}px)`;
      slides.forEach((slide, j) => {
        slide.setAttribute("aria-hidden", j === carouselIndex ? "false" : "true");
      });
      dots.forEach((dot, j) => {
        dot.setAttribute("aria-selected", j === carouselIndex ? "true" : "false");
      });
    }

    btnPrev?.addEventListener("click", () => goTo(carouselIndex - 1));
    btnNext?.addEventListener("click", () => goTo(carouselIndex + 1));
    dots.forEach((dot, j) => {
      dot.addEventListener("click", () => goTo(j));
    });

    window.addEventListener("resize", layout);
    requestAnimationFrame(() => {
      layout();
      requestAnimationFrame(layout);
    });
  }

  initInlineCarousel("menu-carousel", "menu-carousel-track", 0.88);
})();
