/**
 * A class to build fzf command with fluent API
 */
export default class Fzf {
  /** @type {string[]} */
  fzf = ["fzf"];

  /**
   * Convert the fzf command to an array
   * @returns {string[]} The fzf command as an array of arguments
   */
  toArray() {
    return [...this.fzf];
  }

  /**
   * Convert the fzf command to a string
   * @returns {string} The fzf command as a string
   */
  toString() {
    return this.fzf.join(" ");
  }

  /**
   * Add custom fzf arguments
   * @returns {Fzf} The current Fzf instance for chaining
   */
  custom(arg) {
    this.fzf.push(arg);
    return this;
  }

  // === SEARCH OPTIONS ===

  /**
   * Enable exact-match
   * @returns {Fzf} The current Fzf instance for chaining
   */
  exact() {
    this.fzf.push("--exact");
    return this;
  }

  /**
   * Disable extended-search mode
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noExtended() {
    this.fzf.push("--no-extended");
    return this;
  }

  /**
   * Case-insensitive match
   * @returns {Fzf} The current Fzf instance for chaining
   */
  ignoreCase() {
    this.fzf.push("--ignore-case");
    return this;
  }

  /**
   * Case-sensitive match
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noIgnoreCase() {
    this.fzf.push("--no-ignore-case");
    return this;
  }

  /**
   * Smart-case match (default)
   * @returns {Fzf} The current Fzf instance for chaining
   */
  smartCase() {
    this.fzf.push("--smart-case");
    return this;
  }

  /**
   * Scoring scheme [default|path|history]
   * @param {string} scheme The scoring scheme to use
   * @returns {Fzf} The current Fzf instance for chaining
   */
  scheme(scheme) {
    this.fzf.push("--scheme", scheme);
    return this;
  }

  /**
   * Comma-separated list of field index expressions for limiting search scope
   * @param {string} nth Comma-separated list of field index expressions
   * @returns {Fzf} The current Fzf instance for chaining
   */
  nth(nth) {
    this.fzf.push("--nth", nth);
    return this;
  }

  /**
   * Transform the presentation of each line using field index expressions
   * @param {string} withNth Comma-separated list of field index expressions
   * @returns {Fzf} The current Fzf instance for chaining
   */
  withNth(withNth) {
    this.fzf.push("--with-nth", withNth);
    return this;
  }

  /**
   * Define which fields to print on accept
   * @param {string} acceptNth Comma-separated list of field index expressions
   * @returns {Fzf} The current Fzf instance for chaining
   */
  acceptNth(acceptNth) {
    this.fzf.push("--accept-nth", acceptNth);
    return this;
  }

  /**
   * Field delimiter regex
   * @param {string} delimiter Field delimiter regex
   * @returns {Fzf} The current Fzf instance for chaining
   */
  delimiter(delimiter) {
    this.fzf.push("--delimiter", delimiter);
    return this;
  }

  /**
   * Do not sort the result
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noSort() {
    this.fzf.push("--no-sort");
    return this;
  }

  /**
   * Do not normalize latin script letters
   * @returns {Fzf} The current Fzf instance for chaining
   */
  literal() {
    this.fzf.push("--literal");
    return this;
  }

  /**
   * Maximum number of items to keep in memory
   * @param {number|string} num Maximum number of items
   * @returns {Fzf} The current Fzf instance for chaining
   */
  tail(num) {
    this.fzf.push("--tail", String(num));
    return this;
  }

  /**
   * Do not perform search
   * @returns {Fzf} The current Fzf instance for chaining
   */
  disabled() {
    this.fzf.push("--disabled");
    return this;
  }

  /**
   * Comma-separated list of sort criteria to apply when the scores are tied
   * @param {string} criteria Comma-separated list of sort criteria
   * @returns {Fzf} The current Fzf instance for chaining
   */
  tiebreak(criteria) {
    this.fzf.push("--tiebreak", criteria);
    return this;
  }

  // === INPUT/OUTPUT OPTIONS ===

  /**
   * Read input delimited by ASCII NUL characters
   * @returns {Fzf} The current Fzf instance for chaining
   */
  read0() {
    this.fzf.push("--read0");
    return this;
  }

  /**
   * Print output delimited by ASCII NUL characters
   * @returns {Fzf} The current Fzf instance for chaining
   */
  print0() {
    this.fzf.push("--print0");
    return this;
  }

  /**
   * Enable processing of ANSI color codes
   * @returns {Fzf} The current Fzf instance for chaining
   */
  ansi() {
    this.fzf.push("--ansi");
    return this;
  }

  /**
   * Synchronous search for multi-staged filtering
   * @returns {Fzf} The current Fzf instance for chaining
   */
  sync() {
    this.fzf.push("--sync");
    return this;
  }

  // === GLOBAL STYLE OPTIONS ===

  /**
   * Apply a style preset
   * @param {string} style Style preset [default|minimal|full[:BORDER_STYLE]]
   * @returns {Fzf} The current Fzf instance for chaining
   */
  style(style) {
    this.fzf.push("--style", style);
    return this;
  }

  /**
   * Set color scheme and custom colors
   * @param {string} colorSpec Base scheme (dark|light|16|bw) and/or custom colors
   * @returns {Fzf} The current Fzf instance for chaining
   */
  color(colorSpec) {
    this.fzf.push("--color", colorSpec);
    return this;
  }

  /**
   * Disable colors
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noColor() {
    this.fzf.push("--no-color");
    return this;
  }

  /**
   * Do not use bold text
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noBold() {
    this.fzf.push("--no-bold");
    return this;
  }

  // === DISPLAY MODE OPTIONS ===

  /**
   * Display fzf window below the cursor with the given height
   * @param {string} height Height specification, e.g. "40%" or "~25"
   * @returns {Fzf} The current Fzf instance for chaining
   */
  height(height) {
    this.fzf.push("--height", height);
    return this;
  }

  /**
   * Minimum height when --height is given as a percentage
   * @param {string} minHeight Minimum height value
   * @returns {Fzf} The current Fzf instance for chaining
   */
  minHeight(minHeight) {
    this.fzf.push("--min-height", minHeight);
    return this;
  }

  /**
   * Start fzf in a tmux popup
   * @param {string} [opts] Options for tmux popup
   * @returns {Fzf} The current Fzf instance for chaining
   */
  tmux(opts) {
    if (opts) {
      this.fzf.push("--tmux", opts);
    } else {
      this.fzf.push("--tmux");
    }
    return this;
  }

  // === LAYOUT OPTIONS ===

  /**
   * Choose layout
   * @param {string} layout Layout type [default|reverse|reverse-list]
   * @returns {Fzf} The current Fzf instance for chaining
   */
  layout(layout) {
    this.fzf.push("--layout", layout);
    return this;
  }

  /**
   * Screen margin
   * @param {string} margin Margin specification (TRBL | TB,RL | T,RL,B | T,R,B,L)
   * @returns {Fzf} The current Fzf instance for chaining
   */
  margin(margin) {
    this.fzf.push("--margin", margin);
    return this;
  }

  /**
   * Padding inside border
   * @param {string} padding Padding specification (TRBL | TB,RL | T,RL,B | T,R,B,L)
   * @returns {Fzf} The current Fzf instance for chaining
   */
  padding(padding) {
    this.fzf.push("--padding", padding);
    return this;
  }

  /**
   * Draw border around the finder
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  border(style) {
    if (style) {
      this.fzf.push("--border", style);
    } else {
      this.fzf.push("--border");
    }
    return this;
  }

  /**
   * Label to print on the border
   * @param {string} label Border label text
   * @returns {Fzf} The current Fzf instance for chaining
   */
  borderLabel(label) {
    this.fzf.push("--border-label", label);
    return this;
  }

  /**
   * Position of the border label
   * @param {string} pos Position specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  borderLabelPos(pos) {
    this.fzf.push("--border-label-pos", pos);
    return this;
  }

  // === LIST SECTION OPTIONS ===

  /**
   * Enable multi-select with tab/shift-tab
   * @param {number} [max] Maximum number of selections
   * @returns {Fzf} The current Fzf instance for chaining
   */
  multi(max) {
    if (max !== undefined) {
      this.fzf.push("--multi", String(max));
    } else {
      this.fzf.push("--multi");
    }
    return this;
  }

  /**
   * Highlight the whole current line
   * @returns {Fzf} The current Fzf instance for chaining
   */
  highlightLine() {
    this.fzf.push("--highlight-line");
    return this;
  }

  /**
   * Enable cyclic scroll
   * @returns {Fzf} The current Fzf instance for chaining
   */
  cycle() {
    this.fzf.push("--cycle");
    return this;
  }

  /**
   * Enable line wrap
   * @returns {Fzf} The current Fzf instance for chaining
   */
  wrap() {
    this.fzf.push("--wrap");
    return this;
  }

  /**
   * Indicator for wrapped lines
   * @param {string} str Indicator string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  wrapSign(str) {
    this.fzf.push("--wrap-sign", str);
    return this;
  }

  /**
   * Disable multi-line display of items when using --read0
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noMultiLine() {
    this.fzf.push("--no-multi-line");
    return this;
  }

  /**
   * Track the current selection when the result is updated
   * @returns {Fzf} The current Fzf instance for chaining
   */
  track() {
    this.fzf.push("--track");
    return this;
  }

  /**
   * Reverse the order of the input
   * @returns {Fzf} The current Fzf instance for chaining
   */
  tac() {
    this.fzf.push("--tac");
    return this;
  }

  /**
   * Render empty lines between each item
   * @param {number} [n] Number of gap lines
   * @returns {Fzf} The current Fzf instance for chaining
   */
  gap(n) {
    if (n !== undefined) {
      this.fzf.push("--gap", String(n));
    } else {
      this.fzf.push("--gap");
    }
    return this;
  }

  /**
   * Draw horizontal line on each gap
   * @param {string} [str] String to use for gap line
   * @returns {Fzf} The current Fzf instance for chaining
   */
  gapLine(str) {
    if (str) {
      this.fzf.push("--gap-line", str);
    } else {
      this.fzf.push("--gap-line");
    }
    return this;
  }

  /**
   * Keep the right end of the line visible on overflow
   * @returns {Fzf} The current Fzf instance for chaining
   */
  keepRight() {
    this.fzf.push("--keep-right");
    return this;
  }

  /**
   * Number of screen lines to keep above or below when scrolling
   * @param {number} lines Number of lines
   * @returns {Fzf} The current Fzf instance for chaining
   */
  scrollOff(lines) {
    this.fzf.push("--scroll-off", String(lines));
    return this;
  }

  /**
   * Disable horizontal scroll
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noHscroll() {
    this.fzf.push("--no-hscroll");
    return this;
  }

  /**
   * Number of screen columns to keep to the right of the highlighted substring
   * @param {number} cols Number of columns
   * @returns {Fzf} The current Fzf instance for chaining
   */
  hscrollOff(cols) {
    this.fzf.push("--hscroll-off", String(cols));
    return this;
  }

  /**
   * Label characters for jump mode
   * @param {string} chars Characters to use for jump labels
   * @returns {Fzf} The current Fzf instance for chaining
   */
  jumpLabels(chars) {
    this.fzf.push("--jump-labels", chars);
    return this;
  }

  /**
   * Pointer to the current line
   * @param {string} str Pointer string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  pointer(str) {
    this.fzf.push("--pointer", str);
    return this;
  }

  /**
   * Multi-select marker
   * @param {string} str Marker string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  marker(str) {
    this.fzf.push("--marker", str);
    return this;
  }

  /**
   * Multi-select marker for multi-line entries
   * @param {string} str Marker string for multi-line entries
   * @returns {Fzf} The current Fzf instance for chaining
   */
  markerMultiLine(str) {
    this.fzf.push("--marker-multi-line", str);
    return this;
  }

  /**
   * Ellipsis to show when line is truncated
   * @param {string} str Ellipsis string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  ellipsis(str) {
    this.fzf.push("--ellipsis", str);
    return this;
  }

  /**
   * Number of spaces for a tab character
   * @param {number} spaces Number of spaces
   * @returns {Fzf} The current Fzf instance for chaining
   */
  tabstop(spaces) {
    this.fzf.push("--tabstop", String(spaces));
    return this;
  }

  /**
   * Scrollbar character(s)
   * @param {string} chars Scrollbar characters
   * @returns {Fzf} The current Fzf instance for chaining
   */
  scrollbar(chars) {
    this.fzf.push("--scrollbar", chars);
    return this;
  }

  /**
   * Hide scrollbar
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noScrollbar() {
    this.fzf.push("--no-scrollbar");
    return this;
  }

  /**
   * Draw border around the list section
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  listBorder(style) {
    if (style) {
      this.fzf.push("--list-border", style);
    } else {
      this.fzf.push("--list-border");
    }
    return this;
  }

  /**
   * Label to print on the list border
   * @param {string} label List border label
   * @returns {Fzf} The current Fzf instance for chaining
   */
  listLabel(label) {
    this.fzf.push("--list-label", label);
    return this;
  }

  /**
   * Position of the list label
   * @param {string} pos Position specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  listLabelPos(pos) {
    this.fzf.push("--list-label-pos", pos);
    return this;
  }

  // === INPUT SECTION OPTIONS ===

  /**
   * Disable and hide the input section
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noInput() {
    this.fzf.push("--no-input");
    return this;
  }

  /**
   * Input prompt
   * @param {string} prompt Prompt string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  prompt(prompt) {
    this.fzf.push("--prompt", prompt);
    return this;
  }

  /**
   * Finder info style
   * @param {string} info Info style specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  info(info) {
    this.fzf.push("--info", info);
    return this;
  }

  /**
   * Command to generate info line
   * @param {string} infoCommand Command to generate info line
   * @returns {Fzf} The current Fzf instance for chaining
   */
  infoCommand(infoCommand) {
    this.fzf.push("--info-command", infoCommand);
    return this;
  }

  /**
   * Command to desable info
   * @param {string} info Info style specification
   */
  noInfo() {
    this.fzf.push("--no-info");
    return this;
  }

  /**
   * Draw horizontal separator on info line
   * @param {string} separator Separator string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  separator(separator) {
    this.fzf.push("--separator", separator);
    return this;
  }

  /**
   * Hide info line separator
   * @returns {Fzf} The current Fzf instance for chaining
   */
  noSeparator() {
    this.fzf.push("--no-separator");
    return this;
  }

  /**
   * Make word-wise movements respect path separators
   * @returns {Fzf} The current Fzf instance for chaining
   */
  filepathWord() {
    this.fzf.push("--filepath-word");
    return this;
  }

  /**
   * Draw border around the input section
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  inputBorder(style) {
    if (style) {
      this.fzf.push("--input-border", style);
    } else {
      this.fzf.push("--input-border");
    }
    return this;
  }

  /**
   * Label to print on the input border
   * @param {string} label Input border label
   * @returns {Fzf} The current Fzf instance for chaining
   */
  inputLabel(label) {
    this.fzf.push("--input-label", label);
    return this;
  }

  /**
   * Position of the input label
   * @param {string} pos Position specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  inputLabelPos(pos) {
    this.fzf.push("--input-label-pos", pos);
    return this;
  }

  // === PREVIEW WINDOW OPTIONS ===

  /**
   * Command to preview highlighted line
   * @param {string} preview Preview command
   * @returns {Fzf} The current Fzf instance for chaining
   */
  preview(preview) {
    this.fzf.push("--preview", preview);
    return this;
  }

  /**
   * Preview window layout
   * @param {string} previewWindow Preview window options
   * @returns {Fzf} The current Fzf instance for chaining
   */
  previewWindow(previewWindow) {
    this.fzf.push("--preview-window", previewWindow);
    return this;
  }

  /**
   * Draw border around the preview window
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  previewBorder(style) {
    if (style) {
      this.fzf.push("--preview-border", style);
    } else {
      this.fzf.push("--preview-border");
    }
    return this;
  }

  /**
   * Label to print on the preview window border
   * @param {string} previewLabel Preview window label
   * @returns {Fzf} The current Fzf instance for chaining
   */
  previewLabel(previewLabel) {
    this.fzf.push("--preview-label", previewLabel);
    return this;
  }

  /**
   * Position of the preview label
   * @param {string} pos Position specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  previewLabelPos(pos) {
    this.fzf.push("--preview-label-pos", pos);
    return this;
  }

  // === HEADER OPTIONS ===

  /**
   * String to print as header
   * @param {string} header Header string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  header(header) {
    this.fzf.push("--header", header);
    return this;
  }

  /**
   * The first N lines of the input are treated as header
   * @param {number} n Number of lines
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerLines(n) {
    this.fzf.push("--header-lines", String(n));
    return this;
  }

  /**
   * Print header before the prompt line
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerFirst() {
    this.fzf.push("--header-first");
    return this;
  }

  /**
   * Draw border around the header section
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerBorder(style) {
    if (style) {
      this.fzf.push("--header-border", style);
    } else {
      this.fzf.push("--header-border");
    }
    return this;
  }

  /**
   * Display header from --header-lines with a separate border
   * @param {string} [style] Border style
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerLinesBorder(style) {
    if (style) {
      this.fzf.push("--header-lines-border", style);
    } else {
      this.fzf.push("--header-lines-border");
    }
    return this;
  }

  /**
   * Label to print on the header border
   * @param {string} label Header border label
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerLabel(label) {
    this.fzf.push("--header-label", label);
    return this;
  }

  /**
   * Position of the header label
   * @param {string} pos Position specification
   * @returns {Fzf} The current Fzf instance for chaining
   */
  headerLabelPos(pos) {
    this.fzf.push("--header-label-pos", pos);
    return this;
  }

  // === SCRIPTING OPTIONS ===

  /**
   * Start the finder with the given query
   * @param {string} query Initial query
   * @returns {Fzf} The current Fzf instance for chaining
   */
  query(query) {
    this.fzf.push("--query", query);
    return this;
  }

  /**
   * Automatically select the only match
   * @returns {Fzf} The current Fzf instance for chaining
   */
  select1() {
    this.fzf.push("--select-1");
    return this;
  }

  /**
   * Exit immediately when there's no match
   * @returns {Fzf} The current Fzf instance for chaining
   */
  exit0() {
    this.fzf.push("--exit-0");
    return this;
  }

  /**
   * Print matches for the initial query and exit
   * @param {string} filter Query string
   * @returns {Fzf} The current Fzf instance for chaining
   */
  filter(filter) {
    this.fzf.push("--filter", filter);
    return this;
  }

  /**
   * Print query as the first line
   * @returns {Fzf} The current Fzf instance for chaining
   */
  printQuery() {
    this.fzf.push("--print-query");
    return this;
  }

  /**
   * Comma-separated list of keys to complete fzf
   * @param {string} keys List of keys
   * @returns {Fzf} The current Fzf instance for chaining
   */
  expect(keys) {
    this.fzf.push("--expect", keys);
    return this;
  }

  // === KEY/EVENT BINDING OPTIONS ===

  /**
   * Custom key/event bindings
   * @param {string} bindings Key/event bindings
   * @returns {Fzf} The current Fzf instance for chaining
   */
  bind(bind) {
    this.fzf.push("--bind", bind);
    return this;
  }

  // === ADVANCED OPTIONS ===

  /**
   * Shell command and flags to start child processes with
   * @param {string} shell Shell command and flags
   * @returns {Fzf} The current Fzf instance for chaining
   */
  withShell(shell) {
    this.fzf.push("--with-shell", shell);
    return this;
  }

  /**
   * Start HTTP server to receive actions
   * @param {string} [addrPort] Optional address and port
   * @returns {Fzf} The current Fzf instance for chaining
   */
  listen(addrPort) {
    if (addrPort) {
      this.fzf.push("--listen", addrPort);
    } else {
      this.fzf.push("--listen");
    }
    return this;
  }

  // === DIRECTORY TRAVERSAL OPTIONS ===

  /**
   * Directory traversal options
   * @param {string} opts Walker options [file][,dir][,follow][,hidden]
   * @returns {Fzf} The current Fzf instance for chaining
   */
  walker(opts) {
    this.fzf.push("--walker", opts);
    return this;
  }

  /**
   * List of directories to walk
   * @param {...string} dirs Directories to walk
   * @returns {Fzf} The current Fzf instance for chaining
   */
  walkerRoot(...dirs) {
    dirs.forEach((dir) => {
      this.fzf.push("--walker-root", dir);
    });
    return this;
  }

  /**
   * Comma-separated list of directory names to skip
   * @param {string} dirs Comma-separated list of directory names
   * @returns {Fzf} The current Fzf instance for chaining
   */
  walkerSkip(dirs) {
    this.fzf.push("--walker-skip", dirs);
    return this;
  }

  // === HISTORY OPTIONS ===

  /**
   * History file
   * @param {string} file Path to history file
   * @returns {Fzf} The current Fzf instance for chaining
   */
  history(file) {
    this.fzf.push("--history", file);
    return this;
  }

  /**
   * Maximum number of history entries
   * @param {number} size Maximum number of history entries
   * @returns {Fzf} The current Fzf instance for chaining
   */
  historySize(size) {
    this.fzf.push("--history-size", String(size));
    return this;
  }
}
