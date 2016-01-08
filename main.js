'use strict';
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const MT = require('mt-front-util');
// Report crashes to our server.
electron.crashReporter.start();

//catch exception
process.on('uncaughtException', function (err) {
    console.log(err.stack);
    MSG.send('error', JSON.stringify(err));
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1200, height: 800, type:'textured'});

    global.MSG = mainWindow.webContents;
    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    ipc.on('message', function (o, data) {
        data = JSON.parse(data);
        console.log(data);
        MT[data.method](data.data);
    });

    event.on('message', function (type, path) {
        MSG.send('message', JSON.stringify({
                status: type,
                path: path
            })
        );
    }.bind(this))
});
