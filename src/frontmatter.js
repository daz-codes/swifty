import yaml from "js-yaml";

const frontMatterPattern =
  /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;
const frontMatterSchema = new yaml.Schema({
  implicit: yaml.DEFAULT_SCHEMA.compiledImplicit.filter(
    (type) => type.tag !== "tag:yaml.org,2002:timestamp",
  ),
  explicit: yaml.DEFAULT_SCHEMA.compiledExplicit,
});

const parseFrontMatter = (source) => {
  if (!/^---[ \t]*(?:\r?\n|$)/.test(source)) {
    return { data: {}, content: source };
  }

  const match = source.match(frontMatterPattern);
  if (!match) {
    throw new Error("Front matter is missing a closing --- delimiter");
  }

  // Keep YAML timestamps as strings so Swifty can distinguish calendar dates
  // from exact ISO instants and apply the configured timezone deliberately.
  const data = yaml.load(match[1], { schema: frontMatterSchema }) || {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Front matter must contain a YAML object");
  }

  return {
    data,
    content: source.slice(match[0].length),
  };
};

export { parseFrontMatter };
