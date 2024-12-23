import workerPromise from "./extensionHandler.js";
import { Theme } from "./themeManager.js";
import { UserInterface } from "./userInterface.js";
import utils from "./utils.js";

export default class WallpaperSetter {
  constructor() {
    this.picCacheDir = HOME_DIR.concat("/.cache/WallRizz/pic/");
    utils.ensureDir(this.picCacheDir);
    this.wallpapers = this.loadWallpapers();
    this.themeManager = new Theme(
      this.picCacheDir,
      this.wallpapers,
    );
  }

  async init() {
    this.loadWallpaperDaemonHandlerScript();
    await this.handleWallpaperCacheCreation();
    await this.themeManager.init();
    await this.handleSettingRandomWallpaper();
    await this.handleSettingWallpaper();
  }

  loadWallpapers() {
    const [imgFiles, error] = OS.readdir(
      USER_ARGUMENTS.wallpapersDirectory,
    );
    if (error !== 0) {
      throw new Error(
        "Failed to read wallpapers directory:\n" +
          USER_ARGUMENTS.wallpapersDirectory,
      );
    }
    const wallpapers = imgFiles.filter(
      (name) =>
        name !== "." && name !== ".." && this.isSupportedImageFormat(name),
    ).map((name) => {
      const [stats, error] = OS.stat(
        USER_ARGUMENTS.wallpapersDirectory.concat(name),
      );

      if (error) {
        throw new Error(
          "Failed to read wallpaper stat for:\n" +
            USER_ARGUMENTS.wallpapersDirectory.concat(name),
        );
      }
      const { dev, ino } = stats;
      return {
        name,
        uniqueId: `${dev}${ino}`.concat(name.slice(name.lastIndexOf("."))),
      };
    });

    if (!wallpapers.length) {
      throw new SystemError(
        "No wallpaper found in ".concat(USER_ARGUMENTS.wallpapersDirectory),
        "Make sure the supported image file exists in the directory.",
      );
    }

    return wallpapers;
  }

  loadWallpaperDaemonHandlerScript() {
    const extensionDir = HOME_DIR.concat("/.config/WallRizz/");
    utils.ensureDir(extensionDir);
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
        await workerPromise({
          scriptPath: extensionPath,
          scriptMethods: {
            setWallpaper: null,
          },
          args: all,
        });
    } else {
      throw new SystemError(
        "Failed to find any wallpaper daemon handler script in " +
          extensionDir,
        'Run "WallRizz -w" to download it.',
      );
    }
  }

  async handleWallpaperCacheCreation() {
    const [cacheNames, error] = OS.readdir(this.picCacheDir);
    const doesWallaperCacheExist = (wallpaperName) => {
      if (error !== 0) return false;
      const cachedWallpaper = cacheNames.filter(
        (name) =>
          name !== "." && name !== ".." &&
          this.isSupportedImageFormat(name),
      );
      if (!cachedWallpaper.length) return false;
      return wallpaperName
        ? this.wallpapers.includes(wallpaperName)
        : this.wallpapers.every((wallpaperName) =>
          cachedWallpaper.some((cacheId) => cacheId === wallpaperName.uniqueId)
        );
    };

    const makeCache = async (wallpaper) => {
      const cachePicName = this.picCacheDir.concat(
        wallpaper.uniqueId,
      );

      if (doesWallaperCacheExist(wallpaper.uniqueId)) return;
      return await execAsync([
        "magick",
        USER_ARGUMENTS.wallpapersDirectory.concat(wallpaper.name),
        "-resize",
        "800x600",
        "-quality",
        "50",
        cachePicName,
      ])
        .catch((e) => {
          throw new SystemError(
            "Failed to create wallpaper cache",
            "Make sure ImageMagick is installed in your system",
            e,
          );
        });
    };

    const createWallpaperCachePromisesQueue = [];
    if (!doesWallaperCacheExist()) {
      this.wallpapers.forEach((wallpaper) => {
        if (!cacheNames.includes(wallpaper.uniqueId)) {
          createWallpaperCachePromisesQueue.push(() => makeCache(wallpaper));
        }
      });
    } else return;

    utils.log("Caching images...");
    await utils.promiseQueueWithLimit(
      createWallpaperCachePromisesQueue,
    );
    utils.log("Done");
  }

  async handleSettingRandomWallpaper() {
    const setRandomWallpaper = async (index = Math.floor(
      Math.random() * this.wallpapers.length,
    )) => await this.handleSelection(this.wallpapers[index]);

    if (USER_ARGUMENTS.setInterval) {
      while (true) {
        await setRandomWallpaper();
        OS.setTimeout(
          () => {
            STD.evalScript(USER_ARGUMENTS.setIntervalCallback);
          },
          USER_ARGUMENTS.setInterval,
        );
      }
    } else if (USER_ARGUMENTS.setRandomWallpaper) {
      await setRandomWallpaper();
      throw EXIT;
    }
  }

  async handleSettingWallpaper() {
    const ui = new UserInterface(
      this.wallpapers,
      this.picCacheDir,
      this.handleSelection.bind(this),
      this.getWallpaperPath.bind(this),
    );
    await ui.init();
  }

  async handleSelection(wallpaper) {
    const { name, uniqueId } = wallpaper;
    const promises = [
      this.themeManager.setThemes(uniqueId),
      this.setWallpaper(name),
    ];
    await Promise.all(promises);
    if (!USER_ARGUMENTS.hold) throw EXIT;
  }

  getWallpaperPath(wallpaper) {
    return USER_ARGUMENTS.wallpapersDirectory.concat(wallpaper.name);
  }

  isSupportedImageFormat(name) {
    const nameArray = name.split(".");
    const format = nameArray[nameArray.length - 1].toLowerCase();
    return /^(jpeg|png|webp|jpg)$/i.test(format);
  }

  async setWallpaper(wallpaperName) {
    const wallpaperDir =
      `${USER_ARGUMENTS.wallpapersDirectory}/${wallpaperName}`;
    await this.wallpaperDaemonHandler(wallpaperDir);
    await utils.notify("New wallpaper", wallpaperName);
  }
}
