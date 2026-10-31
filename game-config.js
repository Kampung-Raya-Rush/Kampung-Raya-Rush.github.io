/* =====================================================================
   GAME-CONFIG.JS  —  *** THIS IS THE ONLY FILE YOU NEED TO EDIT ***
   =====================================================================
   Everything players read (questions, answers, clues, hints, the poem,
   the route…) lives in this file.

   HOW TO EDIT SAFELY
   - Only change the text between the "quotation marks".
   - Do NOT delete commas (,) at the end of lines.
   - Do NOT delete the quotation marks themselves.
   - If your text contains a quotation mark, write it as \"  (backslash first)
   - Use \n to start a new line inside a text.
   - You can use these shortcuts inside any text; the game swaps them in:
         {hashtag}    -> your event hashtag
         {eventName}  -> the name of the event
   - Answers are NOT case-sensitive and extra spaces / punctuation are ignored.
     ("Red", "red ", " RED!" all match "red")
   ===================================================================== */

const GAME_CONFIG = {

  /* ---------------------------------------------------------------
     1. THE BIG STUFF  (change these first)
     --------------------------------------------------------------- */

  eventName: "Kampung Raya Rush",

  // Hashtag printed on the photos and shown to players. Keep the # at the front.
  eventHashtag: "#YOURHASHTAG",

  // Instagram / social link for the [ FOLLOW US ] button on the last screen.
  // Example: "https://www.instagram.com/youraccount/"   (leave "" to hide it)
  instagramURL: "",

  // Text used when someone taps [ SHARE THE HUNT ]
  shareText: "I just finished {eventName}! {hashtag}",
  shareURL: "",

  // Used to remember progress on the phone. Change it (e.g. "..._v4") if you
  // ever want EVERY player's saved progress to start fresh.
  storageKey: "kampungRayaRush_v3",

  // Testing mode (?debug=true on the address).
  // >>> Set this to false on the event day so players can't skip ahead. <<<
  debugAllowed: true,


  /* ---------------------------------------------------------------
     2. TIMER, PHOTOS + DASHBOARD  (the Google Sheet)
     ---------------------------------------------------------------
     serverURL: paste the "Web app URL" you get when you deploy
     google-apps-script.gs (see README.md, part 3). It looks like
       https://script.google.com/macros/s/AKfy....../exec
     Leave it "" and the game still works, but nothing is recorded
     and the dashboard stays empty.

     The organiser PIN and the dashboard password are NOT in this file
     (this file is public). They live in the Google script.
     --------------------------------------------------------------- */
  serverURL: "https://script.google.com/macros/s/AKfycbyxklKdjdPcv3CvC43whrBw2k1oTe-6icQU9MPD8mvv_D40yHlbEt3qb0gbDaEJfBGQ/exec",

  // true = at the very end the organiser types their PIN on the player's
  //        phone. That stops the timer. (Stops people skipping to the end.)
  finishNeedsOrganiserPin: true,

  // true = when a player SAVES or SHARES a photo, a copy is sent to your
  //        Google Drive and appears on the dashboard.
  sendPhotosToOrganisers: true,


  /* ---------------------------------------------------------------
     3. PHOTO WATERMARK (the footer drawn under every photo)
     --------------------------------------------------------------- */
  showPhotoDate: true,        // e.g. 30 OCT 2026
  showPhotoTime: true,        // e.g. 4:37 PM
  showPhotoHashtag: true,     // shows eventHashtag above
  photoFooterText: "Kampung Raya Rush • Melaka",   // "" = none

  // >>> LOGO AREA <<<  put assets/logo.png in the assets folder and set:
  //   logoPath: "assets/logo.png",
  logoPath: "",

  photoColors: {
    background: "#0f0d12",
    text: "#ffffff",
    accent: "#ffc83a",
    muted: "#cfc4d8"
  },
  photoMaxLongSide: 1920,
  photoJpegQuality: 0.92,
  photoFilePrefix: "kampung-raya-rush",

  photoText: {
    take: "TAKE PHOTO",
    choose: "CHOOSE FROM PHOTOS",
    working: "Developing your photo…",
    looksGood: "LOOKING GOOD.",
    retake: "RETAKE",
    save: "SAVE TO MY PHONE",
    share: "SHARE (INSTAGRAM, WHATSAPP…)",
    privacy: "When you save or share a photo, a copy is sent to the organisers.",
    sending: "Sending a copy to the organisers…",
    sent: "✓ Organisers have your photo.",
    sendFailed: "Couldn't send the photo to the organisers (no internet?). Press Save again to retry.",
    saveIOS: "Tap \"Save Image\" in the menu that opens.",
    saveAndroid: "Saved! Look in your Gallery or Downloads.",
    holdTip: "Didn't save? Press and hold the photo above, then choose Save / Download image.",
    hashtagCopied: "Hashtag copied. Paste it in your caption: {hashtag}",
    inApp: "You opened this inside another app (Instagram, WhatsApp…). Photos can't be saved here. Tap ⋯ or the share icon and choose \"Open in browser\" (Safari or Chrome).",
    error: "Hmm, we couldn't read that photo. Please try again."
  },


  /* ---------------------------------------------------------------
     4. FIRST SCREEN + SIGN-UP  (at Bazaar 1961 / Kampung Raya)
     --------------------------------------------------------------- */
  intro: {
    headline: "KAMPUNG RAYA RUSH",
    sub: "Clues, photos and a race across Melaka.\nThe clock starts when you sign up.",
    button: "SIGN UP & START",
    footer: "No guide.\nNo map.\nJust clues."
  },

  signup: {
    title: "SIGN UP",
    intro: "Fill this in, then press GO. Your timer starts straight away.",
    fields: [
      { key: "name",  label: "Your name (or team name)", placeholder: "e.g. Team Cendol", required: true },
      { key: "phone", label: "Phone number", placeholder: "e.g. 012 345 6789", type: "tel", required: true }
    ],
    privacyNote: "We only use your number to contact the winners. Photos you save or share during the hunt are sent to the organisers.",
    button: "GO! START MY TIMER",
    working: "Starting your timer…",
    errorNoNet: "Couldn't reach the timer. Check your internet and press GO again.",
    emptyMessage: "Please fill in every box."
  },

  // Shown when someone scans a QR code too early
  locked: {
    title: "NOT YET 🔒",
    line1: "You're getting ahead of yourself.",
    line2: "Finish the step before this one first.",
    button: "BACK TO MY HUNT"
  },

  // Shown under a clue when the next place has a QR code
  scanNote: "Found it? Scan the QR code there to continue.",
  nextButton: "NEXT →",


  /* ---------------------------------------------------------------
     5. THE POEM  (memorised at the mural, said to Syirin at the end)
     --------------------------------------------------------------- */
  poem: {
    // One line per entry.
    lines: [
      "Pantun seloka penuh ibrah,",
      "Adat sanjungan takkan hilang,",
      "Melawat Melaka penuh sejarah,",
      "Manis kenangan dibawa pulang."
    ],
    seconds: 30               // how long the poem stays on screen
  },


  /* ---------------------------------------------------------------
     6. THE ROUTE  —  one entry = one page
     ---------------------------------------------------------------
     stop:   which checkpoint the page belongs to (shown in the progress bar)
     qr:     put this on the FIRST page at a place that has a QR code.
             Players must scan that QR to open the page.
             The QR codes are: "cp1" "cp2" "cp3" "cp4" "final"
     type:   "questions"  → questions with right answers
             "poem"       → shows the poem once, then hides it
             "task"       → tick boxes + optional photo + optional answer box
             "people"     → several people on one page, a photo + answer each
             "finish"     → organiser stops the timer
     clue:   shown AFTER the page is done (leads to the next place).
     hints:  the HINT 1 / HINT 2 buttons.  hints: [] = no hint buttons.

     A "task" page can have:
       checks: ["tick box text", "another tick box"],
       photo:  true,                 ← needs a photo before they can continue
       answer: { label: "...", placeholder: "..." }   ← any answer is accepted
       answer: { label: "...", acceptedAnswers: ["..."] }  ← must be right
       link:   { url: "https://...", label: "OPEN" }   ← a button that opens a website
       button: "I FOUND IT →"        ← text on the button at the bottom
     --------------------------------------------------------------- */
  stops: ["START", "CP1", "CP2", "CP3", "TRAIL", "CP4", "FINAL"],

  steps: [

    /* ========== START — Bazaar 1961 (sign-up page, see section 4) ========== */
    {
      id: "signup", stop: "START", type: "signup", title: "SIGN UP",
      clue: {
        text: "Go to the nearest bridge and find a TURQUOISE GREEN building.",
        hints: ["Find the bridge first, then look around for the colour.", "The turquoise green building is Baba Kaya."]
      }
    },

    /* ========== CP1 — Baba Kaya ========== */
    {
      id: "cp1-questions", stop: "CP1", qr: "cp1", type: "questions",
      title: "CP1 — BABA KAYA",
      intro: "How well do you know Peranakan and Malay culture? Pick one answer for each question.",
      questions: [
        { type: "choice", prompt: "Peranakan culture is a blend of which two cultures?",
          options: ["Malay + Chinese", "Chinese + Indian", "Baba + Nyonya", "Malay + Indian"],
          acceptedAnswers: ["Malay + Chinese"] },
        { type: "choice", prompt: "Which traditional instrument is usually played at a Malay wedding?",
          options: ["Violin", "Sape", "Kompang", "Sitar"],
          acceptedAnswers: ["Kompang"] },
        { type: "choice", prompt: "What outfit do Peranakan women wear?",
          options: ["Kebaya", "Kebarung", "Sari", "Baju kurung"],
          acceptedAnswers: ["Kebaya"] },
        { type: "choice", prompt: "Which ingredient is used to make kaya?",
          options: ["Soy milk", "Honey", "Coconut milk", "Butter"],
          acceptedAnswers: ["Coconut milk"] },
        { type: "choice", prompt: "Which of these is commonly eaten with kaya toast?",
          options: ["Kimchi", "Soft-boiled eggs", "French fries", "Nachos"],
          acceptedAnswers: ["Soft-boiled eggs"] },
        { type: "choice", prompt: "What is the main flavour of curry laksa?",
          options: ["Sweet and salty", "Spicy and savoury", "Sour and salty", "Bitter and savoury"],
          acceptedAnswers: ["Spicy and savoury"] }
      ],
      wrongMessage: "Some answers are wrong (they shake). Try those again.",
      hints: ["Look around the shop. The menu and decorations can help.", "Ask the staff at Baba Kaya!"],
      doneTitle: "QUESTIONS DONE ✓"
    },
    {
      id: "cp1-puzzle", stop: "CP1", type: "task",
      title: "CP1 — THE PUZZLE",
      text: "Solve the jigsaw puzzle to see where you're going next.\n\nWhen it's done, come back to this page.",
      link: { url: "https://puzzel.org/en/jigsaw/play?p=-P5ACOZ9ME14hkJQbQCq", label: "🧩 OPEN THE PUZZLE" },
      checks: ["I finished the puzzle"],
      hints: ["Start with the corners and edges.", "The finished picture shows your next place."],
      doneTitle: "CP1 COMPLETE ✓",
      clue: {
        text: "You've seen the picture.\n\nNow go and find the real MURAL.",
        hints: []
      }
    },

    /* ========== CP2 — Mural ========== */
    {
      id: "cp2-poem", stop: "CP2", qr: "cp2", type: "poem",
      title: "CP2 — THE MURAL",
      introLines: ["⚠️ IMPORTANT ⚠️", "Memorise the poem at the mural.", "You'll need it at the very end to finish the hunt.", "Press the button to see it here too, but only for 30 seconds."],
      readyButton: "I'M READY",
      memoriseTitle: "MEMORISE THIS.",
      afterTitle: "IT'S GONE.",
      afterText: "Keep it in your head. You'll be asked for it at the finish.",
      doneTitle: "POEM MEMORISED ✓"
    },
    {
      id: "cp2-photo", stop: "CP2", type: "task",
      title: "CP2 — BECOME THE MURAL",
      text: "Pose like the mural and take a photo with it.\n\nSave the photo to your phone. Share it if you like!",
      photo: true,
      hints: ["Stand back so the whole mural fits in the photo.", "Ask a friend or a passer-by to take it."],
      doneTitle: "CP2 COMPLETE ✓",
      clue: {
        text: "Time doesn't stand still in this city.\nBut something here has been counting for centuries.\n\nFind the keeper of the chime.",
        hints: ["Look for something tall, red and very good at telling the time.", "Go to the Clock Tower in Dutch Square."]
      }
    },

    /* ========== CP3 — Clock Tower (3 people on one page) ========== */
    {
      id: "cp3-people", stop: "CP3", qr: "cp3", type: "people",
      title: "CP3 — PEOPLE OF MELAKA",
      text: "Talk to THREE different people near the Clock Tower and ask each one:\n\n“Describe Melaka in ONE word.”\n\nTake a photo with each person and type their answer.",
      count: 3,
      personLabel: "PERSON",
      answerLabel: "Their one word",
      hints: ["Locals, tourists, shopkeepers — anyone counts. Smile and say hello!"],
      doneTitle: "CP3 COMPLETE ✓",
      clue: {
        text: "Now follow the route and find FOUR animals hiding in the streets.\n\nOne page, one animal. Don't skip any!",
        hints: []
      }
    },

    /* ========== TRAIL — the animals ========== */
    {
      id: "animal-cow", stop: "TRAIL", type: "task",
      title: "ANIMAL 1 OF 4 — THE PINK COW",
      text: "Find the pink cow and pose beside it, take a photo with it.",
      checks: ["I found the pink cow"],
      photo: true,
      hints: ["Look for a windmill.", "It's on your right."],
      doneTitle: "PINK COW ✓"
    },
    {
      id: "animal-horse", stop: "TRAIL", type: "task",
      title: "ANIMAL 2 OF 4 — THE GOLDEN HORSE",
      text: "Find the golden horse and pose beside it, take a photo with it.",
      checks: ["I found the golden horse"],
      photo: true,
      hints: ["It's in front of you.", "Cross the bridge, then turn right."],
      doneTitle: "GOLDEN HORSE ✓",
      clue: {
        text: "Follow the way the golden horse is facing.",
        hints: ["Stand behind the horse and walk in the direction its head points."]
      }
    },
    {
      id: "animal-orangutan", stop: "TRAIL", type: "task",
      title: "ANIMAL 3 OF 4 — THE ORANGUTAN",
      text: "Find the orangutan and pose beside it, take a photo with it.",
      checks: ["I found the orangutan"],
      photo: true,
      hints: ["Look for a sign with fruits on it.", "Go straight all the way."],
      doneTitle: "ORANGUTAN ✓",
      clue: {
        text: "When you're feeling sick or pain is near,\nthere's a place that helps you feel better here.\nDoctors and nurses are ready to care.\nCan you find this place and get there?",
        hints: ["Go straight all the way.", "It's a clinic called PULSE."]
      }
    },

    /* ========== CP4 — Pulse ========== */
    {
      id: "cp4-postbox", stop: "CP4", qr: "cp4", type: "task",
      title: "CP4 — PULSE",
      text: "You found PULSE!\n\nNow find a POSTBOX nearby. Take a photo with it.",
      checks: ["I found the postbox"],
      photo: true,
      hints: [],
      doneTitle: "POSTBOX ✓"
    },
    {
      id: "cp4-bridge", stop: "CP4", type: "task",
      title: "CP4 — THE BRIDGE",
      text: "Walk over the bridge.",
      checks: ["I crossed the bridge"],
      hints: [],
      doneTitle: "BRIDGE ✓"
    },
    {
      id: "animal-chicken", stop: "CP4", type: "task",
      title: "ANIMAL 4 OF 4 — THE CHICKEN",
      text: "Find the chicken holding a bun and pose beside it, take a photo with it.",
      checks: ["I found the chicken holding a bun"],
      photo: true,
      hints: ["Look for a chicken behind bars.", "It's on your left."],
      doneTitle: "ALL 4 ANIMALS ✓",
      clue: {
        text: "Head straight back to where it all began.\n\nBazaar 1961 — Kampung Raya.\nYour last task is waiting.",
        hints: ["Go back to the place you signed up."]
      }
    },

    /* ========== FINAL — back at Bazaar 1961 ========== */
    {
      id: "final-vendor", stop: "FINAL", qr: "final", type: "task",
      title: "FINAL — A VENDOR",
      text: "Welcome back! Three photos to go.\n\nPhoto 1: take a photo with a VENDOR.",
      photo: true,
      doneTitle: "VENDOR ✓"
    },
    {
      id: "final-workshop", stop: "FINAL", type: "task",
      title: "FINAL — A WORKSHOP",
      text: "Photo 2: take a photo at a WORKSHOP.",
      photo: true,
      doneTitle: "WORKSHOP ✓"
    },
    {
      id: "final-artwork", stop: "FINAL", type: "task",
      title: "FINAL — AN ARTWORK",
      text: "Photo 3: take a photo with an ARTWORK.",
      photo: true,
      doneTitle: "ARTWORK ✓"
    },
    {
      id: "final-poem", stop: "FINAL", type: "task",
      title: "FINAL — THE POEM",
      text: "Remember the poem from the mural?\n\nFind Syirin (white bucket hat) and finish your last task.",
      button: "I FOUND SYIRIN →"
    },
    {
      id: "finish", stop: "FINAL", type: "finish",
      title: "LAST TASK",
      text: "Say the poem to Syirin.\nThen she'll type the PIN to stop your timer.",
      pinLabel: "ORGANISER PIN",
      pinPlaceholder: "Organiser types the PIN",
      button: "STOP MY TIMER",
      working: "Stopping your timer…",
      wrongPin: "That PIN isn't right.",
      errorNoNet: "Couldn't reach the timer. Check the internet and try again."
    }
  ],


  /* ---------------------------------------------------------------
     7. THE LAST SCREEN   ({time} = how long they took)
     --------------------------------------------------------------- */
  reveal: {
    title: "CONGRATS!!",
    text: "You finished the Kampung Raya Rush in the duration of {time}.",
    thanks: "Thank you for playing and we will see you at the next event!",
    followButton: "FOLLOW US",
    shareButton: "SHARE THE HUNT"
  },


  /* ---------------------------------------------------------------
     8. HELP SCREEN  ("STUCK?" button)
     --------------------------------------------------------------- */
  help: {
    title: "STUCK?",
    howItWorks: [
      "Each page is one task. Finish it to unlock the next.",
      "At some places you need to scan a QR code to continue.",
      "Your timer keeps running, even if you close the page.",
      "Your progress is saved on this phone. You can close the page and come back."
    ],
    hintsNote: "Open Hint 1 first. Only open Hint 2 if you're really stuck.",
    noHints: "No hints for this step. Read the clue on screen again, slowly.",
    techTitle: "Having technical problems?",
    troubleshooting: [
      "Refresh the page. Your progress is NOT lost.",
      "Scan the QR code again.",
      "Photos: open the hunt in Safari or Chrome, not inside Instagram or WhatsApp.",
      "Photos: allow camera access if your phone asks.",
      "Still stuck? Find an organiser."
    ]
  }

};
