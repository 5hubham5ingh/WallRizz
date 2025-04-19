/*
 For:            hyprpaper, https://github.com/hyprwm/hyprpaper
 Author:         https://github.com/5hubham5ingh
 Prerequisite:   hyprpaper daemon should be running
*/

export function setWallpaper(wallpaperPath) {
  OS.exec(["hyprctl", "-q", "hyprpaper unload all"]);
  OS.exec(["hyprctl", "-q", `hyprpaper preload ${wallpaperPath}`]);
  OS.exec(["hyprctl", "-q", `hyprpaper wallpaper ,${wallpaperPath}`]);
}
