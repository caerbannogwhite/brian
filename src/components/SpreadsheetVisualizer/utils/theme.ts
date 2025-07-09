export interface ThemeColors {
  // Header colors
  headerBackgroundColor: string;
  headerTextColor: string;

  // Cell colors
  cellBackgroundColor: string;
  cellTextColor: string;

  // Border and UI colors
  borderColor: string;
  selectionColor: string;
  hoverColor: string;

  // Scrollbar colors
  scrollbarColor: string;
  scrollbarThumbColor: string;
  scrollbarHoverColor: string;

  // Data type specific colors
  booleanStyle: { backgroundColor: string; textColor: string };
  numericStyle: { backgroundColor: string; textColor: string };
  stringStyle: { backgroundColor: string; textColor: string };
  dateStyle: { backgroundColor: string; textColor: string };
  datetimeStyle: { backgroundColor: string; textColor: string };
  nullStyle: { backgroundColor: string; textColor: string };
}

export function detectCurrentTheme(): "light" | "dark" {
  // Check body class first (set by BrianApp)
  if (document.body.classList.contains("theme-light")) {
    return "light";
  }
  if (document.body.classList.contains("theme-dark")) {
    return "dark";
  }

  // Fallback to system preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function getThemeColors(theme?: "light" | "dark"): ThemeColors {
  const currentTheme = theme || detectCurrentTheme();

  if (currentTheme === "dark") {
    return {
      // Header colors - match app dark theme
      headerBackgroundColor: "#2d2d30",
      headerTextColor: "#cccccc",

      // Cell colors - darker but readable
      cellBackgroundColor: "#1e1e1e",
      cellTextColor: "#cccccc",

      // Border and UI colors
      borderColor: "#3c3c3c",
      selectionColor: "rgba(0, 120, 215, 0.3)",
      hoverColor: "rgba(0, 120, 215, 0.15)",

      // Scrollbar colors
      scrollbarColor: "#2d2d30",
      scrollbarThumbColor: "#666666",
      scrollbarHoverColor: "#777777",

      // Data type specific colors - subtle variations
      booleanStyle: { backgroundColor: "#2a2a2a", textColor: "#87ceeb" },
      numericStyle: { backgroundColor: "#2a2a2a", textColor: "#98fb98" },
      stringStyle: { backgroundColor: "#2a2a2a", textColor: "#cccccc" },
      dateStyle: { backgroundColor: "#2a2a2a", textColor: "#ffd700" },
      datetimeStyle: { backgroundColor: "#2a2a2a", textColor: "#ffa500" },
      nullStyle: { backgroundColor: "#2a2a2a", textColor: "#888888" },
    };
  }

  // Light theme colors - match app light theme
  return {
    // Header colors - match dataset panel header
    headerBackgroundColor: "#f8f9fa",
    headerTextColor: "#2c3e50",

    // Cell colors - clean and bright
    cellBackgroundColor: "#ffffff",
    cellTextColor: "#2c3e50",

    // Border and UI colors - match app borders
    borderColor: "#e1e5e9",
    selectionColor: "rgba(0, 120, 215, 0.2)",
    hoverColor: "rgba(0, 120, 215, 0.1)",

    // Scrollbar colors
    scrollbarColor: "#f3f3f3",
    scrollbarThumbColor: "#d6dade",
    scrollbarHoverColor: "#c1c8cd",

    // Data type specific colors - subtle but distinct
    booleanStyle: { backgroundColor: "#f1f3f4", textColor: "#1565c0" },
    numericStyle: { backgroundColor: "#f1f3f4", textColor: "#2e7d32" },
    stringStyle: { backgroundColor: "#f1f3f4", textColor: "#2c3e50" },
    dateStyle: { backgroundColor: "#f1f3f4", textColor: "#ed6c02" },
    datetimeStyle: { backgroundColor: "#f1f3f4", textColor: "#d84315" },
    nullStyle: { backgroundColor: "#f1f3f4", textColor: "#6c757d" },
  };
}

export function listenForThemeChanges(callback: (theme: "light" | "dark") => void): () => void {
  let currentTheme = detectCurrentTheme();

  // Watch for body class changes
  const observer = new MutationObserver(() => {
    const newTheme = detectCurrentTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      callback(newTheme);
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Watch for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    const newTheme = detectCurrentTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      callback(newTheme);
    }
  };

  mediaQuery.addEventListener("change", handleMediaChange);

  // Return cleanup function
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
}
