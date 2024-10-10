import { Curl } from "../justjs/src/curl.js";
import { ensureDir } from "../justjs/src/fs.js";
import { exec as execAsync } from "../justjs/src/process.js";
import utils from "./utils.js";

/**
 * @typedef {import('./types.d.ts').ApiCache} ApiCache
 * @typedef {import('./types.d.ts').DownloadItemList} DownloadItemList
 */

export default class Download {
  /**
   * @param {string[]} sourceRepoUrls
   * @param {string} destinationDir
   */
  constructor(sourceRepoUrls, destinationDir) {
    this.destinationDir = destinationDir;
    this.sourceRepoUrls = sourceRepoUrls.map(Download.ensureGitHubApiUrl);

    /** @type {DownloadItemList} */
    this.downloadItemList = [];

    this.apiCacheFilePath = `${HOME_DIR}/.cache/WallWiz/apiCache.json`;

    try {
      ensureDir(this.destinationDir);
      const apiCacheFile = STD.loadFile(this.apiCacheFilePath);
      /** @type {ApiCache} */
      this.apiCache = apiCacheFile ? JSON.parse(apiCacheFile) : [];
    } catch (error) {
      print("Error initializing Download:");
      throw error;
    }
  }

  /**
   * Fetch data from a URL with caching support
   * @param {string} url
   * @param {Object} [headers]
   * @returns {Promise<any>}
   */
  async fetch(url, headers = {}) {
    const upsertCache = (updatedData) => {
      const index = this.apiCache.findIndex((cache) =>
        cache.url === updatedData.url
      );
      if (index !== -1) {
        this.apiCache[index] = updatedData;
      } else {
        this.apiCache.push(updatedData);
      }
      utils.writeFile(JSON.stringify(this.apiCache), this.apiCacheFilePath);
    };

    const currentCache = this.apiCache.find((cache) => cache.url === url) ||
      { url };

    const curl = new Curl(url, {
      parseJson: true,
      headers: {
        "if-none-match": currentCache.etag,
        Authorization: USER_ARGUMENTS.githubApiKey
          ? `token ${USER_ARGUMENTS.githubApiKey}`
          : null,
        ...headers,
      },
    });

    try {
      await curl.run();
    } catch (error) {
      print("Failed to fetch data:");
      throw error;
    }

    if (curl.statusCode === 304) {
      return currentCache.data;
    }

    if (curl.failed) {
      utils.error("Curl Error:", curl.error);
    }

    currentCache.etag = curl.headers.etag;
    currentCache.data = curl.body;
    upsertCache(currentCache);
    return curl.body;
  }

  /**
   * Fetch item list from all source repositories
   * @returns {Promise<DownloadItemList>}
   */
  async fetchItemListFromRepo() {
    const responses = await Promise.all(
      this.sourceRepoUrls.map((url) => this.fetch(url)),
    );

    return responses.reduce((acc, itemList) => {
      if (Array.isArray(itemList)) {
        Array.prototype.push.apply(acc, itemList);
      } else {
        utils.notify("Invalid item list received:", itemList, "critical");
      }
      return acc;
    }, []);
  }

  /**
   * Download items to the destination directory
   * @param {DownloadItemList} [itemList]
   * @param {string} [destinationDir]
   */
  async downloadItemInDestinationDir(
    itemList = this.downloadItemList,
    destinationDir = this.destinationDir,
  ) {
    const fileListForCurl = [];

    for (const item of itemList) {
      fileListForCurl.push([
        item.downloadUrl,
        `${destinationDir}/${item.name}`,
      ]);
    }

    try {
      await execAsync(Download.generateCurlParallelCommand(fileListForCurl));
    } catch (error) {
      utils.error("Download failed:", error);
    }
  }

  /**
   * Generate curl command for parallel downloads
   * @param {Array<[string, string]>} fileList
   * @returns {string}
   */
  static generateCurlParallelCommand(fileList) {
    const escapedFileList = fileList.map(([sourceUrl, destPath]) => [
      sourceUrl.replace(/(["\s'$`\\])/g, "\\$1"),
      destPath.replace(/(["\s'$`\\])/g, "\\$1"),
    ]);

    return "curl --parallel --parallel-immediate " +
      escapedFileList.map(([sourceUrl, destPath]) =>
        `-o "${destPath}" "${sourceUrl}"`
      ).join(" ");
  }

  /**
   * Ensure the given URL is a valid GitHub API URL
   * @param {string} gitHubUrl
   * @returns {string}
   */
  static ensureGitHubApiUrl(gitHubUrl) {
    const apiUrlRegex =
      /^https:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/contents\/(.+)(\?ref=.+)?$/;
    if (apiUrlRegex.test(gitHubUrl)) {
      return gitHubUrl;
    }

    const githubRegex =
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)(\/(.+))?/;
    const match = gitHubUrl.match(githubRegex);

    if (!match) {
      utils.error(`Invalid GitHub URL format`, gitHubUrl);
    }

    const [, owner, repo, branch, , directoryPath = ""] = match;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${directoryPath}?ref=${branch}`;
  }
}
