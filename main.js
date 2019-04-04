/**
 * 
 */
const {app, Menu, Tray, shell, dialog, ipcMain, globalShortcut, BrowserWindow,session} = require('electron')
//logger
const logger = require("electron-log")
const path = require('path')
//const url = require('url')
// 注意这个autoUpdater不是electron中的autoUpdater
const {
  autoUpdater
} = require("electron-updater")


/*****************************************配置 ****************************************************/

//加载web服务器地址
let loadUrl = ''
if(process.env.NODE_ENV !== 'production'){
  //测试环境
  loadUrl = "http://127.0.0.1:8081/"
}else{
  //正式环境
  loadUrl = "http://220.165.9.44:18081/"
}


/*****************************************配置 ****************************************************/



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
//主窗口
let mainWindow

//系统托盘
let tray
//窗口图标
let windowIcon = path.join(__dirname, 'static/icon.ico')

try {
  var pepflashplayer = "";
  pepflashplayer = app.getPath('pepperFlashSystemPlugin');
  app.commandLine.appendSwitch('ppapi-flash-path', pepflashplayer);
} catch (error) {
  shell.openExternal('https://www.flash.cn/')
  throw new Error('启动失败，未安装flash插件,请下载安装: (')
}
app.commandLine.appendSwitch("--disable-http-cache");

function createWindow() {
  //注册热键
  globalShortcut.register('CommandOrControl+R', function () {})
  globalShortcut.register('F5', function () {})
  globalShortcut.register('CommandOrControl+Shift+I', function () {
    if (mainWindow) {
      //开启调试工具
      mainWindow.openDevTools()
    }
  })
  // 隐藏菜单栏
  Menu.setApplicationMenu(null)
  // Create the browser window.
  //mainWindow = new BrowserWindow({ width: 800, height: 600 })
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hiddenInset', //隐藏标题栏, 显示小的控制按钮在窗口边缘
    useContentSize: true,
    show: false,
    width: 1024,
    height: 768,
    minWidth: 1024,
    minHeight: 768,
    //frame: false,
    // fullscreen:false,
    // //title: 'beidou',
    icon: 'static/icon.ico',
    // resizable: true,
    //skipTaskbar: true, //是否在任务栏中显示窗口. 默认值为false
    center: true,
    webPreferences: {
      plugins: true
    }
  })
  mainWindow.setIcon(windowIcon)
  //mainWindow.maximize()
  //全屏
  //mainWindow = new BrowserWindow({ fullscreen: true })

  //开启调试工具
  //mainWindow.webContents.openDevTools()
  // and load the index.html of the app.
  //加载本地项目地址
  // mainWindow.loadURL(
  //   url.format({
  //     pathname: path.join(__dirname, 'index.html'),
  //     protocol: 'file:',
  //     slashes: true
  //   })
  // )
  //加载远程项目地址
  mainWindow.loadURL(loadUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.setSkipTaskbar(true)
  })

  mainWindow.on('close', event => {
    // event.preventDefault()
    // dialog.showMessageBox(mainWindow, {
    //   type: 'info',
    //   title: '关闭程序',
    //   message: '是否最小化到系统托盘？',
    //   buttons: ['是', '否'],
    //   cancelId: 1
    // }, (buttonIndex) => {
    //   if (buttonIndex === 0) {
    //     mainWindow.hide()
    //     mainWindow.setSkipTaskbar(true)
    //   } else {
    //     app.quit()
    //     app.exit(0)
    //   }
    // })
    app.quit()
    app.exit(0)
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  //崩溃重启
  mainWindow.webContents.on('crashed', (event) => {
    const options = {
      type: 'error',
      title: '进程崩溃了',
      message: '这个进程已经崩溃.',
      buttons: ['重载', '退出'],
    };
    logger.error(`[Beidou] mainWindow crashed: ${event}`);
    dialog.showMessageBox(mainWindow, options, (index) => {
      if (index === 0) {
        if (mainWindow.isDestroyed()) {
          app.relaunch();
          app.exit(0);
        } else {
          BrowserWindow.getAllWindows().forEach((w) => {
            if (w.id !== mainWindow.id) w.destroy();
          });
          mainWindow.reload();
        }
      } else {
        app.quit();
        app.exit(0);
      }
    });
  })

  //窗口改变
  //窗口最大化时触发
  mainWindow.on('maximize', function () {
    sendSizeChangeMessage(true)
  })
  //当窗口从最大化状态退出时触发
  mainWindow.on('unmaximize', function () {
    sendSizeChangeMessage(false)
  })
  //窗口最小化时触发
  mainWindow.on('minimize', function () {
    sendSizeChangeMessage(false)
  })
  //在调整窗口大小之前发出。调用event.preventDefault()会阻止窗口大小被调整。
  mainWindow.on('will-resize', function (event) {
    event.preventDefault()
  })

  //窗口改变发送消息
  function sendSizeChangeMessage(text) {
    mainWindow.webContents.send('sizeChangeMessage', text)
  }


  trayIcon = path.join(__dirname, 'static') //app是选取的目录
  tray = new Tray(path.join(trayIcon, 'icon.ico'))
  //tray = new Tray('/static/img/defaultDriverHead.jpg')
  //图标的上下文菜单
  const contextMenu = Menu.buildFromTemplate([{
      label: '设置',
      click: function () {} //打开相应页面
    },
    {
      label: '意见反馈',
      click: function () {}
    },
    {
      label: '帮助',
      click: function () {
        shell.openExternal('http://www.yncwbd.com')
      }
    },
    {
      label: '关于',
      click: function () {}
    },
    {
      label: '退出',
      click: function () {
        //ipc.send('close-main-window');
        //app.exit(0)
        mainWindow.destroy()
        app.quit()
        app.exit(0)
      }
    }
  ])
  //设置此托盘图标的悬停提示内容
  tray.setToolTip('云南成为车联网北斗服务平台')
  //设置此图标的上下文菜单
  tray.setContextMenu(contextMenu)
  //单击右下角小图标显示应用
  tray.on('click', function () {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      mainWindow.setSkipTaskbar(false)
    } else {
      mainWindow.show()
      mainWindow.setSkipTaskbar(true)
    }
  })
  //双击
  tray.on('double-click', function () {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      mainWindow.setSkipTaskbar(false)
    } else {
      mainWindow.show()
      mainWindow.setSkipTaskbar(true)
    }
  })

  mainWindow.on('show', () => {
    tray.setHighlightMode('always')
  })
  mainWindow.on('hide', () => {
    tray.setHighlightMode('never')
  })
}

//单例(已失效)
// const isSecondInstance = app.makeSingleInstance(
//   (commandLine, workingDirectory) => {
//     // Someone tried to run a second instance, we should focus our window.
//     if (mainWindow) {
//       //最小化则还原
//       if (mainWindow.isMinimized()) myWimainWindowndow.restore()
//       mainWindow.focus()
//     }
//   }
// )

// if (isSecondInstance) {
//   app.quit()
// }
//使用单例
// const gotTheLock = app.requestSingleInstanceLock()

// if (!gotTheLock) {
//   app.exit(0)
//   //app.quit()
// } else {
//   app.on('second-instance', (event, commandLine, workingDirectory) => {
//     // Someone tried to run a second instance, we should focus our window.
//     if (mainWindow) {
//       if (mainWindow.isMinimized()) mainWindow.restore()
//       mainWindow.focus()
//     }
//   })

//   // Create myWindow, load the rest of the app, etc...
//   //app.on('ready', () => {})

//   // This method will be called when Electron has finished
//   // initialization and is ready to create browser windows.
//   // Some APIs can only be used after this event occurs.
//   app.on('ready', () => {
//     createWindow();
//     updateHandle();
//     newWindowHandle();
//   })

//   // Quit when all windows are closed.
//   app.on('window-all-closed', function () {
//     // On OS X it is common for applications and their menu bar
//     // to stay active until the user quits explicitly with Cmd + Q
//     if (process.platform !== 'darwin') {
//       app.quit()
//       app.exit(0)
//     }
//   })

//   app.on('activate', function () {
//     // On OS X it's common to re-create a window in the app when the
//     // dock icon is clicked and there are no other windows open.
//     if (mainWindow === null) {
//       createWindow()
//     }
//   })
// }

//不使用单例
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Create myWindow, load the rest of the app, etc...
//app.on('ready', () => {})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  updateHandle();
  newWindowHandle();
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
    app.exit(0)
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


// ipcMain
// 更新
function updateHandle() {
  let message = {
    error: '检查更新出错',
    checking: '正在检查更新……',
    updateAva: '检测到新版本，正在下载……',
    updateNotAva: '现在使用的就是最新版本，不用更新',
  };

  //autoUpdater.setFeedURL(uploadUrl);
  if(process.env.NODE_ENV !== 'production'){
    //测试环境
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
  }

  autoUpdater.on('error', function (error) {
    logger.error(`[Beidou] autoUpdater error: ${error}`);
    sendUpdateMessage(message.error)
  });
  autoUpdater.on('checking-for-update', function () {
    sendUpdateMessage(message.checking)
  });
  autoUpdater.on('update-available', function (info) {
    sendUpdateMessage(message.updateAva)
  });
  autoUpdater.on('update-not-available', function (info) {
    sendUpdateMessage(message.updateNotAva)
  });

  // 更新下载进度事件
  autoUpdater.on('download-progress', function (progressObj) {
    mainWindow.webContents.send('downloadProgress', progressObj)
  })
  autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

    ipcMain.on('updateNow', (event, arg) => {
      console.log("开始更新");
      //some code here to handle event
      autoUpdater.quitAndInstall();
    });

    mainWindow.webContents.send('isUpdateNow')
  });

  ipcMain.on("checkForUpdate", () => {
    //执行自动更新检查
    autoUpdater.checkForUpdates();
  })
}

// 通过main进程发送事件给renderer进程，提示更新信息
function sendUpdateMessage(text) {
  mainWindow.webContents.send('message', text)
}

//创建新窗口
function newWindowHandle() {
  ipcMain.on('showWindow', (events, args) => {
    if (isEmptyNullOrUndefined(args.url)) {
      throw new Error('参数错误: (')
    }
    if (isEmptyNullOrUndefined(args.token)) {
      throw new Error('参数错误: (')
    }
    // if (args.title === '' || args.title == null) {
    //   throw new Error('参数错误: (')
    // }
    // let value = localStorage.getItem('123')
    // app.commandLine.appendSwitch('ppapi-flash-path',app.getPath('pepperFlashSystemPlugin'))
    // app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.156')
    //this.createWindow(win, args) // .show()
    // event.sender.send('123', '111')
    const newWindow = new BrowserWindow({
      //parent: mainWindow,
      width: 1024,
      height: 768,
      show: false,
      // webPreferences: {
      //   plugins: true
      // }
      // resizable: false,
      // maximizable: true
    })
    // localStorage.setItem('123', true)
    newWindow.loadURL(args.url)
    const cookie = {
      url: args.url,
      name: 'Token',
      value: args.token
    }
    session.defaultSession.cookies.set(cookie, error => {
      if (error) throw new Error('系统异常，请联系管理员: (')
    })
    newWindow.setMenu(null)
    // 设置窗口图标
    if (process.platform !== 'darwin') {
      newWindow.setIcon(windowIcon)
    }
    let isTrue = isEmptyNullOrUndefined(args.title)
    if (!isTrue) {
      newWindow.setTitle(args.title)
    }
    newWindow.on('page-title-updated', event => {
      if (!isTrue) {
        event.preventDefault()
      }
    })
    newWindow.once('ready-to-show', () => {
      newWindow.show()
      //events.sender.send('123', '111')
    })
  })
}


//Common
function isUndefined (e) {
  return void 0 === e
}
function isEmptyNullOrUndefined (e) {
  return e === null || isUndefined(e) || e === ''
}
// function isNullOrUndefined (e) {
//   return e === null || isUndefined(e)
// }

// function getType (e) {
//   return Object.prototype.toString.call(e).slice(8, -1)
// }