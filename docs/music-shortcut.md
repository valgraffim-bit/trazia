# Music shortcut

The map shows the selected music service icon, defaulting to YouTube Music. Tapping it opens a small panel with an external link and an option to change services. The service choice persists on the device.

The panel closes after six seconds of inactivity, when opening the external link, tapping outside, pressing Escape, or using its close button. Keyboard focus inside the panel keeps it open. The icon remains available on mobile, landscape and desktop layouts.

Playback and playback controls stay in the music service. This shortcut does not connect accounts or control another application in the background. The external URL may open the installed application or its website depending on the device.

Validation: `node tests/music-dock-browser.cjs` checks icons, provider links, dismissal, keyboard focus, persisted selection and responsive placement. `node tests/settings-browser.cjs` checks the settings integration.
