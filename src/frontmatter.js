import yaml from "js-yaml";

const frontMatterPattern =
  /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;

const parseFrontMatter = (source) => {
  if (!/^---[ \t]*(?:\r?\n|$)/.test(source)) {
    return { data: {}, content: source };
  }

  const match = source.match(frontMatterPattern);
  if (!match) {
    throw new Error("Front matter is missing a closing --- delimiter");
  }

  const data = yaml.load(match[1]) || {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Front matter must contain a YAML object");
  }

  return {
    data,
    content: source.slice(match[0].length),
  };
};

export { parseFrontMatter };
