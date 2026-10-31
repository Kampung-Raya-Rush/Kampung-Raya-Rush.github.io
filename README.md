# Kampung Raya Rush

A phone treasure hunt around Melaka that runs in the browser. No app to install.
Players scan **one QR code**, sign up at Bazaar 1961, race through the checkpoints taking photos,
and come back to finish. Organisers watch everyone live on a dashboard.

Everything is free: the game is hosted on GitHub Pages, and times and photos are stored
in a Google Sheet and Google Drive.

---

## Links

| What | Link |
|---|---|
| **The game** (this is what the QR code opens) | https://kampung-raya-rush.github.io/ |
| Testing mode | https://kampung-raya-rush.github.io/?debug=true |
| **Organiser dashboard** (password) | https://kampung-raya-rush.github.io/dashboard.html |
| QR code maker | https://kampung-raya-rush.github.io/qr-codes.html |

---

## The route

| Stop | What players do |
|---|---|
| **START — Bazaar 1961** | Scan the QR, sign up with name + phone. **The timer starts.** |
| **CP1 — Baba Kaya** | 6-question Peranakan & Malay culture quiz, then a jigsaw puzzle that shows the next place. |
| **CP2 — Mural** | Memorise the poem (shown for 30 seconds), then pose like the mural and take a photo. |
| **CP3 — Clock Tower** | One page, three people: a photo with each and their one word for Melaka. |
| **Trail** | Pink cow, golden horse, orangutan: one page and one photo each. |
| **CP4 — Pulse** | Postbox photo, cross the bridge, chicken holding a bun. |
| **FINAL — Bazaar 1961** | Photo with a vendor, then find a specific artwork (its picture is shown on screen) and take a photo with it. Then find **Syirin** (white bucket hat) and say the poem. Syirin types the PIN, and **the timer stops.** |

Last screen: *"Congrats!! You finished the Kampung Raya Rush in the duration of …"*

There are no QR codes at the checkpoints. When a clue sends players somewhere new, they press
**I'M HERE →** when they arrive. Their photos on the dashboard show they really went.

---

## Photos

- **Save to my phone:** on iPhone a menu opens, tap **Save Image**. On Android it saves to Gallery / Downloads.
- **Share:** opens the phone's share menu (Instagram, WhatsApp and more).
- **Copy #hashtag:** copies the hashtag for the caption.
- Every photo gets a footer with the date, time and hashtag.
- The **first time** a photo is saved or shared, a copy goes to the organisers' Google Drive and appears on the dashboard.
  Taking a photo without saving or sharing it does **not** send it.
- Players must open the game in **Safari or Chrome**. Saving doesn't work inside Instagram or WhatsApp,
  and the game warns them if they're there.

---

## Organiser dashboard

Open https://kampung-raya-rush.github.io/dashboard.html and type the dashboard password.
It updates itself every 15 seconds. **↻ Refresh** updates it straight away.

- **Top numbers:** signed up, still on the course, finished, photos received.
- **Leaderboard:** finishers in order with 🥇🥈🥉 and their times.
- **Participants:** each player's current page, a progress bar, last activity (turns **orange** after 15 minutes
  of nothing, so they may be lost), running time and start time.
- **Live activity:** every sign-up, finished page, photo and finish, with the time.
- **Photos:** newest first. Filter by player, click to enlarge or open in Google Drive.
- **Test players** (anyone who signed up through `?debug=true`) and their photos are **hidden** unless you tick
  **Show test players**. A note at the top tells you how many are hidden.
- Anyone who finishes faster than 20 minutes is marked **CHECK** and gets no place. You decide what to do.

The same data is in the Google Sheet (tabs **Players**, **Photos**, **Log**) and the photos are in the
Drive folder **Kampung Raya Rush photos**.

---

## Files in this repository

| File | What it is | Edit it? |
|---|---|---|
| `js/game-config.js` | All the text, questions, clues, hints, poem and settings | **Yes, this is the one to edit** |
| `index.html`, `js/game.js`, `css/style.css` | The game itself | No |
| `sw.js` | Lets the game open on weak mobile signal | No |
| `assets/find-artwork.jpg` | The artwork players must find at the finish | Replace it to change the artwork |
| `dashboard.html` | The organiser dashboard | No |
| `qr-codes.html` | Makes the QR code | No |
| `google-apps-script.gs` | The code that runs inside the Google Sheet | Only the settings at the top |
| `README.md` | This guide | — |

**To change something on the site:** open the file on GitHub, click the ✏️ pencil, edit, then **Commit changes**.
Or use **Add file → Upload files** to replace a file. The site updates within a few minutes.

---

## Editing the game (`js/game-config.js`)

- Only change text **inside "quotation marks"**. Don't delete commas or quotation marks.
- `\n` starts a new line.
- Quiz answers ignore capital letters, spaces and punctuation.

| To change… | Look for… |
|---|---|
| Hashtag on photos | `eventHashtag` (currently `#Bazzar1961`) |
| Instagram "Follow us" button | `instagramURL` |
| Sign-up form | `signup:` |
| The poem | `poem:` → `lines` |
| Any page, clue or hint | `steps:`, one block per page |
| The last screen | `reveal:` |
| Turn testing mode off | `debugAllowed: false,` |
| Google Sheet connection | `serverURL` (already set, don't change unless you redeploy) |

---

## Google Sheet (already set up)

The Sheet is connected through `serverURL` in `js/game-config.js`.
Settings live at the top of the script (**Extensions → Apps Script** in the Sheet):

- `ORGANISER_PIN`: the number Syirin types at the finish
- `DASHBOARD_PASSWORD`: the dashboard password
- `MIN_MINUTES`: faster than this is marked CHECK (default 20)

**If you change the script:** click **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
Keep **Who has access: Anyone**. The URL stays the same.

**If you ever make a brand-new deployment**, you get a new URL. Paste it into `serverURL` in
`js/game-config.js` and upload that file.

---

## Testing

1. Open the testing link: https://kampung-raya-rush.github.io/?debug=true
2. Use the red panel at the bottom: **Jump to that page**, **Skip current page**, **Reset entire hunt**.
3. Test sign-ups are marked **TEST**. They never get a place, but their photos still upload, so you can check the dashboard
   (tick **Show test players**).
4. Test on a **real iPhone and a real Android phone**: Save, Share, and check the photo reaches the dashboard.

---

## Event-day checklist

- [ ] In `js/game-config.js`: set `debugAllowed: false,` and upload it.
- [ ] `eventHashtag` and `instagramURL` are correct.
- [ ] In the Google Sheet, delete the test rows in **Players**, **Photos** and **Log** (keep row 1 in each).
- [ ] Delete the test photos in the Drive folder **Kampung Raya Rush photos**.
- [ ] Print the QR code from the QR maker and check it opens the game.
- [ ] Syirin (and anyone else at the finish) knows the PIN.
- [ ] The dashboard is open on a laptop or tablet at Bazaar 1961.
- [ ] Remind players: open the link in **Safari or Chrome**, and press **Save** or **Share** on every photo.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site shows **404** or old content after an upload | Wait 2–5 minutes. If it's still wrong, open the **Actions** tab, click the stuck "pages build and deployment", **Cancel**, then **Re-run all jobs**. |
| Phone still shows the old version | Refresh twice, or close the tab and open the link again. |
| Dashboard has no photos | Tick **Show test players** (test photos are hidden). Photos only arrive when a player presses **Save** or **Share**. |
| Sign-up says it can't reach the timer | Check the phone has internet. Check the Google script is still deployed with **Who has access: Anyone**. |
| "Unknown page type" message | In testing mode press **Reset entire hunt**. |
| Player lost their progress | They cleared their browser data. They need to sign up again (new timer). |
| Wrong PIN at the finish | The PIN is `ORGANISER_PIN` in the Google script. |

---

## Good to know

- The timer runs on Google's clock, so changing a phone's time does nothing.
- Progress is saved on each phone. Players can close the page and come back to the same spot.
- Pressing **STOP MY TIMER** twice on the same phone doesn't change the result.
- Players need mobile data or Wi-Fi to sign up, to send photos, and at the finish.
