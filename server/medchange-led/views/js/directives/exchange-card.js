(function() {
    'use strict';

    angular
        .module('currencyApp')
        .directive('exchangeCard', exchangeCard);

    function exchangeCard($timeout) {
        return {
            restrict: 'E',
            scope: {
                rate: '=',
                isHighlighted: '=',
                customFontSize: '=',
                customLogoSize: '=',
                customCodeSize: '=',
                activeBorderColor: '='
            },
            templateUrl: 'js/directives/templates/exchange-card.html',
            link: function(scope, element, attrs) {
                scope.fontSize = 50; // Default
                scope.defaultActiveColor = '#22d3ee';

                scope.getActiveColor = function() {
                    return scope.activeBorderColor || scope.defaultActiveColor;
                };

                scope.getCardStyle = function() {
                    if (!scope.isHighlighted) return {};
                    var color = scope.getActiveColor();
                    return {
                        border: '4px solid ' + color,
                        boxShadow: 'inset 0 0 20px ' + hexToRgba(color, 0.5)
                    };
                };

                scope.getGlowStyle = function() {
                    if (!scope.isHighlighted) return {};
                    return {
                        backgroundColor: scope.getActiveColor()
                    };
                };

                scope.getRateTextStyle = function() {
                    var style = {
                        'font-size': scope.fontSize + 'px'
                    };

                    if (scope.isHighlighted) {
                        var color = scope.getActiveColor();
                        style.color = color;
                        style.textShadow = '0 0 15px ' + hexToRgba(color, 0.5);
                    }

                    return style;
                };

                function calculateFontSize() {
                    // Similar logic to the React version to auto-scale font
                    if (scope.customFontSize > 0) {
                        scope.fontSize = scope.customFontSize;
                        return;
                    }

                    // Delay slightly to ensure DOM render
                    $timeout(function() {
                        var container = element[0].querySelector('.rate-values-container');
                        if (!container) return;

                        var colWidth = container.clientWidth / 2;
                        var height = container.clientHeight;

                        // More aggressive logic
                        // "12.34" = ~5 chars. Orbitron is wide (~0.7 aspect ratio)
                        var charCount = 5; 
                        var sizeByWidth = (colWidth - 10) / (charCount * 0.7); // 0.7 aspect ratio
                        var sizeByHeight = height * 0.7; // Use 70% of height max

                        // Cap at 200px (massive)
                        scope.fontSize = Math.min(sizeByWidth, sizeByHeight, 200);
                        
                        if (scope.fontSize < 30) scope.fontSize = 30;
                    });
                }

                // Recalc on resize or data change
                scope.$watchGroup(['rate', 'customFontSize'], calculateFontSize);
                
                // Simple window resize hook
                window.addEventListener('resize', calculateFontSize);
                scope.$on('$destroy', function() {
                    window.removeEventListener('resize', calculateFontSize);
                });

                function hexToRgba(hex, alpha) {
                    if (!hex) return 'rgba(34, 211, 238, ' + alpha + ')';
                    var clean = hex.replace('#', '');
                    if (clean.length === 3) {
                        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
                    }

                    if (clean.length !== 6) return 'rgba(34, 211, 238, ' + alpha + ')';

                    var r = parseInt(clean.substr(0, 2), 16);
                    var g = parseInt(clean.substr(2, 2), 16);
                    var b = parseInt(clean.substr(4, 2), 16);

                    if (isNaN(r) || isNaN(g) || isNaN(b)) {
                        return 'rgba(34, 211, 238, ' + alpha + ')';
                    }

                    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
                }
            }
        };
    }
})();
