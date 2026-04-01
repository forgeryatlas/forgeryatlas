// Time slider variables - using window to make them globally accessible
window.START_YEAR = 1854;
window.END_YEAR = 1900; // Default end year, will be updated based on data
let currentYear = window.START_YEAR;
let timeSlider;
let isPlaying = false;
let playInterval;

// Initialize the time slider
function initTimeSlider() {
    timeSlider = document.getElementById('time-slider');

    // Create significant years for pips (tick marks)
    const significantYears = {};
    const yearStep = Math.ceil((window.END_YEAR - window.START_YEAR) / 10); // Show about 10 tick marks
    for (let year = window.START_YEAR; year <= window.END_YEAR; year += yearStep) {
        significantYears[year] = year.toString();
    }
    // Always include the last year
    significantYears[window.END_YEAR] = window.END_YEAR.toString();

    noUiSlider.create(timeSlider, {
        start: window.START_YEAR,
        connect: 'lower',
        step: 1,
        range: {
            'min': window.START_YEAR,
            'max': window.END_YEAR
        },
        format: {
            to: value => Math.round(value),
            from: value => Math.round(value)
        },
        pips: {
            mode: 'values',
            values: Object.keys(significantYears).map(Number),
            density: 4,
            format: {
                to: function(value) {
                    return significantYears[value];
                }
            }
        }
    });

    // Update year display when slider changes
    timeSlider.noUiSlider.on('update', function(values, handle) {
        currentYear = parseInt(values[handle]);
        document.getElementById('current-year').innerText = currentYear;

        // Only call updateMarkers if markers have been loaded
        if (allMarkers.length > 0) {
            updateMarkers();
        }
    });

    // Add play/pause functionality
    const playPauseButton = document.getElementById('play-pause');
    playPauseButton.addEventListener('click', togglePlayPause);

    // Add previous year button functionality
    const prevYearButton = document.getElementById('prev-year');
    prevYearButton.addEventListener('click', goToPreviousYear);

    // Add next year button functionality
    const nextYearButton = document.getElementById('next-year');
    nextYearButton.addEventListener('click', goToNextYear);

    // Start autoplay by default after a delay to ensure everything is loaded properly
    setTimeout(() => {
        togglePlayPause(); // Start playing automatically
    }, 2000); // 2 second delay
}

// Toggle play/pause for the time slider
function togglePlayPause() {
    const playPauseButton = document.getElementById('play-pause');

    if (isPlaying) {
        // Stop playing
        clearInterval(playInterval);
        playPauseButton.innerHTML = '&#9654;'; // Play symbol
        isPlaying = false;
    } else {
        // Start playing
        playPauseButton.innerHTML = '&#9616;&#9616;'; // Pause symbol
        isPlaying = true;

        playInterval = setInterval(() => {
            // Increment year
            let nextYear = currentYear + 1;

            // Reset to start if we reach the end
            if (nextYear > window.END_YEAR) {
                nextYear = window.START_YEAR;
            }

            // Update the slider
            timeSlider.noUiSlider.set(nextYear);
        }, 1000); // Change year every second
    }
}

// Go to the previous year
function goToPreviousYear() {
    // If playing, stop first
    if (isPlaying) {
        togglePlayPause();
    }

    // Calculate previous year
    let prevYear = currentYear - 1;

    // If we're at the start, loop to the end
    if (prevYear < window.START_YEAR) {
        prevYear = window.END_YEAR;
    }

    // Update the slider
    timeSlider.noUiSlider.set(prevYear);

    // Add visual feedback for the button
    const prevYearButton = document.getElementById('prev-year');
    prevYearButton.style.transform = 'scale(1.2)';
    setTimeout(() => {
        prevYearButton.style.transform = 'scale(1)';
    }, 200);
}

// Go to the next year
function goToNextYear() {
    // If playing, stop first
    if (isPlaying) {
        togglePlayPause();
    }

    // Calculate next year
    let nextYear = currentYear + 1;

    // If we're at the end, loop to the start
    if (nextYear > window.END_YEAR) {
        nextYear = window.START_YEAR;
    }

    // Update the slider
    timeSlider.noUiSlider.set(nextYear);

    // Add visual feedback for the button
    const nextYearButton = document.getElementById('next-year');
    nextYearButton.style.transform = 'scale(1.2)';
    setTimeout(() => {
        nextYearButton.style.transform = 'scale(1)';
    }, 200);
}

// Function to update the time slider range based on the maximum year in the data
// Making it globally accessible
window.updateTimeSliderRange = function(maxYear) {
    // Update the END_YEAR variable
    window.END_YEAR = maxYear;
    console.log(`Updated time slider end year to: ${window.END_YEAR}`);

    // Update the slider range
    if (timeSlider && timeSlider.noUiSlider) {
        // Update the range
        timeSlider.noUiSlider.updateOptions({
            range: {
                'min': window.START_YEAR,
                'max': window.END_YEAR
            }
        });

        // Update the pips (tick marks)
        const significantYears = {};
        for (let year = window.START_YEAR; year <= window.END_YEAR; year += Math.ceil((window.END_YEAR - window.START_YEAR) / 10)) {
            significantYears[year] = year.toString();
        }
        // Always include the last year
        significantYears[window.END_YEAR] = window.END_YEAR.toString();

        // Update pips
        timeSlider.noUiSlider.updateOptions({
            pips: {
                mode: 'values',
                values: Object.keys(significantYears).map(Number),
                density: 4,
                format: {
                    to: function(value) {
                        return significantYears[value];
                    }
                }
            }
        });
    }
}
