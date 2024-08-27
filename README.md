# WallWiz

WallWiz (wallpaper wizard) let you select a wallpaper from a grid menu displayed in a terminal emulator (Kitty) and apply not only the wallpaper but also dynamically generated themes to various applications, including terminal emulators and window managers.

## Features

- **Wallpaper Selection**: Choose your wallpaper from a grid menu in the terminal.
- **Theme Generation and Application**: Automatically generates and applies themes based on the chosen wallpaper to applications such as Kitty terminal and Hyprland window manager.
- **Extensible with Scripts**: You can write custom scripts in JavaScript for theme generation and wallpaper application, placed in `~/.config/WallWiz/`.

## Prerequisites

- **Kitty terminal**: For displaying the wallpaper grid in the terminal.
- **ImageMagick**: For generating color themes.
- **Extension scripts**: For setting the wallpaper and themes. You can use your own or download the available script from here 1 2.

## Installation

### Option 1: Download Executable

You can download the executable binary from the [GitHub releases](https://github.com/5hubham5ingh/WallWiz/releases) page.

### Option 2: Build from Source

1. Clone the required library:
   ```bash
   git clone https://github.com/5hubham5ingh/justjs.git

3. Clone the project repository:
   ```bash
   git clone https://github.com/5hubham5ingh/WallWiz.git

3. Get the qjsc compiler source, build, and install it:
   ```bash
   git clone https://github.com/bellard/quickjs.git &&
   cd quickjs &&
   make &&
   sudo make install 

5. Build WallWiz:
   ```bash
   cd WallWiz
   qjsc main.js -o WallWiz

7. Install WallWiz:
   ```bash
   sudo cp WallWiz /usr/bin/

## Usage

| **Option**         | **Description**                                                                                     |
|--------------------|-----------------------------------------------------------------------------------------------------|
| `--wall-dir`, `-d` | Specifies the directory containing wallpapers.                                                      |
| `--random`, `-r`   | Applies a random wallpaper from the specified directory.                                             |
| `--img-size`, `-s` | Sets the size of wallpaper previews in `WIDTHxHEIGHT` format (e.g., `60x20`).                        |
| `--light-theme`, `-l` | Enables a light theme for the generated configuration.                                            |
| `--padding`, `-p`  | Defines padding around previews in `V_PADDINGxH_PADDING` format (e.g., `2x1`).                       |
| `--auto-resize`, `-a` | Automatically resizes the terminal window to fit all wallpaper previews.                           |

## Custom Scripts and Extensions

WallWiz's functionality can be extended through user-defined JavaScript scripts:

- **Theme Extension Scripts**: Located in `~/.config/WallWiz/themeExtensionScripts/`, these scripts are responsible for generating and applying themes. Each script should export a default class with a constructor and two methods: 
  - `setTheme(filepath, execAsync)`: Applies the theme based on the generated configuration file and uses the provided `execAsync` function for asynchronous command execution.
  - `getThemeConf(colorHexArray)`: Generates a theme configuration file from an array of colors and returns it as a string.
  
- **Wallpaper Daemon Handler**: The script located in `~/.config/WallWiz/wallpaperDaemonHandler.js` should also export a default class with a mandatory `setWallpaper(wallpaperPath, execAsync)` method to apply the selected wallpaper. This script also receives the `os` and `std` modules from QuickJS for system-level operations.

Prewritten extensions can be downloaded from the project's GitHub repository.

## Contributing

Contributions are welcome! Feel free to submit pull requests to extend the functionality of WallWiz.

## Future Plans

- Add support for swww as an alternative wallpaper setter

## License

This project is licensed under the [MIT License](LICENSE).
      
