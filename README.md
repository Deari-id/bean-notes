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

The app shell works offline after the first successful visit. By default, reviews and the selected theme are stored in the browser's local storage on the current device. Reviews can synchronize between devices after the optional cloud connection below is configured. The three initial reviews are sample entries and can be edited or removed.

## Optional cloud synchronization

Bean Notes includes an offline-first Supabase synchronization layer. Until configured, the journal continues to work entirely on the current device.

1. Create a Supabase project.
2. In **Storage**, create a private bucket named `coffee-photos`.
3. Open the Supabase SQL Editor and run `supabase/schema.sql`.
4. Add the published Bean Notes URL to the allowed Auth redirect URLs.
5. Copy the project URL and **publishable** key into `cloud-config.js`.

The publishable key is designed for frontend use when Row Level Security is enabled. Never put a secret key or service-role key in this repository.
