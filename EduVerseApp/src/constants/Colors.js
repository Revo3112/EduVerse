// src/constants/Colors.js
export const Colors = {
  // Main theme colors
  primary: "#007AFF",
  secondary: "#5856D6",
  background: "#f8f9fa",
  surface: "#ffffff",
  white: "#ffffff",
  black: "#000000",

  // Text colors
  text: "#333333",
  textSecondary: "#666666",
  textMuted: "#999999",

  // Gray scale
  gray: "#666666",
  lightGray: "#e0e0e0",

  // Status colors
  success: "#28a745",
  warning: "#ff9500",
  error: "#FF3B30",
  info: "#17a2b8",
  purple: "#6f42c1",

  // Border
  border: "#e0e0e0",

  // Light theme - for compatibility with existing components
  light: {
    background: "#f8f9fa",
    surface: "#ffffff",
    text: "#333333",
    textSecondary: "#666666",
    textMuted: "#999999",
    tint: "#007AFF",
    tabIconDefault: "#ccc",
    tabIconSelected: "#007AFF",
    border: "#e0e0e0",
    primary: "#007AFF",
    secondary: "#5856D6",
    success: "#28a745",
    warning: "#ff9500",
    error: "#FF3B30",
    info: "#17a2b8",
  },
};

// Theme variants for future use
export const ColorThemes = {
  light: {
    primary: "#007AFF",
    secondary: "#5856D6",
    background: "#f8f9fa",
    surface: "#ffffff",
    text: "#333333",
    textSecondary: "#666666",
    textMuted: "#999999",
    border: "#e0e0e0",
    success: "#28a745",
    warning: "#ff9500",
    error: "#FF3B30",
    info: "#17a2b8",
    purple: "#6f42c1",
    // Gradients
    primaryGradient: ["#007AFF", "#5856D6"],
    backgroundGradient: ["#f8f9fa", "#ffffff"],
  },
  dark: {
    primary: "#0A84FF",
    secondary: "#5E5CE6",
    background: "#000000",
    surface: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#EBEBF5",
    textMuted: "#8E8E93",
    border: "#38383A",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
    info: "#64D2FF",
    purple: "#BF5AF2",
    // Gradients
    primaryGradient: ["#0A84FF", "#5E5CE6"],
    backgroundGradient: ["#000000", "#1C1C1E"],
  },
};
