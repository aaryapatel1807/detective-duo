# Album backend + gallery UI (Sachi)

Photo collection with ML classification, plus its gallery UI at `/albums`
(also linked from the dashboard sidebar, bottom nav, and Featured).
The page degrades gracefully: before activation (migration + service
key) it shows a "still being set up" notice instead of failing, and
it fires the process route on open and after uploads so nothing stays
pending just because an upload ran cold.

## What it does

Upload a photo into the one shared album — opened by a single secret
key (the `ALBUM_SECRET_KEY` server env var, sent as the `x-album-key`
header) — and the backend:

1. Compresses it (max 2048px JPEG) + makes a 480px thumbnail (sharp).
2. Reads its date and GPS from EXIF (exifr).
3. Classifies it with two tiny ONNX models running inside the app —
   no photo ever leaves the stack:
   - **YuNet** (232KB) counts faces → solo (1) vs together (2+).
     Decode transcribed from OpenCV's FaceDetectorYN, and verified
     against OpenCV's own output on a real group photo (box matched
     to the pixel). Score = sqrt(cls × obj), threshold 0.6, NMS 0.3.
   - **MobileNetV2** (14MB) reads the scene → beach, nature, food,
     city, animals, people, or things (keyword map in `sceneTags.ts`).
4. Serves auto-albums (Google-Photos style views over tags, not folders):
   All, Solo, Together, Places, Nature, Food, City, Animals, plus a
   month timeline. Places group by ~1km clusters; place names are v2.

## Endpoints (all server-only, Node runtime)

- `POST /api/albums/upload` — multipart `key`, `uploader`, `file`
  (image ≤ 15MB, JPEG/PNG/WebP). Returns the photo id + status. If
  inline classification fails or runs long, the row stays `pending`.
- `POST /api/albums/process` — classify pending photos (upload retries
  + catch-up). Body `{ "limit": 10 }`. Gate: the shared album key
  (`x-album-key`) or, if set, `ALBUMS_WORKER_TOKEN` (`x-albums-token`).
  Attempts are CLAIMED before inference (a function killed mid-photo
  never runs its catch block, so counting only on errors left photos
  `pending` forever); a photo that burned 3 claims without success is
  marked `failed`. Each call stops at an 8s budget and reports
  `pendingRemaining`, so the page polls until nothing is left.
  No `maxDuration` is set on purpose: raising it needs a paid plan,
  and this design works on any plan.
- `POST /api/albums/retry` — reset `failed` rows (and `pending` rows
  that burned all their claims) back to pending with a fresh attempt
  budget, so the next `/process` call classifies them. Same gate as
  `/process`. Response `{ reset }`.
- `GET /api/albums/photos?album=all&month=YYYY-MM&limit=&offset=`
  — ready photos with 1-hour signed thumbnail + full URLs. Requires
  the `x-album-key` header.
- `GET /api/albums/albums` — album counts, timeline months,
  place-cluster count. Requires the `x-album-key` header.

## Activation (do once, then deploy)

1. Run `supabase/migrations/20261025000001_album_photos.sql` in the
   Supabase dashboard SQL editor (creates the table + private bucket;
   no anonymous access — routes are the only path, via the service key).
2. Set `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project env
   (server-only; never a `NEXT_PUBLIC_` var).
3. Set `ALBUM_SECRET_KEY` in the Vercel project env to the one shared
   secret key — the server checks every album request against it, and
   the key itself never appears in code or in the client bundle.
4. Optional: `ALBUMS_WORKER_TOKEN` to gate `/process`.
4. Deploy the branch. Model weights are NOT in git (they would make
   pushes too big for this VM's tunnel): `postinstall` fetches them
   into `public/models/` at install time (`node scripts/fetch-models.mjs`
   also works by hand), skipping files already present.

## Limits (honest)

- Free-tier server functions cut off around 10s: a cold first upload
  can exceed that, so the row used to stay `pending` forever. Now each
  `/process` call claims attempts before inference, stops at an 8s
  budget, and the page polls until `pendingRemaining` is 0 — and a
  photo that burned its claims is marked `failed` (visible, with a
  Retry button) instead of stuck.
- Free Supabase storage is ~1GB: originals are compressed on upload.
- Place clusters have no names yet (needs geocoding — v2, opt-in).
- Face *identity* (who is who) is v2: it needs reference faces and
  stores biometric embeddings, which deserves its own privacy pass.
- Access is one shared secret key (`ALBUM_SECRET_KEY` server env):
  without it, every album route answers 401. The key is never stored
  in code or shown on screen; each device keeps the key it was given
  in its own local storage.
- Photos stay in the private bucket permanently: there is no expiry
  and no delete path. Only the signed view links expire (1 hour) and
  are re-signed on every list.

## Verified locally (24 Oct, real pipeline, not mocks)

- Group photo (7 men, Wikimedia): **5 faces** → Together. OpenCV's
  own detector finds 7 on the same photo; the two missed are an
  occluded face (no candidate at all) and a borderline one (0.49–0.52
  vs the 0.6 threshold). The 5 boxes that do fire match OpenCV's to
  the pixel, so the decode is exact — the gap is the tiny model's
  recall on hard faces, not a bug. Album assignment is unaffected.
- Kids group photo: **9 faces** → Together.
- Landscape/city photos: **0 faces**, tags beach/city correct.
- Cartoon faces: **0 faces** (no false positives).
- Scene tags: seashore/pier → beach, suspension bridge → city.
- Timing: ~130ms warm per photo, ~1.2s cold including model load.
- Tests: 221/221 green. `npm run build` green; the four API routes
  are in the build output.

## Dev check

```
npx tsx scripts/ml-smoke-test.mjs <image...>
```

Runs the real pipeline on local files and prints faces/tags/timing.
