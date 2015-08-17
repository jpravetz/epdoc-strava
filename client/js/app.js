/**
 * Main app, used when user is logged in.
 * If user is not authenticated, they are redirected to "/" which will server the public 'login' app.
 */

var app = angular.module('dcms', ["ngResource", "ngCookies", "ngStorage", "ngAnimate", "ui.router", "ui.sortable", "mgcrea.ngStrap"])
    .run(function( $rootScope ) {
        $rootScope.underscore = _;
        $rootScope.showPagination = false;
        $rootScope.date = new Date();
        $rootScope.org = undefined;
    })
    .config(function( $sceProvider ) {
        $sceProvider.enabled(false);
    })
    .config(function( $stateProvider, $urlRouterProvider, $locationProvider ) {

        $urlRouterProvider.otherwise('/main');

        $stateProvider
            .state("app", {url: '/app', abstract: true, templateUrl: "partials/navigation/app.jade"})
            .state("app.adbreaks", {url: '^/adbreaks', templateUrl: "partials/adbreaks/index.jade", controller: "AdBreakIndexCtrl"})
            .state("app.profile", {url: '^/profile', templateUrl: "partials/accounts/edit.jade", controller: "AccountEditCtrl", sp: {authenticate: true}})
            .state("app.about", {url: '^/about', templateUrl: "partials/about/index.jade", controller: "AboutCtrl"})
            .state("app.help", {url: '^/help', templateUrl: "partials/navigation/mainhelp.jade", controller: "MainHelpCtrl"})
            .state("app.legal", {url: '^/legal', templateUrl: "partials/about/legal.jade"})
            .state("app.copyright", {url: '^/copyright', templateUrl: "partials/about/copyright.jade"})
            .state("app.privacy", {url: '^/privacy', templateUrl: "partials/about/privacy.jade"})
            .state("app.terms", {url: '^/terms', templateUrl: "partials/about/terms.jade"})
            .state("app.main", {url: '^/main', templateUrl: "partials/navigation/main.jade"})

            .state("reg", {url: '/reg', abstract: true, templateUrl: "partials/registration/reg.jade"})
            .state("reg.login", {url: '^/login', templateUrl: "partials/registration/login.jade"}); // , controller: "RegLoginCtrl"})
        //.state("logout", {url:'^/logout', templateUrl: "public/registration/logout.jade", controller: "RegLogoutCtrl" })
        //.state("reg.register", {url: '^/register', templateUrl: "public/registration/register.jade"}) // , controller: "RegRegisterCtrl" })
        //.state("reg.passwordResetRequest", {url: '^/pwd_request_reset', templateUrl: "partials/registration/passwordReset.jade", sp: {authenticate: true}}) //, controller: "RegVerifyCtrl" })
        //.state("reg.emailverify", {url: '^/register/verify?sptoken', templateUrl: "public/registration/verify.jade"}); //, controller: "RegVerifyCtrl" })

        // Sets URL scheme to use '/contents' rather than '#/contents'. This is also compatible with nodejs page serving.
        $locationProvider.html5Mode(true);

    })
    .run(function( $stormpath ) {
        $stormpath.uiRouter({
            loginState: 'reg.login',
            defaultPostLoginState: 'app.main'
        });
    });



// Mechanism for injecting constant config into Angular
// See http://bahmutov.calepin.co/inject-valid-constants-into-angular.html
angular.module('AppConfig', [])
    .provider('AppConfig', function() {
        // initial/default config
        var config = {
            adBreakDuration: 2
        };
        return {
            set: function( constants ) { // 1
                angular.extend(config, constants);
            },
            $get: function() {
                return config;
            }
        };
    });

/**
 * AJAX error Interceptor, redirects to public (login) app for all auth failure responses
 */

app.config(['$httpProvider',
    function( $httpProvider ) {


        //================================================
        // Add an interceptor for AJAX errors
        //================================================

        $httpProvider.interceptors.push(function( $q, $injector, $rootScope ) {
            return {
                'responseError': function( response ) {
                    if( response.status === 401 && $rootScope.redirecting !== true ) {
                        //var state = $injector.get('$state');
                        //state.transitionTo('reg.login');
                        $rootScope.redirecting = true;
                        window.location = "/";
                        return $q.reject(response);
                    } else {
                        return $q.reject(response);
                    }
                }
            };
        });

    }]);
