# Pano intro video

`index.html` holds the whole film: one board and a small timeline. `seek(seconds)` draws any exact frame, with no CSS animations or timers, and the page makes no network requests. All figures on screen are illustrative. Beat timings are the `B2` to `END` constants near the top of the script.

Re-render from the repository root, after `bun install`. It needs `ffmpeg` on PATH:

```sh
node --experimental-strip-types docs/media/intro/render.ts
```

This writes `docs/media/pano-intro.mp4` (1920x1080, 30 fps, H.264, no audio) and `docs/media/pano-intro.gif` (960 wide, 12 fps, 1.85x speed).

To check single moments without a full render:

```sh
node --experimental-strip-types docs/media/intro/render.ts --stills 12.5,31 --out <folder>
```

Text uses the system font stack, so the look follows the machine that renders it.
