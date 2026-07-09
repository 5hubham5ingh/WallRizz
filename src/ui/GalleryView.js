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

  async getImageDimensions(filePath) {
    const output = await execAsync([
      "magick", "identify", "-format", "%w %h", filePath,
    ]);
    const [width, height] = output.split(" ").map(Number);
    return { width, height };
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

  async renderImage(pngSource, size, position, sourceRect) {
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
    // BUG: kitty ignores s/v/w/h source-rect params, so zoom/pan transmit has no effect.
    // Must pre-crop the image via magick before transmission instead.
    if (sourceRect) {
      if (sourceRect.x !== undefined) params += `,s=${Math.round(sourceRect.x)}`;
      if (sourceRect.y !== undefined) params += `,v=${Math.round(sourceRect.y)}`;
      if (sourceRect.w !== undefined) params += `,w=${Math.round(sourceRect.w)}`;
      if (sourceRect.h !== undefined) params += `,h=${Math.round(sourceRect.h)}`;
    }

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
    try {
      await renderPage();
      let isFullScreen = false;
      let zoomLevel = 1.0;
      let panX = 0;
      let panY = 0;
      let imgWidth = 0;
      let imgHeight = 0;

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

    const renderFullscreen = async () => {
      const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
      // BUG: if getHiRes returns null, falling back to pngSource obj instead of filePath string
      const filePath = getHiRes(pngs[globalIndex]) ?? pngs[globalIndex].filePath;

      const srcW = imgWidth / zoomLevel;
      const srcH = imgHeight / zoomLevel;

      panX = Math.max(0, Math.min(panX, imgWidth - srcW));
      panY = Math.max(0, Math.min(panY, imgHeight - srcH));

      // BUG: s/v/w/h source-rect params are ignored by kitty, so pan offsets do nothing.
      // Must pre-crop with magick before transmission.
      return this.renderImage({ filePath }, {
        columns: terminalWidth,
        rows: terminalHeight,
      }, { row: originX, column: originY }, {
        x: Math.round(panX),
        y: Math.round(panY),
        w: Math.round(srcW),
        h: Math.round(srcH),
      });
    };

    const toggleFullscreen = async () => {
      const globalIndex = (currentPage * maxCellsInGrid) + currentCell;
      if (pngs[globalIndex]) {
        if (isFullScreen = !isFullScreen) {
          print(enterAlternativeScreen);
          zoomLevel = 1.0;
          panX = 0;
          panY = 0;
          // BUG: falling back to pngSource object instead of .filePath string
          const filePath = getHiRes(pngs[globalIndex]) ?? pngs[globalIndex].filePath;
          const dims = await this.getImageDimensions(filePath);
          imgWidth = dims.width;
          imgHeight = dims.height;
          return renderFullscreen();
        }
        print(exitAlternativeScreen);
      }
    };

    const zoomIn = async () => {
      if (!isFullScreen) return;
      const newZoom = Math.min(5.0, zoomLevel * 1.25);
      panX += (imgWidth / zoomLevel - imgWidth / newZoom) / 2;
      panY += (imgHeight / zoomLevel - imgHeight / newZoom) / 2;
      zoomLevel = newZoom;
      await renderFullscreen();
    };

    const zoomOut = async () => {
      if (!isFullScreen) return;
      const newZoom = Math.max(1.0, zoomLevel / 1.25);
      panX += (imgWidth / zoomLevel - imgWidth / newZoom) / 2;
      panY += (imgHeight / zoomLevel - imgHeight / newZoom) / 2;
      zoomLevel = newZoom;
      await renderFullscreen();
    };

    const panUp = async () => {
      if (!isFullScreen || zoomLevel <= 1.0) return;
      const srcH = imgHeight / zoomLevel;
      panY = Math.max(0, panY - Math.max(1, Math.floor(srcH / 10)));
      await renderFullscreen();
    };

    const panDown = async () => {
      if (!isFullScreen || zoomLevel <= 1.0) return;
      const srcH = imgHeight / zoomLevel;
      panY = Math.min(imgHeight - srcH, panY + Math.max(1, Math.floor(srcH / 10)));
      await renderFullscreen();
    };

    const panLeft = async () => {
      if (!isFullScreen || zoomLevel <= 1.0) return;
      const srcW = imgWidth / zoomLevel;
      panX = Math.max(0, panX - Math.max(1, Math.floor(srcW / 10)));
      await renderFullscreen();
    };

    const panRight = async () => {
      if (!isFullScreen || zoomLevel <= 1.0) return;
      const srcW = imgWidth / zoomLevel;
      panX = Math.min(imgWidth - srcW, panX + Math.max(1, Math.floor(srcW / 10)));
      await renderFullscreen();
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
      [keySequences.ArrowDown]: () => {
        if (isFullScreen && zoomLevel > 1) return panDown();
        moveSelectionDown();
      },
      "j": () => {
        if (isFullScreen && zoomLevel > 1) return panDown();
        moveSelectionDown();
      },

      [keySequences.ArrowUp]: () => {
        if (isFullScreen && zoomLevel > 1) return panUp();
        moveSelectionUp();
      },
      "k": () => {
        if (isFullScreen && zoomLevel > 1) return panUp();
        moveSelectionUp();
      },

      [keySequences.ArrowRight]: () => {
        if (isFullScreen && zoomLevel > 1) return panRight();
        return moveSelection("NEXT");
      },
      "l": () => {
        if (isFullScreen && zoomLevel > 1) return panRight();
        return moveSelection("NEXT");
      },
      [keySequences.ArrowLeft]: () => {
        if (isFullScreen && zoomLevel > 1) return panLeft();
        return moveSelection("PREV");
      },
      "h": () => {
        if (isFullScreen && zoomLevel > 1) return panLeft();
        return moveSelection("PREV");
      },

      "f": toggleFullscreen,
      "+": zoomIn,
      "-": zoomOut,

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

    } finally {
      STD.out.puts(clearTerminal);
      print(cursorShow);
    }
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
