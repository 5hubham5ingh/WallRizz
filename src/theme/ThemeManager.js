import { ensureDir, writeFile } from "../core/utils/io.js";
import { log, notify } from "../core/utils/ui.js";
import { promiseQueueWithLimit } from "../core/utils/async.js";
import workerPromise from "../extensions/ExtensionHandler.js";
import { OS, STD, HOME_DIR, SystemError, execAsync, Color } from "../core/constants.js";

/**
 * @typedef {import('../core/types.d.ts').ColoursCache} ColoursCache
 */

/**
 * Theme class manages colors and theme configurations of wallpapers
 */
class Theme {
  /**
   * Constructor for the Theme class
   * @param {string} wallpaperDir - Directory containing cached wallpapers
   * @param {Array} wallpaper - Array of wallpaper objects
   * @param {Object} config - Configuration object
   */
  constructor(wallpaperDir, wallpaper, config) {
    this.wallpaperDir = wallpaperDir;
    this.wallpaper = wallpaper;
    this.config = config;
    this.wallpaperThemeCacheDir = `${HOME_DIR}/.cache/WallRizz/themes/`;
    this.appThemeCacheDir = {};
    this.themeExtensionScriptsBaseDir =
      `${HOME_DIR}/.config/WallRizz/themeExtensionScripts/`;
    this.themeExtensionScripts = {};
  }

  /** @type {ColoursCache} */
  static coloursCache = {};

  async init() {
    ensureDir(this.wallpaperThemeCacheDir);
    await this.createColoursCacheFromWallpapers();
    this.loadThemeExtensionScripts();
    await this.createAppThemesFromColours();
  }

  static wallpaperColoursCacheFilePath =
    `${HOME_DIR}/.cache/WallRizz/colours.json`; // Made static to share it with UI class

  async createColoursCacheFromWallpapers() {
    const getColoursFromWallpaper = async (wallpaperPath) => {
      const result = await execAsync(
        this.config.colorExtractionCommand.replace("{}", wallpaperPath),
      );
      const colors = result
        .split("\n")
        .map((line) => line.split(" ").filter((word) => Color(word).isValid()))
        .flat()
        .map((color) => Color(color).toHexString());
      if (!colors.length) {
        throw new SystemError(
          "Color extraction failed.",
          "Make sure the backend is extracting colors correctly.",
        );
      }
      return colors;
    };

    const queue = this.wallpaper
      .filter((wp) => !this.getCachedColours(wp.uniqueId))
      .map((wp) => async () => {
        const wallpaperPath = `${this.wallpaperDir}${wp.uniqueId}`;
        const colours = await getColoursFromWallpaper(wallpaperPath);
        Theme.coloursCache[wp.uniqueId] = colours;
      });

    if (queue.length) {
      log("Extracting colours from wallpapers...", this.config);
      await promiseQueueWithLimit(queue, this.config.processLimit);
      writeFile(
        JSON.stringify(Theme.coloursCache),
        Theme.wallpaperColoursCacheFilePath,
      );
      log("Done.", this.config);
    }
  }

  loadThemeExtensionScripts() {
    ensureDir(this.themeExtensionScriptsBaseDir);
    const scriptNames = OS.readdir(
      this.themeExtensionScriptsBaseDir,
    )[0].filter((name) => name.endsWith(".js") && !name.startsWith("."));

    for (const fileName of scriptNames) {
      const extensionPath = `${this.themeExtensionScriptsBaseDir}${fileName}`;
      const extensionScript = {
        setTheme: async (...all) =>
          await workerPromise({
            scriptPath: extensionPath,
            scriptMethods: {
              setTheme: null,
            },
            args: all,
            config: this.config,
          }),

        getThemes: async (colors, wallpaperPath, cacheDirs) =>
          await workerPromise({
            scriptPath: extensionPath,
            scriptMethods: {
              getDarkThemeConf: cacheDirs[0],
              getLightThemeConf: cacheDirs[1],
            },
            args: [colors, wallpaperPath],
            config: this.config,
          }),
      };
      this.themeExtensionScripts[fileName] = extensionScript;
      this.appThemeCacheDir[
        fileName
      ] = `${this.wallpaperThemeCacheDir}${fileName}/`;
      ensureDir(this.appThemeCacheDir[fileName]);
    }
  }

  async createAppThemesFromColours() {
    const isThemeConfCached = (wallpaperName, scriptName) => {
      const cacheDir = `${this.appThemeCacheDir[scriptName]}${
        this.getThemeName(wallpaperName, "light")
      }`;
      const scriptDir = `${this.themeExtensionScriptsBaseDir}${scriptName}`;
      const [cacheStat, cacheErr] = OS.stat(cacheDir);
      const [scriptStat, scriptErr] = OS.stat(scriptDir);

      if (scriptErr !== 0) {
        throw new Error(
          "Failed to read script status.\n" + `Script name: ${scriptName}`,
        );
      }
      return cacheErr === 0 && cacheStat.mtime > scriptStat.mtime;
    };

    const promises = [];

    for (const wallpaper of this.wallpaper) {
      const colours = this.getCachedColours(wallpaper.uniqueId);
      if (!colours) {
        throw new Error(
          "Cache miss\n" +
            `Wallpaper: ${wallpaper.name}, Colours cache id: ${wallpaper.uniqueId}`,
        );
      }
      for (
        const [scriptName, themeHandler] of Object.entries(
          this.themeExtensionScripts,
        )
      ) {
        if (isThemeConfCached(wallpaper.uniqueId, scriptName)) continue;

        const generateThemeConfig = () => {
          log(
            `Generating theme config for wallpaper: "${wallpaper.name}" using "${scriptName}".`,
            this.config
          );
          return themeHandler
            .getThemes(
              colours,
              this.config.wallpapersDirectory.concat(wallpaper.name),
              [
                `${this.appThemeCacheDir[scriptName]}${
                  this.getThemeName(wallpaper.uniqueId, "dark")
                }`,
                `${this.appThemeCacheDir[scriptName]}${
                  this.getThemeName(wallpaper.uniqueId, "light")
                }`,
              ],
            );
        };

        promises.push(generateThemeConfig);
      }
    }

    await promiseQueueWithLimit(promises, this.config.processLimit);
  }

  /**
   * Set the theme for a given wallpaper
   * @param {string} wallpaperId - Name of the wallpaper
   */
  async setThemes(wallpaperId, wallpaperName) {
    const themeName = this.getThemeName(wallpaperId);

    const getTaskPromiseCallBacks = Object.entries(
      this.themeExtensionScripts,
    ).map(
      ([scriptName, themeHandler]) => async () => {
        const cachedThemePath = `${
          this.appThemeCacheDir[scriptName]
        }${themeName}`;

        const [, err] = OS.stat(cachedThemePath);

        if (err === 0) {
          await themeHandler.setTheme(
            cachedThemePath,
            this.config.wallpapersDirectory.concat(wallpaperName),
          );
        }
      },
    );
    await promiseQueueWithLimit(getTaskPromiseCallBacks, this.config.processLimit);
    await notify("Theme applied.", "", "normal", this.config);
  }

  /**
   * Get the theme name based on wallpaper and theme type
   * @param {string} fileName - Name of the wallpaper file
   * @param {"light" | "dark"} [type] - Type of theme (light or dark)
   * @returns {string} Theme name
   */
  getThemeName(fileName, type) {
    const themeType = type === undefined
      ? this.config.enableLightTheme ? "light" : "dark"
      : type === "light"
      ? "light"
      : "dark";
    return `${fileName}-${themeType}.conf`;
  }

  /**
   * Get cached colours for a wallpaper
   * @param {string} cacheName - Unique identifier for the wallpaper
   * @returns {string[] | null} Array of colour hex codes or null if not found
   */
  getCachedColours(cacheName) {
    if (Theme.coloursCache[cacheName]) return Theme.coloursCache[cacheName];

    const cacheContent = STD.loadFile(Theme.wallpaperColoursCacheFilePath);
    if (!cacheContent) {
      return null;
    }
    Theme.coloursCache = JSON.parse(cacheContent) || {};

    return Theme.coloursCache[cacheName] || null;
  }
}

export { Theme };
