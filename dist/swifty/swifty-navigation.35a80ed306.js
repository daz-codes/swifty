import { Morpheus } from "./morpheus.js";

export class SwiftyNavigation extends Morpheus {
  constructor(options = {}) {
    super({
      eventAliases: ["swifty"],
      historyAliases: ["swifty"],
      navigationOffSelector:
        '[data-morpheus-navigation="off"], [data-swifty-navigation="off"]',
      prefetchOffSelector:
        '[data-morpheus-prefetch="off"], [data-swifty-prefetch="off"]',
      permanentSelector: "[data-morpheus-permanent], [data-swifty-permanent]",
      loadingAttributes: ["data-morpheus-navigating", "data-swifty-navigating"],
      navigationHeaders: { "X-Swifty-Navigation": "true" },
      prefetchHeaders: { "X-Swifty-Prefetch": "true" },
      ...options,
    });
  }
}

const startSwiftyNavigation = (script) => {
  if (!script || typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const navigation = new SwiftyNavigation({
    target: script.dataset.target,
    prefetching: script.dataset.prefetching !== "off",
    prefetchDelay: script.dataset.prefetchDelay,
    cacheSize: script.dataset.cacheSize,
    cacheTTL: script.dataset.cacheTtl,
  });
  window.SwiftyNavigation = navigation;
  window.Morpheus ||= navigation;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => navigation.start(), { once: true });
  } else {
    navigation.start();
  }

  return navigation;
};

const script = typeof document === "undefined"
  ? null
  : document.querySelector("script[data-swifty-navigation]");
startSwiftyNavigation(script);

export { Morpheus, startSwiftyNavigation };
