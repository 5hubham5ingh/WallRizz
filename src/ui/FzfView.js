import { ansi } from "../../helpers/ansiStyle.js";
import { ProcessSync } from "../../qjs-ext-lib/src/process.js";
import Fzf from "../../helpers/fzf.js";
import { Theme } from "../theme/ThemeManager.js";
import { STD, SystemError, EXIT, OS } from "../core/constants.js";

export class FzfView {
  constructor(config, wallpapers, wallpapersDir, handleSelection, getWallpaperPath) {
    this.config = config;
    this.wallpapers = wallpapers;
    this.wallpapersDir = wallpapersDir;
    this.handleSelection = handleSelection;
    this.getWallpaperPath = getWallpaperPath;
  }

  async render() {
    const [width] = OS.ttyGetWinSize() ?? [80, 24];
    const cachedColoursFile = STD.loadFile(
      Theme.wallpaperColoursCacheFilePath,
    );
    const cachedColours = cachedColoursFile ? JSON.parse(cachedColoursFile) : {};

    const wallColors = Object.fromEntries(
      this.wallpapers.map((wallpaper) => {
        const wallId = wallpaper.uniqueId;
        const palette = cachedColours[wallId] || [];
        const wallpaperName = wallpaper.name;
        return [[wallpaperName.concat("#", wallId)], palette];
      }),
    );

    const previewCols = (this.config.imageSize[0] + 2) * 2;

    const kittyPreviewCmd =
      `--preview='printf "\\x1b[1;1H\\x1b_Ga=T,i=1,t=f,f=100,q=2,c=${previewCols};\`echo -e {} | head -n 2 | tail -n 1\`\\x1b\\\\" >> /dev/tty'`;

    const fzf = new Fzf();
    fzf.color("16,current-bg:-1")
      .read0()
      .delimiter("' '")
      .withNth("1")
      .previewWindow(
        `wrap,border-none,left,${previewCols}`,
      )
      .noInfo()
      .separator("' '")
      .bind("'focus:transform-footer(echo -e {} | tail -n +3)'")
      .layout("reverse")
      .withShell("'/usr/bin/bash -c'")
      .custom(kittyPreviewCmd)
      .custom("--footer-border=none");

    const maxLineLength = Math.floor(
      width - (this.config.imageSize[0] + 2) * 2,
    );

    const fzfInput = Object.entries(wallColors)
      .map(([wallpaperName, palette]) => {
        const [wpName, id] = wallpaperName.split("#");
        const name = wpName.includes(" ") ? `"${wpName}"` : wpName;

        const wordLength = palette.length
          ? (Math.floor(maxLineLength / palette.length) || 1)
          : 1;

        const paletteVisualization = (() => {
          if (!palette.length) return "";
          const line = palette
            .map((color) =>
              `${ansi.bgHex(color)}${ansi.hex(color)}${"-".repeat(wordLength)}`
            )
            .join("");

          return Array(wordLength * 2)
            .fill(`\b${line}`)
            .join("\n")
            .slice(0, -1);
        })();

        return `${name ?? this.getWallpaperPath({ uniqueId: id, name })} \n${
          this.toBase64(this.wallpapersDir + id)
        } \n${JSON.stringify(paletteVisualization)}\n`;
      })
      .join("\0");

    const previewer = new ProcessSync(
      fzf.toString(),
      {
        input: fzfInput,
        useShell: true,
      },
    );

    try {
      previewer.run();
    } catch (error) {
      throw new SystemError(
        "Failed to run fzf.",
        "Make sure fzf is installed and available in the system.",
        error,
      );
    } finally {
      STD.out.puts("\x1b_Ga=d,d=A\x1b\\");
      STD.out.flush();
    }

    if (!previewer.success) {
      STD.exit();
      throw new SystemError("Error", previewer.stderr || "No item selected.");
    }

    const wallpaper = previewer.stdout.split("\n")[0].trim();
    const cleanWallpaper = wallpaper.replace(/^"|"$/g, "");
    const selection = this.wallpapers.find(
      (wp) => wp.name === wallpaper || wp.name === cleanWallpaper,
    );
    await this.handleSelection(selection);
    throw EXIT;
  }

  toBase64(str) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;

    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;

      const idx1 = a >> 2;
      const idx2 = ((a & 3) << 4) | (b >> 4);
      const idx3 = ((b & 15) << 2) | (c >> 6);
      const idx4 = c & 63;

      result += chars[idx1] +
        chars[idx2] +
        (i - 2 < str.length ? chars[idx3] : "=") +
        (i - 1 < str.length ? chars[idx4] : "=");
    }

    return result;
  }
}
