// Ottoman Crime Network Map - Map Fullscreen Module

/**
 * Initialize fullscreen functionality for the map
 * @param {string} mapId - ID of the map container element
 */
function initFullScreenToggle(mapId = 'map') {
    console.log("Initializing fullscreen toggle for map");
    
    // Get the map container
    const mapContainer = document.getElementById(mapId);
    
    // Create fullscreen button if it doesn't exist
    let fullscreenButton = document.getElementById('fullscreen-toggle');
    
    if (!fullscreenButton) {
        fullscreenButton = document.createElement('button');
        fullscreenButton.id = 'fullscreen-toggle';
        fullscreenButton.className = 'map-control-button';
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenButton.title = 'Toggle fullscreen';
        
        // Add the button to the map container
        mapContainer.appendChild(fullscreenButton);
    }
    
    // Add click event listener to toggle fullscreen
    fullscreenButton.addEventListener('click', function() {
        toggleFullScreen(mapContainer);
    });
    
    // Also listen for 'F' key to toggle fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'f' || e.key === 'F') {
            // Only if not in an input field
            if (document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA') {
                toggleFullScreen(mapContainer);
            }
        }
    });
    
    console.log("Fullscreen toggle initialized");
}

/**
 * Toggle fullscreen mode for an element
 * @param {HTMLElement} element - Element to toggle fullscreen for
 */
function toggleFullScreen(element) {
    if (!document.fullscreenElement &&    // Standard property
        !document.mozFullScreenElement && // Firefox
        !document.webkitFullscreenElement && // Chrome, Safari and Opera
        !document.msFullscreenElement) {  // IE/Edge
        
        // Enter fullscreen
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        // Update button icon
        const button = document.getElementById('fullscreen-toggle');
        if (button) {
            button.innerHTML = '<i class="fas fa-compress"></i>';
        }
        
        // Add fullscreen class to the element
        element.classList.add('fullscreen-mode');
        
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Update button icon
        const button = document.getElementById('fullscreen-toggle');
        if (button) {
            button.innerHTML = '<i class="fas fa-expand"></i>';
        }
        
        // Remove fullscreen class from the element
        element.classList.remove('fullscreen-mode');
    }
}

// Listen for fullscreen change events to update the button icon
document.addEventListener('fullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('mozfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('MSFullscreenChange', updateFullscreenButtonIcon);

/**
 * Update the fullscreen button icon based on fullscreen state
 */
function updateFullscreenButtonIcon() {
    const button = document.getElementById('fullscreen-toggle');
    if (!button) return;
    
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement) {
        // In fullscreen mode
        button.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        // Not in fullscreen mode
        button.innerHTML = '<i class="fas fa-expand"></i>';
    }
}
