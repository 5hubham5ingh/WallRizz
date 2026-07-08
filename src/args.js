import arg from "../qjs-ext-lib/src/arg.js";
import { ansi } from "../helpers/ansiStyle.js";
import * as os from "../qjs-ext-lib/src/os.js";
import * as std from "../qjs-ext-lib/src/std.js";

/**
 * Parses the command-line arguments and returns them in a structured format.
 *
 * @returns {Object} Parsed user configuration.
 */
export function parseArguments() {
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
    githubApiKey: "--github-key",
    showKeyMap: "--show-keymap",
    disableNotification: "--disable-notification",
    disableAutoScaling: "--disable-autoscaling",
    setInterval: "--set-interval",
    setIntervalCallback: "--set-interval-callback",
    thumbnailSize: "--thumbnail",
    hold: "--hold",
    processLimit: "--plimit",
    inspection: "--inspection",
    test: "--test",
    update: "--update",
  };

  // Define and parse command-line arguments using the 'arg' library
  const userArguments = arg
    .parser({
      [argNames.wallpapersDirectory]: arg
        .path(os.getcwd()[0])
        .env("WALLPAPER_DIR")
        .check()
        .map((path) => path.concat("/"))
        .desc("Wallpaper directory path."),
      [argNames.setRandomWallpaper]: arg
        .flag(false)
        .desc("Apply random wallpaper from the directory."),
      [argNames.imageSize]: arg
        .str("32x9")
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
        .str("2x1")
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
      [argNames.thumbnailSize]: arg
        .str("600x338")
        .reg(/^\d+x\d+$/)
        .desc("Thumbnail size"),
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
        .cust(std.evalScript)
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
        .flag(false)
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
    .ver("1.5.0")
    .parse();

  // Convert parsed arguments to a more convenient object format
  return Object.fromEntries(
    Object.entries(argNames).map((
      [key, value],
    ) => [key, userArguments[value]]),
  );
}
