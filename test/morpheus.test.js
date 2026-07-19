import assert from "assert";

import { Morpheus, NavigationFallback } from "../src/client/morpheus.js";
import {
  SwiftyNavigation,
  startSwiftyNavigation,
} from "../src/client/swifty-navigation.js";
import { startMorpheus } from "../src/client/morpheus-auto.js";

describe("Morpheus navigation", () => {
  it("is safe to import and configure without a browser environment", () => {
    const navigation = new Morpheus();

    assert.strictEqual(navigation.targetSelector, "main");
    assert.deepStrictEqual(navigation.eventPrefixes, ["morpheus"]);
    assert.deepStrictEqual(navigation.historyKeys, ["morpheus"]);
    assert.strictEqual(navigation.navigationHeaders["X-Morpheus-Navigation"], "true");
    assert.strictEqual(startMorpheus(null), null);
    assert.strictEqual(startSwiftyNavigation(null), null);
    assert.ok(new NavigationFallback("/fallback", "failed") instanceof Error);
  });

  it("supports reusable navigation options", () => {
    const morpher = { morph() {} };
    const navigation = new Morpheus({
      target: "#content",
      prefetching: false,
      prefetchDelay: 125,
      cacheSize: 8,
      cacheTTL: 30,
      morpher,
    });

    assert.strictEqual(navigation.targetSelector, "#content");
    assert.strictEqual(navigation.prefetching, false);
    assert.strictEqual(navigation.prefetchDelay, 125);
    assert.strictEqual(navigation.cacheSize, 8);
    assert.strictEqual(navigation.cacheTTL, 30000);
    assert.strictEqual(navigation.morpher, morpher);
  });

  it("keeps Swifty's public browser contracts as compatibility aliases", () => {
    const navigation = new SwiftyNavigation();

    assert.deepStrictEqual(navigation.eventPrefixes, ["morpheus", "swifty"]);
    assert.deepStrictEqual(navigation.historyKeys, ["morpheus", "swifty"]);
    assert.ok(navigation.navigationOffSelector.includes("data-swifty-navigation"));
    assert.ok(navigation.prefetchOffSelector.includes("data-swifty-prefetch"));
    assert.ok(navigation.permanentSelector.includes("data-swifty-permanent"));
    assert.ok(navigation.loadingAttributes.includes("data-swifty-navigating"));
    assert.strictEqual(navigation.navigationHeaders["X-Swifty-Navigation"], "true");
    assert.strictEqual(navigation.prefetchHeaders["X-Swifty-Prefetch"], "true");
  });

  it("dispatches generic and compatibility events with shared cancellation", () => {
    const originalDocument = globalThis.document;
    const events = [];
    globalThis.document = {
      dispatchEvent(event) {
        events.push(event.type);
        if (event.type === "swifty:before-navigate") event.preventDefault();
        return !event.defaultPrevented;
      },
    };

    try {
      const navigation = new SwiftyNavigation();
      assert.strictEqual(
        navigation.dispatch("before-navigate", { url: "/next" }, true),
        false,
      );
      assert.deepStrictEqual(events, [
        "morpheus:before-navigate",
        "swifty:before-navigate",
      ]);
    } finally {
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }
  });
});
