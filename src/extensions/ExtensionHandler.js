import { curlRequest } from "../../qjs-ext-lib/src/curl.js";
import { writeFile, ensureDir } from "../core/utils/io.js";
import { log } from "../core/utils/ui.js";
import Fzf from "../../helpers/fzf.js"
import { OS, SystemError, EXIT, execAsync, STD, HOME_DIR } from "../core/constants.js";

/**
 * @description - Promisify the extensionScriptHandlerWorker.
 * @param {Object} data - The data to be passed to the worker.
 * @param {string} data.scriptPath - Path to the script to be imported.
 * @param {string[]} data.scriptMethods - { methodName: cacheDir }.
 * @param {any[]} data.args - Arguments for the function from the imported script.
 * @param {Object} [data.config] - Configuration object.
 * @returns {Promise<any>} A promise that resolves with the result or rejects with error from the worker script.
 */
export default async function extensionHandler(data) {
  const config = data.config;
  if (config.processLimit == 1) {
    return await handleExtensionPromise(data);
  }

  return await handleExtensionThread(data);
}

async function handleExtensionPromise(data) {
  const { scriptPath, scriptMethods, args } = data;
  // Set globals that extension scripts may depend on (previously from globalConstants.js)
  globalThis.execAsync ??= execAsync;
  globalThis.STD ??= STD;
  globalThis.OS ??= OS;
  globalThis.HOME_DIR ??= HOME_DIR;
  globalThis.EXIT ??= EXIT;
  globalThis.SystemError ??= SystemError;
  const exports = await import(scriptPath);

  for (const [functionName, cacheDir] of Object.entries(scriptMethods)) {
    const cb = exports?.[functionName];
    if (!cb) {
      throw new SystemError(
        "Error in " + scriptPath,
        "No function named " + functionName + " found.",
      );
    }
    try {
      const result = await cb(...args);
      if (!!result && !!cacheDir) writeFile(result, cacheDir);
    } catch (status) {
      if (status === EXIT) continue;

      throw status;
    }
  }
}

async function handleExtensionThread(data) {
  return await new Promise((resolve, reject) => {
    // When process limit is set greater than one.
    const worker = new OS.Worker(
      "extensions/ExtensionHandlerWorker.js",
    );
    const abortWorker = () => {
      worker.postMessage({ type: "abort" });
      worker.onmessage = null;
    };

    worker.postMessage({ type: "start", data: data });

    worker.onmessage = (e) => {
      const ev = e.data;
      switch (ev.type) {
        case "success":
          abortWorker();
          resolve(ev.data);
          break;
        case "error": {
          abortWorker();
          reject(
            new Error(
              ev.data,
            ),
          );
          break;
        }
        case "systemError": {
          abortWorker();
          const [name, description, body] = ev.data;
          reject(
            new SystemError(
              name,
              description,
              body,
            ),
          );
        }
      }
    };
  });
}

export async function testExtensions() {
  const cwd = OS.getcwd()[0];
  let extensions;

  try {
    extensions = await import(cwd.concat("/main.js"));
  } catch (_) {
    const fzf = new Fzf()
    fzf.header("\nFailed to load main.js for testing.\nCreate a new extension template in current directory?\n\n")
      .color("16,current-bg:-1")
      .noInfo()
      .layout("reverse")
      .highlightLine()
      .headerFirst()
    const createExtensionTemplate = await execAsync(fzf.toString(), { input: "Yes\nNo" });

    if (createExtensionTemplate === "Yes") {
      log("Fetching extensions template...", globalThis.USER_ARGUMENTS);
      const zipPath = cwd + "/extensionTemplate.zip";
      await curlRequest(
        "https://github.com/5hubham5ingh/WallRizz/archive/refs/heads/ext.zip",
        { outputFile: zipPath },
      );
      log("Extracting template...", globalThis.USER_ARGUMENTS);
      await execAsync(["unzip", zipPath])
        .catch((_) => {
          throw new SystemError(
            "Extraction failed!",
            "Make sure unzip is installed and available.",
          );
        });
      OS.remove(zipPath);
      const extensionTemplateDirPath = cwd + "/extensionTemplate";
      OS.rename(cwd + "/WallRizz-ext", extensionTemplateDirPath);
      log(
        "Template created successfully at " + extensionTemplateDirPath,
        globalThis.USER_ARGUMENTS
      );
    }
    throw EXIT;
  }

  await extensions.main();
}
