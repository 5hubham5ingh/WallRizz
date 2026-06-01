import { Theme } from "./themeManager.js";
import utils from "./utils.js";
import {
  clearTerminal,
  cursorHide,
  cursorMove,
  cursorShow,
  cursorTo,
  enterAlternativeScreen,
  eraseDown,
  exitAlternativeScreen,
} from "../../justjs/cursor.js";
import { ansi } from "../../justjs/ansiStyle.js";
import { handleKeysPress, keySequences } from "../../justjs/terminal.js";
import exec, { ProcessSync } from "../../qjs-ext-lib/src/process.js";
import Fzf from "../../justjs/fzf.js";
import { printf } from "../../qjs-ext-lib/src/std.js";

/**
 * @typedef {import('./types.d.ts').WallpapersList} WallpapersList
 */

class UserInterface {
  /**
   * @param {WallpapersList} wallpaperList
   * @param {string} wallpapersDirectory
   * @param {Function} handleSelection
   * @param {Function} getWallpaperPath
   * @param {Function} handleFocus
   */
  constructor(
    wallpaperList,
    wallpapersDirectory,
    handleSelection,
    getWallpaperPath,
    handleFocus,
  ) {
    this.wallpapers = wallpaperList;
    this.wallpapersDir = wallpapersDirectory;
    this.handleSelection = handleSelection;
    this.getWallpaperPath = getWallpaperPath;
    this.handleFocus = handleFocus;
  }

  /**
   * Initialize UI
   */
  async init() {
    await this.handleListPreview();

    const pngPaths = this.wallpapers.map((img) => ({
      filePath: this.wallpapersDir + img.uniqueId,
      meta: img,
    }));

    const [terminalWidth, terminalHeight] = OS.ttyGetWinSize();

    const gridSize = USER_ARGUMENTS.enablePagination
      ? `${USER_ARGUMENTS.gridSize[1]}x${USER_ARGUMENTS.gridSize[0]}`
      : this.autoGridSize(terminalWidth, terminalHeight);

    await this.gallery(pngPaths, {
      gridSize,
      highlightType: USER_ARGUMENTS.highlight,
      terminalSize: `${terminalWidth}x${terminalHeight}`,
      cellPadding: {
        vertical: USER_ARGUMENTS.padding?.[0],
        horizontal: USER_ARGUMENTS.padding?.[1],
      },
      origin: "0x1",
      onFocus: (_, index) => {
        if (!USER_ARGUMENTS.onFocus) return;
        const wallpaper = this.wallpapers[index];
        return this.handleFocus?.(wallpaper);
      },
      onSelect: async (_, index) => {
        const wallpaper = this.wallpapers[index];
        await this.handleSelection(wallpaper);
      },
      getHiRes: (png) => this.getWallpaperPath(png.meta),
    }).catch(print);
  }

  /**
   * Automatically compute grid size when pagination is disabled
   */
  autoGridSize(terminalWidth, terminalHeight) {
    const [imgW, imgH] = USER_ARGUMENTS.imageSize;
    const [padY, padX] = USER_ARGUMENTS.padding;

    const containerWidth = imgW + padX;
    const containerHeight = imgH + padY;

    const cols = Math.max(1, Math.floor(terminalWidth / containerWidth));
    const rows = Math.max(1, Math.floor(terminalHeight / containerHeight));

    return `${cols}x${rows}`;
  }

  /**
   * Retains list preview behaviour (fzf mode)
   */
  async handleListPreview() {
    if (USER_ARGUMENTS.previewMode === "grid") return;
    const [width, height] = OS.ttyGetWinSize();
    const cachedColoursFile = STD.loadFile(
      Theme.wallpaperColoursCacheFilePath,
    );
    const cachedColours = JSON.parse(cachedColoursFile);
    const wallColors = Object.fromEntries(
      Object.entries(
        cachedColours,
      )
        .map(([wallId, pallete]) => {
          const wallpaperName = this.wallpapers.find((wallpaper) =>
            wallpaper.uniqueId === wallId
          )?.name;
          return wallpaperName
            ? [[wallpaperName.concat("#", wallId)], pallete]
            : null;
        })
        .filter(Boolean),
    );

    const kittyPreviewCmd =
      "--preview='printf \"\\x1b[0;0H\\x1b_Ga=T,t=f,f=100,q=2,c=${FZF_PREVIEW_COLUMNS};`echo -e {} | head -n 2 | tail -n 1`\\x1b\\\\\" >> /dev/tty'";

    const fzf = new Fzf();
    fzf.color("16,current-bg:-1")
      .read0()
      .delimiter("' '")
      .withNth("1")
      .previewWindow(
        `wrap,border-none,left,${(USER_ARGUMENTS.imageSize[0] + 2) * 2}`,
      )
      .noInfo()
      .separator("' '")
      .bind("'focus:transform-footer(echo -e {} | tail -n +3)'")
      .layout("reverse")
      .withShell("'/usr/bin/bash -c'")
      .custom(kittyPreviewCmd)
      .custom("--footer-border=none");

    // Calculate the length of the palette view
    const maxLineLength = Math.floor(
      width - (USER_ARGUMENTS.imageSize[0] + 2) * 2,
    );

    // Generate FZF input
    const fzfInput = Object.entries(wallColors)
      .map(([wallpaperName, palette]) => {
        const [wpName, id] = wallpaperName.split("#");
        const name = wpName.includes(" ") ? `"${wpName}"` : wpName;

        const wordLength = Math.floor(maxLineLength / palette.length) || 1;

        // Generate the visual representation of the palette
        const paletteVisualization = (() => {
          const line = palette
            .map((color) =>
              `${ansi.bgHex(color)}${ansi.hex(color)}${"-".repeat(wordLength)}`
            )
            .join("");

          // Duplicate the line and return the result
          return Array(wordLength * 2)
            .fill(`\b${line}`)
            .join("\n")
            .slice(0, -1);
        })();

        // Format the entry for FZF
        return `${name ?? this.getWallpaperPath({ uniqueId: id, name })} \n${
          this.toBase64(this.wallpapersDir + id)
        } \n${JSON.stringify(paletteVisualization)}\n`;
      })
      .join("\0");

    const previewer = new ProcessSync(
      fzf.toString(),
      {
        input: fzfInput, // Pass the formatted options as input to fzf
        useShell: true,
      },
    );

    try {
      previewer.run();
    } catch (error) {
      print(error);
      throw new SystemError(
        "Failed to run fzf.",
        "Make sure fzf is installed and available in the system.",
        error,
      );
    }

    if (!previewer.success) {
      STD.exit();
      throw new SystemError("Error", previewer.stderr || "No item selected.");
    }

    const wallpaper = previewer.stdout.split("\n")[0].trim();
    const selection = this.wallpapers.find((wp) => wp.name === wallpaper);
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

  async renderImage(pngSource, size, position) {
    const tempFile = pngSource.filePath.endsWith(".png")
      ? pngSource.filePath
      : `/tmp/${pngSource.filePath.split("/").at(-1)}.png`;

    const [_, err] = OS.stat(tempFile);

    if (err) {
      print("Loading...");
      await execAsync([
        "magick",
        pngSource.filePath,
        "-type",
        "truecolor",
        tempFile,
      ]);
    }

    const encodedPath = this.toBase64(tempFile);

    if (position) {
      STD.out.puts(cursorTo(position.row, position.column));
    }

    // Build params:
    //    a=T  → Transmit AND display in one command
    //    t=f  → Transmission medium is a file path
    //    f=100 → Payload is PNG format (not BMP/f=29)
    //    q=2  → Suppress terminal response (prevents garbage in shell prompt)
    let params = "a=T,t=f,f=100,q=2";
    if (size?.columns) params += `,c=${size.columns}`;
    if (size?.rows) params += `,r=${size.rows}`;

    // Send the escape sequence
    //    Format: ESC_G<params>;<base64-encoded-path>ESC\
    const escapeSequence = `\x1b_G${params};${encodedPath}\x1b\\`;
    STD.out.puts(escapeSequence);
    STD.out.flush();
  }

  async gallery(
    pngs,
    {
      gridSize = "4x3",
      onFocus = () => {},
      onSelect = () => {},
      highlightType = "fill",
      origin = "0x0",
      terminalSize,
      cellPadding = { vertical: 1, horizontal: 1 },
      getHiRes = () => {},
    },
  ) {
    /*------------------ Args validation ---------------*/
    if (!Array.isArray(pngs)) throw TypeError("'pngs' must be an array of png");

    /*----------------------- Grid Setup ---------------------*/
    const [originX, originY] = origin ? origin.split("x").map(Number) : [0, 0];
    const [terminalWidth, terminalHeight] = terminalSize
      ? terminalSize.split("x").map(Number)
      : OS.ttyGetWinSize();

    const [targetCols, targetRows] = gridSize.split("x").map(Number);
    const cellWidth = Math.floor(terminalWidth / targetCols);
    const cellHeight = Math.floor(terminalHeight / targetRows);

    // Calculate offsets to center the grid
    const usedWidth = cellWidth * targetCols;
    const usedHeight = cellHeight * targetRows;
    const offsetX = originX + Math.floor((terminalWidth - usedWidth) / 2);
    const offsetY = originY + Math.floor((terminalHeight - usedHeight) / 2);

    const coordinates = [];
    for (let row = 0; row < targetRows; row++) {
      for (let col = 0; col < targetCols; col++) {
        const x = offsetX + col * cellWidth;
        const y = offsetY + row * cellHeight;
        coordinates.push([x, y, cellWidth, cellHeight]);
      }
    }

    /*------------------ State Management -----------------*/

    let currentCell = 0; // Index relative to the current page
    let currentPage = 0;
    const maxCellsInGrid = targetCols * targetRows;
    const totalPages = Math.ceil(pngs.length / maxCellsInGrid);

    /*------------------ Rendering Helpers -----------------*/
    const label = highlightType === "fill" ? "█" : " ";

    const renderHighlight = (cellIndex) => {
      if (cellIndex < 0 || cellIndex >= coordinates.length) return;

      const [x, y, w, h] = coordinates[cellIndex];
      const drawW = Math.floor(w);
      const drawH = Math.floor(h);

      if (drawW <= 0 || drawH <= 0) return;

      STD.out.puts(cursorTo(0, 0), eraseDown);

      if (highlightType !== "fill") {
        const borderedLines = this.border(
          Math.max(0, drawH),
          Math.max(0, drawW),
        ).split("\n");

        for (let i = 0; i < borderedLines.length; i++) {
          STD.out.puts(cursorTo(x, y + i) + borderedLines[i]);
        }
      } else {
        const row = label.repeat(drawW);
        for (let i = 0; i < drawH; i++) {
          STD.out.puts(cursorTo(x, y + i) + row);
        }
      }
      STD.out.flush();
    };

    // Renders the full grid of images for the current page
    const renderPage = async () => {
      // Clear all images
      STD.out.puts(clearTerminal);

      const startIdx = currentPage * maxCellsInGrid;
      const promises = [];

      // Loop through grid slots
      for (let i = 0; i < maxCellsInGrid; i++) {
        const pngIndex = startIdx + i;
        const coord = coordinates[i];

        // If we have an image, render it
        if (pngIndex < pngs.length) {
          promises.push(
            this.renderImage(pngs[pngIndex], {
              rows: cellHeight - cellPadding.horizontal * 2,
              columns: cellWidth - cellPadding.vertical * 2,
            }, {
              row: coord[0] + cellPadding.vertical,
              column: coord[1] + cellPadding.horizontal,
            }),
          );
        }
      }

      await Promise.all(promises);

      renderHighlight(currentCell);

      const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
      if (pngs[globalIndex]) {
        onFocus(pngs[globalIndex], globalIndex);
      }
    };

    /*--------------------- Init ----------------------*/

    // Initial Render
    OS.ttySetRaw();
    STD.out.puts(cursorHide);
    await renderPage();
    let isFullScreen = false;

    /*------------------- Event handlers --------------------*/
    const moveSelectionDown = () => {
      if (isFullScreen) return;
      if (currentCell + targetCols < maxCellsInGrid) {
        // Ensure we don't select an empty slot on the last page
        const nextGlobal = (currentPage * maxCellsInGrid) +
          (currentCell + targetCols);
        if (nextGlobal < pngs.length) {
          currentCell += targetCols;
          renderHighlight(currentCell);
          return onFocus(pngs[nextGlobal], nextGlobal);
        }
      }
    };

    const moveSelectionUp = () => {
      if (isFullScreen) return;
      if (currentCell - targetCols >= 0) {
        currentCell -= targetCols;
        renderHighlight(currentCell);
        const nextGlobal = (currentPage * maxCellsInGrid) + currentCell;
        return onFocus(pngs[nextGlobal], nextGlobal);
      }
    };

    const toggleFullscreen = () => {
      const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
      if (pngs[globalIndex]) {
        if (isFullScreen = !isFullScreen) {
          print(enterAlternativeScreen);
          isFullScreen = true;
          const filePath = getHiRes(pngs[globalIndex]) ?? pngs[globalIndex];

          return this.renderImage({ filePath }, {
            columns: terminalWidth,
            rows: terminalHeight,
          }, { row: originX, column: originY });
        }
        print(exitAlternativeScreen);
      }
    };

    const moveSelection = async (direction) => {
      if (isFullScreen) return;
      // Current Global Index
      const globalIdx = (currentPage * maxCellsInGrid) + currentCell;

      // --- NEXT PAGE Logic (Right Arrow) ---
      if (direction === "NEXT") {
        const isLastCellInGrid = currentCell === maxCellsInGrid - 1;
        const isLastImage = globalIdx === pngs.length - 1;

        // Case 1: Just move next in current grid
        if (!isLastCellInGrid && !isLastImage) {
          currentCell++;
          renderHighlight(currentCell); // Draw new
          onFocus(pngs[globalIdx + 1], globalIdx + 1);
        } // Case 2: Wrap to Next Page
        else if (isLastCellInGrid && currentPage < totalPages - 1) {
          currentPage++;
          currentCell = 0; // Focus first cell
          await renderPage(); // Re-render images
        }
        // Case 3: End of content (Do nothing)
        return;
      }

      // --- PREV PAGE Logic (Left Arrow) ---
      if (direction === "PREV") {
        const isFirstCellInGrid = currentCell === 0;

        // Case 1: Just move back in current grid
        if (!isFirstCellInGrid) {
          currentCell--;
          renderHighlight(currentCell);
          onFocus(pngs[globalIdx - 1], globalIdx - 1);
        } // Case 2: Wrap to Prev Page
        else if (isFirstCellInGrid && currentPage > 0) {
          currentPage--;
          currentCell = maxCellsInGrid - 1; // Focus last cell
          await renderPage();
        }
        // Case 3: Start of content (Do nothing)
        return;
      }
    };

    const nextPage = () => {
      if (isFullScreen || currentPage == totalPages - 1) return;
      currentPage++;
      currentCell = 0;
      return renderPage();
    };

    const prevPage = () => {
      if (isFullScreen || currentPage === 0) return;
      currentPage--;
      currentCell = maxCellsInGrid - 1;
      return renderPage();
    };

    const handleExit = (_, exit) => {
      if (isFullScreen) print(exitAlternativeScreen);
      exit();
    };

    /*--------------------- Event Loop ----------------------*/
    await handleKeysPress({
      // Standard Grid Navigation (Up/Down don't change pages in grids, only rows)
      [keySequences.ArrowDown]: moveSelectionDown,
      "j": moveSelectionDown,

      [keySequences.ArrowUp]: moveSelectionUp,
      "k": moveSelectionUp,

      // Pagination Navigation
      [keySequences.ArrowRight]: () => moveSelection("NEXT"),
      "l": () => moveSelection("NEXT"),
      [keySequences.ArrowLeft]: () => moveSelection("PREV"),
      "h": () => moveSelection("PREV"),

      "f": toggleFullscreen,

      // Page Navigation
      "H": prevPage,
      "L": nextPage,

      // Selection
      [keySequences.Enter]: () => {
        const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
        if (pngs[globalIndex]) {
          return onSelect(pngs[globalIndex], globalIndex);
        }
      },

      "q": handleExit,
    });

    print(cursorShow);
  }

  border(height, width) {
    const x = "─";
    const y = "│";
    const tl = "╭";
    const tr = "╮";
    const bl = "╰";
    const br = "╯";

    const top = tl + x.repeat(width - 2) + tr;
    const middle = y + " ".repeat(width - 2) + y;
    const bottom = bl + x.repeat(width - 2) + br;

    const rows = [top];
    for (let i = 0; i < height - 2; i++) {
      rows.push(middle);
    }
    rows.push(bottom);

    return rows.join("\n");
  }
}

export { UserInterface };
