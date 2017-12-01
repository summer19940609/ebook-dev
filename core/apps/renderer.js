/**
 * 渲染进程
 * author:chenshenhao
 * createTime:2017.4.5
 * updateTime:2017.8.14
 */
const electron = require('electron')
const shell = electron.shell
const app = electron.ipcRenderer
const BrowserWindow = electron.remote.BrowserWindow
const win = electron.remote.getCurrentWindow();
const fs = require('fs')
const path = require('path')
const config = require(path.resolve(__dirname, '../../app/config'));
const staticUrl = path.resolve(__dirname, '../../app/' + config.staticUrl)
console.log(staticUrl)

onload = () => {
    document.title = config.title
    let webview = document.getElementById('webview');
    let toolBarBtn = document.getElementById('toolBarBtn');
    webview.src = staticUrl
    webview.addEventListener('console-message', (e) => {
            console.log('Guest page logged a message:', e.message)
        })
        // 此处是对弹出新窗口的拦截，本app目前只支持一个窗口
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        webview.loadURL(e.url);
    });
    webview.addEventListener('dom-ready', () => {
        // webview.openDevTools()
        // webview.loadURL();
    })
    webview.addEventListener('keydown', (e) => {
        if (process.platform !== 'darwin') {
            if (e.keyCode === 123) {
                if (webview.isDevToolsOpened()) {
                    webview.closeDevTools()
                } else {
                    webview.openDevTools()
                }
            }
        } else {
            if (e.keyCode === 123) {
                if (webview.isDevToolsOpened()) {
                    webview.closeDevTools()
                } else {
                    webview.openDevTools()
                }
            }
        }
    })

    //判断是否全屏
    function judgeFullScreen() {
        console.log(win.isFullScreen());
        if (!win.isFullScreen()) {
            toolBarBtn.style.display = 'none';
        } else {
            toolBarBtn.style.display = 'flex';
        }
    }
    // judgeFullScreen();
}


let toolBarBtn = document.getElementById('toolBarBtn');
let minimize = document.getElementById('minimize');
let fullscreen = document.getElementById('fullscreen');
let closeApp = document.getElementById('closeApp');

// //进入全屏
// win.on('enter-full-screen', (e) => {
//         console.log(e);
//         toolBarBtn.style.display = 'flex';
//     })
//     //退出全屏
// win.on('leave-full-screen', (e) => {
//         console.log(e);
//         toolBarBtn.style.display = 'none';
//     })
    // 最小化接口
minimize.onclick = function minimize() {
    app.send('minimize')
}

// 最大化接口
fullscreen.onclick = function fullscreen() {
    app.send('fullscreen')
}

// 退出app接口
closeApp.onclick = function closeApp() {
    console.log("关闭");
    app.send('exit')
}

const downloadSuccess = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadSuccess', message);
    console.log(obj.id + obj.message)
};
const downloadProgress = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadProgress', message);
    console.log("下载任务" + obj.id + ":" + obj.progress)
};
const downloadStart = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadStart', message);
    console.log(obj.id + obj.message)
};
const downloadFailed = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadFailed', message);
    console.log(obj.id + obj.message)
};
const uploadSuccess = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadSuccess', message);
    console.log(obj.id + obj.message + obj.body)
};
const uploadProgress = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadProgress', message);
    console.log("上传" + obj.id + ":" + obj.progress)
};
const uploadStart = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadStart', message);
    console.log(obj.id + obj.message)
};
const uploadFailed = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadFailed', message);
    console.log(obj.id + obj.message)
};
const listenToolBar = (event, message) => {
    let flag = message;
    if (flag === 'show') {
        toolBarBtn.style.display = 'flex';
    } else {
        toolBarBtn.style.display = 'none';
    }
}


app.on('uploadProgress', uploadProgress)
app.on('uploadStart', uploadStart)
app.on('uploadSuccess', uploadSuccess)
app.on('uploadFailed', uploadFailed)
app.on('downloadProgress', downloadProgress)
app.on('downloadStart', downloadStart)
app.on('downloadSuccess', downloadSuccess)
app.on('downloadFailed', downloadFailed)
app.on('listenToolBar', listenToolBar)