
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'create-windows-installer': {
      x64: {
        appDirectory: '/tmp/build/my-app-64',
        outputDirectory: '/tmp/build/installer64',
        authors: 'My App Inc.',
        exe: 'myapp.exe'
      },
      ia32: {
        appDirectory: '/tmp/build/my-app-32',
        outputDirectory: '/tmp/build/installer32',
        authors: 'My App Inc.',
        exe: 'myapp.exe'
      }
    }
  });

  grunt.loadNpmTasks('grunt-electron-installer');

  // 默认被执行的任务列表。
};


