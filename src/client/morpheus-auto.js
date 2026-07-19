import { Morpheus } from "./morpheus.js";

const startMorpheus = (script) => {
  if (!script || typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const navigation = new Morpheus({
    target: script.dataset.target,
    prefetching: script.dataset.prefetching !== "off",
    prefetchDelay: script.dataset.prefetchDelay,
    cacheSize: script.dataset.cacheSize,
    cacheTTL: script.dataset.cacheTtl,
  });
  window.Morpheus = navigation;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => navigation.start(), { once: true });
  } else {
    navigation.start();
  }

  return navigation;
};

const script = typeof document === "undefined"
  ? null
  : document.querySelector("script[data-morpheus]");
startMorpheus(script);

export { startMorpheus };
