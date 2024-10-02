import cache from "./cache.js";
import { ensureDir } from "../justjs/src/fs.js";
import { os, std } from "./quickJs.js";

"use strip";

class Config { // theme extension script manager
  constructor() {
    this.homeDir = std.getenv("HOME");
    this.themeExtensionScripts = {};
    this.themeExtensionScriptsBaseDir = this.homeDir.concat(
      "/.config/WallWiz/themeExtensionScripts/",
    );
  }

  static async create() {
    const config = new Config();
    await config.loadThemeExtensionScripts();
    return config;
  }

  getThemeExtensionScriptDirByScriptName(scriptName) {
    return this.themeExtensionScriptsBaseDir.concat(scriptName);
  }

  async loadThemeExtensionScripts() {
    const extensionDir = this.themeExtensionScriptsBaseDir;
    ensureDir(extensionDir);
    const scriptNames = os.readdir(extensionDir)[0]
      .filter((name) => name !== "." && name !== ".." && name.endsWith(".js"));
    for (const fileName of scriptNames) {
      const extensionPath = extensionDir.concat(fileName);
      const script = await import(extensionPath);
      if (!script.setTheme) {
        print("No setTheme handler function found in ", extensionPath);
        std.exit(2);
      }
      if (!script.getDarkThemeConf || !script.getLightThemeConf) {
        print("No getThemeConf function found in ", extensionPath);
        std.exit(2);
      }
      this.themeExtensionScripts[fileName] = script;
      cache.createCacheDirrectoryForAppThemeConfigFileFromAppName(fileName);
    }
  }

  getThemeExtensionScripts() {
    return this.themeExtensionScripts;
  }

  getThemeHandler(scriptName) {
    return this.themeExtensionScripts[scriptName];
  }
}

const config = await Config.create().catch((e) => {
  print(e);
  throw e;
});
export default config;
