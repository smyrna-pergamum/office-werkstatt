#!/usr/bin/env node
/* Removes the Discord / community links from the Word/Excel/Slide Werkzeug Pro engine UI before building.
 *   node scripts/remove-community-links.js <repo-dir>                                              */
'use strict';
const fs = require('fs'), path = require('path');
const repo = process.argv[2];
const edits = [
  ['crates/ui-egui/src/chrome.rs', /if app\.ui\.show_discord \{/, 'if false && app.ui.show_discord {'],
  ['crates/ui-egui/src/backstage.rs', /fn bottom_links\(app: &WordApp\)[\s\S]*?\n\}/, 'fn bottom_links(_app: &WordApp) -> Vec<(&\'static str, &\'static str)> {\n    vec![("About", "about")]\n}'],
  ['crates/ui-egui/src/ribbon/review.rs', /\n\s*big\(ui, app, "discord".*\n/, '\n'],
  ['crates/ui-egui/src/keytips.rs', /c\("Community Discord", "ui\.discord"\), /, ''],
  ['crates/ui-egui/src/dialogs/dispatch.rs', /\n\s*ui\.hyperlink_to\(tl!\("Join us on Discord[^\n]*/, ''],
  ['crates/ui-egui/src/dialogs/about.rs', /\n\s*ui\.hyperlink_to\("Join (the ArtCraft|our community on) Discord[^\n]*/, ''],
  ['crates/ui-egui/src/backstage/info.rs', /\n\s*ui\.hyperlink_to\("Join our community on Discord[^\n]*/, ''],
  ['crates/ui-egui/src/backstage/files.rs', /\n\s*ui\.hyperlink_to\("Join the ArtCraft community on Discord[^\n]*/, ''],
];
for (const [f, re, rep] of edits) {
  const p = path.join(repo, f); if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8'), n = s.replace(re, rep);
  if (n !== s) { fs.writeFileSync(p, n); console.log('  community link removed:', f); }
}
