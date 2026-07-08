import { curlRequest } from "../../../qjs-ext-lib/src/curl.js";
import { version } from "../../../qjs-ext-lib/src/version.js";
import { SystemError, OS, execAsync } from "../constants.js";

/**
 * Checks for updates and initiates the update process if a newer version is available.
 * @returns {Promise<void>}
 */
export async function checkForUpdate() {
  const latest = await curlRequest("https://api.github.com/repos/5hubham5ingh/WallRizz/releases/latest");
  const newVersionDownloadUrl = latest.assets[0].browser_download_url;
  const latestVersion = newVersionDownloadUrl.split("/").at(-2).slice(1);
  if (!version.isSemver(latestVersion)) throw Error("Error: Failed to parse version for the latest release from GitHub. Unexpected format detected.");
  print("Detected latest available version: ", latestVersion);
  const currentVersion = await execAsync("WallRizz --version").catch(e => {
    throw new SystemError("WallRizz not found.", "It seems WallRizz is not installed or not in your system's PATH. Please install it first or ensure it's accessible.");
  });
  if (!version.isSemver(currentVersion)) throw Error("Error: Failed to parse the currently installed WallRizz version. Please check your installation.");
  print("Currently installed WallRizz version: ", currentVersion);

  if (version.gt(currentVersion, latestVersion)) {
    print("An update is available! Initiating WallRizz update process...");
    const installationDir = (await execAsync("whereis WallRizz"))?.split(" ")[1]?.trim();
    print("Identified current WallRizz installation path: ", installationDir);
    const newReleasePackageName = newVersionDownloadUrl.split('/').at(-1);
    const packageDestinationDir = OS.getcwd()[0] + "/" + "WallRizz.tar";
    print(`Downloading new release package: '${newReleasePackageName}' to temporary location: '${packageDestinationDir}' (saved as 'WallRizz.tar'). This might take a moment...`);
    if (OS.exec(["curl", "-o", packageDestinationDir, "-L", newVersionDownloadUrl])) {
      throw new SystemError("Download failed.", "Failed to download the new WallRizz release package.", " Please ensure 'curl' is installed on your system and you have an active internet connection.");
    }
    print("Download complete. Package saved successfully.");

    print("Unpacking the new WallRizz release package...");
    if (OS.exec(["tar", "-xzf", 'WallRizz.tar'])) {
      throw new SystemError("Extraction failed.", "Failed to extract the downloaded WallRizz archive.", " Please ensure 'tar' is installed and available in your system.");
    }
    print("Package unpacked successfully.");

    print("Cleaning up: Removing the downloaded release package...");
    OS.remove(packageDestinationDir);
    print("Temporary package file removed.");

    print("Moving the new WallRizz binary to its installation directory...");
    if (OS.rename("WallRizz", installationDir)) {
      throw new SystemError(`Installation failed.`, `Failed to move the new WallRizz executable to '${installationDir}'.`, ` This usually happens due to insufficient permissions. Please try running 'sudo mv WallRizz ${installationDir}' manually for a system-wide installation, or ensure your user has write access to the directory.`);
    }
    print("WallRizz update completed successfully!");
  } else {
    print("WallRizz is already at the latest version. No update needed at this time.");
  }
}
