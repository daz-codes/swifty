const DEFAULT_CONCURRENCY = 16;

const getConcurrencyLimit = (value = DEFAULT_CONCURRENCY) => {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_CONCURRENCY;
};

const mapLimit = async (items, mapper, concurrency = DEFAULT_CONCURRENCY) => {
  const limit = Math.min(getConcurrencyLimit(concurrency), items.length || 1);
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

export { getConcurrencyLimit, mapLimit };
