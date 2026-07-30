import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

import { baseDir } from "./config.js";

const extensionPath = path.join(baseDir, "swifty.config.js");
const emptyExtensions = Object.freeze({
  globals: Object.freeze({}),
  helpers: Object.freeze({}),
  markedExtensions: Object.freeze([]),
});

let extensionPromise;

const validateObject = (value, name) => {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} in ${extensionPath} must be an object`);
  }
  return value;
};

const readExtensions = async () => {
  try {
    await fs.access(extensionPath);
  } catch (error) {
    if (error.code === "ENOENT") return emptyExtensions;
    throw new Error(`Unable to read ${extensionPath}: ${error.message}`, {
      cause: error,
    });
  }

  let imported;
  try {
    imported = await import(pathToFileURL(extensionPath).href);
  } catch (error) {
    throw new Error(`Unable to load ${extensionPath}: ${error.message}`, {
      cause: error,
    });
  }

  const config = imported.default ?? imported;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError(`${extensionPath} must export a configuration object`);
  }

  const globals = validateObject(config.globals, "globals");
  const helpers = validateObject(config.helpers, "helpers");
  for (const [name, helper] of Object.entries(helpers)) {
    if (typeof helper !== "function") {
      throw new TypeError(`helpers.${name} in ${extensionPath} must be a function`);
    }
  }

  const markedExtensions = config.markedExtensions ?? [];
  if (
    !Array.isArray(markedExtensions) ||
    markedExtensions.some(
      (extension) => !extension || typeof extension !== "object" || Array.isArray(extension),
    )
  ) {
    throw new TypeError(
      `markedExtensions in ${extensionPath} must be an array of Marked extension objects`,
    );
  }

  return {
    globals: Object.freeze({ ...globals }),
    helpers: Object.freeze({ ...helpers }),
    markedExtensions: Object.freeze([...markedExtensions]),
  };
};

const loadExtensions = () => {
  extensionPromise ||= readExtensions();
  return extensionPromise;
};

export { extensionPath, loadExtensions };
