document.addEventListener('DOMContentLoaded', () => {
    // Theme selector
    const themeButtons = document.querySelectorAll('.theme-btn');
    const modeButtons = document.querySelectorAll('.mode-btn');

    // Load and apply saved theme and mode
    function loadTheme() {
        browser.storage.sync.get(['popupTheme', 'popupMode']).then((result) => {
            const theme = result.popupTheme || 'coffee';
            const mode = result.popupMode || 'light';
            applyTheme(theme);
            applyMode(mode);
        }).catch(() => {
            browser.storage.local.get(['popupTheme', 'popupMode']).then((result) => {
                const theme = result.popupTheme || 'coffee';
                const mode = result.popupMode || 'light';
                applyTheme(theme);
                applyMode(mode);
            });
        });
    }

    function applyTheme(theme) {
        // Remove all theme classes
        document.body.classList.remove(
            'theme-coffee', 'theme-matcha', 'theme-caramel', 'theme-oat', 'theme-espresso'
        );
        // Add selected theme class
        document.body.classList.add(`theme-${theme}`);
        // Update active button
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    function applyMode(mode) {
        // Remove all mode classes
        document.body.classList.remove('mode-dark', 'mode-light');
        // Add selected mode class
        document.body.classList.add(`mode-${mode}`);
        // Update active button
        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    function saveTheme(theme) {
        browser.storage.sync.set({ popupTheme: theme }).catch(() => {
            browser.storage.local.set({ popupTheme: theme });
        });
    }

    function saveMode(mode) {
        browser.storage.sync.set({ popupMode: mode }).catch(() => {
            browser.storage.local.set({ popupMode: mode });
        });
    }

    // Theme button click handlers
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            saveTheme(theme);
        });
    });

    // Mode button click handlers
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            applyMode(mode);
            saveMode(mode);
        });
    });

    // Load theme and mode on startup
    loadTheme();
});
