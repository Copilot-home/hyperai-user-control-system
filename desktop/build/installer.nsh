!define PRODUCT_NAME "HyperAI User Control System"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Alpha Prime"
!define PRODUCT_URL "https://hyperai.example.com"

OutFile "installer.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"

Section "Install"
    SetOutPath "$INSTDIR"
    File /r "C:\path\to\your\build\*.*"  ; Adjust the path to your build files
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\your_executable.exe" "" "$INSTDIR\icon.png"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\your_executable.exe"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    RMDir "$INSTDIR"
SectionEnd

Function .onInit
    MessageBox MB_OK "Welcome to the ${PRODUCT_NAME} Installer!"
FunctionEnd

Function .onInstSuccess
    MessageBox MB_OK "Installation of ${PRODUCT_NAME} completed successfully!"
FunctionEnd

Function .onUninstSuccess
    MessageBox MB_OK "Uninstallation of ${PRODUCT_NAME} completed successfully!"
FunctionEnd