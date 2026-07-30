const indexRequests = new Map();

const loadIndex = (url) => {
  if (!indexRequests.has(url)) {
    indexRequests.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json();
      }),
    );
  }
  return indexRequests.get(url);
};

const tokenize = (value) =>
  value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);

const scorePage = (page, terms) => {
  const fields = {
    title: String(page.title || "").toLocaleLowerCase(),
    summary: String(page.summary || "").toLocaleLowerCase(),
    content: String(page.content || "").toLocaleLowerCase(),
    tags: Array.isArray(page.tags) ? page.tags.join(" ").toLocaleLowerCase() : "",
  };
  if (!terms.every((term) => Object.values(fields).some((field) => field.includes(term)))) {
    return 0;
  }
  return terms.reduce(
    (score, term) =>
      score +
      (fields.title.includes(term) ? 8 : 0) +
      (fields.tags.includes(term) ? 5 : 0) +
      (fields.summary.includes(term) ? 3 : 0) +
      (fields.content.includes(term) ? 1 : 0),
    0,
  );
};

const createResult = (page) => {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = page.url;
  link.textContent = page.title;
  item.append(link);
  if (page.summary) {
    const summary = document.createElement("p");
    summary.textContent = page.summary;
    item.append(summary);
  }
  return item;
};

const initializeSearch = (root) => {
  if (root.dataset.swiftySearchReady === "true") return;
  root.dataset.swiftySearchReady = "true";
  const form = root.querySelector("form");
  const input = root.querySelector("[data-swifty-search-input]");
  const results = root.querySelector("[data-swifty-search-results]");
  const status = root.querySelector("[data-swifty-search-status]");
  const limit = Number.parseInt(root.dataset.limit, 10) || 10;
  let pages = null;

  form?.addEventListener("submit", (event) => event.preventDefault());
  input?.addEventListener("input", async () => {
    const terms = tokenize(input.value);
    if (!terms.length) {
      results.replaceChildren();
      status.textContent = "";
      return;
    }

    status.textContent = "Searching…";
    try {
      pages ||= (await loadIndex(root.dataset.indexUrl)).pages || [];
      const matches = pages
        .map((page) => ({ page, score: scorePage(page, terms) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
        .slice(0, limit)
        .map(({ page }) => page);
      results.replaceChildren(...matches.map(createResult));
      status.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"}`;
    } catch (error) {
      results.replaceChildren();
      status.textContent = "Search is temporarily unavailable.";
      console.error(error);
    }
  });

  input?.addEventListener("keydown", (event) => {
    const links = [...results.querySelectorAll("a")];
    if (event.key === "ArrowDown" && links.length) {
      event.preventDefault();
      links[0].focus();
    } else if (event.key === "Escape") {
      input.value = "";
      input.dispatchEvent(new Event("input"));
    }
  });

  results?.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const links = [...results.querySelectorAll("a")];
    const current = links.indexOf(document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    links[(current + offset + links.length) % links.length].focus();
  });
};

const initializeAllSearch = () => {
  document.querySelectorAll("[data-swifty-search]").forEach(initializeSearch);
};

initializeAllSearch();
document.addEventListener("swifty:load", initializeAllSearch);
