import * as std from "../../qjs-ext-lib/src/std.js";
import * as os from "../../qjs-ext-lib/src/os.js";
import { exec as execAsync } from "../../qjs-ext-lib/src/process.js";
import Color from "../Color/color.js";
import { SystemError } from "./errors.js";

// Export for new modules
export { std as STD, os as OS, execAsync, Color, SystemError };
export const HOME_DIR = std.getenv("HOME");
export const EXIT = "exit";
