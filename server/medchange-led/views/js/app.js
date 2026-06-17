(function() {
    'use strict';

    angular.module('currencyApp', ['btford.socket-io'])
        .directive('onEnded', function() {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    element.bind('ended', function() {
                        scope.$apply(function() {
                            scope.$eval(attrs.onEnded);
                        });
                    });
                }
            };
        });

})();
