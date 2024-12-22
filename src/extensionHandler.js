import { curlRequest } from "../../qjs-ext-lib/src/curl.js";
import utils from "./utils.js";

/**
 * @description - Promisify the extensionScriptHandlerWorker.
 * @param {Object} data - The data to be passed to the worker.
 * @param {string} data.scriptPath - Path to the script to be imported.
 * @param {string[]} data.functionNames - Name of the function to be imported from the imported script.
 * @param {any[]} data.args - Arguments for the function from the imported script.
 * @returns {Promise<any>} A promise that resolves with the result or rejects with error from the worker script.
 */
export default async function extensionHandler(data) {
  if (USER_ARGUMENTS.processLimit == 1) {
    return await handleExtensionPromise(data);
  }

  return await handleExtensionThread(data);
}

async function handleExtensionPromise(data) {
  const { scriptPath, scriptMethods, args } = data;
  const exports = await import(scriptPath);

  for (const [functionName, cacheDir] of Object.entries(scriptMethods)) {
    const cb = exports?.[functionName];
    if (!cb) {
      throw SystemError(
        "Error in " + scriptPath,
        "No function named " + functionName + " found.",
      );
    }
    try {
      const result = await cb(...args);
      if (!!result && !!cacheDir) utils.writeFile(result, cacheDir);
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
      "./extensionHandlerWorker.js",
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
          const [fileName, cause] = ev.data;
          reject(
            new Error(
              `Error in "${fileName}"`,
              { body: cause },
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
              JSON.parse(body),
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
    const createExtensionTemplate = await execAsync([
      "fzf",
      "--header=\nFailed to load main.js for testing.\nCreate a new extension template in current directory?\n\n",
      "--color=16,current-bg:-1", // Set colors for background and border
      "--no-info",
      "--layout=reverse",
      "--highlight-line",
      "--header-first",
    ], { input: "Yes\nNo" });

    if (createExtensionTemplate === "Yes") {
      utils.log("Fetching extensions template...");
      const zipPath = cwd + "/extensionTemplate.zip";
      await curlRequest(
        "https://github.com/5hubham5ingh/WallRizz/archive/refs/heads/ext.zip",
        { outputFile: zipPath },
      );
      utils.log("Extracting template...");
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
      utils.log(
        "Template created successfully at " + extensionTemplateDirPath,
      );
    }
    throw EXIT;
  }

  await extensions.main();
}
