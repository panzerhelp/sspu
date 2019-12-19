const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

// Configure log debugging
autoUpdater.logger = require('electron-log');

autoUpdater.logger.transports.file.level = 'info';

// diable auto downloading of updates
autoUpdater.autoDownload = false;

// check for and apply any avaliable updates
module.exports = () => {
  // check for updates (GH releases)
  autoUpdater.checkForUpdates();

  // check for the update available event
  autoUpdater.on('update-available', () => {
    // prompt to start updater
    dialog.showMessageBox(
      {
        type: 'info',
        title: 'Update available',
        message:
          'A new version of SSPU is available. Do you want to update now?',
        buttons: ['Update', 'Do Not Update']
      },
      buttonIndex => {
        // 0 - update button
        if (buttonIndex === 0) {
          autoUpdater.downloadUpdate();
        }
      }
    );

    // Listen for update downloaded
    autoUpdater.on('update-downloaded', () => {
      // prompt the user to install the  update
      dialog.showMessageBox(
        {
          type: 'info',
          title: 'Update ready',
          message: 'Install and update now?',
          buttons: ['Insall Now', 'Later']
        },
        buttonIndex => {
          // yes button
          if (buttonIndex === 0) {
            autoUpdater.quitAndInstall(false, true);
          }
        }
      );
    });
  });
};
