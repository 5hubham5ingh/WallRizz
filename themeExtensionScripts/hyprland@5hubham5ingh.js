/*
 For:            Hyprland, https://hyprland.org
 Author:         https://github.com/5hubham5ingh
 Version:        0.0.3
 Prerequisite:   Edit the ~/.config/hypr/hyprland.conf file to add this line at the bottom-
                 source = ~/.config/hypr/WallRizzTheme.conf
*/

function createHyprlandTheme(colors, isDark = true) {
  // Validate input
  if (colors.length < 5) {
    throw new Error("At least 5 colors required for theme generation");
  }

  // Helper to calculate "distance" between colors based on luminance and hue
  const colorDistance = (color1, color2) => {
    const lDiff = color1.getLuminance() - color2.getLuminance();
    const hDiff = Math.min(
      Math.abs((color1.toHsv().h || 0) - (color2.toHsv().h || 0)),
      360 - Math.abs((color1.toHsv().h || 0) - (color2.toHsv().h || 0)),
    );
    return Math.sqrt(lDiff ** 2 + (hDiff / 360) ** 2);
  };

  // Select the most distinct colors
  const selectDistinctColors = (inputColors, targetCount) => {
    const selected = [Color(inputColors[0])];
    const remaining = inputColors.slice(1).map(Color);

    while (selected.length < targetCount && remaining.length > 0) {
      let bestCandidate = null;
      let maxMinDistance = -Infinity;

      for (const candidate of remaining) {
        const minDistance = Math.min(
          ...selected.map((existing) => colorDistance(candidate, existing)),
        );

        if (minDistance > maxMinDistance) {
          maxMinDistance = minDistance;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        selected.push(bestCandidate);
        remaining.splice(remaining.indexOf(bestCandidate), 1);
      }
    }

    return selected;
  };

  // Select five distinct colors, ensuring the count with random additions if necessary
  const distinctColors = selectDistinctColors(colors, 5);
  while (distinctColors.length < 5) {
    distinctColors.push(
      distinctColors[Math.floor(Math.random() * distinctColors.length)]
        .analogous()[5],
    );
  }

  // Map colors for theme properties
  const [
    backgroundSource,
    foregroundSource,
    activeBorder1,
    activeBorder2,
    inactiveBorder,
  ] = distinctColors;

  const adjustBrightness = (color, amount) =>
    isDark ? color.darken(amount) : color.lighten(amount);

  return {
    background: adjustBrightness(backgroundSource, 10).toHexString(),
    foreground: adjustBrightness(foregroundSource, 20).toHexString(),
    activeBorder: [
      activeBorder1.setAlpha(0.7).toHexString(),
      activeBorder2.toHexString(),
    ],
    inactiveBorder: inactiveBorder.toHexString(),
    shadow: backgroundSource.clone().setAlpha(0.4).toHex8String(),
    groupColors: {
      activeGroup: activeBorder1.toHexString(),
      inactiveGroup: activeBorder2.toHexString(),
      lockedActiveGroup: activeBorder1.darken(10).toHexString(),
      lockedInactiveGroup: activeBorder2.darken(10).toHexString(),
    },
    splash: foregroundSource.toHexString(),
  };
}
function createHyprlandConfig(theme) {
  return `
general {
  col.active_border = rgb(${theme.activeBorder[0].substring(1)}) rgb(${theme.activeBorder[1].substring(1)
    }) 45deg
  col.inactive_border = rgb(${theme.inactiveBorder.substring(1)})
}

group {
  col.border_active = rgb(${theme.groupColors.activeGroup.substring(1)})
  col.border_inactive = rgb(${theme.groupColors.inactiveGroup.substring(1)})
  col.border_locked_active = rgb(${theme.groupColors.lockedActiveGroup.substring(1)
    })
  col.border_locked_inactive = rgb(${theme.groupColors.lockedInactiveGroup.substring(1)
    })

  groupbar {
    text_color = rgb(${theme.foreground.substring(1)})
    col.active = rgb(${theme.groupColors.activeGroup.substring(1)})
    col.inactive = rgb(${theme.groupColors.inactiveGroup.substring(1)})
  }
}

misc {
  background_color = rgb(${theme.background.substring(1)})
  col.splash = rgb(${theme.splash.substring(1)})
}`.trim();
}
const getDarkThemeConf = (colors) =>
  createHyprlandConfig(createHyprlandTheme(colors, true));

const getLightThemeConf = (colors) =>
  createHyprlandConfig(createHyprlandTheme(colors, false));

function setTheme(themeConfPath) {
  const oldConfigPath = HOME_DIR.concat(
    "/.config/hypr/WallRizzTheme.conf",
  );
  const oldConfig = STD.open(oldConfigPath, "w+");
  oldConfig.puts(`source = ${themeConfPath}`);
  oldConfig.flush();
  oldConfig.close();
}

export { getDarkThemeConf, getLightThemeConf, setTheme };
