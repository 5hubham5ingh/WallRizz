import * as std from "std";
import * as os from "os";
import { ansi } from "../../justjs/src/just-js/helpers/ansiStyle.js";
import { exec as execAsync } from "../../justjs/src/process.js";

/**
 * @typedef {import('./types.d.ts').IOs} IOs
 * @typedef {import('./types.d.ts').IStd} IStd
 * @typedef {import('./types.d.ts').UserArguments} UserArguments
 */

/**
 * @type {IOs}
 */
globalThis.OS = os;

/**
 * @type {IStd}
 */
globalThis.STD = std;

/**
 * @type {string}
 */
globalThis.HOME_DIR = std.getenv("HOME");

/**
 * Represents a system-level error that extends the built-in Error class.
 * Provides a method to log the error in a formatted style.
 *
 * @class
 * @extends Error
 */
globalThis.SystemError = class SystemError extends Error {
  /**
   * Creates an instance of SystemError.
   *
   * @param {string} error - The error message describing the issue.
   * @param {string} [description] - Additional description about the error (optional).
   * @param {typeof Error} body
   */
  constructor(error, description, body) {
    super(error);
    this.name = error;
    this.description = description;
    this.body = body;
    // Capture the stack trace (optional)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
    }
  }

  /**
   * Logs the error in a formatted style, using ANSI codes for styling.
   *
   * @param {boolean} inspect - Wheather to print the error body or not for inspection.
   */
  log(inspect) {
    print(
      "\n",
      ansi.styles(["bold", "red"]),
      this.name,
      ":",
      ansi.style.reset,
      "\n",
      ansi.style.red,
      this.description.split(".").map((line) => line.trim()).join("\n"),
      ansi.style.reset,
      "\n",
      inspect && body,
      cursorShow,
    );
  }
};

/**
 * @typedef {typeof execAsync}
 */
globalThis.execAsync = execAsync;
