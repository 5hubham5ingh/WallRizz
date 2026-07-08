import { OS, STD, execAsync, EXIT } from "../core/constants.js";
import {
  clearTerminal,
  cursorHide,
  cursorMove,
  cursorShow,
  cursorTo,
  enterAlternativeScreen,
  eraseDown,
  exitAlternativeScreen,
} from "../../helpers/cursor.js";
import { handleKeysPress, keySequences } from "../../helpers/terminal.js";

export class GalleryView {
  constructor(config, wallpapers, wallpapersDir, handleSelection, getWallpaperPath, onFocus) {
    this.config = config;
    this.wallpapers = wallpapers;
    this.wallpapersDir = wallpapersDir;
    this.handleSelection = handleSelection;
    this.getWallpaperPath = getWallpaperPath;
    this.onFocusCallback = onFocus;
  }

  async render() {
    const pngPaths = this.wallpapers.map((img) => ({
      filePath: this.wallpapersDir + img.uniqueId,
      meta: img,
    }));

    const [terminalWidth, terminalHeight] = OS.ttyGetWinSize();

    const gridSize = this.config.enablePagination
      ? `${this.config.gridSize[1]}x${this.config.gridSize[0]}`
      : this.autoGridSize(terminalWidth, terminalHeight);

    await this.gallery(pngPaths, {
      gridSize,
      highlightType: this.config.highlight,
      terminalSize: `${terminalWidth}x${terminalHeight}`,
      cellPadding: {
        vertical: this.config.padding?.[0],
        horizontal: this.config.padding?.[1],
      },
      origin: "0x1",
      onFocus: (_, index) => {
        if (!this.config.onFocus && !USER_ARGUMENTS.focusSet) return;
        const wallpaper = this.wallpapers[index];
        return this.onFocusCallback?.(wallpaper);
      },
      onSelect: async (_, index) => {
        const wallpaper = this.wallpapers[index];
        await this.handleSelection(wallpaper);
      },
      getHiRes: (png) => this.getWallpaperPath(png.meta),
    }).catch(print);
  }

  autoGridSize(terminalWidth, terminalHeight) {
    const [imgW, imgH] = this.config.imageSize;
    const [padY, padX] = this.config.padding;

    const containerWidth = imgW + padX;
    const containerHeight = imgH + padY;

    const cols = Math.max(1, Math.floor(terminalWidth / containerWidth));
    const rows = Math.max(1, Math.floor(terminalHeight / containerHeight));

    return `${cols}x${rows}`;
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

    let params = "a=T,t=f,f=100,q=2";
    if (size?.columns) params += `,c=${size.columns}`;
    if (size?.rows) params += `,r=${size.rows}`;

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
    let currentHighlight = highlightType;
    if (!Array.isArray(pngs)) throw TypeError("'pngs' must be an array of png");

    const [originX, originY] = origin ? origin.split("x").map(Number) : [0, 0];
    const [terminalWidth, terminalHeight] = terminalSize
      ? terminalSize.split("x").map(Number)
      : OS.ttyGetWinSize();

    const [targetCols, targetRows] = gridSize.split("x").map(Number);
    const cellWidth = Math.floor(terminalWidth / targetCols);
    const cellHeight = Math.floor(terminalHeight / targetRows);

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

    let currentCell = 0;
    let currentPage = 0;
    const maxCellsInGrid = targetCols * targetRows;
    const totalPages = Math.ceil(pngs.length / maxCellsInGrid);

    const label = () => currentHighlight === "fill" ? "█" : " ";

    const renderHighlight = (cellIndex) => {
      if (cellIndex < 0 || cellIndex >= coordinates.length) return;

      const [x, y, w, h] = coordinates[cellIndex];
      const drawW = Math.floor(w);
      const drawH = Math.floor(h);

      if (drawW <= 0 || drawH <= 0) return;

      STD.out.puts(cursorTo(0, 0), eraseDown);

      if (currentHighlight !== "fill") {
        const borderedLines = this.border(
          Math.max(0, drawH),
          Math.max(0, drawW),
        ).split("\n");

        for (let i = 0; i < borderedLines.length; i++) {
          STD.out.puts(cursorTo(x, y + i) + borderedLines[i]);
        }
      } else {
        const row = label().repeat(drawW);
        for (let i = 0; i < drawH; i++) {
          STD.out.puts(cursorTo(x, y + i) + row);
        }
      }
      STD.out.flush();
    };

    const renderPage = async () => {
      STD.out.puts(clearTerminal);

      const startIdx = currentPage * maxCellsInGrid;
      const promises = [];

      for (let i = 0; i < maxCellsInGrid; i++) {
        const pngIndex = startIdx + i;
        const coord = coordinates[i];

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

    OS.ttySetRaw();
    STD.out.puts(cursorHide);
    await renderPage();
    let isFullScreen = false;

    const moveSelectionDown = () => {
      if (isFullScreen) return;
      if (currentCell + targetCols < maxCellsInGrid) {
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
      const globalIdx = (currentPage * maxCellsInGrid) + currentCell;

      if (direction === "NEXT") {
        const isLastCellInGrid = currentCell === maxCellsInGrid - 1;
        const isLastImage = globalIdx === pngs.length - 1;

        if (!isLastCellInGrid && !isLastImage) {
          currentCell++;
          renderHighlight(currentCell);
          onFocus(pngs[globalIdx + 1], globalIdx + 1);
        } else if (isLastCellInGrid && currentPage < totalPages - 1) {
          currentPage++;
          currentCell = 0;
          await renderPage();
        }
        return;
      }

      if (direction === "PREV") {
        const isFirstCellInGrid = currentCell === 0;

        if (!isFirstCellInGrid) {
          currentCell--;
          renderHighlight(currentCell);
          onFocus(pngs[globalIdx - 1], globalIdx - 1);
        } else if (isFirstCellInGrid && currentPage > 0) {
          currentPage--;
          currentCell = maxCellsInGrid - 1;
          await renderPage();
        }
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

    await handleKeysPress({
      [keySequences.ArrowDown]: moveSelectionDown,
      "j": moveSelectionDown,

      [keySequences.ArrowUp]: moveSelectionUp,
      "k": moveSelectionUp,

      [keySequences.ArrowRight]: () => moveSelection("NEXT"),
      "l": () => moveSelection("NEXT"),
      [keySequences.ArrowLeft]: () => moveSelection("PREV"),
      "h": () => moveSelection("PREV"),

      "f": toggleFullscreen,

      "H": prevPage,
      "L": nextPage,

      [keySequences.Enter]: () => {
        const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
        if (pngs[globalIndex]) {
          return onSelect(pngs[globalIndex], globalIndex);
        }
      },

      [keySequences.Space]: () => {
        USER_ARGUMENTS.focusSet = !USER_ARGUMENTS.focusSet;
        USER_ARGUMENTS.hold = USER_ARGUMENTS.focusSet;
      },
      [keySequences.Tab]: () => {
        currentHighlight = currentHighlight === "border" ? "fill" : "border";
        USER_ARGUMENTS.highlight = currentHighlight;
        renderHighlight(currentCell);
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
