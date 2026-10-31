# Kampung Raya Rush — beginner's guide

A phone treasure hunt that runs in the browser. No app needed.
Players sign up at Bazaar 1961, race through Melaka, and come back.
A free Google Sheet records everyone's times and photos, and an
organiser dashboard shows it all live.

- **Game:** https://jade-hash21.github.io/KampungRayaRush/
- **Testing mode:** https://jade-hash21.github.io/KampungRayaRush/?debug=true
- **Organiser dashboard:** https://jade-hash21.github.io/KampungRayaRush/dashboard.html
- **QR codes:** https://jade-hash21.github.io/KampungRayaRush/qr-codes.html

---

## 1. Files

| File | What it is |
|---|---|
| `index.html`, `css/`, `js/game.js`, `sw.js` | the game (don't edit) |
| `js/game-config.js` | **all the text, questions, clues and settings — edit this one** |
| `dashboard.html` | the live organiser dashboard |
| `qr-codes.html` | makes the QR codes |
| `google-apps-script.gs` | goes into your Google Sheet (part 3) |

To update the site: on GitHub click **Add file → Upload files**, drag the files in, click **Commit changes**.
If the site doesn't update within a few minutes, open the **Actions** tab and re-run the stuck "pages build and deployment".

---

## 2. How the hunt works

1. **START — Bazaar 1961:** sign up (name + phone). The timer starts.
2. **CP1 — Baba Kaya:** 6-question culture quiz, then the jigsaw puzzle.
3. **CP2 — Mural:** memorise the poem, then pose like the mural and take a photo.
4. **CP3 — Clock Tower:** 3 people on one page, a photo + their one word each.
5. **Trail:** pink cow, golden horse, orangutan (one page each, photo).
6. **CP4 — Pulse:** postbox photo, cross the bridge, chicken holding a bun.
7. **FINAL — Bazaar 1961:** photos with a vendor, a workshop and an artwork.
   Then they find **Syirin** (white bucket hat), say the poem, and Syirin types the PIN to stop the timer.
8. Last screen: *"Congrats!! You finished the Kampung Raya Rush in the duration of …"*

**Photos:** *Save* puts the photo on the phone (iPhone: tap **Save Image**), *Share* opens Instagram, WhatsApp and more.
The first time a photo is saved or shared, a copy goes to your Google Drive and appears on the dashboard.

---

## 3. Set up the Google Sheet (free — do this once)

1. Go to **sheets.google.com** → **Blank spreadsheet**. Name it `Kampung Raya Rush results`.
2. Click **Extensions → Apps Script**.
3. Delete everything in the code box. Open `google-apps-script.gs`, copy **all** of it, paste it in.
4. Change the settings at the top:
   - `ORGANISER_PIN` — the number Syirin types at the finish (default `1961`).
   - `DASHBOARD_PASSWORD` — the password for the dashboard. **Change it from `change-me`.**
   - `MIN_MINUTES` — anyone faster than this is marked **CHECK** and gets no place (default 20).
5. Click 💾 **Save**.
6. Pick **setup** from the function list at the top and click **▶ Run**.
   Google asks for permission (Sheets + Drive): **Review permissions → your account → Advanced → Go to (unsafe) → Allow**.
   ("Unsafe" just means you wrote the script yourself.)
   Your sheet now has 3 tabs — **Players**, **Photos**, **Log** — and your Google Drive has a folder **Kampung Raya Rush photos**.
7. Click **Deploy → New deployment** → ⚙️ → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy**, then copy the **Web app URL** (ends in `/exec`).
8. On GitHub open `js/game-config.js`, click the pencil, paste it:
   `serverURL: "https://script.google.com/macros/s/....../exec",`
   → **Commit changes**.

**Changed the script later?** Deploy → **Manage deployments** → ✏️ → Version: **New version** → Deploy. The URL stays the same.

---

## 4. The organiser dashboard

Open **https://jade-hash21.github.io/KampungRayaRush/dashboard.html** on a laptop, tablet or phone and type your `DASHBOARD_PASSWORD`.
It refreshes itself every 15 seconds.

- **Top numbers:** signed up, still on the course, finished, photos received.
- **Leaderboard:** finishers in order, 🥇🥈🥉 for the top 3, with their time.
- **Participants:** where each player is right now, a progress bar, when they last did something
  (turns orange after 15 minutes of nothing — maybe they're lost), their running time and start time.
- **Live activity:** every sign-up, QR scan, finished page, photo and finish, with the time.
- **Photos:** newest first. Pick one player from the menu to see only theirs. Click a photo to enlarge it or open it in Google Drive.
- Test players (made in `?debug=true` mode) are hidden unless you tick **Show test players**.

The same information is in the Google Sheet if you ever need it.

**Privacy:** photos in the Drive folder can be opened by anyone who has a photo's link. The links are only shown on the
password-protected dashboard. Delete the folder after the event if you don't need the photos.

---

## 5. QR codes

Open **qr-codes.html** (link at the top) and **DOWNLOAD QR** for each:

| QR | Put it at |
|---|---|
| START | Bazaar 1961 sign-up table |
| cp1 | Baba Kaya |
| cp2 | the Mural |
| cp3 | the Clock Tower |
| cp4 | Pulse |
| final | Bazaar 1961 (the finish) |

---

## 6. Testing

Use the testing link (top of this page). A red panel at the bottom lets you **jump to any page**, **skip** a page or **reset**.
Test sign-ups are marked **TEST** and never get a place. Test photos still upload, so you can check the dashboard.

Test on a **real iPhone and a real Android phone**: Save, Share, and that the photo shows up on the dashboard.

---

## 7. Event-day checklist

- [ ] `serverURL` is filled in; PIN and dashboard password are set in the Google script.
- [ ] `eventHashtag` and `instagramURL` are set in `js/game-config.js`.
- [ ] `debugAllowed: false,` in `js/game-config.js` (so players can't skip with `?debug=true`).
- [ ] Delete your test rows in the **Players**, **Photos** and **Log** tabs (keep row 1) and the test photos in Drive.
- [ ] QR codes printed and stuck up.
- [ ] Syirin (and anyone else at the finish) knows the PIN.
- [ ] The dashboard is open on a laptop or tablet at Bazaar 1961.
- [ ] One full real run on your own phone the day before.

### Good to know
- The timer runs on Google's clock, so changing a phone's time does nothing.
- If a player clears their browser data, they lose their progress and must sign up again (new timer).
- Pressing STOP MY TIMER twice on the same phone doesn't change the result.
- Players need mobile data or Wi-Fi at sign-up, for photos to reach you, and at the finish.
[Uploading README.md…]()
