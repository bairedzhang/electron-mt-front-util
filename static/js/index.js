/**
 *
 * Created by bairedzhang on 15/12/16.
 */
'use strict';

const clipboard = require('electron').clipboard;
var Vue = require('vue');
var VueStrap = require('vue-strap');
var ipc = require('electron').ipcRenderer;
var MT = require('mt-front-util');

document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
        require('remote').getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});
Vue.config.debug = true;

Vue.component('file-list', {
    props: ['list', 'title'],
    data: function () {
        return {};
    },
    filters: {
        relativePath: function (path) {
            return path.replace(/.*\/(src|build\/)/, '$1');
        },
        time: function (date) {
            return [date.getHours(), date.getMinutes(), date.getSeconds()].join(':');
        },
        status: function (state) {
            return /ed$/.test(state) ? 'bg-success'
                : 'bg-info';
        }
    },
    template: `
   <div class="panel panel-default" v-if="list.length">
                <div class="panel-heading text-uppercase">{{title}}</div>
                <table class="table text-center">
                    <thead>
                        <tr>
                           <td width="15%">项目</td>
                           <td width="55%">文件路径</td>
                           <td width="15%">状态</td>
                           <td width="15%">时间</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in list" class="{{item.status | status}}">
                           <td>{{item.name}}</td>
                           <td>{{item.path | relativePath}}</td>
                           <td>{{item.status}}</td>
                           <td>{{item.time | time}}</td>
                        </tr>
                    </tbody>
                </table>
           </div>
   `,
    replace: true
});
new Vue({
    el: '#app',
    template: `
        <div class="container" @dragleave.prevent  @dragover.prevent  @drop.prevent>
            <form>
                <h3 class="text-uppercase">
                    global config
                    <button style="vertical-align:5px;" type="button" class="btn btn-default btn-xs" @click="toggleShowGlobal" aria-label="Left Align">
                            <span class="glyphicon" :class="{'glyphicon-plus-sign': !showGlobalConfig,'glyphicon-minus-sign': showGlobalConfig}" aria-hidden="true"></span>
                    </button>
                </h3>
                <div v-show="showGlobalConfig">
                    <div class="form-group" v-for="(key, val) in config.global">
                        <label for="{{key}}">{{key}}</label>
                        <input type="text" class="form-control" id="{{key}}" placeholder="{{key}}" v-model="config.global[key]">
                    </div>
                    <button type="button" class="btn btn-primary" @click="save">保存</button>
                </div>
            </form>
           <div>
                <h3 class="text-uppercase">new project</h3>
                <form>
                <div class="form-group">
                    <label for="exampleInputtext1">项目名称</label>
                    <input type="text" class="form-control" placeholder="项目名称" v-model="curProject.name">
                </div>
                <div class="form-group" @dragleave.prevent  @dragover.prevent  @drop.prevent="drop">
                    <label for="exampleInputtext1">配置文件路径(拖拽文件路径到此处)</label>
                    <input type="text" class="form-control" placeholder="配置文件路径(拖拽文件路径到此处)" v-model="curProject.confPath">
                </div>
                <p><button type="button" class="btn btn-primary" @click="saveProject">保存</button></p>
               </form>
           </div>
           <div class="panel panel-default">
                <div class="panel-heading text-uppercase">project list</div>
                <table class="table table-striped text-center">
                    <thead>
                        <tr>
                           <td>项目名称</td>
                           <td>配置文件路径</td>
                           <td>操作</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(key, val) in projectList" >
                           <td>{{key}}</td>
                           <td>{{val.confPath}}</td>
                           <td>
                           <button index="{{key}}"
                                   type="button"
                                   class="btn btn-sm"
                                   @click="toggleWatch"
                                   :class="{'btn-default': val.watched, 'btn-primary': !val.watched}"
                                   >{{val.watched | watchStatus}}</button>
                           <button index="{{key}}"
                                   type="button"
                                   class="btn btn-sm btn-success"
                                   @click="build"
                                   >构建</button>
                           <button index="{{key}}"
                                   type="button"
                                   class="btn btn-sm btn-danger"
                                   @click="remove"
                                   >删除</button>
                           </td>
                        </tr>
                    </tbody>
                </table>
            </div>
           <ul class="list-unstyled pre-scrollable lead">
               <li v-for="item in console"><samp>{{item}}</samp></li>
           </ul>
        </div>
    `,
    data: {
        files: [],
        projectList: {},
        console: [],
        curProject: {
            name: '',
            confPath: ''
        },
        showGlobalConfig: false,
        isNotify: true,
        config: {
            global: {
                proxyRoot: '/tmp/tencent_proxy',
                serverRoot: '/usr/local/app/resin_bairedzhang/webapps'
            },
            projects: {
            },
            proxy: {
                port: '8088',
                map: {
                    'g': 'info'
                },
                open: true
            }
        }
    },

    filters: {
        watchStatus: function (status) {
            return status ? '关闭' : '开启';
        },
        relativePath: function (path) {
            return path.replace(/.*\/(src|build\/)/, '$1');
        },
        simplePath: function (path) {
            return path.replace(this.config.global.uploadRootPath, '');
        }
    },

    watch: {
        curProject: function (a) {
            console.log(a);
        }
    },

    computed: {
        showFileList: function () {
            return Object.keys(this.files).length;
        },
        compileList: function () {
            return this.files.filter(function (item) {
                return item.path.indexOf('src') > -1;
            });
        },
        uploadList: function () {
            return this.files.filter(function (item) {
                return item.path.indexOf('src') < 0;
            });
        }
    },
    watches: {},
    created: function () {
        this.setConfig();
        this.events();
    },
    methods: {
        events: function () {
            event.on('message', function(type, path) {
               this.notify({
                   status: type,
                   path: path
               });
            }.bind(this))
        },

        toggleShowGlobal: function () {
            this.showGlobalConfig = !this.showGlobalConfig;
        },

        uploadAll: function (e) {
        },

        build: function (e) {
            var idx = e.currentTarget.getAttribute('index');
            var project = this.projectList[idx];
            var config = require(project.confPath);
            console.log(config);
            MT.build(config);
        },

        notify: function (item) {
            new Notification(item.status, {
                body: item.path
            });
        },

        setFile: function (path, status, name) {
            var o = this.files.filter(function (item) {
                return item.path == path;
            });
            if (o.length) {
                o[0].status = status;
                o[0].time = new Date();
            } else {
                this.files.unshift({
                    path: path,
                    status: status,
                    time: new Date(),
                    name: name
                });
            }
        },

        remove: function (e) {
            var idx = e.currentTarget.getAttribute('index');
            delete this.projectList[idx];
            delete this.config.projects[idx];
            this.$set('xxx', 33);
            this.save();
        },

        setConfig: function () {
            var config = {};
            var localConfig = localStorage.getItem('config');
            if (localConfig) {
                config = JSON.parse(localConfig);
            } else {
                this.showGlobalConfig = true;
            }
            Object.assign(this.config, config);
            for (var key in this.config.projects) {
                this.projectList[key] = Object.assign({watched: false}, this.config.projects[key]);
            }
            console.log(this.projectList);
        },

        saveProject: function () {
            var curProject = this.curProject;
            this.$set('projectList.' + curProject.name , Object.assign({watched: false}, curProject));
            this.config.projects[curProject.name] = curProject;
            this.$set('config.projects.' + curProject.name, curProject);
            this.save();
        },

        toggleWatch: function (e) {
            var idx = e.currentTarget.getAttribute('index');
            var project = this.projectList[idx];
            project.watched = !project.watched;
            var config = require(project.confPath);
            if (!project.watched) {
                MT.close(config)
            } else {
                MT.watch(config);
            }
        },

        getServerRoot: function (rootPath, serverRoot) {
            var global = this.config.global;
            var path = '';
            if (serverRoot) {
                path = global.uploadRootPath + serverRoot;
            }
            path = path.replace(/\\/g, '/');
            return path;
        },

        save: function () {
            localStorage.setItem('config', JSON.stringify(this.config));
        },

        drop: function (e) {
            var file = e.dataTransfer.files[0];
            var path = file.path;
            this.$set('curProject.confPath', path);
        }
    }
});
