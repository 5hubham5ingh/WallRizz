import { OS, STD, execAsync, SystemError, HOME_DIR } from "../core/constants.js";
import { ensureDir } from "../core/utils/io.js";
import { log } from "../core/utils/ui.js";
import { promiseQueueWithLimit } from "../core/utils/async.js";

export class CacheManager {
  constructor(config, wallpapers) {
    this.config = config;
    this.wallpapers = wallpapers;
    this.picCacheDir = HOME_DIR.concat("/.cache/WallRizz/pic/");
    ensureDir(this.picCacheDir);
  }

  async handleWallpaperCacheCreation() {
    const [cacheNames, error] = OS.readdir(this.picCacheDir);
    const doesWallpaperCacheExist = (wallpaperUniqueId) => {
      if (error !== 0) return false;
      const cachedWallpapers = cacheNames.filter(
        (name) =>
          name !== "." && name !== ".." &&
          this.isSupportedImageFormat(name),
      );
      if (!cachedWallpapers.length) return false;
      
      return wallpaperUniqueId
        ? cachedWallpapers.includes(wallpaperUniqueId)
        : this.wallpapers.every((wp) =>
          cachedWallpapers.includes(wp.uniqueId)
        );
    };

    const makeCache = async (wallpaper) => {
      const cachePicName = this.picCacheDir.concat(
        wallpaper.uniqueId,
      );

      if (doesWallpaperCacheExist(wallpaper.uniqueId)) return;
      return await execAsync([
        "magick",
        this.config.wallpapersDirectory.concat(wallpaper.name),
        "-resize",
        this.config.thumbnailSize,
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
    if (!doesWallpaperCacheExist()) {
      this.wallpapers.forEach((wallpaper) => {
        if (!cacheNames.includes(wallpaper.uniqueId)) {
          createWallpaperCachePromisesQueue.push(() => makeCache(wallpaper));
        }
      });
    } else return;

    log("Caching images...", this.config);
    await promiseQueueWithLimit(
      createWallpaperCachePromisesQueue,
      this.config.processLimit
    );
    log("Done", this.config);
  }

  isSupportedImageFormat(name) {
    const nameArray = name.split(".");
    const format = nameArray[nameArray.length - 1].toLowerCase();
    return /^(jpeg|png|webp|jpg|gif)$/i.test(format);
  }

  getCacheDir() {
    return this.picCacheDir;
  }
}
