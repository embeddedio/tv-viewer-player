(function() {
    'use strict';

    angular
        .module('currencyApp')
        .directive('marqueeText', marqueeText);

    function marqueeText() {
        return {
            restrict: 'E',
            scope: {
                items: '=',
                speed: '=',
                fontSize: '='
            },
            template: 
                '<div class="marquee-container w-100 h-100">' +
                    '<div class="marquee-content" ng-style="animationStyle">' +
                        // Two spans for seamless infinite loop
                        '<span class="marquee-item" ng-style="textStyle">{{text}}</span>' +
                        '<span class="marquee-item" ng-style="textStyle">{{text}}</span>' +
                    '</div>' +
                '</div>',
            link: function(scope, element, attrs) {
                
                function buildText() {
                    if (!scope.items || scope.items.length === 0) {
                        scope.text = "";
                        return;
                    }
                    // Exact React Separator: Spaces + Bullet + Spaces
                    var separator = " \u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0 ";
                    var base = scope.items.join(separator) + separator;
                    
                    // Repeat to fill space (React uses 1500 chars min)
                    var result = base;
                    while(result.length < 1500 && result.length > 0) {
                        result += base;
                    }
                    scope.text = result;
                }

                function updateStyle() {
                    scope.animationStyle = {
                        'animation-duration': (scope.speed || 30) + 's'
                    };
                    scope.textStyle = scope.fontSize > 0 ? { 'font-size': scope.fontSize + 'px' } : { 'font-size': '1.25rem' };
                }

                scope.$watch('items', buildText);
                scope.$watchGroup(['speed', 'fontSize'], updateStyle);
            }
        };
    }
})();