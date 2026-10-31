/* =====================================================================
   KAMPUNG RAYA RUSH — TIMER, PHOTOS + DASHBOARD  (Google Apps Script)
   =====================================================================
   This runs inside YOUR Google Sheet (free). It:
     - records every sign-up and stamps the start time (Google's clock,
       so nobody can fake it from their phone)
     - logs every step a player finishes, with a time stamp
     - saves the photos players save/share into a Google Drive folder
     - when the organiser types the PIN at the finish, stamps the finish
       time and works out 1st / 2nd / 3rd
     - sends all of this to dashboard.html (password protected)

   SET-UP: see README.md, part 3. Short version:
     1. Make a new Google Sheet.  Extensions → Apps Script.
     2. Delete what's there, paste this whole file, click Save.
     3. Change the settings just below.
     4. Run the "setup" function once (allow the permissions it asks for).
     5. Deploy → New deployment → Web app.
        Execute as: Me.   Who has access: Anyone.   → Deploy.
     6. Copy the Web app URL into serverURL in js/game-config.js.
   ===================================================================== */

// >>> 1. THE ORGANISER PIN (typed on the player's phone at the finish) <<<
//     Keep it secret. Leave it '' to let players stop their own timer.
var ORGANISER_PIN = '1961';

// >>> 2. THE DASHBOARD PASSWORD (to open dashboard.html) <<<
var DASHBOARD_PASSWORD = 'change-me';

// >>> 3. ANYONE FASTER THAN THIS (minutes) IS MARKED "CHECK" <<<
//     They don't get a place (1st / 2nd / 3rd…). You decide.
var MIN_MINUTES = 20;

// Name of the Google Drive folder the photos go into
var PHOTO_FOLDER_NAME = 'Kampung Raya Rush photos';

/* ---------------------------------------------------------------------
   You don't need to change anything below this line.
   --------------------------------------------------------------------- */
var PLAYERS = 'Players', PHOTOS = 'Photos', LOG = 'Log';
var HEAD = ['Player ID', 'Name', 'Phone', 'Started', 'Last step', 'Last step at', 'Steps done',
            'Finished', 'Total time', 'Place', 'Notes', 'Start ms', 'Last ms', 'Finish ms'];
var PHOTO_HEAD = ['Time', 'Player ID', 'Name', 'Page', 'Photo link', 'File ID', 'Time ms'];
var LOG_HEAD = ['Time', 'Player ID', 'Name', 'What happened', 'Time ms'];
var COL = {}; HEAD.forEach(function (h, i) { COL[h] = i + 1; });

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [[PLAYERS, HEAD, 3], [PHOTOS, PHOTO_HEAD, 2], [LOG, LOG_HEAD, 2]].forEach(function (t) {
    var sh = ss.getSheetByName(t[0]) || ss.insertSheet(t[0]);
    sh.getRange(1, 1, 1, t[1].length).setValues([t[1]]).setFontWeight('bold').setBackground('#ffc83a');
    sh.setFrozenRows(1);
    sh.hideColumns(t[1].length - t[2] + 1, t[2]);   // hide the "ms" helper columns
  });
  ss.getSheetByName(PLAYERS).getRange('C:C').setNumberFormat('@');   // keep phone numbers as text
  folder();                                                           // creates the Drive folder
  return 'Ready';
}

/* ---------------------------------------------------------------------
   The game talks to doPost, the dashboard talks to doGet
   --------------------------------------------------------------------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'dashboard') {
    if (String(p.key || '') !== String(DASHBOARD_PASSWORD)) return out({ ok: false, error: 'key' });
    return out(dashboard());
  }
  return out({ ok: true, message: 'Kampung Raya Rush timer is running.' });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad-request' }); }

  // Photos are written to Drive BEFORE taking the lock, so one slow upload
  // doesn't make everyone else wait.
  var photo = null;
  if (body.action === 'photo') {
    if (!body.data || !findRow(sheet(PLAYERS), body.id)) return out({ ok: false, error: 'unknown-player' });
    try { photo = savePhotoFile(body); } catch (err) { return out({ ok: false, error: 'drive: ' + err }); }
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return out({ ok: false, error: 'busy' }); }
  try {
    if (body.action === 'start') return out(start(body));
    if (body.action === 'progress') return out(progress(body));
    if (body.action === 'photo') return out(recordPhoto(body, photo));
    if (body.action === 'finish') return out(finish(body));
    return out({ ok: false, error: 'unknown-action' });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */
function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { setup(); sh = ss.getSheetByName(name); }
  return sh;
}

function folder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

// stops "=FORMULA" tricks in names
function clean(s, max) { return String(s == null ? '' : s).replace(/^[=+\-@]/, "'$&").slice(0, max || 80); }

function findRow(sh, id) {
  var last = sh.getLastRow();
  if (last < 2 || !id) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function nameOf(sh, r) { return r ? String(sh.getRange(r, COL['Name']).getValue()) : ''; }

function log(id, name, what, now) {
  sheet(LOG).appendRow([now, id, name, clean(what, 200), now.getTime()]);
}

/* ---------------------------------------------------------------------
   Actions from the game
   --------------------------------------------------------------------- */
function start(b) {
  var sh = sheet(PLAYERS), now = new Date();
  var id = (b.test ? 'TEST-' : 'P-') + Utilities.getUuid().slice(0, 8).toUpperCase();
  var row = [];
  row[COL['Player ID'] - 1] = id;
  row[COL['Name'] - 1] = clean(b.name);
  row[COL['Phone'] - 1] = clean(b.phone, 30);
  row[COL['Started'] - 1] = now;
  row[COL['Last step'] - 1] = 'signed up';
  row[COL['Last step at'] - 1] = now;
  row[COL['Steps done'] - 1] = 1;
  row[COL['Notes'] - 1] = b.test ? 'TEST (debug mode)' : '';
  row[COL['Start ms'] - 1] = now.getTime();
  row[COL['Last ms'] - 1] = now.getTime();
  for (var i = 0; i < HEAD.length; i++) if (row[i] === undefined) row[i] = '';
  sh.appendRow(row);
  log(id, clean(b.name), 'Signed up — timer started', now);
  return { ok: true, id: id, startMs: now.getTime(), serverNow: Date.now() };
}

function progress(b) {
  var sh = sheet(PLAYERS), r = findRow(sh, b.id);
  if (!r) return { ok: false, error: 'unknown-player' };
  if (sh.getRange(r, COL['Finish ms']).getValue()) return { ok: true };
  var now = new Date(), step = clean(b.step);
  sh.getRange(r, COL['Last step'], 1, 3).setValues([[step, now, Number(b.n) || '']]);
  sh.getRange(r, COL['Last ms']).setValue(now.getTime());
  var what = step.indexOf('arrived-') === 0 ? 'Scanned QR ' + step.slice(8) : 'Finished page: ' + step;
  log(b.id, nameOf(sh, r), what, now);
  return { ok: true };
}

function savePhotoFile(b) {
  var name = clean(b.name, 120).replace(/^'/, '') || ('photo-' + Date.now() + '.jpg');
  var blob = Utilities.newBlob(Utilities.base64Decode(b.data), 'image/jpeg', b.id + '-' + name);
  var file = folder().createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { id: file.getId(), url: file.getUrl() };
}

function recordPhoto(b, photo) {
  var sh = sheet(PLAYERS), r = findRow(sh, b.id), now = new Date(), name = nameOf(sh, r);
  sheet(PHOTOS).appendRow([now, b.id, name, clean(b.label || b.step, 120), photo.url, photo.id, now.getTime()]);
  log(b.id, name, 'Photo: ' + (b.label || b.step), now);
  return { ok: true, fileId: photo.id };
}

function finish(b) {
  var sh = sheet(PLAYERS), r = findRow(sh, b.id);
  if (!r) return { ok: false, error: 'unknown-player' };
  if (ORGANISER_PIN && String(b.pin || '') !== String(ORGANISER_PIN)) return { ok: false, error: 'pin' };

  var vals = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  var startMs = Number(vals[COL['Start ms'] - 1]);

  // Already finished? Give back the same result.
  if (vals[COL['Finish ms'] - 1]) {
    return { ok: true, place: vals[COL['Place'] - 1] || null, totalMs: Number(vals[COL['Finish ms'] - 1]) - startMs, again: true };
  }

  var now = new Date(), totalMs = now.getTime() - startMs;
  var isTest = String(vals[0]).indexOf('TEST-') === 0 || b.test;
  var notes = String(vals[COL['Notes'] - 1] || '');
  var place = '';

  if (!isTest) {
    if (totalMs < MIN_MINUTES * 60000) {
      notes = (notes ? notes + ' / ' : '') + 'CHECK: finished in under ' + MIN_MINUTES + ' min';
    } else {
      var last = sh.getLastRow(), finishedBefore = 0;
      sh.getRange(2, COL['Place'], last - 1, 1).getValues().forEach(function (p) { if (Number(p[0]) > 0) finishedBefore++; });
      place = finishedBefore + 1;
      if (place <= 3) notes = (notes ? notes + ' / ' : '') + '🏆 #' + place;
    }
  }

  sh.getRange(r, COL['Last step'], 1, 3).setValues([['FINISHED', now, vals[COL['Steps done'] - 1]]]);
  sh.getRange(r, COL['Finished'], 1, 4).setValues([[now, duration(totalMs), place, notes]]);
  sh.getRange(r, COL['Last ms']).setValue(now.getTime());
  sh.getRange(r, COL['Finish ms']).setValue(now.getTime());
  if (place && place <= 3) sh.getRange(r, 1, 1, HEAD.length).setBackground('#fff2c2');
  log(b.id, vals[COL['Name'] - 1], 'FINISHED in ' + duration(totalMs) + (place ? ' — place ' + place : ''), now);

  return { ok: true, place: place || null, totalMs: totalMs };
}

/* ---------------------------------------------------------------------
   Data for dashboard.html
   --------------------------------------------------------------------- */
function rows(name, width) {
  var sh = sheet(name), last = sh.getLastRow();
  return last < 2 ? [] : sh.getRange(2, 1, last - 1, width).getValues();
}

function dashboard() {
  var players = rows(PLAYERS, HEAD.length).map(function (v) {
    return {
      id: String(v[0]), name: String(v[1]), phone: String(v[2]),
      lastStep: String(v[COL['Last step'] - 1]), stepsDone: Number(v[COL['Steps done'] - 1]) || 0,
      place: Number(v[COL['Place'] - 1]) || null, notes: String(v[COL['Notes'] - 1]),
      startMs: Number(v[COL['Start ms'] - 1]) || null, lastMs: Number(v[COL['Last ms'] - 1]) || null,
      finishMs: Number(v[COL['Finish ms'] - 1]) || null
    };
  });
  var photos = rows(PHOTOS, PHOTO_HEAD.length).slice(-150).reverse().map(function (v) {
    return { id: String(v[1]), name: String(v[2]), label: String(v[3]), url: String(v[4]), fileId: String(v[5]), ms: Number(v[6]) };
  });
  var events = rows(LOG, LOG_HEAD.length).slice(-150).reverse().map(function (v) {
    return { id: String(v[1]), name: String(v[2]), what: String(v[3]), ms: Number(v[4]) };
  });
  return { ok: true, serverNow: Date.now(), players: players, photos: photos, log: events };
}

function duration(ms) {
  var t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
