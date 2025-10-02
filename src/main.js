import * as _ from "./globalConstants.js";
import arg from "../../qjs-ext-lib/src/arg.js";
import {
  ThemeExtensionScriptsDownloadManager,
  WallpaperDaemonHandlerScriptDownloadManager,
} from "./extensionDownloadManager.js";
import WallpaperDownloadManager from "./wallpaperDownloadManager.js";
import WallpaperSetter from "./wallpapersManager.js";
import { UserInterface } from "./userInterface.js";
import { ansi } from "../../justjs/ansiStyle.js";
import { testExtensions } from "./extensionHandler.js";
import utils from "./utils.js";

class WallRizz {
  constructor() {
    globalThis.USER_ARGUMENTS = this.parseArguments();
  }

  async run() {
    try {
      this.handleShowKeymaps();
      await this.handleRunUpdate();
      await this.handleExtensionTest();
      await this.handleThemeExtensionScriptDownload();
      await this.handleWallpaperHandlerScriptDownload();
      OS.ttySetRaw(); // enable raw mode for grid UI
      await this.handleWallpaperBrowsing();
      await this.handleWallpaperSetter();
    } catch (status) {
      this.handleExecutionStatus(status);
    } finally {
      STD.exit(0);
    }
  }

  /**
   * Parses the command-line arguments and returns them in a structured format.
   *
   * @returns {typeof USER_ARGUMENTS} Parsed user arguments.
   */
  parseArguments() {
    // Helper function to split string of format "AxB" into an array of two numbers
    const splitNumbersFromString = (str) => str.split("x").map(Number);

    // Define argument names and their corresponding command-line flags
    const argNames = {
      wallpapersDirectory: "--wall-dir",
      setRandomWallpaper: "--random",
      imageSize: "--img-size",
      enableLightTheme: "--light-theme",
      padding: "--padding",
      enablePagination: "--enable-pagination",
      gridSize: "--grid-size",
      downloadThemeExtensionScripts: "--theme-extensions",
      colorExtractionCommand: "--color-backend",
      previewMode: "--preview-mode",
      highlight: "--highlight",
      onFocus: "--on-focus",
      downloadWallpaperDaemonHandlerScript: "--wallpaper-handler",
      browseWallpaperOnline: "--browse",
      wallpaperRepositoryUrls: "--repo-url",
      githubApiKey: "--api-key",
      showKeyMap: "--show-keymap",
      disableNotification: "--disable-notification",
      disableAutoScaling: "--disable-autoscaling",
      setInterval: "--set-interval",
      setIntervalCallback: "--set-interval-callback",
      hold: "--hold",
      processLimit: "--plimit",
      inspection: "--inspection",
      test: "--test",
      update: "--update"
    };

    // Define and parse command-line arguments using the 'arg' library
    const userArguments = arg
      .parser({
        [argNames.wallpapersDirectory]: arg
          .path(OS.getcwd()[0])
          .env("WALLPAPER_DIR")
          .check()
          .map((path) => path.concat("/"))
          .desc("Wallpaper directory path."),
        [argNames.setRandomWallpaper]: arg
          .flag(false)
          .desc("Apply random wallpaper from the directory."),
        [argNames.imageSize]: arg
          .str("30x10")
          .reg(/^\d+x\d+$/)
          .desc("Image cell size.")
          .val("WIDTHxHEIGHT")
          .err(
            "Invalid size, it should be of WIDTHxHEIGHT format. \n Ex:- 60x20",
          )
          .map(splitNumbersFromString),
        [argNames.enableLightTheme]: arg.flag(false).desc(
          "Enable light theme.",
        ),
        [argNames.padding]: arg
          .str("1x1")
          .reg(/^\d+x\d+$/)
          .err(
            "Invalid padding, it should of VERTICLE_PADDINGxHORIZONTAL_PADDING format. \n Ex:- 2x1",
          )
          .map(splitNumbersFromString)
          .desc("Container padding in cells.")
          .val("VERTICLExHORIZONTAL"),
        [argNames.enablePagination]: arg
          .flag(false)
          .desc(
            "Display wallpapers in a fixed size grid. Remaining wallpapers will be displayed in the next grid upon navigation.",
          ),
        [argNames.gridSize]: arg
          .str("4x4")
          .reg(/^\d+x\d+$/)
          .err(
            "Invalid grid size. \n Ex:- 4x4",
          )
          .map(splitNumbersFromString)
          .desc("Wallpaper grid size.")
          .val("WIDTHxHEIGHT"),
        [argNames.downloadThemeExtensionScripts]: arg
          .flag(false)
          .desc("Download theme extension scripts."),
        [argNames.colorExtractionCommand]: arg
          .str(
            "magick {} -format %c -define histogram:method=kmeans -colors 16 histogram:info:",
          )
          .desc("Set color extraction command."),
        [argNames.previewMode]: arg
          .str("grid")
          .enum(["grid", "list"])
          .desc("Wallpaper preview mode."),
        [argNames.highlight]: arg
          .str("border")
          .enum(["border", "fill"])
          .desc("Highlight current selection"),
        [argNames.onFocus]: arg
          .flag()
          .desc("Set wallpaper on focus."),
        [argNames.downloadWallpaperDaemonHandlerScript]: arg
          .flag(false)
          .desc("Download wallpaper handler script."),
        [argNames.browseWallpaperOnline]: arg
          .flag(false)
          .desc("Browse wallpapers online."),
        [argNames.wallpaperRepositoryUrls]: arg
          .str("https://github.com/5hubham5ingh/WallRizz/tree/wallpapers/")
          .env("WALLPAPER_REPO_URLS")
          .reg(
            /^https:\/\/github\.com\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9.-]+(\/tree\/[a-zA-Z0-9.-]+(\/.*)?)?(\s*;\s*https:\/\/github\.com\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9.-]+(\/tree\/[a-zA-Z0-9.-]+(\/.*)?)?)*$/,
          )
          .map((urls) => urls.split(";").map((url) => url.trim()))
          .err("Invalid repository url(s).")
          .desc("Wallpaper repository github url(s).")
          .val("URL(s)"),
        [argNames.githubApiKey]: arg
          .str()
          .env("GITHUB_API_KEY")
          .desc("Github API key."),
        [argNames.showKeyMap]: arg
          .flag(false)
          .desc("Display keymaps for the user interface."),
        [argNames.disableNotification]: arg
          .flag(false)
          .desc("Disable desktop notifications."),
        [argNames.disableAutoScaling]: arg
          .flag(false)
          .desc("Disable auto scale terminal size to fit all images."),
        [argNames.setInterval]: arg
          .num(0)
          .min(0)
          .max(Number.MAX_SAFE_INTEGER)
          .desc(
            "Set time interval to periodically set random wallpaper.",
          ),
        [argNames.setIntervalCallback]: arg
          .str("")
          .env("WR_CB")
          .val("JavaScript IIFE")
          .cust(STD.evalScript)
          .desc(
            "Set a callback function to conditionally modify the arguments at setInterval.",
          ),
        [argNames.hold]: arg
          .flag(false)
          .desc(
            "Keep the app running even after the wallpaper has been applyed.",
          ),
        [argNames.processLimit]: arg
          .num()
          .min(1)
          .desc("Number of execution threads used. (default: auto)"),
        [argNames.inspection]: arg
          .flag(true)
          .desc("Enable log for inspection."),
        [argNames.test]: arg
          .flag()
          .desc("Test extensions"),
        [argNames.update]: arg
          .flag()
          .desc("Update WallRizz"),
        "-d": argNames.wallpapersDirectory,
        "-r": argNames.setRandomWallpaper,
        "-s": argNames.imageSize,
        "-p": argNames.padding,
        "-e": argNames.enablePagination,
        "-g": argNames.gridSize,
        "-l": argNames.enableLightTheme,
        "-t": argNames.downloadThemeExtensionScripts,
        "-c": argNames.colorExtractionCommand,
        "-z": argNames.previewMode,
        "-w": argNames.downloadWallpaperDaemonHandlerScript,
        "-b": argNames.browseWallpaperOnline,
        "-u": argNames.wallpaperRepositoryUrls,
        "-k": argNames.githubApiKey,
        "-m": argNames.showKeyMap,
        "-n": argNames.disableNotification,
        "-a": argNames.disableAutoScaling,
        "-v": argNames.setInterval,
        "-f": argNames.setIntervalCallback,
        "-o": argNames.hold,
        "-x": argNames.processLimit,
        "-i": argNames.inspection,
      })
      .ex([
        [
          "-t -d ~/Pictures",
          "Download theme extension scripts.",
        ],
        [
          "-l -d ~/Pictures/wallpapers",
          "Apply wallpaper and light theme.",
        ],
        [
          "-e -a -d ~/Pictures",
          "Enable grid view and disable terminal auto-scaling.",
        ],
        [
          "-v 3600000 -c \"(globalThis.USER_ARGUMENTS ??= {})[ 'enableLightTheme' ] = ((h) => h >= 6 && h < 18)(new Date().getHours())\"",
          "Set dark or light theme based on the hour of the day.",
        ],
        [
          "-d ~/Pictures -u https://github.com/D3Ext/aesthetic-wallpapers/tree/main/images;https://github.com/5hubham5ingh/WallRizz/tree/wallpapers",
          "Browse online wallpapers.",
        ],
      ].map(
        ([command, description]) =>
          command.concat(
            "\n",
            ansi.style.grey,
            ansi.style.italic,
            `- ${description}`,
            ansi.style.reset,
          ),
      ))
      .ver("1.3.0")
      .parse();

    // Convert parsed arguments to a more convenient object format
    return Object.fromEntries(
      Object.entries(argNames).map((
        [key, value],
      ) => [key, userArguments[value]]),
    );
  }

  async handleExtensionTest() {
    if (!USER_ARGUMENTS.test) return;
    await testExtensions();
    throw EXIT;
  }

  async handleThemeExtensionScriptDownload() {
    if (!USER_ARGUMENTS.downloadThemeExtensionScripts) return;
    const downloadManager = new ThemeExtensionScriptsDownloadManager();
    await downloadManager.init();
  }

  async handleWallpaperHandlerScriptDownload() {
    if (!USER_ARGUMENTS.downloadWallpaperDaemonHandlerScript) return;
    const downloadManager = new WallpaperDaemonHandlerScriptDownloadManager();
    await downloadManager.init();
  }

  async handleWallpaperBrowsing() {
    if (!USER_ARGUMENTS.browseWallpaperOnline) return;

    const wallpaperDownloadManager = new WallpaperDownloadManager();
    await wallpaperDownloadManager.init();
  }

  async handleWallpaperSetter() {
    const wallpaperSetter = new WallpaperSetter();
    await wallpaperSetter.init();
  }

  handleShowKeymaps() {
    if (!USER_ARGUMENTS.showKeyMap) return;
    UserInterface.printKeyMaps();
  }

  async handleRunUpdate() {
    if (!USER_ARGUMENTS.update) return;
    await utils.checkForUpdate()
    throw EXIT;
  }

  handleExecutionStatus(status) {
    if (status === EXIT) STD.exit(0);
    if (status instanceof SystemError) {
      status.log(USER_ARGUMENTS.inspection);
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
