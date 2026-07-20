Place arena background images in this folder.

Current default config expects:
- bg-01.png

If you want multiple backgrounds, add files here and then update
frontend/src/arenaBackgrounds.js with the exact paths.
Only files that really exist should be listed, otherwise the arena can
fall back to gradient if a missing file is selected.

All clients will resolve the same background for the same boss because selection is deterministic from boss id.
If you rename or add files, update frontend/src/arenaBackgrounds.js.
