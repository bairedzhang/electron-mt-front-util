/**
 *
 * Created by bairedzhang on 15/12/16.
 */
'use strict';

const clipboard = require('electron').clipboard;
var Vue = require('vue');
var fs = require('fs');
var ipc = require('electron').ipcRenderer;
var jsfmt = require('jsfmt');

document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
        require('remote').getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});


Vue.config.debug = true;

Vue.component('file-list', {
    props: ['list'],
    data () {
        return {};
    },
    filters: {
        relativePath (path) {
            return path.replace(/.*\/(src|build\/)/, '$1');
        },
        time (date) {
            var fmt = function(num) {
               return num < 10 ? ('0' + num) : num
            };
            return [date.getHours(), date.getMinutes(), date.getSeconds()].map((item) => fmt(item)).join(':');
        },
        status (state) {
            return /ed$/.test(state) ? 'bg-success'
                : 'bg-info';
        }
    },
    template: `
           <div class="panel panel-default pre-scrollable" v-if="list.length">
                <div class="panel-heading text-uppercase">update messages</div>
                <table class="table text-center table-condensed">
                        <tr v-for="item in list" class="success">
                           <td width="15%">{{item.status}}</td>
                           <td width="60%">{{item.path}}</td>
                           <td width="15%">{{item.time | time}}</td>
                        </tr>
                </table>
           </div>
   `,
    replace: true
});

Vue.component('project-config', {
    props: ['config', 'global'],
    data () {
        return {
            presets: {
                'es2015': false
            },
            plugins: {
                'transform-react-jsx': false,
                'transform-es2015-modules-mt-amd': false
            }
        };
    },
    filters: {},
    template: `
       <form>
           <h3 class="text-uppercase">{{config.name || 'new project'}}</h3>
           <div class="form-group">
               <label>项目名称</label>
               <input type="text" class="form-control" placeholder="项目名称" v-model="config.name">
           </div>
           <div class="form-group" @drop.prevent="drop">
               <label>本地路径</label>
               <input type="text" class="form-control" placeholder="本地路径" v-model="config.localPath">
           </div>
           <div class="form-group">
               <label>测试机路径</label>
               <input type="text" class="form-control" placeholder="测试机路径" v-model="config.serverPath">
           </div>
           <div class="form-group">
               <label>编译任务</label>
               <div>
                   <label class="checkbox-inline">
                      <input type="checkbox" name="" id="" value="true" v-model="presets.es2015"> es6
                   </label>
                   <label class="checkbox-inline">
                      <input type="checkbox" name="" id="" value="true" v-model="plugins['transform-es2015-modules-mt-amd']"> mt-amd
                   </label>
                   <label class="checkbox-inline">
                      <input type="checkbox" name="" id="" value="true" v-model="plugins['transform-react-jsx']"> react
                   </label>
               </div>
           </div>
           <p> <button type="button" class="btn btn-primary" @click="save">保存</button></p>
       </form>
       `,
    created () {
        this.setConf();
    },
    methods: {
        setConf () {
            if (this.config.localPath) {
                var confPath = this.config.localPath + '/mt-conf.js';
                if (fs.existsSync(confPath)) {
                    var localConf = require(confPath);
                    Object.assign(this.config, localConf);
                }
            }
            this.config.compile.babel.presets.forEach(function (item) {
                this.presets[item] = true;
            }.bind(this));
            this.config.compile.babel.plugins.forEach(function (item) {
                this.plugins[item] = true;
            }.bind(this));
            this.$set('xxx', 1);
        },
        getArray (obj) {
            return Object.keys(obj).filter((item) => obj[item]).map((item) => item);
        },
        drop (e) {
            var file = e.dataTransfer.files[0];
            var path = file.path;
            this.$set('config.localPath', path);
            this.$set('config.confPath', path + '/mt-conf.js');
            this.setConf();
        },
        save () {
            var keys = ['proxyRoot', 'serverRoot', 'proxy'];
            keys.forEach(function (key) {
                this.config[key] = this.global[key];
            }.bind(this));
            var conf = Object.assign({}, this.config);
            delete conf.watched;
            var str = 'module.exports = ' + JSON.stringify(conf) + ';';
            str = jsfmt.format(str);
            this.$parent.saveProject();
            fs.writeFileSync(conf.confPath, str, {encoding: 'utf8'});
        }
    },
    watch: {
        config: {
            handler (val, oldVal) {
                this.setConf();
            },
            deep: true
        },
        presets: {
            handler (val) {
                this.config.compile.babel.presets = this.getArray(val);
            },
            deep: true
        },
        plugins: {
            handler (val) {
                this.config.compile.babel.plugins = this.getArray(val);
            },
            deep: true
        }
    },
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

                    <button style="vertical-align:5px;" type="button" class="btn btn-default btn-sm pull-right" :class="{'btn-primary': proxy}" @click="toggleProxy" aria-label="Left Align">
                            <span class="glyphicon glyphicon-globe" aria-hidden="true"></span>&nbsp;本地代理
                    </button>
                </h3>
                <div v-show="showGlobalConfig">
                    <div class="form-group">
                        <label for="proxyRoot">proxyRoot</label>
                        <input type="text" class="form-control"  placeholder="proxyRoot" v-model="config.proxyRoot">
                    </div>
                    <div class="form-group">
                        <label for="serverRoot">serverRoot</label>
                        <input type="text" class="form-control" placeholder="serverRoot" v-model="config.serverRoot">
                    </div>
                    <div class="form-group">
                        <label for="proxyPort">代理端口</label>
                        <input type="text" class="form-control" id="proxyPort"placeholder="proxy port" v-model="config.proxy.port">
                    </div>
                    <div class="form-group">
                        <label for="proxyMap">代理映射(g=info等)</label>
                        <input type="text" class="form-control" id="proxyMap" placeholder="proxy map" v-model="proxyMap">
                    </div>
                    <button type="button" class="btn btn-primary" @click="save">保存</button>
                </div>
           </form>
           <project-config :config.sync="curProject" :global="config"></project-config>
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
                                   class="btn btn-sm btn-success"
                                   @click="edit"
                                   >编辑</button>
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
            <file-list :list="messages"></file-list>
        </div>
    `,
    data: {
        messages: [],
        projectList: {},
        proxy: false,
        proxyMap: '',
        curProject: {
            name: '',
            localPath: '',
            serverPath: '',
            compile: {
                babel: {
                    presets: [],
                    plugins: []
                }
            },
            confPath: '',
            watch: ['upload', 'compile'],
            build: ['upload', 'compile']
        },
        showGlobalConfig: false,
        isNotify: true,
        config: {
            proxyRoot: '/tmp/tencent_proxy',
            serverRoot: '/usr/local/app/resin_bairedzhang/webapps',
            proxy: {
                port: '8088',
                map: {
                    'g': 'info'
                }
            },
            projects: {}
        }
    },

    filters: {
        watchStatus (status) {
            return status ? '关闭' : '开启';
        },
        relativePath (path) {
            return path.replace(/.*\/(src|build\/)/, '$1');
        },
        simplePath (path) {
            return path.replace(this.config.global.uploadRootPath, '');
        }
    },

    computed: {
        showFileList () {
            return Object.keys(this.files).length;
        },
        compileList () {
            return this.files.filter(function (item) {
                return item.path.indexOf('src') > -1;
            });
        },
        uploadList() {
            return this.files.filter(function (item) {
                return item.path.indexOf('src') < 0;
            });
        }
    },
    watch: {
        proxyMap: {
            handler (val) {
                var o = {};
                this.proxyMap.split('&').forEach(function (item) {
                    var arr = item.split('=');
                    if (arr.length == 2) {
                        o[arr[0]] = arr[1];
                    }
                });
                this.$set('config.proxy.map', o);
            },
            deep: true
        }
    },
    created () {

        this.setConfig();
        this.events();
    },
    methods: {
        events () {
            ipc.on('message', function (o, data) {
                this.notify(JSON.parse(data));
            }.bind(this));

            ipc.on('error', function (o, data) {
                alert(data);
            }.bind(this));
        },

        toggleShowGlobal () {
            this.showGlobalConfig = !this.showGlobalConfig;
        },

        MT(method, data) {
            var o = {
                method: method,
                data: data
            };
            ipc.send('message', JSON.stringify(o));
        },

        toggleProxy () {
            this.proxy = !this.proxy;
            if (this.proxy) {
                this.MT('proxy', Object.assign({}, this.config));
            } else {
                this.MT('closeProxy', {});
            }
        },

        uploadAll (e) {
        },

        build (e) {
            var idx = e.currentTarget.getAttribute('index');
            var project = this.projectList[idx];
            this.MT('build', Object.assign({}, project));
        },

        edit (e) {
            var idx = e.currentTarget.getAttribute('index');
            var project = this.projectList[idx];
            this.curProject = Object.assign(this.curProject, project);
        },

        notify (item) {
            new Notification(item.status, {
                body: item.path
            });
            item.time = new Date();
            this.messages.push(item);
        },

        remove (e) {
            var idx = e.currentTarget.getAttribute('index');
            delete this.projectList[idx];
            delete this.config.projects[idx];
            this.$set('xxx', 33);
            this.save();
        },

        setConfig () {
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
            this.proxyMap = Object.keys(this.config.proxy.map).map((key) => key + '=' + this.config.proxy.map[key]).join('&');
        },

        saveProject () {
            var curProject = this.curProject;
            this.projectList[curProject.name] = Object.assign({watched: false}, curProject);
            this.config.projects[curProject.name] = curProject;
            this.config.projects[curProject.name] = curProject;
            this.$set('xxx', 1);
            this.save();
        },

        toggleWatch (e) {
            var idx = e.currentTarget.getAttribute('index');
            var project = this.projectList[idx];
            project.watched = !project.watched;
            var config = Object.assign({}, project);
            if (!project.watched) {
                this.MT('close', config);
            } else {
                this.MT('watch', config);
            }
        },

        getServerRoot (rootPath, serverRoot) {
            var global = this.config.global;
            var path = '';
            if (serverRoot) {
                path = global.uploadRootPath + serverRoot;
            }
            path = path.replace(/\\/g, '/');
            return path;
        },

        save () {
            localStorage.setItem('config', JSON.stringify(this.config));
        }
    }
});
