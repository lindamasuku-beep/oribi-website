/* ==========================================================================
   ORIBI Experience Layer — scripts/experience.js
   Zero-dependency ES module for smooth 60fps interactions & visual proof.
   Honors prefers-reduced-motion: reduce at every step.
   ========================================================================== */

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const pad2 = (n) => String(n).padStart(2, '0');

/* --------------------------------------------------------------------------
   1. Reactive Header & Scroll Progress Bar
   -------------------------------------------------------------------------- */
function initHeaderAndProgress() {
  const header = document.querySelector('[data-site-header]');
  const progressBar = document.querySelector('[data-scroll-progress]');
  const hero = document.querySelector('[data-cinema-hero]');
  const navLinks = [...document.querySelectorAll('.xp-header .nav__link[href^="#"]')];

  if (!header && !progressBar) return;

  const sections = navLinks
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      return target ? { link, target } : null;
    })
    .filter(Boolean);

  let rafId = 0;

  const update = () => {
    rafId = 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = clamp(scrollY / maxScroll, 0, 1);

    if (progressBar) {
      progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    if (header) {
      const heroThreshold = hero ? Math.max(48, hero.offsetHeight - header.offsetHeight - 40) : 48;
      const overHero = Boolean(hero) && scrollY < heroThreshold;
      header.classList.toggle('is-over-hero', overHero);
      header.classList.toggle('is-scrolled', !overHero);
    }

    if (sections.length) {
      const probeY = scrollY + (header ? header.offsetHeight : 72) + 120;
      let active = null;
      for (const item of sections) {
        if (item.target.offsetTop <= probeY) {
          active = item;
        }
      }
      for (const item of sections) {
        item.link.classList.toggle('is-active', item === active);
      }
    }
  };

  const requestUpdate = () => {
    if (!rafId) rafId = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  update();
}

/* --------------------------------------------------------------------------
   2. Ambient Cinema Hero (Entrance, Playback Toggle, Parallax)
   -------------------------------------------------------------------------- */
function initCinemaHero() {
  const hero = document.querySelector('[data-cinema-hero]');
  if (!hero) return null;

  const video = hero.querySelector('[data-hero-video]');
  const toggleBtn = hero.querySelector('[data-hero-toggle]');
  const toggleLabel = toggleBtn?.querySelector('[data-hero-toggle-label]');
  const parallaxEl = hero.querySelector('[data-hero-parallax]');
  const reduced = prefersReduced();

  let userPaused = false;

  const syncToggleUI = (paused) => {
    if (!toggleBtn) return;
    toggleBtn.classList.toggle('is-paused', paused);
    toggleBtn.setAttribute('aria-pressed', String(paused));
    toggleBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    if (toggleLabel) {
      toggleLabel.textContent = paused ? 'Play reel' : 'Pause reel';
    }
  };

  const setAmbientPlaying = (play) => {
    if (!video) return;
    if (play) {
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          syncToggleUI(true);
        });
      }
      syncToggleUI(false);
    } else {
      video.pause();
      syncToggleUI(true);
    }
  };

  if (video) {
    const markReady = () => hero.classList.add('is-video-ready');
    if (video.readyState >= 2) markReady();
    video.addEventListener('loadeddata', markReady, { once: true });
    video.addEventListener('playing', markReady, { once: true });
    video.addEventListener('pause', () => syncToggleUI(true));
    video.addEventListener('play', () => syncToggleUI(false));

    if (reduced) {
      userPaused = true;
      video.autoplay = false;
      video.pause();
      syncToggleUI(true);
    } else {
      setAmbientPlaying(true);
    }
  }

  toggleBtn?.addEventListener('click', () => {
    if (!video) return;
    const willPause = !video.paused;
    userPaused = willPause;
    setAmbientPlaying(!willPause);
  });

  // Pause ambient video when scrolled completely off screen to save GPU/battery
  if (video && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            if (!video.paused) video.pause();
          } else if (!userPaused && !prefersReduced() && !document.body.classList.contains('xp-modal-open')) {
            setAmbientPlaying(true);
          }
        }
      },
      { threshold: 0.05 }
    );
    io.observe(hero);
  }

  // Smooth staggered hero entrance (Web Animations API, non-destructive, reduced-motion safe)
  const runEntrance = () => {
    if (reduced) return;
    const title = hero.querySelector('[data-hero-reveal]');
    const staggers = [...hero.querySelectorAll('[data-hero-stagger]')];
    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

    if (title && typeof title.animate === 'function') {
      const originalText = title.textContent || '';
      const hasOnlyText = [...title.childNodes].every((n) => n.nodeType === Node.TEXT_NODE);
      if (hasOnlyText && originalText.trim()) {
        const frag = document.createDocumentFragment();
        const words = originalText.trim().split(/(\s+)/);
        const inners = [];
        for (const part of words) {
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(part));
          } else {
            const mask = document.createElement('span');
            mask.className = 'xp-word-mask';
            const inner = document.createElement('span');
            inner.className = 'xp-word-in';
            inner.textContent = part;
            mask.append(inner);
            frag.append(mask);
            inners.push(inner);
          }
        }
        title.setAttribute('aria-label', originalText.trim());
        title.textContent = '';
        title.append(frag);

        const anims = inners.map((el, idx) =>
          el.animate(
            [
              { transform: 'translateY(112%)', opacity: 0.01 },
              { transform: 'translateY(0%)', opacity: 1 },
            ],
            {
              duration: 640,
              delay: 50 + Math.min(idx, 8) * 38,
              easing,
              fill: 'both',
            }
          )
        );

        Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
          title.textContent = originalText;
          title.removeAttribute('aria-label');
        });
      } else {
        title.animate(
          [
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 640, delay: 40, easing, fill: 'both' }
        );
      }
    }

    staggers.forEach((el, idx) => {
      if (typeof el.animate !== 'function') return;
      el.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 560,
          delay: 180 + idx * 75,
          easing,
          fill: 'both',
        }
      );
    });
  };

  runEntrance();

  // Subtle scroll-linked parallax settle on hero backdrop
  if (parallaxEl && !reduced) {
    let rafId = 0;
    const renderParallax = () => {
      rafId = 0;
      if (prefersReduced() || window.innerWidth < 768) {
        parallaxEl.style.transform = '';
        return;
      }
      const rect = hero.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const progress = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
      const translateY = progress * 64;
      const scale = 1 + progress * 0.05;
      parallaxEl.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(renderParallax);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  return {
    pauseForModal() {
      const wasPlaying = Boolean(video && !video.paused);
      if (video && wasPlaying) video.pause();
      return wasPlaying;
    },
    resumeAfterModal(shouldResume) {
      if (shouldResume && !userPaused && !prefersReduced()) {
        setAmbientPlaying(true);
      }
    },
  };
}

/* --------------------------------------------------------------------------
   3. Full-Sound Video Lightbox Modal ([data-video-modal])
   -------------------------------------------------------------------------- */
function initVideoModal(heroCtrl) {
  const modal = document.querySelector('[data-video-modal]');
  if (!modal) return;

  const player = modal.querySelector('[data-video-player]');
  const titleEl = modal.querySelector('[data-video-modal-title]');
  const closeBtns = [...modal.querySelectorAll('[data-video-close]')];
  const backdrop = modal.querySelector('.xp-modal__backdrop');

  let lastOpener = null;
  let resumeHero = false;

  const getFocusable = () =>
    [...modal.querySelectorAll('button, [href], video, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !el.disabled && !el.hidden && el.offsetParent !== null
    );

  const openModal = (trigger) => {
    const src = trigger.getAttribute('data-video-open');
    if (!src || !player) return;

    lastOpener = trigger;
    resumeHero = heroCtrl ? heroCtrl.pauseForModal() : false;

    const title = trigger.getAttribute('data-video-title') || 'ORIBI Founder Film';
    const poster = trigger.getAttribute('data-video-poster') || '';

    if (titleEl) titleEl.textContent = title;
    if (poster) player.setAttribute('poster', poster);
    else player.removeAttribute('poster');

    if (player.getAttribute('src') !== src) {
      player.setAttribute('src', src);
    }
    player.muted = false;
    player.currentTime = 0;

    modal.hidden = false;
    document.body.classList.add('xp-modal-open');

    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
      closeBtns[0]?.focus();
      const playPromise = player.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          /* User can press native Play if browser blocks unmuted autoplay */
        });
      }
    });
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('xp-modal-open');

    if (player) {
      player.pause();
      player.currentTime = 0;
    }

    const finalize = () => {
      modal.hidden = true;
      if (lastOpener && typeof lastOpener.focus === 'function') {
        lastOpener.focus();
      }
      lastOpener = null;
      if (heroCtrl) heroCtrl.resumeAfterModal(resumeHero);
      resumeHero = false;
    };

    if (prefersReduced()) {
      finalize();
    } else {
      window.setTimeout(finalize, 220);
    }
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest?.('[data-video-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener);
    }
  });

  closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = getFocusable();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* --------------------------------------------------------------------------
   4. Interactive Visual Proof Programme Stage ([data-program-stage])
   -------------------------------------------------------------------------- */
function initProgramStage() {
  const stage = document.querySelector('[data-program-stage]');
  if (!stage) return;

  const items = [...stage.querySelectorAll('[data-program-item]')];
  const slides = [...stage.querySelectorAll('[data-program-slide]')];
  const tagEl = stage.querySelector('[data-program-active-tag]');
  const metricEl = stage.querySelector('[data-program-active-metric]');
  const titleEl = stage.querySelector('[data-program-active-title]');
  const descEl = stage.querySelector('[data-program-active-desc]');
  const applyBtn = stage.querySelector('[data-program-apply]');

  if (!items.length) return;

  let activeKey = null;

  const activate = (item, moveFocus = false) => {
    const key = item.getAttribute('data-program-item');
    if (!key) return;
    if (key === activeKey && !moveFocus) return;
    activeKey = key;

    items.forEach((btn) => {
      const isOn = btn === item;
      btn.classList.toggle('is-active', isOn);
      btn.setAttribute('aria-selected', String(isOn));
      btn.tabIndex = isOn ? 0 : -1;
    });

    slides.forEach((slide) => {
      const isOn = slide.getAttribute('data-program-slide') === key;
      slide.classList.toggle('is-active', isOn);
      slide.setAttribute('aria-hidden', String(!isOn));
    });

    const name = item.getAttribute('data-program-name') || item.textContent.trim();
    const tag = item.getAttribute('data-program-tag') || '';
    const metric = item.getAttribute('data-program-metric') || '';
    const desc = item.getAttribute('data-program-desc') || '';

    if (tagEl && tag) tagEl.textContent = tag;
    if (metricEl) {
      metricEl.textContent = metric;
      metricEl.hidden = !metric;
    }
    if (titleEl) titleEl.textContent = name;
    if (descEl && desc) descEl.textContent = desc;

    if (applyBtn) {
      applyBtn.setAttribute('data-program-apply', name);
      const labelNode = applyBtn.querySelector('[data-program-apply-label]');
      if (labelNode) {
        labelNode.textContent = `Apply for ${name}`;
      } else {
        applyBtn.textContent = `Apply for ${name}`;
      }
    }

    if (moveFocus) item.focus();
  };

  let hoverTimer = 0;
  let lastScrollAt = 0;
  let clickLockedUntil = 0;

  const cancelHover = () => {
    if (hoverTimer) {
      window.clearTimeout(hoverTimer);
      hoverTimer = 0;
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      lastScrollAt = performance.now();
      cancelHover();
    },
    { passive: true }
  );

  const stageViewport = stage.querySelector('.xp-prog-stage');
  stageViewport?.addEventListener('pointerenter', cancelHover);

  items.forEach((item, index) => {
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - lastScrollAt < 280 || now < clickLockedUntil) return;
      cancelHover();
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        const current = performance.now();
        if (current - lastScrollAt < 280 || current < clickLockedUntil) return;
        activate(item);
      }, 180);
    });
    item.addEventListener('pointerleave', cancelHover);
    item.addEventListener('click', () => {
      cancelHover();
      clickLockedUntil = performance.now() + 1800;
      activate(item);
    });
    item.addEventListener('keydown', (e) => {
      let nextIdx = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIdx = (index + 1) % items.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIdx = (index - 1 + items.length) % items.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = items.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cancelHover();
        clickLockedUntil = performance.now() + 1800;
        activate(item);
        return;
      }

      if (nextIdx >= 0) {
        e.preventDefault();
        cancelHover();
        clickLockedUntil = performance.now() + 1800;
        activate(items[nextIdx], true);
      }
    });
  });

  const initial = items.find((b) => b.getAttribute('aria-selected') === 'true') || items[0];
  activate(initial);
}

/* --------------------------------------------------------------------------
   5. Full-Bleed Scroll Story — ORIBI Trust Model ([data-story-chapters])
   -------------------------------------------------------------------------- */
function initStoryChapters() {
  const section = document.querySelector('[data-story-chapters]');
  if (!section) return;

  const frames = [...section.querySelectorAll('[data-story-frame]')];
  const chapters = [...section.querySelectorAll('[data-story-chapter]')];
  const jumps = [...section.querySelectorAll('[data-story-jump]')];
  const counterEl = section.querySelector('[data-story-counter]');
  const progressFill = section.querySelector('[data-story-progress]');
  const prevBtn = section.querySelector('[data-story-prev]');
  const nextBtn = section.querySelector('[data-story-next]');

  const count = chapters.length;
  if (!count) return;

  let activeIdx = -1;
  let stickyMode = false;
  let rafId = 0;

  const setChapter = (idx) => {
    const safeIdx = clamp(idx, 0, count - 1);
    if (safeIdx === activeIdx) return;
    activeIdx = safeIdx;

    chapters.forEach((ch, i) => {
      ch.classList.toggle('is-active', i === safeIdx);
      ch.setAttribute('aria-current', i === safeIdx ? 'step' : 'false');
    });

    jumps.forEach((btn, i) => {
      btn.classList.toggle('is-active', i === safeIdx);
      btn.setAttribute('aria-pressed', String(i === safeIdx));
    });

    if (counterEl) {
      counterEl.textContent = `${pad2(safeIdx + 1)} / ${pad2(count)}`;
    }

    if (prevBtn) prevBtn.disabled = safeIdx === 0;
    if (nextBtn) nextBtn.disabled = safeIdx === count - 1;
  };

  const scrollToChapter = (idx) => {
    const targetIdx = clamp(idx, 0, count - 1);
    if (!stickyMode) {
      chapters[targetIdx]?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'center' });
      setChapter(targetIdx);
      return;
    }
    const rect = section.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const targetProgress = count > 1 ? targetIdx / (count - 1) : 0;
    // Slight offset into middle of chapter hold
    const y = sectionTop + travel * targetProgress;
    window.scrollTo({ top: y, behavior: prefersReduced() ? 'auto' : 'smooth' });
  };

  const renderScroll = () => {
    rafId = 0;
    if (!stickyMode) return;

    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const p = clamp(-rect.top / travel, 0, 1);

    if (progressFill) {
      const barScale = (1 / count) + p * ((count - 1) / count);
      progressFill.style.transform = `scaleX(${clamp(barScale, 0, 1).toFixed(4)})`;
    }

    const seg = 1 / count;
    let current = 0;

    frames.forEach((frame, i) => {
      if (i === 0) {
        frame.style.setProperty('--wipe', '0%');
        frame.style.setProperty('--zoom', '1');
        return;
      }
      // Smooth bottom-to-top wipe across chapter boundary
      const start = (i - 0.35) * seg;
      const span = 0.55 * seg;
      const u = clamp((p - start) / span, 0, 1);
      const eased = easeOutQuart(u);
      const wipePct = (1 - eased) * 100;
      const zoom = 1.07 - 0.07 * eased;
      frame.style.setProperty('--wipe', `${wipePct.toFixed(2)}%`);
      frame.style.setProperty('--zoom', zoom.toFixed(4));
      if (u >= 0.45) current = i;
    });

    setChapter(current);
  };

  const requestRender = () => {
    if (!rafId && stickyMode) rafId = window.requestAnimationFrame(renderScroll);
  };

  const syncMode = () => {
    const shouldStick = window.innerWidth >= 900 && window.innerHeight >= 580 && !prefersReduced();
    if (shouldStick === stickyMode) {
      if (stickyMode) renderScroll();
      return;
    }
    stickyMode = shouldStick;
    section.classList.toggle('is-sticky-active', stickyMode);

    if (stickyMode) {
      renderScroll();
    } else {
      frames.forEach((frame) => {
        frame.style.removeProperty('--wipe');
        frame.style.removeProperty('--zoom');
      });
      chapters.forEach((ch) => ch.classList.add('is-active'));
    }
  };

  jumps.forEach((btn, i) => {
    btn.addEventListener('click', () => scrollToChapter(i));
  });
  prevBtn?.addEventListener('click', () => scrollToChapter(activeIdx - 1));
  nextBtn?.addEventListener('click', () => scrollToChapter(activeIdx + 1));

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', syncMode, { passive: true });
  const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof rmq.addEventListener === 'function') rmq.addEventListener('change', syncMode);

  setChapter(0);
  syncMode();
}

/* --------------------------------------------------------------------------
   6. Scroll Reveals ([data-reveal]) & Animated Impact Counters ([data-count-to])
   -------------------------------------------------------------------------- */
function initScrollRevealsAndCounters() {
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  const counters = [...document.querySelectorAll('[data-count-to]')];
  const reduced = prefersReduced();

  // Apply stagger delays if provided
  reveals.forEach((el) => {
    const delay = el.getAttribute('data-reveal-delay');
    if (delay) el.style.setProperty('--reveal-delay', `${parseInt(delay, 10) || 0}ms`);
  });

  const revealAll = () => reveals.forEach((el) => el.classList.add('is-revealed'));

  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
  } else if (reveals.length) {
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            entry.target.classList.add('is-revealed');
            revealIO.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -4% 0px' }
    );

    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96) {
        el.classList.add('is-revealed');
      } else {
        revealIO.observe(el);
      }
    });
  }

  // Animated Counters
  const formatter = new Intl.NumberFormat('en-US');

  const formatCounter = (val, prefix, suffix, useGrouping) => {
    const numStr = useGrouping ? formatter.format(Math.round(val)) : String(Math.round(val));
    return `${prefix}${numStr}${suffix}`;
  };

  counters.forEach((el) => {
    const rawTarget = Number(el.getAttribute('data-count-to'));
    if (!Number.isFinite(rawTarget)) return;

    const prefix = el.getAttribute('data-count-prefix') || '';
    const suffix = el.getAttribute('data-count-suffix') || '';
    const useGrouping = el.getAttribute('data-count-group') !== 'false' && rawTarget >= 1000;
    const finalText = formatCounter(rawTarget, prefix, suffix, useGrouping);

    if (reduced || !('IntersectionObserver' in window)) {
      el.textContent = finalText;
      el.dataset.counted = '1';
      return;
    }

    const animateCounter = () => {
      if (el.dataset.counted === '1') return;
      el.dataset.counted = '1';
      const duration = parseInt(el.getAttribute('data-count-duration') || '1100', 10);
      const startTime = performance.now();

      const tick = (now) => {
        const progress = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutQuart(progress);
        el.textContent = progress < 1 ? formatCounter(rawTarget * eased, prefix, suffix, useGrouping) : finalText;
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      };

      window.requestAnimationFrame(tick);
    };

    const counterIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateCounter();
            counterIO.unobserve(el);
          }
        }
      },
      { threshold: 0.25 }
    );

    counterIO.observe(el);
  });
}

/* --------------------------------------------------------------------------
   7. Interactive Founder Proof Switcher ([data-founder-stage])
   -------------------------------------------------------------------------- */
function initFounderStage() {
  const stage = document.querySelector('[data-founder-stage]');
  if (!stage) return;

  const tabs = [...stage.querySelectorAll('[data-founder-tab]')];
  const slides = [...stage.querySelectorAll('[data-founder-slide]')];
  const quotes = [...stage.querySelectorAll('[data-founder-quote]')];
  const prevBtn = stage.querySelector('[data-founder-prev]');
  const nextBtn = stage.querySelector('[data-founder-next]');
  const counterEl = stage.querySelector('[data-founder-counter]');
  const progressFill = stage.querySelector('[data-founder-progress]');

  if (!tabs.length) return;

  let activeIdx = 0;

  const select = (idx, focusTab = false) => {
    const safeIdx = (idx + tabs.length) % tabs.length;
    activeIdx = safeIdx;
    const key = tabs[safeIdx].getAttribute('data-founder-tab');

    tabs.forEach((tab, i) => {
      const on = i === safeIdx;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });

    slides.forEach((slide) => {
      const on = slide.getAttribute('data-founder-slide') === key;
      slide.classList.toggle('is-active', on);
      slide.setAttribute('aria-hidden', String(!on));
    });

    quotes.forEach((quote) => {
      const on = quote.getAttribute('data-founder-quote') === key;
      quote.classList.toggle('is-active', on);
      quote.setAttribute('aria-hidden', String(!on));
    });

    if (counterEl) {
      counterEl.textContent = `${pad2(safeIdx + 1)} / ${pad2(tabs.length)}`;
    }
    if (progressFill) {
      progressFill.style.transform = `scaleX(${((safeIdx + 1) / tabs.length).toFixed(4)})`;
    }

    if (focusTab) tabs[safeIdx].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(i + 1, true);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(i - 1, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        select(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        select(tabs.length - 1, true);
      }
    });
  });

  prevBtn?.addEventListener('click', () => select(activeIdx - 1));
  nextBtn?.addEventListener('click', () => select(activeIdx + 1));

  const initialIdx = Math.max(
    0,
    tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
  );
  select(initialIdx);
}

/* --------------------------------------------------------------------------
   8. Application Programme Pills, Deep-Link Pre-Selection & Form Polish
   -------------------------------------------------------------------------- */
function initProgramPickerAndApply() {
  const picker = document.querySelector('[data-program-picker]');
  const pills = picker ? [...picker.querySelectorAll('[data-program-pill]')] : [];
  const form = document.querySelector('[data-apply-form]') || document.querySelector('#apply form.form');
  const applyCard = form?.closest('.xp-apply-card');
  const programmeInput =
    document.querySelector('[data-program-input]') ||
    form?.querySelector('input[name="programme"]');

  let pulseTimer = 0;

  const selectProgramme = (name, { pulse = false } = {}) => {
    const normalized = (name || '').trim().toLowerCase();
    let matchedPill = null;

    pills.forEach((pill) => {
      const value = (pill.getAttribute('data-program-pill') || '').trim();
      const isMatch = value.toLowerCase() === normalized;
      pill.classList.toggle('is-selected', isMatch);
      pill.setAttribute('aria-pressed', String(isMatch));
      if (isMatch) matchedPill = pill;
    });

    if (programmeInput && name) {
      programmeInput.value = matchedPill ? matchedPill.getAttribute('data-program-pill') : name;
      programmeInput.dispatchEvent(new Event('input', { bubbles: true }));
      programmeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (pulse) {
      window.clearTimeout(pulseTimer);
      matchedPill?.classList.add('is-pulsing');
      applyCard?.classList.add('is-pulsing');
      pulseTimer = window.setTimeout(() => {
        matchedPill?.classList.remove('is-pulsing');
        applyCard?.classList.remove('is-pulsing');
      }, 1100);
    }
  };

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const value = pill.getAttribute('data-program-pill') || '';
      selectProgramme(value, { pulse: false });
    });
  });

  programmeInput?.addEventListener('input', () => {
    const val = (programmeInput.value || '').trim().toLowerCase();
    pills.forEach((pill) => {
      const pVal = (pill.getAttribute('data-program-pill') || '').trim().toLowerCase();
      const match = Boolean(val) && pVal === val;
      pill.classList.toggle('is-selected', match);
      pill.setAttribute('aria-pressed', String(match));
    });
  });

  // Contextual "Apply for <Programme>" buttons anywhere on page
  document.addEventListener('click', (e) => {
    const cta = e.target.closest?.('[data-program-apply]');
    if (!cta) return;
    const programme = cta.getAttribute('data-program-apply');
    const targetSection = document.getElementById('apply');
    if (targetSection) {
      e.preventDefault();
      targetSection.scrollIntoView({
        behavior: prefersReduced() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
    if (programme) {
      selectProgramme(programme, { pulse: true });
    }
    const nameInput = form?.querySelector('#f-name') || form?.querySelector('input[name="name"]');
    if (nameInput && !nameInput.value) {
      window.setTimeout(() => nameInput.focus({ preventScroll: true }), prefersReduced() ? 0 : 420);
    }
  });

  // Smooth form submission confirmation when no remote HTTP endpoint is configured
  if (form) {
    const status = form.querySelector('[data-form-status]');
    const fields = [...form.elements].filter(
      (el) => el.matches('input, select, textarea') && !/^(hidden|submit|button|reset|image)$/.test(el.type)
    );

    const validateField = (el) => {
      const ok = el.checkValidity();
      const errId = (el.getAttribute('aria-describedby') || '').split(/\s+/).find((id) => {
        const node = document.getElementById(id);
        return node && node.classList.contains('field__error');
      });
      const errEl = errId ? document.getElementById(errId) : null;
      if (ok) {
        el.removeAttribute('aria-invalid');
        if (errEl) errEl.hidden = true;
        return true;
      }
      el.setAttribute('aria-invalid', 'true');
      if (errEl) errEl.hidden = false;
      return false;
    };

    fields.forEach((el) => {
      el.addEventListener('input', () => {
        if (el.getAttribute('aria-invalid') === 'true') validateField(el);
      });
    });

    form.addEventListener('submit', (e) => {
      const bad = fields.filter((el) => !validateField(el));
      if (bad.length) {
        e.preventDefault();
        if (status) {
          status.classList.remove('is-success');
          status.textContent =
            bad.length === 1
              ? 'Please complete the highlighted field before submitting.'
              : `Please complete the ${bad.length} highlighted fields before submitting.`;
        }
        bad[0].focus();
        return;
      }

      const endpoint = (form.dataset.endpoint || '').trim();
      if (!/^https?:\/\//.test(endpoint) && !endpoint.startsWith('/')) {
        e.preventDefault();
        const chosen = programmeInput?.value?.trim();
        const sentMsg =
          form.dataset.sent ||
          'Your incubation enquiry has been recorded. Our team reviews applications in Cape Town.';
        if (status) {
          status.classList.add('is-success');
          status.textContent = chosen ? `${sentMsg} Programme noted: ${chosen}.` : sentMsg;
        }
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function init() {
  document.documentElement.classList.add('xp-js');

  try {
    initHeaderAndProgress();
  } catch (err) {
    console.warn('experience.js: header', err);
  }

  let heroCtrl = null;
  try {
    heroCtrl = initCinemaHero();
  } catch (err) {
    console.warn('experience.js: hero', err);
  }

  try {
    initVideoModal(heroCtrl);
  } catch (err) {
    console.warn('experience.js: video modal', err);
  }

  try {
    initProgramStage();
  } catch (err) {
    console.warn('experience.js: program stage', err);
  }

  try {
    initStoryChapters();
  } catch (err) {
    console.warn('experience.js: story chapters', err);
  }

  try {
    initScrollRevealsAndCounters();
  } catch (err) {
    console.warn('experience.js: reveals & counters', err);
  }

  try {
    initFounderStage();
  } catch (err) {
    console.warn('experience.js: founder stage', err);
  }

  try {
    initProgramPickerAndApply();
  } catch (err) {
    console.warn('experience.js: apply picker', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export default { init };
