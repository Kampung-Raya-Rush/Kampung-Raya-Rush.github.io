/* =====================================================================
   KAMPUNG RAYA RUSH — TIMER + WINNERS  (Google Apps Script)
   =====================================================================
   This runs inside YOUR Google Sheet. It:
     - records every sign-up and stamps the start time (Google's clock,
       so nobody can fake it from their phone)
     - writes each player's latest step, so you can watch them live
     - when the organiser types the PIN at the finish, stamps the finish
       time, works out 1st / 2nd / 3rd and gives out the winner codes.
       Each winner code is given out ONCE only.

   SET-UP: see README.md, part 3. Short version:
     1. Make a new Google Sheet.  Extensions → Apps Script.
     2. Delete what's there, paste this whole file, click Save.
     3. Change the 3 settings just below.
     4. Run the "setup" function once (allow the permissions it asks for).
     5. Deploy → New deployment → Web app.
        Execute as: Me.   Who has access: Anyone.   → Deploy.
     6. Copy the Web app URL into serverURL in js/game-config.js.
   ===================================================================== */

// >>> 1. YOUR WINNER CODES (1st, 2nd, 3rd) <<<
var WINNER_CODES = ['WINNER-CODE-1', 'WINNER-CODE-2', 'WINNER-CODE-3'];

// >>> 2. THE ORGANISER PIN (typed on the player's phone at the finish) <<<
//     Keep it secret. Leave it '' to let players stop their own timer.
var ORGANISER_PIN = '1961';

// >>> 3. ANYONE FASTER THAN THIS (minutes) IS MARKED "CHECK" <<<
//     They still get a normal code, but NOT a winner code. You decide.
var MIN_MINUTES = 20;

// Prefix for everyone else's completion code, e.g. HUNT-7KQ2
var CODE_PREFIX = 'HUNT-';

/* ---------------------------------------------------------------------
   You don't need to change anything below this line.
   --------------------------------------------------------------------- */
var SHEET = 'Players';
var HEAD = ['Player ID', 'Name', 'Phone', 'Started', 'Last step', 'Last step at', 'Steps done',
            'Finished', 'Total time', 'Place', 'Code', 'Notes', 'Start ms', 'Finish ms'];
var COL = {}; HEAD.forEach(function (h, i) { COL[h] = i + 1; });

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#ffc83a');
  sh.setFrozenRows(1);
  sh.hideColumns(COL['Start ms'], 2);
  sh.getRange('C:C').setNumberFormat('@');      // keep phone numbers as text (leading 0)
  sh.setColumnWidth(COL['Name'], 180);
  return 'Ready';
}

function doGet() {
  return out({ ok: true, message: 'Kampung Raya Rush timer is running.' });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad-request' }); }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return out({ ok: false, error: 'busy' }); }
  try {
    if (body.action === 'start') return out(start(body));
    if (body.action === 'progress') return out(progress(body));
    if (body.action === 'finish') return out(finish(body));
    return out({ ok: false, error: 'unknown-action' });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  if (!sh) { setup(); sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET); }
  return sh;
}

function clean(s, max) { return String(s == null ? '' : s).replace(/^[=+\-@]/, "'$&").slice(0, max || 80); }

function findRow(sh, id) {
  var last = sh.getLastRow();
  if (last < 2 || !id) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function start(b) {
  var sh = sheet(), now = new Date();
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
  for (var i = 0; i < HEAD.length; i++) if (row[i] === undefined) row[i] = '';
  sh.appendRow(row);
  return { ok: true, id: id, startMs: now.getTime(), serverNow: Date.now() };
}

function progress(b) {
  var sh = sheet(), r = findRow(sh, b.id);
  if (!r) return { ok: false, error: 'unknown-player' };
  if (sh.getRange(r, COL['Finished']).getValue()) return { ok: true };
  sh.getRange(r, COL['Last step'], 1, 3).setValues([[clean(b.step), new Date(), Number(b.n) || '']]);
  return { ok: true };
}

function finish(b) {
  var sh = sheet(), r = findRow(sh, b.id);
  if (!r) return { ok: false, error: 'unknown-player' };
  if (ORGANISER_PIN && String(b.pin || '') !== String(ORGANISER_PIN)) return { ok: false, error: 'pin' };

  var vals = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  var startMs = Number(vals[COL['Start ms'] - 1]);

  // Already finished? Give back the same result (never a second code).
  if (vals[COL['Finish ms'] - 1]) {
    return { ok: true, place: vals[COL['Place'] - 1] || null, code: vals[COL['Code'] - 1],
             totalMs: Number(vals[COL['Finish ms'] - 1]) - startMs, again: true };
  }

  var now = new Date(), totalMs = now.getTime() - startMs;
  var isTest = String(vals[0]).indexOf('TEST-') === 0 || b.test;
  var notes = String(vals[COL['Notes'] - 1] || '');
  var tooFast = totalMs < MIN_MINUTES * 60000;
  var place = '', code;

  if (isTest) {
    code = 'TEST-' + rand(4);
  } else {
    // place = how many real players finished before + 1
    var last = sh.getLastRow(), finishedBefore = 0;
    var places = sh.getRange(2, COL['Place'], last - 1, 1).getValues();
    places.forEach(function (p) { if (Number(p[0]) > 0) finishedBefore++; });
    if (tooFast) {
      notes = (notes ? notes + ' / ' : '') + 'CHECK: finished in under ' + MIN_MINUTES + ' min';
      code = CODE_PREFIX + rand(4);
    } else {
      place = finishedBefore + 1;
      code = place <= WINNER_CODES.length ? WINNER_CODES[place - 1] : CODE_PREFIX + rand(4);
      if (place <= WINNER_CODES.length) notes = (notes ? notes + ' / ' : '') + '🏆 WINNER #' + place;
    }
  }

  sh.getRange(r, COL['Last step'], 1, 3).setValues([['FINISHED', now, vals[COL['Steps done'] - 1]]]);
  sh.getRange(r, COL['Finished'], 1, 5).setValues([[now, duration(totalMs), place, code, notes]]);
  sh.getRange(r, COL['Finish ms']).setValue(now.getTime());
  if (place && place <= WINNER_CODES.length) sh.getRange(r, 1, 1, HEAD.length).setBackground('#fff2c2');

  return { ok: true, place: place || null, code: code, totalMs: totalMs, flagged: tooFast };
}

function rand(n) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function duration(ms) {
  var t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
