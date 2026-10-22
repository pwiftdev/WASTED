# $WASTED

Landing page for **$WASTED**, the GTA death-screen meme on Solana.

CA: `BvP5kfxFcJ69DA7XJzZcRkyRkqYpPsBA3HSuZbTppump`

Plain static site with no build step: `index.html`, `styles.css`, `app.js` and `assets/`.

## Run locally

```bash
node serve.js
```

Then open http://localhost:8080 (set `PORT` to change it).

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this repo.
2. Framework preset: **Other**. Leave the build command and output directory empty.
3. Deploy. `vercel.json` sets clean URLs, cache headers and basic security headers.

## Config

- **Social links:** fill in `LINKS.x` and `LINKS.telegram` at the top of `app.js`. Empty links show a "drops soon" toast.
- **Link previews:** once you have a domain, change `og:image` in `index.html` to an absolute URL, e.g. `https://your-domain/assets/og.jpg`. X needs the absolute URL to show the card.
- **Live data:** price, market cap, volume and 24h change come from the public DexScreener API. No key is needed.

## Assets

- `assets/memes/`: 90 memes from the [Know Your Meme "Wasted" gallery](https://knowyourmeme.com/memes/wasted/photos), converted to short MP4 clips plus JPG posters. `assets/memes.js` lists them.
- `assets/wasted.png` and `assets/wasted@2x.png`: the wordmark. `assets/wasted-data.js` is an inline copy for the Wasted-ify canvas.
- `assets/og.jpg`: the social preview image.
