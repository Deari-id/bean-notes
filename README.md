# Bean Notes

An installable, offline-capable coffee tasting journal. Add a photo of each bag, record the bean or blend name, roaster, origin, process, brew method, tasting notes, freeform notes, and separate Taste and Favorite ratings in half-star steps.

## Run it

This project has no build step and no dependencies. Open `index.html` directly, or serve the folder with any local static server:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

Opening `index.html` directly still works for a quick preview, but `file://` browser storage may not survive reopening the file. Use the published HTTPS app for your real journal. Installation and offline caching also require HTTP locally or HTTPS when published.

## Install on iPhone

1. Publish the folder to an HTTPS host such as GitHub Pages.
2. Open the published address in Safari on the iPhone.
3. Tap **Share**, then **Add to Home Screen**.
4. Turn on **Open as Web App**, then tap **Add**.

The app shell works offline after the first successful visit. Reviews and photos are stored primarily in IndexedDB on the current device, with a `localStorage` fallback and migration of existing reviews. A save is confirmed only after storage commits. The selected theme remains in `localStorage`. Reviews can synchronize between devices after the optional cloud connection below is configured. The three initial reviews are sample entries and can be edited or removed.

## Optional cloud synchronization

Bean Notes includes an offline-first Supabase synchronization layer. Until configured, the journal continues to work entirely on the current device.

1. Create a Supabase project.
2. In **Storage**, create a private bucket named `coffee-photos`.
3. Open the Supabase SQL Editor and run `supabase/schema.sql`.
4. Add the published Bean Notes URL to the allowed Auth redirect URLs.
5. Copy the project URL and **publishable** key into `cloud-config.js`.

The publishable key is designed for frontend use when Row Level Security is enabled. Never put a secret key or service-role key in this repository.

If the Supabase table already exists, run `supabase/migrations/20261026_dual_ratings.sql` in the SQL Editor before publishing the dual-rating app. Older reviews retain their Taste score and show Favorite as unrated until you edit them.

Sign-in links need the published HTTPS app, not a local `file://` copy. If you see “Load failed”, first verify that `cloud-config.js` contains the current Supabase publishable key, then open the published app in Safari or Chrome and try again. If the request succeeds but no email arrives, check the Supabase Auth email settings and spam folder; Supabase's default email service has recipient and rate limits, so a custom SMTP service may be needed.

### Sign in from the iPhone Home Screen

Safari and a Home Screen web app can have separate sign-in sessions. Bean Notes supports email/password sign-in directly inside the app. If your account previously used only email links:

1. Request an email link using **First time or forgot your password?** in Cloud sync.
2. Open the link in Safari, then open **Cloud sync → Set a password for Home Screen login**.
3. Set your password, return to Bean Notes from the Home Screen, and sign in with the same email and password.

Password fields are sent only to Supabase Auth and are never written to the journal's local storage. Existing browser sessions and email-link login remain supported. The email provider must be enabled in Supabase Auth; no email-template or database-schema change is required for this flow.
