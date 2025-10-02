/**
 * UserArguments represents the user configuration and options for the wallpaper management system.
 * This includes preferences for wallpaper directories, random wallpaper settings, image sizes, and more.
 */
export type UserArguments = {
  /** Directory path where wallpapers are stored */
  wallpapersDirectory: string;

  /** Whether to set a random wallpaper from the directory */
  setRandomWallpaper: boolean;

  /** The size of the wallpaper image in pixels as [width, height] */
  imageSize: [number, number];

  /** Enable or disable light theme support */
  enableLightTheme: boolean;

  /** Padding in pixels around the wallpaper image as [horizontal, vertical] */
  padding: [number, number];

  /** Enable or disable pagination when browsing wallpapers */
  enablePagination: boolean;

  /** Size of the wallpaper grid display as [columns, rows] */
  gridSize: [number, number];

  /** Download additional scripts to support theme extensions */
  downloadThemeExtensionScripts: boolean;

  /** Set color extraction backend command */
  colorExtractionCommand: string;

  /** Preview extracted colours pallete */
  previewMode: "list" | "grid";

  /** Highlight mode on focus */
  highlight: "border" | "fill";

  /** Set wallpaper on focus */
  onFocus: boolean;

  /** Download a script to manage wallpaper daemon handlers */
  downloadWallpaperDaemonHandlerScript: boolean;

  /** Whether to allow browsing wallpapers from online repositories */
  browseWallpaperOnline: boolean;

  /** List of URLs to wallpaper repositories */
  wallpaperRepositoryUrls: string[];

  /** GitHub API key for downloading wallpapers from repositories */
  githubApiKey: string;

  /** Show a key map for navigating wallpapers */
  showKeyMap: boolean;

  /** Disable system notifications */
  disableNotification: boolean;

  /** Disable automatic scaling of wallpapers to screen size */
  disableAutoScaling: boolean;

  /** Set daemon mode to randomly apply wallpaper at set intervel */
  setInterval: number;

  /** Set a callback function to conditionally modify the arguments at setInterval */
  setIntervalCallback: () => void | Promise<null>;

  /** Hold, i.e. Do not quit the app after applying wallpaper. */
  hold: boolean;

  /** Limit the number of processes used for downloading wallpapers */
  processLimit: number;

  /** Enable verbose error log for inspection. */
  inspection: boolean;

  /** Test entensions */
  test: boolean;

  /** Run update **/
  update: boolean
};

/**
 * ColoursCache represents a cached map of wallpaper unique IDs to an array of color strings.
 * Each unique wallpaper ID corresponds to its associated color scheme.
 */
export type ColoursCache = {
  [uid: string]: string[];
};

/**
 * DownloadItemMenu defines a list of downloadable items, including details such as the name, description, and URL.
 * Optionally, a temporary file location can be specified.
 */
export type DownloadItemMenu = {
  /** Name of the downloadable item */
  name: string;

  /** Description or additional details about the item */
  about: string;

  /** URL where the item can be downloaded */
  downloadUrl: string;

  /** Optional temporary file path where the item is stored during download */
  tmpFile?: string;
}[];

/**
 * ApiCache represents a cache for API requests, storing the URL, ETag for caching, and associated data.
 */
export type ApiCache = {
  /** The URL of the cached API request */
  url: string;

  /** ETag used for cache validation */
  etag: string;

  /** The data retrieved from the API request */
  data: object;
}[];

/**
 * DownloadItemList is a list of downloadable wallpapers, including their name and download URL.
 */
export type DownloadItemList = {
  /** Name of the downloadable wallpaper */
  name: string;

  /** URL where the wallpaper can be downloaded */
  downloadUrl: string;
}[];

/**
 * WallpapersList is a list of wallpapers with unique identifiers.
 */
export type WallpapersList = {
  /** Name of the wallpaper */
  name: string;

  /** Unique identifier for the wallpaper */
  uniqueId: string;
}[];

declare global {
  const USER_ARGUMENTS: UserArguments;
}
