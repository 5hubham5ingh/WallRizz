const SupportedImageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
const WallpaperRepoUrls = [
  "https://api.github.com/repos/5hubham5ingh/WallWiz/contents/?ref=wallpapers",
  "https://api.github.com/repos/D3Ext/aesthetic-wallpapers/contents/?ref=main",
  "https://api.github.com/repos/ronit18/Asthetic-Wallpapers/contents/?ref=main",
  "https://api.github.com/repos/danihek/dh-wallpapers/contents/?ref=main",
  "https://api.github.com/repos/Axenide/wallpapers/contents/?ref=main",
  "https://api.github.com/repos/JoydeepMallick/Wallpapers/contents/?ref=main",
];

document.addEventListener("DOMContentLoaded", () => {
  const imageGrid = document.querySelector(".image-grid");
  // Global variables
  let count = 0;
  let imageUrls = [];
  let observer = null;
  let lastObservedElement = null; // Track the last observed element
  const imagesPerLoad = 4;
  // Function to fetch image URLs from API
  async function fetchImageUrls(repoUrl) {
    try {
      const response = await fetch(repoUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();

      return data
        .filter((item) => item.download_url) // Ensure download_url exists
        .map((item) => item.download_url)
        .filter((url) =>
          SupportedImageExtensions.some((ext) =>
            url.toLowerCase().endsWith(`.${ext}`)
          )
        );
    } catch (error) {
      console.error(`Error fetching from ${repoUrl}:`, error);
      return [];
    }
  }
  // Function to create image elements with loading indicator
  function createImageElement(url) {
    if (!url) return null;

    const container = document.createElement("div");

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Wallpaper";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.display = "none";

    img.onload = () => {
      img.style.display = "block";
    };

    img.onerror = () => {
      img.alt = "Failed to load image";
      img.style.display = "block";
    };

    container.appendChild(img);
    return container;
  }

  // Function to load initial set of images
  async function loadWallpapers(
    filter = localStorage.getItem("wallpaper-filter"),
  ) {
    try {
      // Fetch all image URLs
      imageUrls = fuzzyFind(
        (
          await Promise.all(WallpaperRepoUrls.map((url) => fetchImageUrls(url)))
        ).flat(),
        filter ?? "",
      );

      if (imageUrls.length === 0) {
        imageGrid.innerHTML = "<p>No images found</p>";
        return;
      }

      loadMoreImages();
      setupIntersectionObserver();
    } catch (error) {
      console.error("Error loading initial images:", error);
      imageGrid.innerHTML = "<p>Failed to load images</p>";
    }
  }
  // Function to load more images
  function loadMoreImages() {
    if (count >= imageUrls.length) return;

    const fragment = document.createDocumentFragment();
    const limit = Math.min(count + imagesPerLoad, imageUrls.length);

    for (; count < limit; count++) {
      const imgElement = createImageElement(imageUrls[count]);
      if (imgElement) {
        fragment.appendChild(imgElement);
      }
    }

    imageGrid.appendChild(fragment);
  }
  // Setup Intersection Observer for lazy loading
  function setupIntersectionObserver() {
    // Disconnect previous observer if it exists
    if (observer) {
      observer.disconnect();
    }

    // Create new observer
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreImages();

          // Update observer to watch the new last element
          updateObservedElement();
        }
      },
      {
        rootMargin: "100px", // Load images before they come into view
        threshold: 0.1,
      },
    );

    updateObservedElement();
  }

  // Update the element being observed
  function updateObservedElement() {
    // Unobserve the previous element if it exists
    if (lastObservedElement) {
      observer.unobserve(lastObservedElement);
    }

    const images = imageGrid.querySelectorAll("img");
    if (images.length > 0 && count < imageUrls.length) {
      lastObservedElement = images[images.length - 1];
      observer.observe(lastObservedElement);
    }
  }
  // Start loading images
  loadWallpapers();

  //============================ Setting panel ===========================
  // DOM elements
  const minWidthSlider = document.getElementById("min-width");
  const wallpaperFilter = document.getElementById("wallpaper-filter");
  const filterButton = document.getElementById("filter-button");

  // Apply min-width to images when slider value is changed
  minWidthSlider.addEventListener("input", function () {
    document.documentElement.style.setProperty("--min-width", `${this.value}%`);
    // Save to localStorage for persistence
    localStorage.setItem("wallpaper-min-width", this.value);
  });

  // Set filter list
  const filterList = document.getElementById("filter-list");
  let filteredUrls;
  wallpaperFilter.addEventListener("input", function () {
    const filterText = wallpaperFilter.value.toLowerCase();
    filteredUrls = fuzzyFind(imageUrls, filterText);

    const fragment = document.createDocumentFragment();
    filteredUrls.forEach((url) => {
      const li = document.createElement("li");
      li.innerText = url.slice(url.lastIndexOf("/") + 1);
      fragment.appendChild(li);
    });

    // delete old list
    filterList.innerHTML = "";

    // append new list
    filterList.appendChild(fragment);
  });

  // Filter images by name
  filterButton.addEventListener("click", function () {
    localStorage.setItem("wallpaper-filter", wallpaperFilter.value);
    window.location.reload();
  });

  // Also apply filter when Enter key is pressed in the input
  wallpaperFilter.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      localStorage.setItem("wallpaper-filter", wallpaperFilter.value);
      window.location.reload();
    }
  });

  // Initialize settings from localStorage (if available)
  function initSettings() {
    // Restore min-width setting
    const savedMinWidth = localStorage.getItem("wallpaper-min-width");
    if (savedMinWidth) {
      document.documentElement.style.setProperty(
        "--min-width",
        `${savedMinWidth}%`,
      );
      minWidthSlider.value = savedMinWidth;
    }

    // Restore filter setting
    const savedFilter = localStorage.getItem("wallpaper-filter");
    if (savedFilter) {
      wallpaperFilter.value = savedFilter;
    }
  }

  initSettings();
});

// # Filter images using fuzzy search

// Score constants
const SCORE = {
  EXACT_MATCH: 0,
  CONSECUTIVE: 16,
  START_OF_WORD: 8,
  CAMEL_CASE: 7,
  AFTER_SEPARATOR: 6,
  LENGTH_PENALTY: 0.2,
  GAP_PENALTY: 1,
  MIN_CHAR_SCORE: 1,
};

function normalizeText(text) {
  return text.toLowerCase().trim();
}

function isWordBoundary(char) {
  return /[\s_\-./]/.test(char);
}

function isCamelCase(text, index) {
  if (index <= 0) return false;
  return /[a-z]/.test(text[index - 1]) && /[A-Z]/.test(text[index]);
}

function fuzzyFind(array, query) {
  if (!query) return array;

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return array;

  function computeMatchScore(text) {
    const matches = [];
    const normalizedText = normalizeText(text);

    // Exact match gets highest priority
    if (text === query) {
      return {
        score: SCORE.EXACT_MATCH,
        matches: [[0, text.length - 1]],
      };
    }

    let score = 0;

    // Dynamic programming matrix for optimal match sequence
    const dp = Array(text.length + 1)
      .fill(null)
      .map(() => Array(normalizedQuery.length + 1).fill(0));

    // Initialize first row
    for (let j = 0; j <= normalizedQuery.length; j++) {
      dp[0][j] = 0;
    }

    // Fill the dp matrix
    for (let i = 1; i <= text.length; i++) {
      for (let j = 1; j <= normalizedQuery.length; j++) {
        if (normalizedText[i - 1] === normalizedQuery[j - 1]) {
          let matchScore = SCORE.MIN_CHAR_SCORE;

          // Bonus for matching at special positions
          if (i === 1 || isWordBoundary(text[i - 2])) {
            matchScore += SCORE.START_OF_WORD;
          } else if (isCamelCase(text, i - 1)) {
            matchScore += SCORE.CAMEL_CASE;
          } else if (text[i - 2] === "/" || text[i - 2] === ".") {
            matchScore += SCORE.AFTER_SEPARATOR;
          }

          // Bonus for consecutive matches
          if (
            i > 1 &&
            j > 1 &&
            normalizedText[i - 2] === normalizedQuery[j - 2]
          ) {
            matchScore += SCORE.CONSECUTIVE;
          }

          dp[i][j] = dp[i - 1][j - 1] + matchScore;
        } else {
          dp[i][j] = Math.max(
            dp[i - 1][j] - SCORE.GAP_PENALTY,
            dp[i][j - 1] - SCORE.GAP_PENALTY,
          );
        }
      }
    }

    // Backtrack to find matching positions
    let i = text.length;
    let j = normalizedQuery.length;
    const positions = [];

    while (i > 0 && j > 0) {
      if (normalizedText[i - 1] === normalizedQuery[j - 1]) {
        positions.unshift(i - 1);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // Convert positions to ranges
    let currentRange = null;
    positions.forEach((pos) => {
      if (!currentRange) {
        currentRange = [pos, pos];
      } else if (currentRange[1] === pos - 1) {
        currentRange[1] = pos;
      } else {
        matches.push(currentRange);
        currentRange = [pos, pos];
      }
    });
    if (currentRange) {
      matches.push(currentRange);
    }

    // Calculate final score
    score = dp[text.length][normalizedQuery.length];

    // Apply length penalty
    score = score / (1 + text.length * SCORE.LENGTH_PENALTY);

    return {
      score,
      matches,
    };
  }

  // Process all items and sort by score
  const results = array
    .map((item) => {
      const { score, matches } = computeMatchScore(String(item));
      return {
        item,
        score,
        matches,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);

  return results.map((result) => result.item);
}
