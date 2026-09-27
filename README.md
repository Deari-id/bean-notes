# Bean Notes

An installable, offline-capable coffee tasting journal. Add a photo of each bag, record the bean or blend name, roaster, origin, process, brew method, tasting notes, freeform notes, and a five-star rating.

## Run it

This project has no build step and no dependencies. Open `index.html` directly, or serve the folder with any local static server:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

Opening `index.html` directly still works, but installation and offline caching require HTTP locally or HTTPS when published.

## Install on iPhone

1. Publish the folder to an HTTPS host such as GitHub Pages.
2. Open the published address in Safari on the iPhone.
3. Tap **Share**, then **Add to Home Screen**.
4. Turn on **Open as Web App**, then tap **Add**.

The app shell works offline after the first successful visit. Reviews and the selected theme are stored in the browser's local storage on the current device; they do not yet synchronize between devices. The three initial reviews are sample entries and can be edited or removed.
