@echo off
REM Office Werkstatt – push this folder to GitHub and create the release (needs git; GitHub CLI "gh" for the release)
cd /d "%~dp0"
if not exist ".git" (
  git init -b main
  git remote add origin https://github.com/smyrna-pergamum/office-werkstatt.git
  git add -A
  git commit -m "Office Werkstatt 1.1"
)
git push -u origin main --force-with-lease
if exist "..\Office-Werkstatt-Setup-1.1.0.exe" copy /y "..\Office-Werkstatt-Setup-1.1.0.exe" . >nul
where gh >nul 2>nul && (
  gh release create v1.1.0 "Office-Werkstatt-Setup-1.1.0.exe" --repo smyrna-pergamum/office-werkstatt --title "Office Werkstatt 1.1.0" --notes-file RELEASE_NOTES.md
) || (
  echo GitHub CLI (gh) yok: https://github.com/smyrna-pergamum/office-werkstatt/releases/new adresinde v1.1.0 etiketiyle yeni surum olusturup .exe dosyasini surukleyin.
)
pause
