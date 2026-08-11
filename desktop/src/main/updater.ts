import { app, autoUpdater, dialog } from 'electron';

const server = 'https://your-update-server.com'; // Replace with your update server URL
const feed = `${server}/update/${process.platform}/${app.getVersion()}`;

export const initializeUpdater = () => {
    autoUpdater.setFeedURL({ url: feed });

    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            buttons: ['OK'],
            title: 'Update Available',
            message: 'A new version is available. Downloading now...',
        });
    });

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            buttons: ['Restart', 'Later'],
            title: 'Update Ready',
            message: 'Update downloaded. Restart the application to apply the updates.',
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    autoUpdater.on('error', (error) => {
        console.error('Error in auto-updater:', error);
    });

    autoUpdater.checkForUpdates();
};