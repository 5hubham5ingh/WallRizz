import { ansi } from "../../helpers/ansiStyle.js";
import * as std from "../../qjs-ext-lib/src/std.js";

/**
 * Represents a system-level error that extends the built-in Error class.
 * Provides a method to log the error in a formatted style.
 *
 * @class
 * @extends Error
 */
export class SystemError extends Error {
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
  }

  /**
   * Logs the error in a formatted style, using ANSI codes for styling.
   *
   * @param {boolean} inspect - Whether to print the error body or not for inspection.
   */
  log(inspect = false) {
    std.err.puts(
      `\n${ansi.styles(["bold", "red"])
      }  ${this.name}:${ansi.style.reset}\n${ansi.style.red}  ${this.description}${ansi.style.reset}\n\n${inspect && this.body ? this.body : ""
      }\n`,
    );
  }
}
