import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import fsExtra from "fs-extra";
import { dirs } from "./config.js";

let dataCache = null;

/**
 * Load all data files from the data/ folder
 * Supports .json and .yaml/.yml files
 * File name becomes the key: data/team.json -> data.team
 */
async function loadData() {
  if (dataCache !== null) {
    return dataCache;
  }

  const data = {};

  // Check if data directory exists
  if (!(await fsExtra.pathExists(dirs.data))) {
    dataCache = data;
    return data;
  }

  try {
    const files = await fs.readdir(dirs.data);

    for (const file of files) {
      const filePath = path.join(dirs.data, file);
      const stat = await fs.stat(filePath);

      // Skip directories
      if (stat.isDirectory()) continue;

      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, ext);

      // Only process JSON and YAML files
      if (!['.json', '.yaml', '.yml'].includes(ext)) continue;

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        if (ext === '.json') {
          data[name] = JSON.parse(content);
        } else {
          data[name] = yaml.load(content);
        }
      } catch (error) {
        console.warn(`Error loading data file ${file}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`Error reading data directory: ${error.message}`);
  }

  dataCache = data;
  return data;
}

/**
 * Clear the data cache (useful for watch mode)
 */
function clearDataCache() {
  dataCache = null;
}

export { loadData, clearDataCache };
