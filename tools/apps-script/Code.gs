/**
 * Guest book backend for Vidhi & Jay's invitation.
 * Reads and writes a Google Sheet, so wishes appear on the website for everyone.
 *
 * Setup: open a Google Sheet -> Extensions -> Apps Script -> paste this in ->
 * Deploy -> New deployment -> Web app -> Execute as: Me, Access: Anyone -> Deploy.
 * Copy the /exec URL into WISH_ENDPOINT in script.js.
 */
var SHEET_NAME = 'Wishes';
var HEADERS = ['when', 'name', 'wish'];
var MAX_NAME = 40;
var MAX_WISH = 300;

function book_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function list_() {
  var sh = book_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, 3).getValues();
  return rows
    .filter(function (r) { return String(r[1]).trim() && String(r[2]).trim(); })
    .map(function (r) {
      var when = (r[0] instanceof Date)
        ? Utilities.formatDate(r[0], 'Asia/Kolkata', 'd MMM yyyy')
        : String(r[0]);
      return { when: when, name: String(r[1]).trim(), wish: String(r[2]).trim() };
    });
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action !== 'list') return out_({ ok: false, error: 'unknown action' });
  var items = list_();
  return out_({ ok: true, items: items });
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return out_({ ok: false, error: 'empty request' });

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'bad json' });
  }

  var name = String(data.name || '').trim().slice(0, MAX_NAME);
  var wish = String(data.wish || '').trim().slice(0, MAX_WISH);
  if (!name || !wish) return out_({ ok: false, error: 'missing name or wish' });

  // crude flood guard: no more than 40 wishes per hour overall
  var props = PropertiesService.getScriptProperties();
  var hour = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMddHH');
  var stamp = props.getProperty('hour') || '';
  var count = Number(props.getProperty('count') || 0);
  if (stamp !== hour) { stamp = hour; count = 0; }
  if (count >= 40) return out_({ ok: false, error: 'the wall is busy, try a little later' });
  props.setProperties({ hour: stamp, count: count + 1 });

  var when = data.when ? String(data.when).slice(0, 24)
    : Utilities.formatDate(new Date(), 'Asia/Kolkata', 'd MMM yyyy');

  book_().appendRow([when, name, wish]);
  return out_({ ok: true, items: list_() });
}
