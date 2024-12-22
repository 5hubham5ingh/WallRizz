import utils from "./utils.js";
import workerPromise from "./extensionHandler.js";

/**
 * @typedef {import('./types.d.ts').ColoursCache} ColoursCache
 */

/**
 * Theme class manages colors and theme configurations of wallpapers
 */
class Theme {
  /**
   * Constructor for the Theme class
   * @param {string} wallpaperDir - Directory containing cached wallpapers
   * @param {Array} wallpaper - Array of wallpaper objects
   */
  constructor(wallpaperDir, wallpaper) {
    this.wallpaperDir = wallpaperDir;
    this.wallpaper = wallpaper;
    this.wallpaperThemeCacheDir = `${HOME_DIR}/.cache/WallRizz/themes/`;
    this.appThemeCacheDir = {};
    this.themeExtensionScriptsBaseDir =
      `${HOME_DIR}/.config/WallRizz/themeExtensionScripts/`;
    this.themeExtensionScripts = {};
  }

  /** @type {ColoursCache} */
  static coloursCache = {};

  async init() {
    utils.ensureDir(this.wallpaperThemeCacheDir);
    await this.createColoursCacheFromWallpapers();
    this.loadThemeExtensionScripts();
    await this.createAppThemesFromColours();
  }

  static wallpaperColoursCacheFilePath =
    `${HOME_DIR}/.cache/WallRizz/colours.json`; // Made static to share it with UI class

  async createColoursCacheFromWallpapers() {
    const getColoursFromWallpaper = async (wallpaperPath) => {
      const result = await execAsync(
        USER_ARGUMENTS.colorExtractionCommand.replace("{}", wallpaperPath),
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
        Theme.coloursCache[wp.uniqueId] = colours;
      });

    if (queue.length) {
      utils.log("Extracting colours from wallpapers...");
      await utils.promiseQueueWithLimit(queue);
      utils.writeFile(
        JSON.stringify(Theme.coloursCache),
        Theme.wallpaperColoursCacheFilePath,
      );
      utils.log("Done.");
    }
  }

  loadThemeExtensionScripts() {
    utils.ensureDir(this.themeExtensionScriptsBaseDir);
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
          }),

        getThemes: async (colors, cacheDirs) =>
          await workerPromise({
            scriptPath: extensionPath,
            scriptMethods: {
              getDarkThemeConf: cacheDirs[0],
              getLightThemeConf: cacheDirs[1],
            },
            args: [colors],
          }),
      };
      this.themeExtensionScripts[fileName] = extensionScript;
      this.appThemeCacheDir[
        fileName
      ] = `${this.wallpaperThemeCacheDir}${fileName}/`;
      utils.ensureDir(this.appThemeCacheDir[fileName]);
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
          utils.log(
            `Generating theme config for wallpaper: "${wallpaper.name}" using "${scriptName}".`,
          );
          return themeHandler
            .getThemes(colours, [
              `${this.appThemeCacheDir[scriptName]}${
                this.getThemeName(wallpaper.uniqueId, "dark")
              }`,
              `${this.appThemeCacheDir[scriptName]}${
                this.getThemeName(wallpaper.uniqueId, "light")
              }`,
            ]);
        };

        promises.push(generateThemeConfig);
      }
    }

    await utils.promiseQueueWithLimit(promises);
  }

  /**
   * Set the theme for a given wallpaper
   * @param {string} wallpaperName - Name of the wallpaper
   */
  async setThemes(wallpaperName) {
    const themeName = this.getThemeName(wallpaperName);

    const getTaskPromiseCallBacks = Object.entries(
      this.themeExtensionScripts,
    ).map(
      ([scriptName, themeHandler]) => async () => {
        const cachedThemePath = `${
          this.appThemeCacheDir[scriptName]
        }${themeName}`;

        const [, err] = OS.stat(cachedThemePath);

        if (err === 0) {
          await themeHandler.setTheme(cachedThemePath);
        }
      },
    );
    await utils.promiseQueueWithLimit(getTaskPromiseCallBacks);
    await utils.notify("Theme applied.");
  }

  /**
   * Get the theme name based on wallpaper and theme type
   * @param {string} fileName - Name of the wallpaper file
   * @param {"light" | "dark"} [type] - Type of theme (light or dark)
   * @returns {string} Theme name
   */
  getThemeName(fileName, type) {
    const themeType = type === undefined
      ? USER_ARGUMENTS.enableLightTheme ? "light" : "dark"
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
