// Ottoman Crime Network Map - JavaScript Color Configuration
// This file contains all color variables used in JavaScript files.
// Modify these values to easily change the entire color scheme.

// Check if colorConfig is already defined
if (typeof window.colorConfig === 'undefined') {
    window.colorConfig = {
    // Primary Color Palette
    primary: '#4B3E2A', // Dark Olive Brown
    secondary: '#A67B5B', // Muted Copper
    accent: '#D4C4A8', // Parchment
    neutralLight: '#F5F1EB', // Antique White
    neutralDark: '#2C2C2C', // Dark Gray
    dataHighlight: '#4B6455', // Forest Green
    alertRed: '#9E4B4B', // Faded Crimson
    mixedColor: '#6A5D4D', // Brown for mixed types

    // Event Type Colors
    forgeryColor: '#9E4B4B', // Same as alertRed
    escapeColor: '#4B6455', // Same as dataHighlight
    arrestColor: '#2C2C2C', // Same as neutralDark

    // Border Colors
    borderColor: '#4B3E2A', // Same as primary
    borderFill: '#A67B5B', // Same as secondary

    // Gradient Colors (for use in JavaScript)
    gradientStart: '#4B6455', // Same as dataHighlight
    gradientEnd: '#A67B5B', // Same as secondary
};
}

// Export the color configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.colorConfig;
}
