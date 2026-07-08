import extensionHandler from "../extensions/ExtensionHandler.js";
import { Theme } from "../theme/ThemeManager.js";
import { UserInterface } from "../ui/UserInterface.js";
import { notify, log } from "../core/utils/ui.js";
import { ensureDir } from "../core/utils/io.js";
import { CacheManager } from "./CacheManager.js";
import { OS, STD, HOME_DIR, EXIT, SystemError } from "../core/constants.js";

export default class WallpaperManager {
  constructor(config) {
    this.config = config;
    this.wallpapers = this.loadWallpapers();
    this.cacheManager = new CacheManager(this.config, this.wallpapers);
    this.themeManager = new Theme(
      this.cacheManager.getCacheDir(),
      this.wallpapers,
      this.config,
    );
  }

  async init() {
    this.loadWallpaperDaemonHandlerScript();
    await this.cacheManager.handleWallpaperCacheCreation();
    await this.themeManager.init();
    await this.handleSettingRandomWallpaper();
    await this.handleSettingWallpaper();
  }

  loadWallpapers() {
    const [imgFiles, error] = OS.readdir(
      this.config.wallpapersDirectory,
    );
    if (error !== 0) {
      throw new Error(
        "Failed to read wallpapers directory:\n" +
          this.config.wallpapersDirectory,
      );
    }
    const wallpapers = imgFiles.filter(
      (name) =>
        name !== "." && name !== ".." && this.isSupportedImageFormat(name),
    ).map((name) => {
      const [stats, error] = OS.stat(
        this.config.wallpapersDirectory.concat(name),
      );

      if (error) {
        throw new Error(
          "Failed to read wallpaper stat for:\n" +
            this.config.wallpapersDirectory.concat(name),
        );
      }
      const { dev, ino } = stats;
      return {
        name,
        uniqueId: `${dev}${ino}`.concat(
          ".png",
        ),
      };
    });

    if (!wallpapers.length) {
      throw new SystemError(
        "No wallpaper found in ".concat(this.config.wallpapersDirectory),
        "Make sure the supported image file exists in the directory.",
      );
    }

    return wallpapers;
  }

  loadWallpaperDaemonHandlerScript() {
    const extensionDir = HOME_DIR.concat("/.config/WallRizz/");
    ensureDir(extensionDir);
    const scriptNames = OS.readdir(extensionDir)[0]
      .filter((name) => name !== "." && name !== ".." && name.endsWith(".js"));
    if (scriptNames.length > 1) {
      throw new SystemError(
        `Too many scripts found in the ${extensionDir}.`,
        "Only one script is required.",
      );
    }
    if (scriptNames.length) {
      const extensionPath = extensionDir.concat(scriptNames[0]);
      this.wallpaperDaemonHandler = async (...all) =>
        await extensionHandler({
          scriptPath: extensionPath,
          scriptMethods: {
            setWallpaper: null,
          },
          args: all,
          config: this.config,
        });
    } else {
      throw new SystemError(
        "Failed to find any wallpaper daemon handler script in " +
          extensionDir,
        'Run "WallRizz -w" to download it.',
      );
    }
  }

  async handleSettingRandomWallpaper() {
    const setRandomWallpaper = async (index = Math.floor(
      Math.random() * this.wallpapers.length,
    )) => await this.handleSelection(this.wallpapers[index]);

    if (this.config.setInterval) {
      while (true) {
        await setRandomWallpaper();
        OS.setTimeout(
          () => {
            STD.evalScript(this.config.setIntervalCallback);
          },
          this.config.setInterval,
        );
      }
    } else if (this.config.setRandomWallpaper) {
      await setRandomWallpaper();
      throw EXIT;
    }
  }

  async handleSettingWallpaper() {
    const ui = new UserInterface(
      this.wallpapers,
      this.cacheManager.getCacheDir(),
      this.handleSelection.bind(this),
      this.getWallpaperPath.bind(this),
      this.config.onFocus ? this.handleSelection.bind(this) : () => {},
      this.config,
    );
    await ui.init();
  }

  async handleSelection(wallpaper) {
    const { name, uniqueId } = wallpaper;
    const promises = [
      this.themeManager.setThemes(uniqueId, name),
      this.setWallpaper(name),
    ];
    await Promise.all(promises);
    if (!this.config.hold) throw EXIT;
  }

  getWallpaperPath(wallpaper) {
    return this.config.wallpapersDirectory.concat(wallpaper.name);
  }

  isSupportedImageFormat(name) {
    const nameArray = name.split(".");
    const format = nameArray[nameArray.length - 1].toLowerCase();
    return /^(jpeg|png|webp|jpg|gif)$/i.test(format);
  }

  async setWallpaper(wallpaperName) {
    const wallpaperPath =
      `${this.config.wallpapersDirectory}${wallpaperName}`;
    await this.wallpaperDaemonHandler(wallpaperPath);
    await notify("New wallpaper", wallpaperName, "normal", this.config);
  }
}
