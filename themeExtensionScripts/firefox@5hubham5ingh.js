/*
 For:            Firefox browser
 Author:         https://github.com/5hubham5ingh
 Version:        0.0.1
 Prerequisite:   Firefox addon Foxpanel https://github.com/5hubham5ingh/foxpanel
*/

export function getDarkThemeConf(colors) {
  const theme = generateTheme(colors, true);
  return generateThemeConfig(theme);
}

export function getLightThemeConf(colors) {
  const theme = generateTheme(colors, false);
  return generateThemeConfig(theme);
}

export function setTheme(themeConfigPath) {
  const themeConfigPathCacheFile = STD.open(
    HOME_DIR.concat("/.cache/WallRizz/firefox.txt"),
    "w+",
  );

  themeConfigPathCacheFile.puts(themeConfigPath);
  themeConfigPathCacheFile.flush();
  themeConfigPathCacheFile.close();
}

function generateTheme(colorCodes, isDark = true) {
  const colors = colorCodes.map((c) => Color(c));
  const pickColor = (dark) => {
    const index = colors.findIndex((color) =>
      (dark ?? isDark) ? color.isDark() : color.isLight()
    );

    return index !== -1
      ? colors.splice(index, 1)[0]
      : isDark
      ? Color("black")
      : Color("white");
  };

  const background = pickColor();
  const foreground = pickColor(false);

  // Ensure visibility of colors against the background color
  for (const color of colors) {
    while (!Color.isReadable(color, background)) {
      isDark ? color.saturate(1).brighten(1) : color.desaturate(1).darken(1);
    }
  }

  // Select distinct colors for various UI elements
  const distinctColors = selectDistinctColors(colors, 4);

  return {
    background,
    foreground,
    primary: distinctColors[0],
    secondary: distinctColors[1],
    accent: distinctColors[2],
    highlight: distinctColors[3],
    variant: isDark ? "dark" : "light",
  };
}

function generateThemeConfig(theme) {
  // Create harmonized color variations
  const darkerBg = theme.background.darken();
  const lighterBg = theme.background.lighten();
  const darkerPrimary = theme.primary.darken();
  const lighterPrimary = theme.primary.lighten();

  return JSON.stringify({
    "colors": {
      "accentcolor": theme.background.toHexString(),
      "bookmark_text": theme.foreground.toHexString(),
      "button_background_active": theme.primary.toHexString(),
      "button_background_hover": lighterPrimary.toHexString(),
      "frame": theme.background.toHexString(),
      "frame_inactive": darkerBg.toHexString(),
      "icons": theme.foreground.toHexString(),
      "icons_attention": theme.accent.toHexString(),
      "ntp_background": theme.background.toHexString(),
      "ntp_card_background": lighterBg.toHexString(),
      "ntp_text": theme.foreground.toHexString(),
      "popup": lighterBg.toHexString(),
      "popup_border": theme.primary.toHexString(),
      "popup_highlight": theme.highlight.toHexString(),
      "popup_highlight_text": theme.background.toHexString(),
      "popup_text": theme.foreground.toHexString(),
      "sidebar": lighterBg.toHexString(),
      "sidebar_border": theme.primary.toHexString(),
      "sidebar_highlight": theme.highlight.toHexString(),
      "sidebar_highlight_text": theme.background.toHexString(),
      "sidebar_text": theme.foreground.toHexString(),
      "tab_background_separator": theme.primary.toHexString(),
      "tab_background_text": theme.foreground.toHexString(),
      "tab_line": theme.accent.toHexString(),
      "tab_loading": theme.accent.toHexString(),
      "tab_selected": lighterBg.toHexString(),
      "tab_text": theme.foreground.toHexString(),
      "textcolor": theme.foreground.toHexString(),
      "toolbar": theme.background.toHexString(),
      "toolbar_bottom_separator": theme.primary.toHexString(),
      "toolbar_field": darkerBg.toHexString(),
      "toolbar_field_border": theme.primary.toHexString(),
      "toolbar_field_border_focus": theme.accent.toHexString(),
      "toolbar_field_focus": darkerBg.toHexString(),
      "toolbar_field_highlight": theme.highlight.toHexString(),
      "toolbar_field_highlight_text": theme.background.toHexString(),
      "toolbar_field_separator": theme.primary.toHexString(),
      "toolbar_field_text": theme.foreground.toHexString(),
      "toolbar_field_text_focus": theme.foreground.toHexString(),
      "toolbar_text": theme.foreground.toHexString(),
      "toolbar_top_separator": theme.primary.toHexString(),
      "toolbar_vertical_separator": theme.primary.toHexString(),
    },
    "images": null,
    "properties": {
      "color_scheme": theme.variant,
      "content_color_scheme": theme.variant,
    },
  });
}

function selectDistinctColors(colorObjects, count) {
  // Sort colors by perceived brightness
  const sortedColors = colorObjects.sort((a, b) =>
    a.getBrightness() - b.getBrightness()
  );

  // Select colors with maximum color distance
  const selectedColors = [];
  while (selectedColors.length < count && colorObjects.length > 0) {
    // If first selection, pick from middle of brightness range
    if (selectedColors.length === 0) {
      const midIndex = Math.floor(sortedColors.length / 2);
      selectedColors.push(sortedColors[midIndex]);
      sortedColors.splice(midIndex, 1);
      continue;
    }

    // Find color with maximum distance from previously selected colors
    let maxDistanceColor = null;
    let maxDistance = -1;

    for (let i = 0; i < sortedColors.length; i++) {
      const currentColor = sortedColors[i];
      const minDistance = Math.min(
        ...selectedColors.map((selected) =>
          Color.readability(selected, currentColor)
        ),
      );

      if (minDistance > maxDistance) {
        maxDistance = minDistance;
        maxDistanceColor = currentColor;
      }
    }

    if (maxDistanceColor) {
      selectedColors.push(maxDistanceColor);
      sortedColors.splice(sortedColors.indexOf(maxDistanceColor), 1);
    } else {
      break;
    }
  }

  return selectedColors;
}
