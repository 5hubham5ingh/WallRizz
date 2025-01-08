Contributions are always welcome! Feel free to submit a pull request, on dev branch, to improve WallRizz by adding extension scripts, wallpapers, or refining the core code.

## Extension Scripts

- **Naming Convention:**  
  When adding a new extension, name the script after the program it supports, followed by your GitHub username to ensure uniqueness. You may optionally add a descriptive tag after the program name. If you are improving an existing extension, ensure the name aligns with the default ones.  
  **Syntax:** `programName[_optionalTag]@userName.js`  
  **Example:**  
  - For a new extension: `kittyTerminalEmulator_material_theme@5hubham5ingh.js`  
  - For improving an existing extension: `kittyTerminalEmulator@5hubham5ingh.js`

- **Directory Structure:**  
  - **Theme Extensions:**  
    Theme-related extensions should be placed in the [themeExtensionScripts](https://github.com/5hubham5ingh/WallRizz/tree/main/themeExtensionScripts) directory.  
    These scripts are responsible for generating and applying application's theme.
    Example: `kittyTerminalEmulator_material_theme@5hubham5ingh.js`
    
  - **Wallpaper Handler Scripts:**  
    Wallpaper daemon handler scripts should go in the [wallpaperDaemonHandlerScripts](https://github.com/5hubham5ingh/WallRizz/tree/main/wallpaperDaemonHandlerScripts) directory.  
    These scripts manage the handling of wallpaper-related tasks, such as changing wallpapers or managing their configurations.  
    Example: `swww@5hubham5ingh.js`

- **Script Header:**  
  At the beginning of the script, include information about its purpose, author, version, and prerequisites.  
  **Example:**  
  ```javascript
  /*
   For:            Kitty terminal emulator, https://sw.kovidgoyal.net/kitty/
   Author:         https://github.com/5hubham5ingh
   Version:        0.0.1
   Prerequisite:   For this script to work, enable remote control in the kitty terminal.
                   To enable remote control, start kitty with allow_remote_control=yes.
                   Example: kitty allow_remote_control=yes
  */
  ```
- **Script Guidelines:**  
  For details on how to write and structure your extension scripts, including the required functions and example implementations, please refer to the [Extension Writing Guide](https://github.com/5hubham5ingh/WallRizz/wiki/4.-Extensions#2-user-defined-extensions).

---

## Wallpapers

You can contribute wallpapers in two ways:

1. **Upload Your Wallpaper:**  
   - Upload your wallpaper images directly to [wallpaper's](https://github.com/5hubham5ingh/WallRizz/tree/wallpapers) repository.  
   - **Naming Convention:** Use descriptive names with underscores (`_`) to separate words for better searchability.  
     **Example:** `sunset_over_mountains_skyline.jpg`  
   - **Optional:** Include the artist's name in the file name if known.  
     **Example:** `sunset_over_mountains_skyline_john_doe.jpg`  

2. **Share Your Wallpaper Repository:**  
   - If you maintain a separate wallpaper collection, list the URL of your repository in the **Wallpaper Repositories** section below.

## Wallpaper Repositories

If you maintain a GitHub repository for wallpaper collections, you can add it to this list for others to explore:

1. [**Aesthetic Wallpapers by D3Ext**](https://github.com/D3Ext/aesthetic-wallpapers)  
2. [**Aesthetic Wallpapers by ronit18**](https://github.com/ronit18/Asthetic-Wallpapers)  
3. [**dh-wallpapers**](https://github.com/danihek/dh-wallpapers)
4. [**Axenide's collection**](https://github.com/Axenide/wallpapers)

In order to browse wallpapers from these repositories, run
```bash
WallRizz -u "url1 ; url2 ; url3"
```
**Note:** You should add a Github api key in WallRizz otherwise github limits api calls to fetch and preview wallpapers from the repositories.

Feel free to contribute additional wallpaper repositories by creating a pull request!

## Naming Conventions

- **Descriptive Names:**  
  Use clear and descriptive file names that reflect the content of the wallpaper.  
  **Bad Example:** `wallpaper1.jpg`  
  **Good Example:** `city_night_lights.jpg`  

- **Artist Credit (Optional):**  
  Append the artist’s name to the file name if known.  
  **Example:** `beach_sunset_jane_doe.jpg`  

- **Undisclosed Artist:**  
  If you don’t know the artist, that’s fine! However, if you are the artist or know the creator, please provide proper attribution.

## Artist Credits

If you are an artist whose work is included in this repository without proper credit, **please contact us** so we can add your name.  

We respect the work of all artists, and proper attribution is a priority. Reach out via [issues](https://github.com/5hubham5ingh/WallRizz/issues) or submit a pull request with the correct details.

## License

When uploading wallpapers, please ensure:  
- You own the work or have the proper license to share it.  
- You comply with the original artist’s licensing terms if using third-party content.  

By contributing, you affirm that your submissions respect the rights of the original creators.
