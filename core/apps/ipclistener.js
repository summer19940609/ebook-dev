/************************
 * 渲染进程监听器              *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.8.29 *
 ************************/

const ipc = require('electron').ipcMain
const app = require('electron').app
const dialog = require('electron').dialog
const path = require('path')
const config = require(path.resolve(__dirname, '../../app/config'));
const request = require('request')
const fs = require('fs-extra')
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.resolve(__dirname, '../../app/' + config.dbUrl));
const uuid = require('uuid')
const moment = require('moment');
const child = require('child_process')
const download_process = path.resolve(__dirname, __dirname + '/download.js')
const downloadBook_process = path.resolve(__dirname, __dirname + '/book_download.js')
const upload_process = path.resolve(__dirname, __dirname + '/upload.js')
const bookUrl = path.resolve(__dirname, '../../app/' + config.bookUrl)
const downloadPath = path.resolve(__dirname, '../../app/' + config.downloadPath)
const QRCode = require('qrcode')
const tar = require('tar')
const coreConfig = require(path.resolve(__dirname, __dirname + '/coreConfig'))

const appEvent = {
    appListener: () => {

        // post请求
        ipc.on('httpPost', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.post({
                url: data.url,
                body: data.data,
                json: true
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err
                    event.sender.send(data.callback, JSON.stringify(info));
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                event.sender.send(data.callback, JSON.stringify(info));
            });
        })

        //post请求form形式
        ipc.on('httpPost_Form', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.post({
                url: data.url,
                form: data.data
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err
                    event.sender.send(data.callback, JSON.stringify(info));
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                event.sender.send(data.callback, JSON.stringify(info));
            });
        })

        // get请求
        ipc.on('httpGet', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.get({
                url: data.url
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, JSON.stringify(info));
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                event.sender.send(data.callback, JSON.stringify(info));
            });
        })

        //get请求带参数form方式
        ipc.on('httpGet_Form', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.get({
                url: data.url,
                qs: data.data
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, JSON.stringify(info));
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                event.sender.send(data.callback, JSON.stringify(info));
            });
        })

        // get请求query方式
        ipc.on('httpGet_Query', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            var stringify = querystring.stringify(data.data);
            request({
                url: data.url + '?' + stringify
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, JSON.stringify(info));
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                event.sender.send(data.callback, JSON.stringify(info));
            });
        })

        // 新建教学过程
        ipc.on('addProcess', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function () {
                let stmt = db.prepare("INSERT INTO teach_process (id,book_id,user_id,page_id,chapter_id,section_id,course_id,count,pos_x,pos_y,create_time,update_time) VALUES ($id,$book_id,$user_id,$page_id,$chapter_id,$section_id,$course_id,$count,$pos_x,$pos_y,$create_time,$update_time)");
                stmt.run({
                    $id: pId,
                    $book_id: data.info.book_id,
                    $user_id: data.info.user_id,
                    $page_id: data.info.page_id,
                    $chapter_id: data.info.chapter_id,
                    $section_id: data.info.section_id,
                    $course_id: data.info.course_id,
                    $count: data.info.count,
                    $pos_x: data.info.pos_x,
                    $pos_y: data.info.pos_y,
                    $create_time: currentTime,
                    $update_time: currentTime
                }, (err) => {
                    stmt.finalize();
                    if (err) {
                        info.message = "新建教学过程错误"
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    } else {
                        for (let i = 0; i < data.data.length; i++) {
                            let resourceID = uuid.v4().replace(/-/g, '')
                            let stmt2 = db.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,download_url,view_url,edit_name,create_time) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$download_url,$view_url,$edit_name,$create_time)");
                            stmt2.run({
                                $id: resourceID,
                                $file_id: data.data[i].file_id,
                                $process_id: pId,
                                $detail_index: data.data[i].detail_index,
                                $file_name: data.data[i].file_name,
                                $ext_name: data.data[i].ext_name,
                                $convert_name: data.data[i].convert_name,
                                $download_url: data.data[i].download_url,
                                $view_url: data.data[i].view_url,
                                $edit_name: data.data[i].edit_name,
                                $create_time: currentTime
                            }, (err) => {
                                stmt2.finalize();
                                if (err) {
                                    info.message = "新建教学过程错误"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                    return false;
                                } else {
                                    if (i == data.data.length - 1) {
                                        info.flag = true
                                        info.message = "新建教学过程成功"
                                        info.data = {
                                            'id': pId
                                        }
                                        event.sender.send(data.callback, JSON.stringify(info));
                                    }
                                }
                            });
                        }

                    }
                });
            });
        })

        // 更新教学过程
        ipc.on('editProcess', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function () {
                if (data.data) {
                    let stmt = db.prepare("update teach_process set update_time = $update_time,pos_x = $pos_x,pos_y=$pos_y,count = $count where id = $id");
                    stmt.run({
                        $pos_x: data.info.pos_x,
                        $pos_y: data.info.pos_y,
                        $count: data.info.count,
                        $id: data.info.id,
                        $update_time: currentTime
                    }, (err) => {
                        stmt.finalize();
                        if (err) {
                            info.message = "编辑教学过程错误"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        } else {
                            let stmt3 = db.prepare("delete from process_files where process_id = $id");
                            stmt3.run({
                                $id: data.info.id
                            }, (err) => {
                                stmt3.finalize();
                                if (err) {
                                    info.message = "编辑教学过程错误"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                    return false;
                                } else {
                                    for (let i = 0; i < data.data.length; i++) {
                                        let resourceID = uuid.v4().replace(/-/g, '')
                                        let stmt2 = db.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,edit_name,download_url,view_url,isDownload,create_time) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$edit_name,$download_url,$view_url,$isDownload,$create_time)");
                                        stmt2.run({
                                            $id: resourceID,
                                            $file_id: data.data[i].file_id,
                                            $process_id: data.info.id,
                                            $detail_index: data.data[i].detail_index,
                                            $file_name: data.data[i].file_name,
                                            $ext_name: data.data[i].ext_name,
                                            $convert_name: data.data[i].convert_name,
                                            $edit_name: data.data[i].edit_name,
                                            $download_url: data.data[i].download_url,
                                            $view_url: data.data[i].view_url,
                                            $isDownload: data.data[i].isDownload,
                                            $create_time: currentTime
                                        }, (err) => {
                                            stmt2.finalize();
                                            console.log("a")
                                            if (err) {
                                                info.message = "编辑教学过程错误"
                                                event.sender.send(data.callback, JSON.stringify(info));
                                                return false;
                                            } else {
                                                console.log(i)
                                                console.log(data.data.length - 1)
                                                if (i == data.data.length - 1) {
                                                    info.flag = true
                                                    info.message = "编辑教学过程成功"
                                                    console.log(JSON.stringify(info))
                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    })
                } else {
                    let stmt = db.prepare("update teach_process set update_time = $update_time,pos_x = $pos_x,pos_y=$pos_y where id = $id");
                    stmt.run({
                        $pos_x: data.info.pos_x,
                        $pos_y: data.info.pos_y,
                        $id: data.info.id,
                        $update_time: currentTime
                    }, (err) => {
                        stmt.finalize();
                        if (err) {
                            info.message = "编辑教学过程错误"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        } else {
                            info.flag = true
                            info.message = "编辑教学过程成功"
                            console.log(JSON.stringify(info))
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    })
                }
            });
        })

        // 查找文件是否存在
        ipc.on('fileIsExsit', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let filePath = path.resolve(downloadPath, './' + data.fileName)
            fs.pathExists(filePath).then((exists) => {
                if (exists) {
                    info.flag = true
                    info.message = "文件已存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = false
                    info.message = "文件不存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        // 更新文件状态位
        ipc.on('fileIsDownloaded', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("update process_files set isDownload = 1 where file_id = $id");
            stmt.run({
                $id: data.file_id
            }, (err) => {
                if (err) {
                    info.message = "更新失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "更新成功"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
            stmt.finalize();
        })

        // 加载所有教学过程
        ipc.on('loadProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("select * from teach_process where user_id = $user_id and book_id = $book_id order by create_time asc");
            stmt.all({
                $user_id: data.data.user_id,
                $book_id: data.data.book_id
            }, (err, row) => {
                stmt.finalize();
                if (err) {
                    info.message = "加载失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "加载成功"
                    info.data = row
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        // 导出教学过程
        ipc.on('exportProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    console.log("choose save path:============>" + dirPath);
                    let attach_file = data.data.attach_file;
                    let zipPath = path.normalize(dirPath + '/process.zip');
                    //生成sql的json文件
                    let sqlJsonName = 'process.json';
                    fs.pathExists(zipPath).then((exists) => {
                        if (exists) {
                            info.message = "文件已存在";
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        }
                        //查找教学过程
                        let stmt = db.prepare("select * from teach_process where user_id = $user_id and book_id = $book_id");
                        stmt.all({
                            $user_id: data.data.user_id,
                            $book_id: data.data.book_id
                        }, (err, row) => {
                            stmt.finalize();
                            if (err) {
                                info.message = "错误"
                                event.sender.send(data.callback, JSON.stringify(info));
                                return false;
                            } else {
                                if (!row.length) {
                                    info.message = "未查到用户数据"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                    return false;
                                }
                                //将查找到的教学过程的insert语句写入txt文件里
                                let str1 = coreConfig.teach_process_insert;
                                let str2 = coreConfig.process_files_insert;
                                let resourceArray = [];
                                row.forEach((el, index) => {
                                    let len1 = row.length - 1;
                                    let currentNum = index;
                                    str1 += "('" + el.id + "','" + el.book_id + "','" + "default_user" + "','" + el.page_id + "','" + el.chapter_id + "','" + el.section_id + "','" + el.course_id + "','" + el.count + "','" + el.pos_x + "','" + el.pos_y + "','" + el.create_time + "','" + el.update_time + "'),";
                                    //查找教学过程资源
                                    let stmt2 = db.prepare("select * from process_files where process_id = $process_id");
                                    stmt2.all({
                                        $process_id: el.id
                                    }, (err, file_row) => {
                                        stmt2.finalize();
                                        if (err) {
                                            info.message = "查找失败";
                                            event.sender.send(data.callback, JSON.stringify(info));
                                            return false;
                                        } else {
                                            let currenIndex;
                                            file_row.forEach((el, index) => {
                                                currenIndex = index;
                                                //如果导出是不带文件，导出的sql里的每个isdownload都为0，跳过将资源名入resourceArray
                                                if (!attach_file) {
                                                    el.isDownload = 0
                                                } else {
                                                    //导出教学过程带文件,将查询结果里每条isdownload标志位为1（已经下载）的资源名入resourceArray
                                                    if (el.isDownload) {
                                                        resourceArray.push(el.convert_name);
                                                        console.log(resourceArray);
                                                    }
                                                }
                                                str2 += "('" + el.id + "','" + el.file_id + "','" + el.process_id + "','" + el.detail_index + "','" + el.file_name + "','" + el.ext_name + "','" + el.convert_name + "','" + el.file_md5 + "','" + el.edit_name + "','" + el.download_url + "','" + el.view_url + "','" + el.create_time + "','" + el.isDownload + "'),";
                                            })
                                            if (len1 === currentNum && currenIndex === file_row.length - 1 || len1 === currentNum && !file_row.length) {
                                                //临时写入的txt文件路径
                                                let tempJsonPath = path.join(downloadPath, sqlJsonName);
                                                //去掉字符串最后的，
                                                str1 = str1.substring(0, str1.length - 1);
                                                str2 = str2.substring(0, str2.length - 1);
                                                let processJson = {
                                                    "teach_process": str1,
                                                    "process_files": str2
                                                };
                                                let jsonStr = JSON.stringify(processJson);
                                                console.log(jsonStr);
                                                fs.outputFile(tempJsonPath, jsonStr)
                                                    .then((result) => {
                                                        console.log(result);
                                                        let zipArr = [];
                                                        zipArr.push(sqlJsonName);
                                                        for (let i = 0; i < resourceArray.length; i++) {
                                                            let resourcePath = resourceArray[i]
                                                            console.log(resourcePath);
                                                            zipArr.push(resourcePath);
                                                        }
                                                        console.log(zipArr);
                                                        tar.c({
                                                            gzip: true,
                                                            file: zipPath,
                                                            cwd: path.join(__dirname, '../../app/userData/'),
                                                        }, zipArr).then((result) => {
                                                            fs.remove(tempJsonPath, err => {
                                                                if (err) {
                                                                    console.log(err);
                                                                } else {
                                                                    console.log("文件删除成功");
                                                                }
                                                            });
                                                            info.flag = true;
                                                            info.message = "导出成功";
                                                            event.sender.send(data.callback, JSON.stringify(info));
                                                            return false;
                                                        })
                                                    }, (err) => {
                                                        console.log(err);
                                                        info.message = "导出json文件出错";
                                                        event.sender.send(data.callback, JSON.stringify(info));
                                                        return false;
                                                    })
                                            }
                                        }
                                    })
                                })
                            }
                        })
                    })
                } else {
                    info.message = "用户已取消";
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                }
            })
        })

        //导入教学过程
        ipc.on('importProcess', (event, data) => {
            let info = {
                flag: false,
                message: '发生错误',
                data: null
            }
            console.log(data.data.user_id)
            dialog.showOpenDialog({
                'properties': ['openFile ']
            }, (dirPath) => {
                if (dirPath) {
                    console.log(dirPath[0]);
                    // 读process.zip
                    //解压输出路径
                    let extractPath = downloadPath;
                    let tempJsonPath = path.join(downloadPath, 'process.json');
                    console.log(extractPath);
                    tar.x({
                        cwd: extractPath,
                        file: dirPath[0]
                    }).then((result) => {
                        return fs.readFile(tempJsonPath, 'utf8')
                    }, (err) => {
                        console.log(err);
                        info.message = "解压出错";
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    }).then((result) => {
                        console.log(result);
                        //获取teach_process里的sql语句
                        let teach_process_sql = JSON.parse(result).teach_process;
                        //teach_process_sql里的default_user替换成当前登录用户的id
                        teach_process_sql = teach_process_sql.replace(/default_user/g, data.data.user_id);
                        let process_files_sql = JSON.parse(result).process_files;
                        console.log(teach_process_sql);
                        console.log(process_files_sql);
                        //sqlite3执行teach_process的sql语句
                        db.run(teach_process_sql, function (err) {
                            if (err) {
                                info.message = "执行sql出错，导入错误";
                                event.sender.send(data.callback, JSON.stringify(info));
                                return false;
                            } else {
                                //sqlite3执行process_files的sql语句
                                db.run(process_files_sql, function (err) {
                                    if (err) {
                                        info.message = "执行sql出错";
                                        event.sender.send(data.callback, JSON.stringify(info));
                                        return false;
                                    } else {
                                        fs.remove(tempJsonPath, err => {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log('文件删除成功');
                                            }
                                        });
                                        info.message = "导入成功";
                                        info.flag = true;
                                        event.sender.send(data.callback, JSON.stringify(info));
                                    }
                                });
                            }
                        })
                    }, (err) => {
                        console.log(err);
                        info.message = "读取文件出错";
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    })
                } else {
                    info.message = "用户已取消";
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                }
            })
        })


        // 删除教学过程
        ipc.on('deleteProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("delete from teach_process where id=$process_id");
            stmt.all({
                $process_id: data.process_id
            }, (err) => {
                stmt.finalize();
                if (err) {
                    info.message = "删除失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    let stmt2 = db.prepare("delete from process_files where process_id=$process_id");
                    stmt2.all({
                        $process_id: data.process_id
                    }, (err, row) => {
                        stmt2.finalize();
                        if (err) {
                            info.message = "删除失败"
                            event.sender.send(data.callback, JSON.stringify(info));
                        } else {
                            info.flag = true
                            info.message = "删除成功"
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    })
                }
            })
        })

        //
        // 加载教学过程中的文件
        ipc.on('loadProcessFiles', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("select * from process_files where process_id = $process_id order by detail_index asc");
            stmt.all({
                $process_id: data.process_id
            }, (err, row) => {
                stmt.finalize();
                if (err) {
                    info.message = "加载失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "加载成功"
                    info.data = row
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //下载教材
        ipc.on('downloadBooks', (event, data) => {
            let bookIsbn = data.isbn
            let info = {
                flag: null,
                message: '',
                data: null,
                pid: null,
                isbn: bookIsbn
            }
            let url = config.serverUrl + config.bookApiUrl
            let query = {
                count: 0,
                isbn: bookIsbn,
                data: []
            }
            let md5Path = path.resolve(bookUrl, './' + bookIsbn + '/md5')
            console.log("md5Path:" + md5Path)
            fs.pathExists(md5Path).then((exists) => {
                let fileData
                let md5_arr = []
                if (exists) {
                    try {
                        md5_arr = fs.readFileSync(md5Path)
                    } catch (err) {
                        info.message = "程序异常" + err
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    }
                }
                console.log("md5_arr:" + md5_arr)
                try {
                    fileData = JSON.parse(md5_arr)
                } catch (e) {
                    console.log(e)
                    fileData = []
                }
                query.data = fileData
                let fileObj = {}
                //若md5文件存在，将md5文件里的对象暂存在变量中，以路径为key
                if (query.data.length) {
                    query.data.forEach((el, index) => {
                        fileObj[el.path] = el
                    })
                }
                console.log(fileObj)
                console.log(query.data)
                //序列化query
                let stringify = JSON.stringify(query);
                // console.log(url + stringify)
                // console.log(Buffer.byteLength(url + stringify))
                request({
                    url: url,
                    method: "POST",
                    form: {
                        jsonstr: stringify
                    }
                }, (error, response, body) => {
                    if (error) {
                        info.flag = 'fail'
                        info.message = "服务器连接失败"
                        event.sender.send(data.callback, JSON.stringify(info));
                        return;
                    }
                    if (body) {
                        console.log(body)
                        let result;
                        try {
                            result = JSON.parse(body)
                        } catch (e) {
                            console.log('请求错误')
                            info.flag = 'fail'
                            info.message = "服务器错误"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        }

                        if (!result.ok) {
                            info.flag = 'fail'
                            info.message = result.comment
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        }
                        //设置一个需要删除的队列
                        let del_Arr = []
                        //设置一个需要更新的队列
                        let update_Arr = []
                        //对服务端的文件列表进行遍历，并进行整理
                        result.data.forEach((el, index) => {
                            //对key做一个转义，以便能与本地的fileObj对象进行匹配
                            let key = el.clientpath.replace(/\\\\/g, '\\')
                            console.log(key)
                            if (fileObj[key] && fileObj[key].hasOwnProperty('path')) {
                                console.log('key存在')

                                //服务器标识为删除，则将对象加入删除队列，并从本地fileObj中删除对应的key
                                if (el.oper === 'D') {
                                    console.log('该文件需要删除---->')
                                    console.log(fileObj[key])
                                    let reg = new RegExp("(.*?)" + bookIsbn)
                                    let del_url = path.resolve(bookUrl, './' + bookIsbn + el.clientpath.replace(reg, "").replace(/\\/g, '\/'))
                                    console.log('del_url->>')
                                    console.log(del_url)
                                    del_Arr.push(del_url)
                                    delete fileObj[key]
                                    console.log("删除对象-->\n")
                                    console.log(fileObj[key])
                                }
                                //服务器标识为更新，则将对象加入更新队列，并从本地fileObj中更新对应的key
                                else {
                                    fileObj[key].md5 = el.md5
                                    update_Arr.push(el)
                                    console.log("更新对象--->\n")
                                    console.log(fileObj[key])
                                }
                            } else {
                                //本地不存在对应的key，服务器标识为更新，则将对象加入更新队列，并从本地fileObj中增加对应的key
                                console.log('key不存在')
                                fileObj[key] = {
                                    path: '',
                                    md5: ''
                                }
                                fileObj[key].path = el.clientpath.replace(/\\\\/g, '#').replace(/\\/g, '#').replace(/#/g, '\\')
                                fileObj[key].md5 = el.md5
                                update_Arr.push(el)
                                console.log("新增对象--->")
                                console.log(fileObj[key])
                            }
                        })
                        console.log("更新数组--->\n")
                        console.log(update_Arr)
                        console.log("删除数组--->\n")
                        console.log(del_Arr)
                        //删除标识为删除的文件
                        if (del_Arr.length) {
                            del_Arr.forEach((el, index) => {
                                "use strict";
                                try {
                                    fs.unlinkSync(el)
                                    console.log("正在删除")
                                    console.log('url->>>>>>')
                                    console.log(el)
                                    console.log("文件删除成功")
                                } catch (e) {
                                    console.log('文件删除失败---->')
                                    console.log(e)
                                }
                            })
                        }

                        let fileObj_Arr = []
                        for (let i in fileObj) {
                            fileObj_Arr.push(fileObj[i])
                        }
                        console.log(fileObj_Arr.length)
                        console.log(result.data.length)
                        console.log(JSON.stringify(fileObj_Arr))

                        if (result.stateCode === '100') {
                            //真.多线程下载 --->
                            //这里丢一个线程出去处理
                            let p = child.fork(downloadBook_process, [], {})
                            info.flag = 'start'
                            info.message = "开始下载"
                            info.pid = p.pid;
                            event.sender.send(data.callback, JSON.stringify(info));
                            p.send({
                                bookIsbn: bookIsbn,
                                fileArr: update_Arr
                            })
                            p.on('message', function (m) {
                                if (m.id === 'kill') {
                                    process.kill(p.pid)
                                    console.log("线程结束")
                                    info.flag = 'fail'
                                    info.message = "下载失败"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                } else if (m.id === 'ok') {
                                    info.flag = 'success'
                                    info.message = "无更新"

                                    //code = 1时为文件有更新
                                    //当文件有更新，或者文件有删除时进行md5文件的重写
                                    if (m.code || del_Arr.length) {
                                        info.message = "下载成功"
                                        fs.writeFile(md5Path, JSON.stringify(fileObj_Arr), (err) => {
                                            if (err) {
                                                console.log(err)
                                            } else {
                                                console.log('书本md5文件储存成功')
                                            }
                                        });
                                    }
                                    process.kill(p.pid)
                                    event.sender.send(data.callback, JSON.stringify(info));
                                } else if (m.id === 'progress') {
                                    console.log('------->')
                                    console.log(m.data)
                                    info.flag = "progress"
                                    info.message = ''
                                    info.data = m.data
                                    event.sender.send(data.callback, JSON.stringify(info));
                                }
                            });
                            p.on('close', (code) => {
                                "use strict";
                                console.log('线程结束标识：' + code)
                            })
                            console.log('child_process pid = ' + p.pid)
                        } else {
                            let result = JSON.parse(body)
                            info.message = result.comment
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    } else {
                        console.log('请求错误')
                        info.message = "服务器错误"
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                })
            }, (err) => {
                info.message = "程序异常" + err
                event.sender.send(data.callback, JSON.stringify(info));
                return false;
            })


        })

        //删除进程
        ipc.on('killProcess', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            try {
                process.kill(data.pid)
            } catch (e) {
                console.log(e)
                info.message = "错误！"
                event.sender.send(data.callback, JSON.stringify(info));
                return;
            }
            info.flag = true
            info.message = "成功！"
            event.sender.send(data.callback, JSON.stringify(info));
        })

        //删除书本
        ipc.on('deleteBook', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let bookPath = path.resolve(bookUrl, './' + data.isbn)
            fs.emptyDir(bookPath).then(() => {
                return fs.rmdir(bookPath)
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            }).then(() => {
                info.flag = true
                info.message = "删除成功"
                event.sender.send(data.callback, JSON.stringify(info));
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            })
        })

        //获取匹配后的书本列表
        ipc.on('getBookList', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let bookArr = data.bookArr
            let listLen = data.bookArr.length
            let myBookArr = [];
            bookArr.forEach((el, index) => {
                let bookPath = path.resolve(bookUrl, './' + el)
                fs.pathExists(path.normalize(bookPath + '/md5')).then((exists) => {
                    if (exists) {
                        myBookArr.push(bookArr[index])
                    }
                    if (index === listLen - 1) {
                        info.flag = true
                        info.message = "获取成功"
                        info.data = myBookArr
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                }, (err) => {
                    info.message = "获取失败" + err
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                })
            })

        })

        //获取配置文件的服务器地址
        ipc.on('getServerUrl', (event, data) => {
            "use strict";
            let info = {
                flag: true,
                message: '',
                data: null
            }
            info.message = "成功！"
            info.data = config.serverUrl
            event.sender.send(data.callback, JSON.stringify(info));
        })

        //创建教学过程空db
        ipc.on('createUserDb', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath + '/user.db');
                    fs.pathExists(filePath).then((exists) => {
                        if (exists) {
                            info.message = "DB已存在"
                            event.sender.send(data.callback, JSON.stringify(info));
                        } else {
                            let MyDB = new sqlite3.Database(filePath)
                            MyDB.run(require(path.resolve(__dirname, __dirname + "/coreConfig")).processSql, (err) => {
                                if (!err) {
                                    MyDB.run(require(path.resolve(__dirname, __dirname + "/coreConfig")).process_files_Sql, (err) => {
                                        if (!err) {
                                            //创建笔记表
                                            MyDB.run(require(path.resolve(__dirname, __dirname + "/coreConfig")).note_sql, (err) => {
                                                if (!err) {
                                                    info.flag = true
                                                    info.message = "创建成功"
                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                } else {
                                                    info.message = "创建失败"
                                                    try {
                                                        console.log("正在删除")
                                                        fs.unlinkSync(filePath)
                                                        console.log("文件删除成功")
                                                    } catch (e) {
                                                        console.log('文件删除失败---->')
                                                        console.log(e)
                                                    }
                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                }
                                            })
                                        } else {
                                            info.message = "创建失败"
                                            try {
                                                console.log("正在删除")
                                                fs.unlinkSync(filePath)
                                                console.log("文件删除成功")
                                            } catch (e) {
                                                console.log('文件删除失败---->')
                                                console.log(e)
                                            }
                                            event.sender.send(data.callback, JSON.stringify(info));
                                        }
                                    })
                                } else {
                                    info.message = "创建失败"
                                    try {
                                        console.log("正在删除")
                                        fs.unlinkSync(filePath)
                                        console.log("文件删除成功")
                                    } catch (e) {
                                        console.log('文件删除失败---->')
                                        console.log(e)
                                    }
                                    event.sender.send(data.callback, JSON.stringify(info));
                                }
                            })
                        }
                    })
                } else {
                    info.message = "用户已取消";
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //创建二维码
        ipc.on('createQRcode', (event, data) => {
            let string = data.data.string
            let outputDir = data.data.outputDir
            let fileName = data.data.fileName
            let options = data.data.options
            let filePath = path.resolve(__dirname, outputDir + '/' + fileName)
            let info = {
                flag: false,
                message: '',
                data: null
            }
            QRCode.toFile(filePath, string, options, function (err) {
                if (err) {
                    console.log(err)
                    info.message = "失败！"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    console.log('done')
                    info.message = "成功！"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件夹路径
        ipc.on('chooseDir', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    info.flag = true
                    info.message = "成功！"
                    info.data = dirPath[0]
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.message = "用户已取消";
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件路径队列
        ipc.on('chooseFiles', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openFile', 'multiSelections']
            }, (filePath) => {
                if (filePath) {
                    info.flag = true
                    info.message = "成功！"
                    info.data = filePath
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.message = "用户已取消";
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件夹下所有文件
        ipc.on('getFolderFiles', (event, data) => {
            let dirPath = data.dirPath
            let info = {
                flag: false,
                message: '',
                data: null
            }
            fs.readdir(dirPath, function (err, files) {
                if (err) {
                    info.message = "错误！==>" + err
                    event.sender.send(data.callback, JSON.stringify(info));
                }
                let filesArr = []
                files.forEach(function (filename, index) {
                    let truePath = path.join(dirPath, filename);
                    fs.stat(truePath, function (err, stats) {
                        if (err) {
                            return false
                            info.message = "错误！==>" + err
                            event.sender.send(data.callback, JSON.stringify(info))
                        }
                        //文件
                        if (stats.isFile()) {
                            filesArr.push({
                                fileName: filename,
                                path: truePath,
                                stats: stats
                            })
                        } else if (stats.isDirectory()) {

                        }

                        if (index === files.length - 1) {
                            info.flag = true
                            info.message = "成功！"
                            info.data = filesArr
                            console.log(filesArr)
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    });
                });
            })
        })

        //打开文件
        ipc.on('openFile', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let url = data.fileUrl
            url = path.join(downloadPath, url)
            fs.pathExists(url).then((exists) => {
                "use strict";
                if (!exists) {
                    info.flag = false
                    info.message = "文件路径不存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                }
            })
            let p;
            if (process.platform !== "darwin") {
                url = '"' + url + '"'
                p = child.exec('start "" ' + url, (error, stdout, stderr) => {
                    if (error) {
                        console.log(error)
                        info.flag = false
                        info.message = "错误！ ->" + error
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                });
            } else {
                p = child.execFile('open', [url], (error, stdout, stderr) => {
                    if (error) {
                        console.log(error)
                        info.flag = false
                        info.message = "错误！ ->" + error
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                    console.log(stdout);
                });
            }
            p.on('close', (code) => {
                "use strict";
                console.log('线程结束标识：' + code)
                if (!code) {
                    info.flag = true
                    info.message = "打开成功"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //添加笔记
        ipc.on('addNote', (event, data) => {
            let info = {
                flag: false,
                message: ''
            }
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            let noteId = data.data.noteId;
            db.serialize(function () {
                let stmt = db.prepare("INSERT INTO note (note_id,user_id,book_id,page_id,chapter_id,section_id,course_id,select_text,position,note_type,note_text,add_time,update_time) VALUES ($note_id,$user_id,$book_id,$page_id,$chapter_id,$section_id,$course_id,$select_text,$position,$note_type,$note_text,$add_time,$update_time)");
                stmt.run({
                    $note_id: noteId,
                    $user_id: data.data.userId,
                    $book_id: data.data.bookId,
                    $page_id: data.data.pageId,
                    $chapter_id: data.data.chapterId,
                    $section_id: data.data.sectionId,
                    $course_id: data.data.courseId,
                    $select_text: data.data.selectText,
                    $position: data.data.position,
                    $note_type: data.data.noteType,
                    $note_text: data.data.noteText,
                    $add_time: currentTime,
                    $update_time: currentTime
                }, (err) => {
                    stmt.finalize();
                    if (err) {
                        console.log(err)
                        info.message = "新建笔记错误"
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    } else {
                        info.flag = true
                        info.message = "新建笔记成功"
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                });
            });
        })

        //删除笔记
        ipc.on('deleteNote', (event, data) => {
            let info = {
                flag: false,
                message: ''
            }
            let stmt = db.prepare("delete from note where note_id=$note_id");
            stmt.all({
                $note_id: data.noteId
            }, (err) => {
                stmt.finalize();
                if (err) {
                    info.message = "删除失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.message = "删除成功"
                    info.flag = true
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //编辑笔记
        ipc.on('editNote', (event, data) => {
            let info = {
                flag: false,
                message: '',
            }
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function () {
                let stmt = db.prepare("update note set update_time = $update_time,note_type = $note_type,note_text=$note_text,position=$position where note_id = $note_id");
                stmt.run({
                    $note_id: data.data.noteId,
                    $note_type: data.data.noteType,
                    $note_text: data.data.noteText,
                    $position: data.data.position,
                    $update_time: currentTime
                }, (err) => {
                    stmt.finalize();
                    if (err) {
                        info.message = "编辑笔记错误"
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    } else {
                        info.flag = true
                        info.message = "编辑笔记成功"
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                });
            });
        })


        //查找笔记
        ipc.on('loadNote', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let userId = data.data.userId;
            let bookId = data.data.bookId;
            let pageId = data.data.pageId;
            let chapterId = data.data.chapterId;
            let sectionId = data.data.sectionId;
            let courseId = data.data.courseId;
            let noteType = data.data.noteType;
            let order = data.data.order;
            let orderType = data.data.orderType;
            let str = 'select note_id AS noteId,'
                + 'user_id AS userId,'
                + 'book_id AS bookId,'
                + 'page_id AS pageId,'
                + 'chapter_id AS chapterId,'
                + 'section_id AS sectionId,'
                + 'course_id AS courseId,'
                + 'select_text AS selectText,'
                + 'position AS position,'
                + 'note_type AS noteType,'
                + 'note_text AS noteText,'
                + 'add_time AS addTime,'
                + 'update_time AS updateTime'
                + ' FROM note where user_id = $userId and book_id = $bookId';
            let param = {
                $userId: userId,
                $bookId: bookId
            };
            if (pageId) {
                str += ' and page_id = $pageId';
                param = {
                    $userId: userId,
                    $bookId: bookId,
                    $pageId: pageId
                }
            }
            if (chapterId) {
                str += ' and chapter_id = $chapterId';
                param = {
                    $userId: userId,
                    $bookId: bookId,
                    $chapterId: chapterId
                }
                if (sectionId) {
                    str += ' and section_id = $sectionId';
                    param = {
                        $userId: userId,
                        $bookId: bookId,
                        $chapterId: chapterId,
                        $sectionId: sectionId
                    }
                    if (courseId) {
                        str += ' and course_id = $courseId';
                        param = {
                            $userId: userId,
                            $bookId: bookId,
                            $chapterId: chapterId,
                            $sectionId: sectionId,
                            $courseId: courseId
                        }
                    }
                }
                if (noteType) {
                    str += ' and note_type = $noteType';
                    param = {
                        $userId: userId,
                        $bookId: bookId,
                        $chapterId: chapterId,
                        $sectionId: sectionId,
                        $courseId: courseId,
                        $noteType: noteType
                    }
                } else {
                    param = {
                        $userId: userId,
                        $bookId: bookId,
                        $chapterId: chapterId,
                        $sectionId: sectionId,
                        $courseId: courseId
                    }
                }
            } else {
                if (noteType) {
                    str += ' and note_type = $noteType';
                    param = {
                        $userId: userId,
                        $bookId: bookId,
                        $noteType: noteType
                    }
                }
            }
            if (order) {
                if (order == 'time') {
                    order = 'update_' + order;
                }
                str += ' order by ' + order + ' ' + orderType;
            }

            console.log(str);
            let stmt = db.prepare(str);
            console.log(stmt);
            stmt.all(param, (err, row) => {
                stmt.finalize();
                if (err) {
                    console.log(err);
                    info.message = "加载失败";
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true;
                    info.message = "加载成功";
                    info.data = row;
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })


        //读取某页所有教学过程资源
        ipc.on('loadPageProcessFiles', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: []
            }
            let fileData = []
            db.serialize(() => {
                let stmt = db.prepare("select * from teach_process where user_id = $user_id and book_id = $book_id and page_id = $page_id order by create_time asc");
                stmt.all({
                    $user_id: data.data.userId,
                    $book_id: data.data.bookId,
                    $page_id: data.data.pageId
                }, (err, row) => {
                    stmt.finalize();
                    if (err) {
                        info.message = "加载失败"
                        event.sender.send(data.callback, JSON.stringify(info));
                    } else {
                        if (!row.length) {
                            info.message = "未查到数据"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        }
                        row.forEach((el, index) => {
                            let len1 = row.length - 1
                            let currentNum = index
                            let teachArr = []
                            db.serialize(() => {
                                let stmt2 = db.prepare("select * from process_files where process_id = $process_id order by detail_index asc");
                                stmt2.all({
                                    $process_id: el.id
                                }, (err, file_row) => {
                                    stmt2.finalize();
                                    if (err) {
                                        info.message = "查找失败";
                                        event.sender.send(data.callback, JSON.stringify(info));
                                        return false;
                                    } else {
                                        if (!file_row.length) {
                                            info.message = "未查到数据";
                                            event.sender.send(data.callback, JSON.stringify(info));
                                            return false;
                                        }
                                        let currenIndex
                                        file_row.forEach((el, index) => {
                                            currenIndex = index;
                                            teachArr.push(el);
                                        })
                                        info.data.push(teachArr)
                                        console.log(len1 + '=====' + currentNum + ' && ' + currenIndex + '=====' + (file_row.length - 1) + ' || ' + len1 + '=====' + currentNum + ' && !' + file_row.length)
                                        if (len1 === currentNum && currenIndex === file_row.length - 1 || len1 === currentNum && !file_row.length) {
                                            info.flag = true;
                                            info.message = "查找成功";
                                            event.sender.send(data.callback, JSON.stringify(info));
                                        }
                                    }
                                })
                            });
                        })
                    }
                })
            });
        })

    },
    windowListener: (win) => {
        // 程序最小化
        ipc.on('minimize', function (event) {
            win.minimize()
            console.log("ok")
        })

        // 程序最大化
        ipc.on('Maximization', function (event) {
            win.maximize()
        })

        // 退出程序
        ipc.on('exit', function (event) {
            app.quit();
        })

        // 全屏
        ipc.on('fullscreen', function (event) {
            console.log(event)
            if (!win.isFullScreen()) {
                win.setFullScreen(true)
            } else {
                win.setFullScreen(false)
            }
        })

        //是否全屏
        ipc.on('isFullscreen', function (event, data) {
            console.log(event)
            var info = {
                message: "不是全屏",
                flag: false
            }
            if (win.isFullScreen()) {
                info.flag = true;
                info.message = "全屏";
            }
            console.log(info);
            event.sender.send(data.callback, JSON.stringify(info));
        })

        //显示隐藏右上方三个按钮
        ipc.on('toolBarStatus', (event, data) => {
            win.webContents.send('listenToolBar', data)
        })

        // 开发者工具
        ipc.on('developTools', function (event) {
            win.webContents.toggleDevTools()
        })

        // 监听window默认下载事件
        win.webContents.session.on('will-download', (event, item, webContents) => {
            event.preventDefault();
            let itemName = item.getFilename();
            let itemUrl = item.getURL();
            let itemSize = item.getTotalBytes();

            let p = child.fork(download_process, [], {})

            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    win.webContents.send('downloadStart', JSON.stringify(startObj));
                } else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                } else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    win.webContents.send('downloadSuccess', JSON.stringify(successObj))
                } else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data,
                        'fileId': m.fileId
                    }
                    win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath[0] + '/' + itemName);
                    p.send({
                        type: 0,
                        itemUrl: itemUrl,
                        dirPath: dirPath,
                        filePath: filePath,
                        itemName: itemName,
                        itemSize: itemSize
                    })
                } else {
                    console.log("用户取消下载")
                }
            })
        })

        // 主动下载文件监听
        ipc.on('downloadFile', function (event, data) {
            let p = child.fork(download_process, [], {})
            console.log(data)
            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    event.sender.send('downloadStart', JSON.stringify(startObj));
                } else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    event.sender.send('downloadFailed', JSON.stringify(stopObj));
                } else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message,
                        'fileId': m.fileId
                    }
                    event.sender.send('downloadSuccess', JSON.stringify(successObj))
                } else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data,
                        'fileId': m.fileId
                    }
                    event.sender.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            if (!data.url) {
                let stopObj = {
                    'id': null,
                    'itemName': null,
                    'fileId': data.fileId,
                    'message': "无效的url地址"
                }
                event.sender.send('downloadFailed', JSON.stringify(stopObj));
                return false;
            }
            if (data.dialog) {
                dialog.showOpenDialog({
                    'properties': ['openDirectory', 'createDirectory']
                }, (dirPath) => {
                    if (dirPath) {
                        p.send({
                            type: 1,
                            url: data.url,
                            newName: data.newName,
                            dirPath: dirPath[0]
                        })
                    } else {
                        console.log("用户取消下载")
                    }
                })
            } else {
                p.send({
                    type: 1,
                    url: data.url,
                    newName: data.newName,
                    fileId: data.fileId,
                    dirPath: downloadPath
                })
            }
            // 设置下载路径

        })

        // 上传文件监听
        ipc.on('uploadFiles', function (event, data) {

            let p = child.fork(upload_process, [], {})

            p.on('message', function (m) {
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadStart', JSON.stringify(startObj));
                } else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadFailed', JSON.stringify(stopObj));
                } else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'message': m.message,
                        'data': m.data
                    }
                    event.sender.send('uploadSuccess', JSON.stringify(successObj))
                } else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    event.sender.send('uploadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })
            dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections']
            }, (files) => {
                if (files) {
                    p.send({
                        data: data,
                        files: files
                    })
                } else {
                    console.log("用户取消了上传");
                }
            })
        })
    }
}

const fileDelete = (filePath) => {
    fs.ensureFile(filePath).then(() => {
        return fs.remove(filePath)
    }, (err) => {
        console.error(err)
    }).then(() => {
        console.log("删除成功");
    }, () => {
        console.log("删除失败");
    })
}

module.exports = appEvent