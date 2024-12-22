import * as std from "../../qjs-ext-lib/src/std.js";
import * as os from "../../qjs-ext-lib/src/os.js";
import { ansi } from "../../justjs/ansiStyle.js";
import { exec as execAsync } from "../../qjs-ext-lib/src/process.js";
import Color from "./Color/color.js";

globalThis.Color = Color;

globalThis.OS = os;

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
   * @param {string} name - The error name describing the nature of issue.
   * @param {string} [description] - Additional description about the error (optional).
   * @param {typeof Error} body
   */
  constructor(name, description, body) {
    super(name);
    this.name = name;
    this.description = description;
    this.body = body;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
    }
  }

  /**
   * Logs the error in a formatted style, using ANSI codes for styling.
   *
   * @param {boolean} inspect - Wheather to print the error body or not for inspection.
   */
  log() {
    STD.err.puts(
      `${
        ansi.styles(["bold", "red"])
      }  ${this.name}:${ansi.style.reset}\n${ansi.style.red}  ${this.description}${ansi.style.reset}\n\n`,
    );
  }
};

globalThis.execAsync = execAsync;

globalThis.EXIT = "exit";
