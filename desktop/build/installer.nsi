; Office Werkstatt – offline Windows installer (per-user, no admin rights, no internet)
Unicode true
SetCompressor /SOLID lzma
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define APP "Office Werkstatt"
!define EXE "Office Werkstatt.exe"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfficeWerkstatt"
Name "${APP}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "Software\Januam\OfficeWerkstatt" "InstallDir"
RequestExecutionLevel user
BrandingText "Office Werkstatt ${VERSION} · Januam"
!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Turkish"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_RESERVEFILE_LANGDLL

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "${APP}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "Januam"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "${APP} Setup"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "© Januam"

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

!macro Assoc EXT DESC
  WriteRegStr HKCU "Software\Classes\.${EXT}\OpenWithProgids" "OfficeWerkstatt.${EXT}" ""
  WriteRegStr HKCU "Software\Classes\OfficeWerkstatt.${EXT}" "" "${DESC}"
  WriteRegStr HKCU "Software\Classes\OfficeWerkstatt.${EXT}\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "Software\Classes\OfficeWerkstatt.${EXT}\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\SupportedTypes" ".${EXT}" ""
!macroend
!macro Unassoc EXT
  DeleteRegValue HKCU "Software\Classes\.${EXT}\OpenWithProgids" "OfficeWerkstatt.${EXT}"
  DeleteRegKey HKCU "Software\Classes\OfficeWerkstatt.${EXT}"
!macroend

Section "Office Werkstatt" SecMain
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  SetOutPath "$INSTDIR"
  File /r "${SRC}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall Office Werkstatt.exe"
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortcut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\${APP}\Uninstall.lnk" "$INSTDIR\Uninstall Office Werkstatt.exe"
  CreateShortcut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}"
  ; "Open with Office Werkstatt" for office files (does not steal existing defaults)
  !insertmacro Assoc "docx" "Word Werkzeug"
  !insertmacro Assoc "werkzeug" "Office Werkstatt"
  !insertmacro Assoc "potx" "Slide Werkzeug"
  !insertmacro Assoc "ppsx" "Slide Werkzeug"
  !insertmacro Assoc "ods" "Excel Werkzeug"
  !insertmacro Assoc "xlsb" "Excel Werkzeug"
  !insertmacro Assoc "xlsm" "Excel Werkzeug"
  !insertmacro Assoc "rtf" "Word Werkzeug"
  !insertmacro Assoc "odt" "Word Werkzeug"
  !insertmacro Assoc "dotx" "Word Werkzeug"
  !insertmacro Assoc "docm" "Word Werkzeug"
  !insertmacro Assoc "ppt" "Slide Werkzeug"
  !insertmacro Assoc "xls" "Excel Werkzeug"
  !insertmacro Assoc "doc" "Word Werkzeug"
  !insertmacro Assoc "xlsx" "Excel Werkzeug"
  !insertmacro Assoc "pptx" "Slide Werkzeug"
  !insertmacro Assoc "pdf"  "PDF Werkzeug"
  !insertmacro Assoc "csv"  "Excel Werkzeug"
  !insertmacro Assoc "md"   "Note Werkzeug"
  !insertmacro Assoc "excalidraw" "Draw Werkzeug"
  !insertmacro Assoc "owdoc" "Office Werkstatt"
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}" "FriendlyAppName" "${APP}"
  WriteRegStr HKCU "Software\Januam\OfficeWerkstatt" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${REGKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${REGKEY}" "Publisher" "Januam"
  WriteRegStr HKCU "${REGKEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${REGKEY}" "UninstallString" '"$INSTDIR\Uninstall Office Werkstatt.exe"'
  WriteRegDWORD HKCU "${REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${REGKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${REGKEY}" "EstimatedSize" "$0"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$SMPROGRAMS\${APP}"
  !insertmacro Unassoc "docx"
  !insertmacro Unassoc "werkzeug"
  !insertmacro Unassoc "potx"
  !insertmacro Unassoc "ppsx"
  !insertmacro Unassoc "ods"
  !insertmacro Unassoc "xlsb"
  !insertmacro Unassoc "xlsm"
  !insertmacro Unassoc "rtf"
  !insertmacro Unassoc "odt"
  !insertmacro Unassoc "dotx"
  !insertmacro Unassoc "docm"
  !insertmacro Unassoc "ppt"
  !insertmacro Unassoc "xls"
  !insertmacro Unassoc "doc"
  !insertmacro Unassoc "xlsx"
  !insertmacro Unassoc "pptx"
  !insertmacro Unassoc "pdf"
  !insertmacro Unassoc "csv"
  !insertmacro Unassoc "md"
  !insertmacro Unassoc "excalidraw"
  !insertmacro Unassoc "owdoc"
  DeleteRegKey HKCU "Software\Classes\Applications\${EXE}"
  DeleteRegKey HKCU "${REGKEY}"
  DeleteRegKey HKCU "Software\Januam\OfficeWerkstatt"
  RMDir /r "$INSTDIR"
  ; documents in %APPDATA%\Office Werkstatt are kept on purpose
SectionEnd
