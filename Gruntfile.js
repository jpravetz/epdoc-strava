'use strict';
var pkg = require('./bower.json');
var config = {
    name: 'strava',
    pkg: pkg,
    bowerdir: 'bower_components',
    distdir: 'dist',
    clientdir: 'client',
    viewsdir: 'server/views'
};

var strava = {name: 'strava', clientdir: 'client', distdir: 'dist'};

module.exports = function (grunt) {

    // Configuration
    grunt.initConfig({
        config: config,
        pkg: config.pkg,
        strava: strava,
        watch: {
            scripts: {
                files: ['<%= config.clientdir %>/js/**/*.js'],
                tasks: ['copy'],
                options: {
                    spawn: false
                }
            },
            stylus: {
                files: ['<%= config.clientdir %>/css/**/*.styl', '<%= config.clientdir %>/css/**/*.css'],
                tasks: [ 'stylus' ],
                options: {
                    spawn: false
                }
            },
            jade: {
                files: ["<%= config.viewsdir %>/*.jade", "<%= config.viewsdir %>/**/*.jade"],
                tasks: [ 'jade' ],
                options: {
                    spawn: false
                }
            }
        },
        jshint: {
            client: ['bin/*.js', '<%= config.clientdir %>/js/*.js']
        },
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= config.bowerdir %>/bootstrap/dist',
                        src: 'fonts/*',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.bowerdir %>/font-awesome',
                        src: 'fonts/*',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.bowerdir %>/ngQuickDate/dist',
                        src: 'css/*.css',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.bowerdir %>/bootstrap/dist',
                        src: 'css/*.css.map',
                        dest: '<%= config.distdir %>'
                    },
                    //{   // Temporary xxx
                    //    expand: true,
                    //    cwd: '<%= config.bowerdir %>/stormpath-sdk-angularjs/dist',
                    //    src: 'stormpath-sdk-angularjs*.js',
                    //    dest: '<%= config.distdir %>/js'
                    //},
                    {
                        expand: true,
                        cwd: '<%= config.clientdir %>',
                        src: 'fonts/*',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.clientdir %>',
                        src: 'img/*',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.clientdir %>/img',
                        src: 'favicon.ico',
                        dest: '<%= config.distdir %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= config.clientdir %>',
                        src: 'js/**/*.js',
                        dest: '<%= config.distdir %>'
                    }
                ]
            }
        },
        jade: {
            compile: {
                options: {
                    data: {
                        debug: false
                    },
                    pretty: true
                },
                files: {
                    "<%= config.distdir %>/index.html": ["<%= config.viewsdir %>/*.jade", "<%= config.viewsdir %>/**/*.jade"]
                }
            }
        },
        stylus: {
            compile: {
                options: {
                    paths: ['<%= config.clientdir %>/css', '<%= config.bowerdir %>'],
                    banner: '/* Copyright (c) 2015 James Pravetz. All rights reserved. */',
                    compress: false,
                    "include css": true
                },
                files: {
                    '<%= config.distdir %>/css/app.css': '<%= config.clientdir %>/css/app.styl'
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            "strava-prod": {
                files: {
                    '<%= config.distdir %>/js/<%= config.name %>.min.js': [
                        '<%= config.bowerdir %>/jquery/dist/jquery.min.js',
                        '<%= config.bowerdir %>/moment/moment.js',
                        '<%= config.bowerdir %>/bootstrap/dist/js/bootstrap.min.js',
                        '<%= config.bowerdir %>/angular/angular.min.js',
                        '<%= config.bowerdir %>/angular-cookies/angular-cookies.min.js',
                        '<%= config.bowerdir %>/angular-resource/*.min.js',
                        '<%= config.bowerdir %>/angular-route/*.min.js',
                        '<%= config.bowerdir %>/angular-ui-sortable/sortable.js',
                        '<%= config.bowerdir %>/angular-ui-router/release/angular-ui-router.js',
                        '<%= config.bowerdir %>/angular-animate/angular-animate.min.js',
                        '<%= config.bowerdir %>/angular-strap/dist/angular-strap.min.js',
                        '<%= config.bowerdir %>/angular-strap/dist/angular-strap.tpl.min.js',
                        '<%= config.bowerdir %>/ngQuickDate/dist/*.min.js',
                        '<%= config.bowerdir %>/ngstorage/*.min.js',
                        '<%= config.bowerdir %>/firebase/firebase.js',
                        '<%= config.bowerdir %>/angularfire/dist/angularfire.min.js',
                        '<%= config.bowerdir %>/bootstrap/dist/js/bootstrap.min.js',
                        '<%= config.bowerdir %>/underscore/underscore-min.js'
                    ]
                }
            },
            "strava-dev": {
                options: {mangle: false, beautify: true},
                files: {
                    '<%= config.distdir %>/js/<%= config.name %>.js': [
                        '<%= config.bowerdir %>/jquery/dist/jquery.js',
                        '<%= config.bowerdir %>/moment/moment.js',
                        '<%= config.bowerdir %>/bootstrap/dist/js/bootstrap.js',
                        '<%= config.bowerdir %>/angular/angular.js',
                        '<%= config.bowerdir %>/angular-cookies/angular-cookies.js',
                        '<%= config.bowerdir %>/angular-resource/angular-resource.js',
                        '<%= config.bowerdir %>/angular-route/angular-route.js',
                        '<%= config.bowerdir %>/angular-ui-sortable/sortable.js',
                        '<%= config.bowerdir %>/angular-ui-router/release/angular-ui-router.js',
                        '<%= config.bowerdir %>/angular-animate/angular-animate.js',
                        '<%= config.bowerdir %>/angular-strap/dist/angular-strap.js',
                        '<%= config.bowerdir %>/angular-strap/dist/angular-strap.tpl.js',
                        '<%= config.bowerdir %>/ngQuickDate/dist/ng-quick-date.js',
                        '<%= config.bowerdir %>/ngstorage/ngStorage.js',
                        '<%= config.bowerdir %>/firebase/firebase-debug.js',
                        '<%= config.bowerdir %>/angularfire/dist/angularfire.js',
                        '<%= config.bowerdir %>/bootstrap/dist/js/bootstrap.js',
                        '<%= config.bowerdir %>/underscore/underscore.js'
                    ]
                }
            }
        },

        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        }

    });

    //grunt.event.on('watch',function(action,filepath,target) {
    //    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    //});

    //grunt.registerTask('test', ['karma','mochaTest']);
    grunt.registerTask('default', ['copy', 'jshint', 'uglify', 'stylus', 'jade']);

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-jade');

};
