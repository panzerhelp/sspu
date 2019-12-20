const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

// Configure log debugging
autoUpdater.logger = require('electron-log');

autoUpdater.logger.transports.file.level = 'debug';

// diable auto downloading of updates
autoUpdater.autoDownload = false;

// check for and apply any avaliable updates
module.exports = () => {
  // check for updates (GH releases)
  autoUpdater.checkForUpdates();

  // check for the update available event
  autoUpdater.on('update-available', () => {
    // console.log('update available');

    // prompt to start updater
    const buttonIndex = dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update available',
      message: 'A new version of SSPU is available. Do you want to update now?',
      buttons: ['Update', 'Do Not Update']
    });

    if (buttonIndex === 0) {
      autoUpdater.downloadUpdate();
    }

    // Listen for update downloaded
    autoUpdater.on('update-downloaded', () => {
      // prompt the user to install the  update
      const buttonId = dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update ready',
        message: 'Install and update now?',
        buttons: ['Install Now', 'Later']
      });

      if (buttonId === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });
};
