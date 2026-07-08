import { STD, EXIT, SystemError } from "./core/constants.js";
import { parseArguments } from "./args.js";
import {
  ThemeExtensionScriptsDownloadManager,
  WallpaperDaemonHandlerScriptDownloadManager,
} from "./extensions/ExtensionDownloadManager.js";
import WallpaperManager from "./wallpaper/WallpaperManager.js";
import { UserInterface } from "./ui/UserInterface.js";
import { testExtensions } from "./extensions/ExtensionHandler.js";
import { checkForUpdate } from "./core/utils/app.js";

class WallRizz {
  constructor() {
    this.config = parseArguments();
    // Maintain backward compatibility ONLY where necessary for now
    globalThis.USER_ARGUMENTS = this.config;
  }

  async run() {
    try {
      this.handleShowKeymaps();
      await this.handleRunUpdate();
      await this.handleExtensionTest();
      await this.handleThemeExtensionScriptDownload();
      await this.handleWallpaperHandlerScriptDownload();
      await this.handleWallpaperManager();
    } catch (status) {
      this.handleExecutionStatus(status);
    } finally {
      this.config.inspection && print(this.config);
    }
  }

  async handleExtensionTest() {
    if (!this.config.test) return;
    await testExtensions(this.config);
    throw EXIT;
  }

  async handleThemeExtensionScriptDownload() {
    if (!this.config.downloadThemeExtensionScripts) return;
    const downloadManager = new ThemeExtensionScriptsDownloadManager(
      this.config,
    );
    await downloadManager.init();
  }

  async handleWallpaperHandlerScriptDownload() {
    if (!this.config.downloadWallpaperDaemonHandlerScript) return;
    const downloadManager = new WallpaperDaemonHandlerScriptDownloadManager(
      this.config,
    );
    await downloadManager.init();
  }

  async handleWallpaperManager() {
    const wallpaperManager = new WallpaperManager(this.config);
    await wallpaperManager.init();
  }

  handleShowKeymaps() {
    if (!this.config.showKeyMap) return;
    UserInterface.printKeyMaps();
  }

  async handleRunUpdate() {
    if (!this.config.update) return;
    await checkForUpdate();
    throw EXIT;
  }

  handleExecutionStatus(status) {
    if (status === EXIT) STD.exit(0);
    if (status instanceof SystemError) {
      status.log(this.config.inspection);
    } else {
      STD.err.puts(
        `${status.constructor.name}: ${status.message}\n${status.stack}`,
      );
    }
    STD.exit(1);
  }
}

const wallRizz = new WallRizz();
await wallRizz.run();
