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
import utils from "./utils.js";
import { Theme } from "./themeManager.js";
import { ProcessSync } from "../../qjs-ext-lib/src/process.js";
import Fzf from "../../justjs/fzf.js"

/**
 * @typedef {import('./types.d.ts').WallpapersList} WallpapersList
 */

class UserInterface {
  /**
   * Constructor for the UserInterface class
   * @param {WallpapersList} wallpaperList - List of wallpapers
   * @param {string} wallpapersDirectory - Directory containing wallpapers
   * @param {Function} handleSelection - Function to handle wallpaper selection
   * @param {Function} getWallpaperPath - Function to get wallpaper path
   */
  constructor(
    wallpaperList,
    wallpapersDirectory,
    handleSelection,
    getWallpaperPath,
    handleFocus
  ) {
    this.wallpapers = wallpaperList;
    this.wallpapersDir = wallpapersDirectory;
    this.handleSelection = handleSelection;
    this.getWallpaperPath = getWallpaperPath;
    this.handleFocus = handleFocus
    this.prepareUiConfig();
  }

  /**
   * Initialize the user interface
   */
  async init() {
    try {
      // Check if list preview enabled
      await this.handleListPreview();

      // Prepare UI config for grid preview
      print(enterAlternativeScreen, cursorHide);
      // Get initial terminal size
      [this.terminalWidth, this.terminalHeight] = OS.ttyGetWinSize();

      // Ensure terminal is wide enough
      while (this.containerWidth > this.terminalWidth) {
        await this.increaseTerminalSize();
      }

      this.calculateCoordinates();

      // Ensure terminal is tall enough
      while (this.isScreenHeightInsufficient()) {
        await this.increaseTerminalSize();
        this.calculateCoordinates();
      }

      this.drawUI();
      await this.handleKeysPress();
    } finally {
      print(exitAlternativeScreen, cursorShow);
      OS.exec(["kitty", "@", "set-font-size", "--", "0"]);
    }
  }

  prepareUiConfig() {
    // Set image dimensions and container size
    [this.imageWidth, this.imageHeight] = USER_ARGUMENTS.imageSize;
    this.containerHeight = this.imageHeight + USER_ARGUMENTS.padding[0];
    this.containerWidth = this.imageWidth + USER_ARGUMENTS.padding[1];
    this.terminalWidth = 0;
    this.terminalHeight = 0;
    this.xy = [];
    this.selection = 0;

    // Handle pagination if enabled
    if (USER_ARGUMENTS.enablePagination) {
      const batchSize = USER_ARGUMENTS.gridSize[0] *
        USER_ARGUMENTS.gridSize[1];
      this.wallpaperBatch = [];
      for (
        let start = 0;
        start < this.wallpapers.length;
        start += batchSize
      ) {
        this.wallpaperBatch.push(
          this.wallpapers.slice(start, start + batchSize),
        );
      }
      this.pageNo = 0;
      this.wallpapers = this.wallpaperBatch[this.pageNo];
    }
  }

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

    const icat = await execAsync(["kitty", "icat", "--detect-support"])
      .then((_) =>
        "--preview='kitty icat --clear --transfer-mode=memory --stdin=no --scale-up --place=${FZF_PREVIEW_COLUMNS}x${FZF_PREVIEW_LINES}@0x0 "
      ).catch((_) =>
        `--preview='timg -U -W --clear -pk -g${parseInt(width * 6.5 / 10)}x${parseInt(height)
        } `
      );

    const fzf = new Fzf()
    fzf.color("16,current-bg:-1")
      .read0()
      .delimiter("' '")
      .withNth("1")
      .custom(icat + this.wallpapersDir + "`echo -e {} | head -n 2 | tail -n 1`'")
      .previewWindow("wrap,border-none")
      .noInfo()
      .separator("' '")
      .bind("'focus:transform-header(echo -e {} | tail -n +3)'")
      .layout("reverse")
      .withShell("'/usr/bin/bash -c'")

    // Calculate the length of the palette view
    const maxLineLength = Math.floor(width / 2);

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
        return `${name} \n${id} \n${JSON.stringify(paletteVisualization)}\n`;
      })
      .join("\0");

    const previewer = new ProcessSync(
      fzf.toString(),
      {
        input: fzfInput, // Pass the formatted options as input to fzf
        useShell: true
      },
    );

    try {
      previewer.run();
    } catch (error) {
      print(error)
      throw new SystemError(
        "Failed to run fzf.",
        "Make sure fzf is installed and available in the system.",
        error,
      );
    }

    if (!previewer.success) {
      STD.exit()
      throw new SystemError("Error", previewer.stderr || "No item selected.");
    }

    const wallpaper = previewer.stdout.split("\n")[0].trim();
    const selection = this.wallpapers.find((wp) => wp.name === wallpaper);
    await this.handleSelection(selection);
    throw EXIT;
  }

  async increaseTerminalSize() {
    const handleError = () => {
      throw new SystemError(
        "Insufficient screen size.",
        "You can use pagination, or reduce the image preview size.",
      );
    };

    if (USER_ARGUMENTS.disableAutoScaling) handleError();

    try {
      await execAsync(["kitty", "@", "set-font-size", "--", "-1"]);
    } catch (e) {
      throw new SystemError(
        "Terminal size too small.",
        "Either set it manually or enable kitty remote control for automatic scaling.",
        e,
      );
    }

    const [w, h] = OS.ttyGetWinSize();
    if (w === this.terminalWidth && h === this.terminalHeight) {
      handleError();
    }
    this.terminalWidth = w;
    this.terminalHeight = h;
  }

  /**
   * Calculate coordinates for wallpaper placement in a grid
   */
  calculateCoordinates() {
    let generatedCount = 0;
    this.xy = [];

    // Calculate the number of images that can fit horizontally
    const numCols = Math.floor(this.terminalWidth / this.containerWidth);

    // Calculate margins to center the grid horizontally
    const totalGridWidth = numCols * this.containerWidth;
    const horizontalMargin = Math.floor(
      (this.terminalWidth - totalGridWidth) / 2,
    );

    // Calculate the starting x position
    const startX = horizontalMargin;

    // Start y position with a top margin of 2 units
    let y = 2; // Top margin

    if (USER_ARGUMENTS.enablePagination) {
      // If gridSize is provided, parse the grid size and calculate coordinates accordingly
      const [numRows, numCols] = USER_ARGUMENTS.gridSize;

      // Calculate the number of images to generate based on the grid size
      const totalImages = numRows * numCols;

      while (
        generatedCount < totalImages &&
        generatedCount < this.wallpapers.length
      ) {
        const currentRow = Math.floor(generatedCount / numCols);
        const currentCol = generatedCount % numCols;

        const x = startX + currentCol * this.containerWidth;
        const y = 2 + currentRow * this.containerHeight;

        this.xy.push([x, y]);
        generatedCount++;
      }
    } else {
      // Original behavior if no gridSize is provided
      while (generatedCount < this.wallpapers.length) {
        for (
          let x = startX;
          x + this.containerWidth <= this.terminalWidth;
          x += this.containerWidth
        ) {
          if (generatedCount < this.wallpapers.length) {
            this.xy.push([x, y]);
            generatedCount++;
          } else return;
        }
        y += this.containerHeight; // Move down for the next row of images
      }
    }
  }

  /**
   * Check if screen height is insufficient
   * @returns {boolean} True if screen height is insufficient, false otherwise
   */
  isScreenHeightInsufficient() {
    return this.xy.some(
      ([x, y]) =>
        y + this.containerHeight > this.terminalHeight ||
        x + this.containerWidth > this.terminalWidth,
    );
  }

  /**
   * Draw the user interface- The wallpapers grid.
   */
  drawUI() {
    if (!this.wallpapers) return;
    print(clearTerminal);
    // Draw wallpapers
    this.wallpapers.forEach((wallpaper, i) => {
      const wallpaperDir = `${this.wallpapersDir}/${wallpaper.uniqueId}`;
      const [x, y] = i < this.xy.length
        ? this.xy[i]
        : this.xy[i % this.xy.length];
      const coordinates = `${this.imageWidth}x${this.imageHeight}@${x}x${y}`;
      // print(cursorMove(x, y));
      // OS.exec([
      //   "timg",
      //   "-U",
      //   "-W",
      //   "--clear",
      //   "-pk",
      //   `-g${this.imageWidth}x${this.imageHeight}`,
      //   wallpaperDir,
      // ]);
      OS.exec([
        "kitten",
        "icat",
        "--stdin=no",
        "--scale-up",
        "--place",
        coordinates,
        wallpaperDir,
      ]);
    });

    this.drawContainerBorder(this.xy[this.selection]);
  }

  /**
   * Draw container border
   * @param {number[]} coordinates - [x, y] coordinates of the container
   */
  drawContainerBorder([x, y]) {
    const OO = cursorTo(x, y);
    const xBorderUp = (USER_ARGUMENTS.highlight === "fill" ? "\b█" : "\b╭") + (USER_ARGUMENTS.highlight === "fill" ? "█" : "─").repeat(this.containerWidth - 1) + (USER_ARGUMENTS.highlight === "fill" ? "█" : "╮");
    const xBorderDown = (USER_ARGUMENTS.highlight === "fill" ? " █" : " ╰") + (USER_ARGUMENTS.highlight === "fill" ? "█" : "─").repeat(this.containerWidth - 1) + (USER_ARGUMENTS.highlight === "fill" ? "█" : "╯");
    const newLine = cursorMove(-1 * (this.containerWidth + 2), 1);
    const yBorder = ` ${(USER_ARGUMENTS.highlight === "fill" ? "█" : "│")}${(USER_ARGUMENTS.highlight === "fill" ? "█" : " ").repeat(this.containerWidth - 1)}${USER_ARGUMENTS.highlight === "fill" ? "█" : "│"}${newLine}`;
    const border = `${OO}${xBorderUp}${newLine}${yBorder.repeat(this.containerHeight - 1)
      }${xBorderDown}${OO}`;
    print(cursorTo(0, 0), eraseDown, ansi.style.brightWhite, border);
  }

  /**
   * Change page in pagination mode
   * @param {number} direction - Direction of page change (1 for next, -1 for previous)
   * @param {boolean} selectStart - Whether to select the start of the new page
   * @returns {boolean} True if page changed successfully, false otherwise
   */
  changePage(direction, selectStart) {
    if (!USER_ARGUMENTS.enablePagination) return false;

    const newPageNo = this.pageNo + direction;
    if (newPageNo >= 0 && newPageNo < this.wallpaperBatch.length) {
      this.pageNo = newPageNo;
      this.wallpapers = this.wallpaperBatch[this.pageNo];
      this.selection = direction > 0 || selectStart
        ? 0
        : this.wallpapers.length - 1;
      this.drawUI();
      return true;
    }
    return false;
  }

  /**
   * Wrap selection to the other end of the list
   * @param {number} direction - Direction of wrap (1 for start, -1 for end)
   */
  wrapSelection(direction) {
    this.selection = direction > 0 ? 0 : this.wallpapers.length - 1;
  }

  /**
   * Move selection in a given direction
   * @param {number} direction - Direction of movement (1 for next, -1 for previous)
   * @returns {boolean} True if selection moved successfully, false otherwise
   */
  moveSelection(direction) {
    const newSelection = this.selection + direction;
    if (newSelection >= 0 && newSelection < this.wallpapers.length) {
      this.selection = newSelection;
      return true;
    }
    return false;
  }

  /**
   * Print key mappings for user reference
   */
  static printKeyMaps() {
    const styles = {
      underline: ansi.style.underline,
      header: ansi.styles(["red", "bold"]),
      reset: ansi.style.reset,
      key: ansi.styles(["cyan", "bold"]),
    };

    const keyMaps = `
${styles.header} Key Maps                                        ${styles.reset}
${styles.underline}                                                 ${styles.reset}

 ${styles.key}k/ArrowUp             ${styles.reset}: Move Up
 ${styles.key}l/ArrowRight          ${styles.reset}: Move Right
 ${styles.key}j/ArrowDown           ${styles.reset}: Move down
 ${styles.key}h/ArrowLeft           ${styles.reset}: Move Left
 ${styles.key}L/PageDown            ${styles.reset}: Next page
 ${styles.key}H/PageUp              ${styles.reset}: Previous page
 ${styles.key}Enter                 ${styles.reset}: Apply/Download wallpaper
 ${styles.key}f                     ${styles.reset}: Fullscreen
 ${styles.key}ESC/Enter             ${styles.reset}: Exit fullscreen
 ${styles.key}q                     ${styles.reset}: Quit
${styles.underline}                                                 ${styles.reset}
`;
    print(keyMaps);
    throw EXIT;
  }

  /**
   * Move selection left
   */
  moveLeft() {
    if (!this.moveSelection(-1) && !this.changePage(-1)) {
      this.wrapSelection(-1);
    }
    this.drawContainerBorder(this.xy[this.selection]);

    return this?.handleFocus(this.wallpapers[this.selection]);
  }

  /**
   * Move selection right
   */
  moveRight() {
    if (!this.moveSelection(1) && !this.changePage(1)) {
      this.wrapSelection(1);
    }
    this.drawContainerBorder(this.xy[this.selection]);
    return this.handleFocus?.(this.wallpapers[this.selection]);
  }

  /**
   * Move to next page
   */
  nextPage() {
    this.changePage(1, true);
    return this.handleFocus?.(this.wallpapers[this.selection]);
  }

  /**
   * Move to previous page
   */
  prevPage() {
    this.changePage(-1, true);
    return this.handleFocus?.(this.wallpapers[this.selection]);
  }

  /**
   * Move selection up
   */
  moveUp() {
    const currentX = this.xy[this.selection][0];
    for (let i = this.selection - 1; i >= 0; i--) {
      if (this.xy[i][0] === currentX) {
        this.selection = i;
        this.drawContainerBorder(this.xy[this.selection]);
        return this.handleFocus?.(this.wallpapers[this.selection]);
      }
    }
  }

  /**
   * Move selection down
   */
  moveDown() {
    const currentX = this.xy[this.selection][0];
    for (
      let i = this.selection + 1;
      i < this.xy.length && i < this.wallpapers.length;
      i++
    ) {
      if (this.xy[i][0] === currentX) {
        this.selection = i;
        this.drawContainerBorder(this.xy[this.selection]);
        return this.handleFocus?.(this.wallpapers[this.selection]);
      }
    }
  }

  /**
   * Enable fullscreen preview of the selected wallpaper
   */
  async enableFullScreenPreview() {
    const wallpaperPath = this.getWallpaperPath(
      this.wallpapers[this.selection],
    );
    try {
      await execAsync(
        `kitty @ launch --type=overlay kitten icat --hold --stdin=no --scale-up ${wallpaperPath}`,
      );
    } catch (_) {
      utils.notify(
        "Failed to launch fullscreen preview.",
        "Make sure kitty remote control is enabled.",
        "critical",
      );
    }
  }

  /**
   * Handle enter key press (apply/download wallpaper)
   */
  async handleEnter() {
    await this.handleSelection(this.wallpapers[this.selection]);
  }

  /**
   * Handle exit (quit the application)
   * @param {*} _ - Unused parameter
   * @param {Function} quit - Function to quit the application
   */
  handleExit(_, quit) {
    quit();
  }

  /**
   * Set up key press handlers and start listening for key presses
   */
  async handleKeysPress() {
    const keyPressHandlers = {
      k: this.moveUp.bind(this),
      [keySequences.ArrowUp]: this.moveUp.bind(this),
      l: this.moveRight.bind(this),
      [keySequences.ArrowRight]: this.moveRight.bind(this),
      j: this.moveDown.bind(this),
      [keySequences.ArrowDown]: this.moveDown.bind(this),
      h: this.moveLeft.bind(this),
      [keySequences.ArrowLeft]: this.moveLeft.bind(this),
      L: this.nextPage.bind(this),
      [keySequences.PageDown]: this.nextPage.bind(this),
      H: this.prevPage.bind(this),
      [keySequences.PageUp]: this.prevPage.bind(this),
      q: this.handleExit.bind(this),
      [keySequences.Enter]: this.handleEnter.bind(this),
      [keySequences.Escape]: this.handleExit.bind(this),
      f: this.enableFullScreenPreview.bind(this),
    };

    await handleKeysPress(keyPressHandlers);
  }
}

export { UserInterface };
