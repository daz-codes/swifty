import { Idiomorph } from "./idiomorph.esm.js";

if (typeof window !== "undefined") window.Idiomorph ||= Idiomorph;

class NavigationFallback extends Error {
  constructor(url, message) {
    super(message);
    this.url = url;
  }
}

export class SwiftyNavigation {
  constructor(options = {}) {
    this.targetSelector = options.target || "main";
    this.prefetching = options.prefetching !== false;
    this.cacheSize = Number(options.cacheSize || 20);
    this.cacheTTL = Number(options.cacheTTL || 15) * 1000;
    this.cache = new Map();
    this.sequence = 0;
    this.controller = null;
    this.prefetchTimer = null;
    this.boundClick = (event) => this.handleClick(event);
    this.boundPopState = (event) => this.handlePopState(event);
    this.boundPrefetchIntent = (event) => this.handlePrefetchIntent(event);
    this.boundInvalidate = () => this.clearCache();
  }

  start() {
    if (this.started) return;
    this.started = true;

    history.scrollRestoration = "manual";
    this.rememberScroll();
    document.addEventListener("click", this.boundClick);
    window.addEventListener("popstate", this.boundPopState);
    document.addEventListener("mouseover", this.boundPrefetchIntent);
    document.addEventListener("focusin", this.boundPrefetchIntent);
    document.addEventListener("touchstart", this.boundPrefetchIntent, { passive: true });
    document.addEventListener("swifty:invalidate", this.boundInvalidate);
    requestAnimationFrame(() => {
      this.dispatch("swifty:load", {
        url: window.location.href,
        navigationType: "initial",
        prefetched: false,
        target: document.querySelector(this.targetSelector),
      });
    });
  }

  stop() {
    if (!this.started) return;

    document.removeEventListener("click", this.boundClick);
    window.removeEventListener("popstate", this.boundPopState);
    document.removeEventListener("mouseover", this.boundPrefetchIntent);
    document.removeEventListener("focusin", this.boundPrefetchIntent);
    document.removeEventListener("touchstart", this.boundPrefetchIntent);
    document.removeEventListener("swifty:invalidate", this.boundInvalidate);
    clearTimeout(this.prefetchTimer);
    this.controller?.abort();
    this.started = false;
  }

  handleClick(event) {
    const link = this.eligibleLink(event.target);
    if (!link || !this.eligibleClick(event, link)) return;

    const url = new URL(link.href, window.location.href);
    if (this.onlyChangesHash(url)) return;

    const detail = { url: url.href, link, navigationType: "link" };
    if (!this.dispatch("swifty:before-navigate", detail, true)) return;

    event.preventDefault();
    this.rememberScroll();
    this.navigate(url.href, { historyMode: "push", navigationType: "link" });
  }

  handlePopState(event) {
    const detail = { url: window.location.href, navigationType: "popstate" };
    if (!this.dispatch("swifty:before-navigate", detail, true)) {
      window.location.reload();
      return;
    }

    const scroll = event.state?.swifty?.scroll;
    this.navigate(window.location.href, {
      historyMode: "pop",
      navigationType: "popstate",
      scroll,
    });
  }

  handlePrefetchIntent(event) {
    if (!this.prefetchEnabled()) return;

    const link = this.eligibleLink(event.target);
    if (!link || !this.eligibleURL(new URL(link.href, window.location.href))) return;
    if (link.closest('[data-swifty-prefetch="off"]')) return;
    if (event.type === "mouseover" && link.contains(event.relatedTarget)) return;

    clearTimeout(this.prefetchTimer);
    const delay = event.type === "mouseover" ? 75 : 0;
    this.prefetchTimer = setTimeout(() => this.prefetch(link.href), delay);
  }

  async navigate(url, options = {}) {
    const sequence = ++this.sequence;
    this.controller?.abort();
    this.controller = null;
    this.setLoading(true, { url, navigationType: options.navigationType });

    try {
      let prefetched = false;
      let page = await this.takePrefetch(url);
      if (page?.cacheable) {
        prefetched = true;
      } else {
        this.controller = new AbortController();
        page = await this.fetchPage(url, { signal: this.controller.signal });
      }

      if (sequence !== this.sequence) return;

      const beforeMorph = {
        url: page.url,
        navigationType: options.navigationType,
        prefetched,
        newTarget: page.target,
      };
      if (!this.dispatch("swifty:before-morph", beforeMorph, true)) {
        throw new NavigationFallback(page.url, "morph was cancelled");
      }

      this.morph(page);
      this.updateHistory(page.url, options.historyMode);
      await this.nextFrame();
      if (sequence !== this.sequence) return;
      this.restoreScroll(page.url, options);
      this.manageFocus(page.url, options.navigationType);

      this.dispatch("swifty:load", {
        url: page.url,
        navigationType: options.navigationType,
        prefetched,
        target: document.querySelector(this.targetSelector),
      });
    } catch (error) {
      if (error.name === "AbortError" || sequence !== this.sequence) return;

      const fallbackURL = error instanceof NavigationFallback ? error.url : url;
      this.dispatch("swifty:navigation-error", { url: fallbackURL, error });
      this.fullLoad(fallbackURL, options.historyMode === "pop");
    } finally {
      if (sequence === this.sequence) {
        this.setLoading(false, { url, navigationType: options.navigationType });
      }
    }
  }

  async fetchPage(url, { prefetch = false, signal } = {}) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      redirect: "follow",
      signal,
      headers: {
        Accept: "text/html",
        "X-Swifty-Navigation": "true",
        ...(prefetch ? { "X-Swifty-Prefetch": "true" } : {}),
      },
    });

    const finalURL = response.url || url;
    if (!response.ok) throw new NavigationFallback(finalURL, `HTTP ${response.status}`);
    if (!this.eligibleURL(new URL(finalURL, window.location.href))) {
      throw new NavigationFallback(finalURL, "redirected outside the current origin");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      throw new NavigationFallback(finalURL, "response is not HTML");
    }

    const source = await response.text();
    const parsed = new DOMParser().parseFromString(source, "text/html");
    const target = parsed.querySelector(this.targetSelector);
    if (!target) throw new NavigationFallback(finalURL, "navigation target is missing");

    const cacheControl = response.headers.get("cache-control") || "";
    return {
      url: finalURL,
      target,
      title: parsed.title,
      cacheable: !cacheControl.includes("no-store"),
    };
  }

  morph(page) {
    const current = document.querySelector(this.targetSelector);
    if (!current) throw new NavigationFallback(page.url, "current navigation target is missing");

    Idiomorph.morph(current, page.target, {
      morphStyle: "outerHTML",
      restoreFocus: false,
      callbacks: {
        beforeNodeMorphed: (oldNode) => {
          if (oldNode.nodeType === Node.ELEMENT_NODE && oldNode.hasAttribute("data-swifty-permanent")) {
            return false;
          }
        },
      },
    });

    if (page.title) document.title = page.title;
  }

  async prefetch(url) {
    const key = this.cacheKey(url);
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.promise;
    if (existing) this.cache.delete(key);

    const promise = this.fetchPage(key, { prefetch: true })
      .then((page) => {
        if (!page.cacheable) this.cache.delete(key);
        return page;
      })
      .catch((error) => {
        this.cache.delete(key);
        if (!(error instanceof NavigationFallback)) console.debug("Swifty prefetch failed", error);
        return null;
      });

    this.cache.set(key, { promise, expiresAt: Date.now() + this.cacheTTL });
    this.pruneCache();
    return promise;
  }

  async takePrefetch(url) {
    const key = this.cacheKey(url);
    const entry = this.cache.get(key);
    if (!entry) return null;

    this.cache.delete(key);
    if (entry.expiresAt <= Date.now()) return null;
    return entry.promise;
  }

  pruneCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size > this.cacheSize) this.cache.delete(this.cache.keys().next().value);
  }

  clearCache() {
    this.cache.clear();
  }

  eligibleClick(event, link) {
    return event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
      !event.defaultPrevented &&
      (!link.target || link.target === "_self");
  }

  eligibleLink(node) {
    const link = node instanceof Element ? node.closest("a[href]") : null;
    if (!link || link.hasAttribute("download")) return null;
    if (link.closest('[data-swifty-navigation="off"]')) return null;
    if (link.relList.contains("external")) return null;

    const url = new URL(link.href, window.location.href);
    return this.eligibleURL(url) ? link : null;
  }

  eligibleURL(url) {
    return url.origin === window.location.origin && ["http:", "https:"].includes(url.protocol);
  }

  onlyChangesHash(url) {
    return url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      url.hash &&
      url.hash !== window.location.hash;
  }

  prefetchEnabled() {
    const connection = navigator.connection;
    return this.prefetching &&
      !connection?.saveData &&
      !["slow-2g", "2g"].includes(connection?.effectiveType);
  }

  cacheKey(url) {
    const value = new URL(url, window.location.href);
    value.hash = "";
    return value.href;
  }

  rememberScroll() {
    const state = history.state || {};
    history.replaceState({
      ...state,
      swifty: {
        ...(state.swifty || {}),
        url: window.location.href,
        scroll: { x: window.scrollX, y: window.scrollY },
      },
    }, "", window.location.href);
  }

  updateHistory(url, mode) {
    const state = { swifty: { url, scroll: { x: 0, y: 0 } } };
    if (mode === "push") history.pushState(state, "", url);
    else if (mode === "pop" && url !== window.location.href) history.replaceState(state, "", url);
  }

  restoreScroll(url, options) {
    if (options.historyMode === "pop" && options.scroll) {
      window.scrollTo(options.scroll.x || 0, options.scroll.y || 0);
      return;
    }

    const hash = new URL(url, window.location.href).hash;
    const anchor = this.anchorFor(hash);
    if (anchor) anchor.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  manageFocus(url, navigationType) {
    if (navigationType === "popstate") return;

    const hash = new URL(url, window.location.href).hash;
    const target = this.anchorFor(hash) ||
      document.querySelector(`${this.targetSelector} [autofocus]`) ||
      document.querySelector(this.targetSelector);
    if (!target) return;

    const addedTabIndex = !target.hasAttribute("tabindex") && !target.matches("a,button,input,select,textarea");
    if (addedTabIndex) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (addedTabIndex) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }

  anchorFor(hash) {
    if (!hash) return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  setLoading(loading, detail) {
    const root = document.documentElement;
    const target = document.querySelector(this.targetSelector);
    if (loading) {
      root.setAttribute("data-swifty-navigating", "");
      target?.setAttribute("aria-busy", "true");
      this.dispatch("swifty:navigation-start", detail);
    } else {
      root.removeAttribute("data-swifty-navigating");
      target?.removeAttribute("aria-busy");
      this.dispatch("swifty:navigation-end", detail);
    }
  }

  dispatch(name, detail, cancelable = false) {
    return document.dispatchEvent(new CustomEvent(name, { detail, cancelable }));
  }

  fullLoad(url, replace = false) {
    if (replace) window.location.replace(url);
    else window.location.assign(url);
  }
}

const script = document.querySelector("script[data-swifty-navigation]");
if (script) {
  const navigation = new SwiftyNavigation({
    target: script.dataset.target,
    prefetching: script.dataset.prefetching !== "off",
    cacheSize: script.dataset.cacheSize,
    cacheTTL: script.dataset.cacheTtl,
  });
  window.SwiftyNavigation = navigation;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => navigation.start(), { once: true });
  } else {
    navigation.start();
  }
}
