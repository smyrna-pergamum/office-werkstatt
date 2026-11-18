#!/usr/bin/env python3
"""Office Werkstatt – rename the bundled engines in everything the user can see.
WordCraft → Word Werkzeug Pro · GridCraft → Excel Werkzeug Pro · DeckCraft → Slide Werkzeug Pro
Only text inside string literals, translation catalogs and JSON assets is changed (identifiers,
crate names and storage keys stay), so the code still builds. Source links to the upstream
projects are removed from the About dialogs. The licence files are left untouched as required.
  python3 scripts/rebrand-engines.py <repo-or-i18n-dir> [...]"""
import re, sys, pathlib
NAMES = [('WordCraft', 'Word Werkzeug Pro'), ('Wordcraft', 'Word Werkzeug Pro'), ('WORDCRAFT', 'WORD WERKZEUG PRO'),
         ('GridCraft', 'Excel Werkzeug Pro'), ('Gridcraft', 'Excel Werkzeug Pro'), ('GRIDCRAFT', 'EXCEL WERKZEUG PRO'),
         ('DeckCraft', 'Slide Werkzeug Pro'), ('Deckcraft', 'Slide Werkzeug Pro'), ('DECKCRAFT', 'SLIDE WERKZEUG PRO')]
WORD = re.compile(r'(?:(?<![A-Za-z0-9_])|(?<=\\[nt]))(' + '|'.join(n for n, _ in NAMES) + r')(?![A-Za-z0-9_])')
MAP = dict(NAMES)
STR = re.compile(r'r#*"(?:.|\n)*?"#*|"(?:[^"\\\n]|\\(?:.|\n))*"')
URL_LINE = re.compile(r'^[^\n]*hyperlink_to\([^\n]*(?:storytold/|getartcraft\.com/apps/)[^\n]*\n', re.M)
def in_strings(text):
    def fix(m):
        s = m.group(0)
        if s.startswith('"') and re.fullmatch(r'"[a-z0-9_.\-/:]*"', s):  # ids, keys, paths
            return s
        return WORD.sub(lambda w: MAP[w.group(1)], s)
    return STR.sub(fix, text)
changed = 0
for root in sys.argv[1:]:
    for p in pathlib.Path(root).rglob('*'):
        if not p.is_file() or '/target/' in str(p) or '/.git/' in str(p) or '/tests' in str(p) or p.name.startswith('LICENSE') or p.name in ('NOTICE', 'ATTRIBUTION.md'):
            continue
        if p.suffix == '.rs':
            t = p.read_text(encoding='utf-8', errors='surrogateescape'); n = URL_LINE.sub('', in_strings(t))
        elif p.suffix in ('.tsv', '.json') or (p.suffix == '.html' and 'apps' in p.parts):
            t = p.read_text(encoding='utf-8', errors='surrogateescape'); n = WORD.sub(lambda w: MAP[w.group(1)], t)
            if p.suffix == '.tsv':  # inflected forms in other languages (WordCrafts, WordCraftom …)
                n = re.sub('|'.join(k for k, _ in NAMES), lambda w: MAP[w.group(0)], n)
        else:
            continue
        if n != t:
            p.write_text(n, encoding='utf-8', errors='surrogateescape'); changed += 1
print(f'rebranded {changed} files')
