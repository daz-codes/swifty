import crypto from "crypto";

const normalizeTagLabel = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

const normalizeTagIdentity = (value) =>
  normalizeTagLabel(value).normalize("NFKC").toLowerCase();

const createTagSlugBase = (value) =>
  normalizeTagIdentity(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const hashTagIdentity = (identity) =>
  crypto.createHash("sha256").update(identity).digest("hex");

const createTagSlugMap = (tags) => {
  const entries = tags
    .map((tag) => ({
      identity: tag.identity || normalizeTagIdentity(tag.label),
      base: tag.slugBase ?? createTagSlugBase(tag.label),
    }))
    .sort((a, b) => a.identity.localeCompare(b.identity));
  const baseCounts = new Map();
  const slugs = new Map();
  const used = new Set();

  for (const { base } of entries) {
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
  }

  for (const { identity, base } of entries) {
    const hash = hashTagIdentity(identity);
    const stem = base || "tag";
    let hashLength = 8;
    let slug = base && baseCounts.get(base) === 1
      ? base
      : `${stem}-${hash.slice(0, hashLength)}`;

    while (used.has(slug) && hashLength < hash.length) {
      hashLength += 4;
      slug = `${stem}-${hash.slice(0, hashLength)}`;
    }
    if (used.has(slug)) {
      let suffix = 2;
      while (used.has(`${slug}-${suffix}`)) suffix += 1;
      slug = `${slug}-${suffix}`;
    }

    used.add(slug);
    slugs.set(identity, slug);
  }

  return slugs;
};

const createStandaloneTagSlug = (value) => {
  const label = normalizeTagLabel(value);
  const identity = normalizeTagIdentity(label);
  const slugBase = createTagSlugBase(label);
  return createTagSlugMap([{ label, identity, slugBase }]).get(identity);
};

export {
  createStandaloneTagSlug,
  createTagSlugBase,
  createTagSlugMap,
  normalizeTagIdentity,
  normalizeTagLabel,
};
