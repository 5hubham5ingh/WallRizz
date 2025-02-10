/*
 For:            Firefox with FoxPanel
 Author:         https://github.com/5hubham5ingh
 Version:        0.0.1
 Description:    Generates base64 wallpaper cache for FoxPanel
*/

let wallpaperMemo;
const getBase64Wallpaper = async (_, wallpaperPath) => {
  if (wallpaperMemo) return wallpaperMemo;
  const base64 = await execAsync(["base64", "-w", 0, wallpaperPath]);
  const extension = wallpaperPath.slice(wallpaperPath.lastIndexOf(".") + 1);
  wallpaperMemo = `data:image/${extension};base64,${base64}`;
  return wallpaperMemo;
};

export const getDarkThemeConf = getBase64Wallpaper;
export const getLightThemeConf = getBase64Wallpaper;

export function setTheme(themeConfigPath) {
  const themeConfigPathCacheFile = STD.open(
    HOME_DIR.concat("/.cache/baremetal/wallpaperPath.txt"),
    "w+",
  );

  themeConfigPathCacheFile.puts(themeConfigPath);
  themeConfigPathCacheFile.flush();
  themeConfigPathCacheFile.close();
}
