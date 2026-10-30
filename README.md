# Kampung Raya Rush — beginner's guide

A phone treasure hunt that runs in the browser. No app needed.
Players sign up at Bazaar 1961, race through Melaka, and come back.
A Google Sheet records everyone's time and gives the first three
finishers their own winner codes.

---

## 1. What's new in this version

- **Your new route.** Start → Baba Kaya → Mural → Clock Tower → 4 animals → Pulse → back to Bazaar 1961.
  Every task is its own page ("one page, one photo").
- **Timer.** Starts when a player signs up. A small clock shows in the corner the whole time.
- **Winners.** At the finish the organiser types a PIN on the player's phone. That stops the timer.
  The 1st, 2nd and 3rd players get your winner codes. Everyone else gets a normal `HUNT-XXXX` code.
- **Photos fixed.**
  - *Save to my phone* — on iPhone it opens the share menu: tap **Save Image** (that's the only way Safari can put a photo in Photos).
    On Android it downloads the photo to Gallery / Downloads.
  - *Share* — opens the phone's share menu with **Instagram, WhatsApp** and more.
  - *Copy #hashtag* — copies the hashtag so players can paste it into their caption.
  - Press-and-hold on the photo also works as a backup.
  - If someone opens the link **inside** Instagram or WhatsApp, a warning tells them to open it in Safari/Chrome (those apps block saving).

---

## 2. Upload the files to GitHub

Your repository is `TresureHuntMLK`. Replace the old files with these:

1. Open the repository on github.com.
2. Click **Add file → Upload files**.
3. Drag in **everything inside this folder**: `index.html`, `qr-codes.html`, `sw.js`,
   `google-apps-script.gs`, `README.md`, and the `css`, `js` and `assets` folders.
   (Same names = GitHub replaces the old ones.)
4. Click **Commit changes**.
5. Optional: delete the old `assets/map.png` — it isn't used any more.

Wait a minute, then open your link on your phone and refresh twice.

---

## 3. Set up the Google Sheet (timer + winners)

You do this once. You need a Google account.

1. Go to **sheets.google.com** → **Blank spreadsheet**. Name it `Kampung Raya Rush results`.
2. Click **Extensions → Apps Script**.
3. Delete everything in the code box. Open `google-apps-script.gs`, copy **all** of it, paste it in.
4. Change the 3 settings at the top:
   - `WINNER_CODES` — your three code names for 1st, 2nd, 3rd. Example:
     `var WINNER_CODES = ['RAYA-GOLD', 'RAYA-SILVER', 'RAYA-BRONZE'];`
   - `ORGANISER_PIN` — a secret number only organisers know (default `1961`).
   - `MIN_MINUTES` — anyone faster than this is marked **CHECK** and doesn't get a winner code (default 20).
5. Click the 💾 **Save** icon.
6. At the top, pick **setup** from the function list and click **▶ Run**.
   Google asks for permission: **Review permissions → your account → Advanced → Go to (unsafe) → Allow**.
   (It says "unsafe" because you wrote the script yourself. That's normal.)
   Go back to your sheet — a **Players** tab with yellow headers appears.
7. Click **Deploy → New deployment**. Click the ⚙️ next to "Select type" → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then copy the **Web app URL** (ends in `/exec`).
8. On GitHub, open `js/game-config.js`, click the pencil, and paste the URL:
   `serverURL: "https://script.google.com/macros/s/....../exec",`
   Click **Commit changes**.

**If you change the script later:** Deploy → **Manage deployments** → ✏️ → Version: **New version** → Deploy.
(The URL stays the same.)

### What you see in the sheet

| Column | Meaning |
|---|---|
| Player ID / Name / Phone | from sign-up |
| Started | when they pressed GO |
| Last step / Last step at | where they are right now (updates live) |
| Finished / Total time | when the organiser typed the PIN |
| Place / Code | 1, 2, 3… and the code they were given |
| Notes | 🏆 winners, **CHECK** (suspiciously fast), **TEST** (debug mode) |

Winners' rows turn yellow.

---

## 4. Make the QR codes

Open `https://jade-hash21.github.io/TresureHuntMLK/qr-codes.html` and click **DOWNLOAD QR** for each:

| QR | Put it at |
|---|---|
| START | Bazaar 1961 sign-up table |
| cp1 | Baba Kaya |
| cp2 | the Mural |
| cp3 | the Clock Tower |
| cp4 | Pulse |
| final | Bazaar 1961 (the finish — can be the same table) |

The animals, postbox and bridge have **no** QR — players tick boxes and take photos.

⚠️ If you rename the repository later (e.g. to `kampung-raya-rush`), the link changes. Make the QR codes **after** renaming.

---

## 5. Testing

Add `?debug=true` to your link:

`https://jade-hash21.github.io/TresureHuntMLK/?debug=true`

A red panel at the bottom lets you **jump to any page**, **skip** the current page or **reset**.
In debug mode your sign-up is marked **TEST** in the sheet and never takes a winner spot.

Test the photo buttons on a **real iPhone and a real Android phone** — the share menu only exists on phones.

---

## 6. Changing the questions, clues and poem

Everything is in `js/game-config.js`:

- **CP1 Baba Kaya** questions and the jigsaw puzzle link
- the **poem** (section 5 of the file) — players see it at the mural and type it at the end
- every clue and hint (a page with `hints: []` simply shows no hint buttons)

Answers ignore capital letters, spaces and punctuation.
For the poem, players need **70%** of the words right (change `passPercent` to make it easier or harder).

---

## 7. Event-day checklist

- [ ] `serverURL` is filled in, and the winner codes + PIN are set in the Google script.
- [ ] In `js/game-config.js`: `debugAllowed: false,` (so players can't skip with `?debug=true`).
- [ ] In the **Players** sheet, delete all your test rows (keep row 1, the headers).
- [ ] QR codes are printed and stuck up.
- [ ] Every organiser at the finish knows the PIN.
- [ ] Do one full real run on your own phone the day before.

### At the finish
1. Player shows you the **YOU MADE IT!** screen.
2. Type the PIN, press **STOP MY TIMER**.
3. Their screen shows **YOU FINISHED 1ST/2ND/3RD!** with the winner code, or a normal code.
4. Double-check with the sheet if needed — it's the official record.

### Good to know
- A player who clears their phone's browser data loses their progress and has to sign up again (new timer).
- The timer runs on Google's clock, so changing the phone's time does nothing.
- Each winner code is given out **once**. Pressing STOP again on the same phone shows the same code.
- Photos never leave the phone. Only names, phone numbers and times go to your sheet.
