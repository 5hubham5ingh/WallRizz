import { OS, SystemError, EXIT, Color, execAsync, STD, HOME_DIR } from "../core/constants.js";
import { writeFile } from "../core/utils/io.js";

globalThis.Color = Color;
globalThis.execAsync = execAsync;
globalThis.STD = STD;
globalThis.OS = OS;
globalThis.HOME_DIR = HOME_DIR;

const parent = OS.Worker.parent;

/**
 * @param {Object} data
 * @param {string} data.scriptPath - Path to the script to be imported.
 * @param {string[]} data.scriptMethods - { methodName: cacheDir }.
 * @param {any[]} data.args - Arguments for the functions from the imported script.
 */
const startWork = async (data) => {
  const { scriptPath, scriptMethods, args } = data;
  const exports = await import(scriptPath);
  for (const [functionName, cacheDir] of Object.entries(scriptMethods)) {
    const cb = exports?.[functionName];
    if (!cb) {
      parent.postMessage({
        type: "systemError",
        data: (
          "Error in " + scriptPath + ";" +
          "No function named " + functionName + " found."
        ),
      });
      break;
    }
    try {
      const result = await cb(...args);
      if (!!result && !!cacheDir) writeFile(result, cacheDir);
    } catch (status) {
      if (status === EXIT) continue;

      status instanceof SystemError
        ? parent.postMessage({
          type: "systemError",
          data: [
            status.name,
            status.description,
            JSON.stringify(status.body ?? ""),
          ],
        })
        : parent.postMessage({
          type: "error",
          data:
            `${status.constructor.name}: ${status.message}\n${status.stack}`,
        });
    }
  }

  parent.postMessage({ type: "success" });
};

parent.onmessage = async (e) => {
  const ev = e.data;
  switch (ev.type) {
    case "start":
      await startWork(ev.data);
      break;
    case "abort":
      parent.onmessage = null;
  }
};
