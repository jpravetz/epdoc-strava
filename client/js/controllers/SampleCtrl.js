app.controller("SampleCtrl", function($scope, $firebaseArray) {
    var ref = new Firebase("https://epdoc-strava.firebaseio.com/messages");
    // create a synchronized array
    // click on `index.html` above to see it used in the DOM!
    $scope.messages = $firebaseArray(ref);
    $scope.myProperty = "sample property"
});