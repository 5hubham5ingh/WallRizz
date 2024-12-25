/*
 For:            Visual studio code
 Author:         https://github.com/5hubham5ingh
 Prerequisite:   Installed and enabled WallRizz-theme in vscode from vscode marketplace.
 Version:        1.0.0
 */

function generateTheme(colors, isDark) {
  const sortedColors = colors.sort((a, b) => {
    const la = Color(a).getLuminance();
    const lb = Color(b).getLuminance();
    return isDark ? la - lb : lb - la;
  });

  const background = sortedColors[0];
  const foreground = sortedColors[colors.length - 1];

  const midIndex = Math.floor(sortedColors.length / 2);
  const selection = sortedColors[midIndex];
  const cursor = isDark
    ? sortedColors[Math.floor(midIndex / 2)]
    : sortedColors[Math.floor(midIndex * 1.5)];

  const black = isDark
    ? sortedColors[1]
    : sortedColors[sortedColors.length - 2];
  const white = isDark
    ? sortedColors[sortedColors.length - 2]
    : sortedColors[1];

  return Object.assign(
    {
      background,
      foreground,
      selection,
      cursor,
      black,
      white,
    },
    ...sortedColors.filter(
      (color) =>
        color !== selection ||
        color !== cursor,
    )
      .map((color, i) => ({
        [`color${i + 1}`]: adjustColorForReadability(background, color),
      })),
  );
}

function adjustColorForReadability(background, foreground) {
  const fg = Color(foreground);
  while (!Color.isReadable(background, foreground)) {
    fg.brighten(1).saturate(1);
    const hex = fg.toHex();
    if (hex === "000000" || hex === "ffffff") {
      return Color(foreground).brighten().saturate().toHexString();
    }
  }

  return fg.toHexString();
}

function generateThemeConfig(theme, isDark) {
  const vscodeTheme = {
    "name": "WallWiz Theme",
    "semanticHighlighting": true,
    "colors": {
      // General
      "editor.background": isDark
        ? Color(theme.background).darken().toHexString()
        : Color(theme.background).lighten().toHexString(),
      "editor.foreground": theme.foreground,
      "textLink.foreground": "#569cd6",
      "textLink.activeForeground": "#569cd6",
      "editor.selectionForeground": theme.foreground,
      "editorCursor.foreground": theme.cursor,

      // Title Bar
      "titleBar.activeBackground": theme.background,
      "titleBar.activeForeground": theme.foreground,
      "titleBar.inactiveBackground": Color(theme.background).lighten()
        .toHexString(),
      "titleBar.inactiveForeground": Color(theme.foreground).lighten()
        .toHexString(),

      // Side Bar
      "sideBar.background": theme.black,
      "sideBar.foreground": theme.foreground,

      // Status bar
      "statusBar.background": theme.background,
      "statusBar.foreground": theme.foreground,
      "statusBar.debuggingBackground": Color(theme.background).brighten()
        .saturate()
        .toHexString(),
      "statusBar.debuggingForeground": Color(theme.foreground).brighten()
        .saturate()
        .toHexString(),
      "statusBar.border": "#000",

      // Activity bar
      "activityBar.background": theme.background,
      "activityBar.foreground": theme.foreground,
      "activityBar.activeBorder": Color(theme.background).brighten()
        .toHexString(),
      "activityBar.inactiveForeground": Color(theme.foreground).lighten()
        .toHexString(),
      "activityBar.activeFocusBorder": theme.white,
      "activityBar.border": theme.black,

      // Remove borders
      "tab.border": "#00000000",
      "sideBar.border": "#00000000",
      "panel.border": "#00000000",
      "titleBar.border": "#00000000",
      "focusBorder": "#00000000",
      "window.activeBorder": "#00000000",
      "contrastBorder": "#00000000",

      // Set borders to white (unless covered by another section)
      "button.border": theme.white,
      "input.border": theme.white,
      "dropdown.border": theme.white,
      "editor.lineHighlightBorder": theme.white,
      "editor.selectionBackground": theme.white,
      "editor.findMatchHighlightBorder": theme.white, // another way to show would be nice

      // Panel
      "panelTitle.inactiveForeground": theme.white,
      "panelTitle.activeForeground": theme.white,

      // Badges
      "activityBarBadge.background": theme.white,
      "activityBarBadge.foreground": theme.black,
      "badge.background": theme.white,
      "badge.foreground": theme.black,

      // List
      "list.activeSelectionIconForeground": theme.background,
      "list.focusHighlightForeground": theme.foreground,
      "list.activeSelectionBackground": theme.white,
      "list.activeSelectionForeground": theme.background,
      "list.dropBackground": theme.white,
      "list.focusBackground": theme.white,
      "list.focusForeground": theme.black,
      "list.highlightForeground": theme.background,
      "list.hoverBackground": theme.white,
      "list.hoverForeground": theme.black,
      "list.inactiveSelectionBackground": theme.background,
      "list.inactiveSelectionForeground": theme.foreground,
      "list.inactiveSelectionIconForeground": theme.black,
      "list.matchHighlightBackground": theme.cursor,
      "list.matchHighlightForeground": theme.black,
      "list.selectionBackground": theme.white,
      "list.selectionForeground": theme.black,
      "list.selectionIconForeground": theme.black,
      "list.warningForeground": theme.cursor,

      // Inlay type inferences
      "editorInlayHint.background": "#000",
      "editorInlayHint.foreground": Color(theme.color1).lighten().toHexString(),

      // Editor tabs
      "tab.inactiveBackground": theme.black,
      "tab.inactiveForeground": theme.foreground,
      "tab.activeBackground": theme.background,
      "tab.activeForeground": theme.foreground,
      "tab.activeBorder": "#000",
      "editorGroupHeader.tabsBackground": theme.black,
      "sideBySideEditor.horizontalBorder": theme.black,
      "sideBySideEditor.verticalBorder": theme.black,

      // Errors
      "editorWarning.background": "#ffb51669",
      "editorError.background": "#ff000069",

      // Line nums
      "editorLineNumber.activeForeground": theme.background,
      "editorLineNumber.foreground": theme.foreground,

      // Peek view
      "peekView.border": theme.background,
      "peekViewEditor.background": theme.black,
      "peekViewResult.background": theme.background,
      "peekViewTitle.background": theme.background,
      "peekViewEditor.matchHighlightBackground": theme.white,
      "peekViewTitleDescription.foreground": theme.foreground,

      // Menu bar
      "menubar.selectionForeground": "#000",
      "menubar.selectionBackground": "#fff",
      "menu.border": "#000",

      // Notifications center
      "notificationCenter.border": "#fff",
      "notificationCenterHeader.background": "#000",
      "notificationCenterHeader.foreground": "#fff",

      // Notifications
      "notifications.background": theme.background,
      "notifications.foreground": theme.foreground,

      // Quick picker
      "quickInput.background": "#000",
      "quickInput.foreground": "#fff",
      "quickInputList.focusBackground": "#fff",
      "quickInputList.focusForeground": "#000",
      "quickInputList.focusIconForeground": "#000",
      "pickerGroup.border": "#fff",

      // Symbol icons (outline, breadcrumbs, suggest)
      "symbolIcon.classForeground": "#4EC9B0",
      "symbolIcon.structForeground": "#4EC9B0",
      "symbolIcon.enumeratorForeground": "#4EC9B0",
      "symbolIcon.enumeratorMemberForeground": "#9CDCFE",
      "symbolIcon.constantForeground": "#9CDCFE",
      "symbolIcon.moduleForeground": "#fff",
      "symbolIcon.functionForeground": "#FFEC8B",
      "symbolIcon.methodForeground": "#FFEC8B",
      "symbolIcon.objectForeground": "#F1644B", // impl block
      "symbolIcon.typeParameterForeground": "#4EC9B0",

      // Scrollbar
      "scrollbarSlider.background": "#ffffff69",
      "scrollbarSlider.hoverBackground": "#fff",
      "scrollbarSlider.activeBackground": "#fff",

      // Settings
      "keybindingTable.rowsBackground": "#000",
      "keybindingLabel.bottomBorder": "#000",

      // Keybinding label colors
      "keybindingLabel.foreground": "#000",
      "keybindingLabel.background": "#fff",
      "keybindingLabel.border": "#fff",

      // Terminal
      "terminal.findMatchBackground": "#fff",
      "terminal.findMatchHighlightBorder": "#ffffff69",
      "terminal.selectionForeground": "#000",
      "terminal.selectionBackground": "#fff",
      "terminal.foreground": "#fff",
      "terminal.background": "#000",

      // Widgets
      "editorWidget.border": "#fff",
      "editorWidget.background": "#000",
      "editorHoverWidget.background": "#000",
      "editorHoverWidget.foreground": "#fff",
      "editorHoverWidget.border": "#fff",

      // Jupyter
      "notebook.cellBorderColor": "#ffffff69",
      "notebook.focusedEditorBorder": "#fff",
      "notebook.outputContainerBorderColor": "#ffffff69",
    },
    "tokenColors": [
      {
        "scope": [
          "",
          "meta.selector",
          "keyword",
          "keyword.other",
          "keyword.control.directive",
          "punctuation.section.directive",
        ],
        "settings": {
          "foreground": theme.color1,
          "fontStyle": "bold",
        },
      },
      {
        "scope": [
          "keyword.operator.quantifier.regexp",
          "punctuation.definition.tag",
          "keyword.control",
          "punctuation.separator",
          "punctuation.terminator",
          "punctuation.accessor",
          "punctuation.bracket",
          "punctuation.section",
        ],
        "settings": {
          "foreground": theme.color2,
        },
      },
      {
        "scope": [
          "support.other.escape.special.regexp",
          "constant.character.escape.regexp",
          "constant.language",
          "meta.preprocessor",
          "constant.other.placeholder",
          "constant.character",
          "keyword.other.special-method",
        ],
        "settings": {
          "foreground": theme.color3,
        },
      },
      {
        "scope": [
          "meta.character.set.regexp",
          "meta.preprocessor.string",
          "string.regexp",
          "constant.character.escape",
          "constant.other.character-class.regexp",
        ],
        "settings": {
          "foreground": theme.color4,
        },
      },
      {
        "scope": [
          "meta.function.decorator.python",
          "entity.name.function.decorator.python",
          "source.css entity.other.attribute-name",
          "source.css.less entity.other.attribute-name.id",
          "source.scss entity.other.attribute-name",
          "meta.preprocessor.numeric",
          "keyword.operator",
          "keyword.control.conditional",
          "keyword.operator.logical",
          "keyword.operator.comparison",
        ],
        "settings": {
          "foreground": theme.color5,
          "fontStyle": "italic",
        },
      },
      {
        "scope": [
          "meta.attribute",
          "meta.item-access",
          "meta.structure.dictionary.key.python",
          "invalid",
          "variable",
          "meta.definition.variable.name",
          "support.variable",
          "entity.name.variable",
          "variable.parameter",
          "variable.other",
          "variable.language",
        ],
        "settings": {
          "foreground": theme.color6,
        },
      },
      {
        "scope": [
          "meta.function-call",
          "storage",
          "markup.heading",
          "keyword.other.unit",
          "meta.object-literal.key",
          "meta.object-literal.key entity.name.function",
          "entity.name.function.call",
          "support.function",
        ],
        "settings": {
          "foreground": theme.background,
        },
      },
      {
        "scope": [
          "meta.diff.header",
          "markup.inserted",
          "storage.type",
          "support.constant.property-value",
          "support.constant.font-name",
          "support.constant.media-type",
          "support.constant.media",
          "constant.other.color.rgb-value",
          "constant.other.rgb-value",
          "support.constant.color",
          "storage.type.primitive",
        ],
        "settings": {
          "foreground": theme.white,
        },
      },
      {
        "scope": [
          "markup.deleted",
          "storage.modifier",
          "constant.sha.git-rebase",
          "keyword.control.flow",
          "keyword.control.import",
        ],
        "settings": {
          "foreground": theme.color9,
        },
      },
      {
        "scope": [
          "markup.changed",
          "string",
          "storage.modifier.import.java",
          "variable.language.wildcard.java",
          "storage.modifier.package.java",
          "string.quoted",
          "string.interpolated",
          "string.template",
        ],
        "settings": {
          "foreground": theme.color10,
        },
      },
      {
        "scope": [
          "constant.numeric",
          "constant.other.color.rgb-value",
          "constant.other.rgb-value",
          "support.constant.color",
          "string.tag",
          "variable.language.this",
          "constant.language.boolean",
          "constant.language.null",
        ],
        "settings": {
          "foreground": theme.color11,
        },
      },
      {
        "scope": [
          "entity.name.tag",
          "string.value",
          "entity.name.function",
          "support.function",
          "support.constant.handlebars",
          "meta.function.identifier",
        ],
        "settings": {
          "foreground": theme.foreground,
        },
      },
      {
        "scope": [
          "entity.name.tag.css",
          "punctuation.definition.template-expression.begin.js",
          "punctuation.definition.template-expression.begin.ts",
          "punctuation.definition.template-expression.end.ts",
          "punctuation.definition.template-expression.end.js",
          "meta.return-type",
          "support.class",
          "support.type",
          "entity.name.type",
          "entity.name.class",
          "source.cs storage.type",
          "storage.type.class",
          "storage.type.function",
        ],
        "settings": {
          "foreground": theme.color13,
        },
      },
      {
        "scope": [
          "entity.other.attribute-name",
          "support.type.vendored.property-name",
          "support.type.property-name",
          "variable.css",
          "variable.scss",
          "variable.other.less",
          "meta.type.cast.expr",
          "meta.type.new.expr",
          "support.constant.math",
          "support.constant.dom",
          "support.constant.json",
          "entity.other.inherited-class",
          "support.type.property-name.json",
        ],
        "settings": {
          "foreground": theme.color14,
        },
      },
      {
        "scope": [
          "mutable",
          "storage.modifier.mut",
          "emphasis",
          "strong",
          "markup.underline",
          "markup.bold",
          "markup.italic",
        ],
        "settings": {
          "fontStyle": "underline bold italic",
        },
      },
      {
        "scope": [
          "comment",
          "string.quoted.docstring",
          "comment.line",
          "comment.block",
        ],
        "settings": {
          "foreground": "#292826",
        },
      },
    ],
  };

  return JSON.stringify(vscodeTheme);
}

function getDarkThemeConf(colors) {
  const theme = generateTheme(colors, true);
  return generateThemeConfig(theme, true);
}

function getLightThemeConf(colors) {
  const theme = generateTheme(colors, false);
  return generateThemeConfig(theme, false);
}

function setTheme(
  themeConfPath,
) {
  const config = STD.loadFile(themeConfPath);
  const themeDir =
    "/.vscode/extensions/ssdev.wallrizz-theme-0.0.6/themes/wallrizz-theme.json";
  const vscodeThemeFile = STD.open(
    HOME_DIR.concat(themeDir),
    "w",
  );
  if (!vscodeThemeFile) return;
  vscodeThemeFile.puts(config);
  vscodeThemeFile.close();
}

export { getDarkThemeConf, getLightThemeConf, setTheme };
