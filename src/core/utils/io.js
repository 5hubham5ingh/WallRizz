import { STD, OS, HOME_DIR } from "../constants.js";

/**
 * Writes content to a file
 * @param {string} content - The content to write to the file
 * @param {string} path - The path of the file to write to
 */
export function writeFile(content, path) {
  if (typeof content !== "string") {
    throw TypeError("File content to write must be of type string.");
  }
  const errObj = {};
  let fileHandler = STD.open(path, "w+", errObj);
  if (errObj.errno === 2) {
    ensureDir(
      path.split("/")
        .map((dir, currDepth, depth) =>
          currDepth === (depth.length - 1) ? "" : dir
        )
        .join("/"),
    );
    fileHandler = STD.open(path, "w+", errObj);
  }
  if (!fileHandler) {
    throw Error(
      "Failed to open file: " + path + "\nError code: " + `${errObj.errno}`,
    );
  }
  fileHandler.puts(content);
  fileHandler.close();
}

/**
 * Ensures a directory exists, creating it if necessary.
 * @param {string} dir - directory path
 */
export function ensureDir(dir) {
  if (typeof dir !== "string") {
    throw new TypeError("Invalid directory type.");
  }
  let directory;
  switch (dir[0]) {
    case "~":
      directory = HOME_DIR.concat(dir.slice(1));
      break;
    case "/":
      directory = dir;
      break;
    default: {
      const path = OS.realpath(dir);
      if (path[1] !== 0) throw new Error("Failed to read directory");
      directory = path[0];
    }
  }

  directory.split("/").forEach((dir, i, path) => {
    if (!dir) return;
    const currPath = path.filter((_, j) => j <= i).join("/");
    const dirStat = OS.stat(currPath)[0];
    if (!dirStat) OS.mkdir(currPath);
  });
}
