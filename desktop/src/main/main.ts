import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { createMenu } from './menu';
import { checkForUpdates } from './updater';

let mainWindow: BrowserWindow | null;

const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.ts'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.loadURL('http://localhost:3000'); // Adjust the URL as needed

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

app.on('ready', () => {
    createMainWindow();
    createMenu();
    checkForUpdates();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

// IPC communication for user control
ipcMain.on('user-action', (event, action) => {
    // Handle user actions here
    console.log('User action received:', action);
});