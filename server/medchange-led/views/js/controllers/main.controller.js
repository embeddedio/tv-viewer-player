(function() {
    'use strict';

    angular
        .module('currencyApp')
        .controller('MainController', MainController);

    MainController.$inject = ['$scope', '$interval', 'DataService', 'SocketService'];

    function MainController($scope, $interval, DataService, SocketService) {
        // --- State ---
        $scope.settings = {
            highlightInterval: 3000,
            rotationInterval: 12000,
            mediaUrls: [],
            marqueeItems: [],
            marqueeSpeed: 30,
            marqueeHeightPercent: 5,
            marqueeFontSize: 0,
            gridColumns: 2,
            gridRows: 2,
            mediaSectionWidth: 33,
            customFontSize: 0,
            mediaRotationInterval: 8000,
            customLogoSize: 0,
            customCodeSize: 0,
            ratesBackgroundColor: '#0b1220',
            activeCardBorderColor: '#22d3ee'
        };
        
        $scope.allRates = [];
        $scope.displayedRates = [];
        $scope.activeCardIndex = 0;
        $scope.isConfigMode = false;
        $scope.isKiosk = (window.location.pathname === '/play' || window.location.hash === '#/play');
        
        var startIndex = 0;
        var highlightTimer;
        var rotationTimer;

        // --- Init ---
        activate();

        function activate() {
            loadData();
            setupSocket();
            startTimers();
        }

        // --- Model Proxies for UI (ms <-> s) ---
        // Helper to create a getter/setter for seconds-based inputs
        function createTimeProxy(key) {
            return function(newValue) {
                if (arguments.length) {
                    $scope.settings[key] = newValue * 1000;
                }
                return ($scope.settings[key] || 0) / 1000;
            };
        }

        // Exposed proxies for the view
        $scope.ui = {
            highlightInterval: function(val) {
                if (arguments.length) { $scope.settings.highlightInterval = val * 1000; }
                return ($scope.settings.highlightInterval || 0) / 1000;
            },
            
            rotationInterval: function(val) {
                if (arguments.length) { $scope.settings.rotationInterval = val * 1000; }
                return ($scope.settings.rotationInterval || 0) / 1000;
            },

            mediaRotationInterval: function(val) {
                if (arguments.length) { $scope.settings.mediaRotationInterval = val * 1000; }
                return ($scope.settings.mediaRotationInterval || 0) / 1000;
            }
        };

        // --- Data Loading ---
        function loadData() {
            DataService.getConfig().then(function(data) {
                if (data.settings) {
                    $scope.settings = angular.extend($scope.settings, data.settings);
                }
                if (data.rates) {
                    $scope.allRates = data.rates;
                }
                updateDisplayedRates();
                resetTimers(); // Restart timers with new settings
            });
        }

        function setupSocket() {
            SocketService.on('connect', function() {
                console.log('Connected to socket');
                loadData();
            });

            SocketService.on('settingsUpdated', function(newSettings) {
                console.log('Settings updated via socket');
                $scope.settings = angular.extend($scope.settings, newSettings);
                updateDisplayedRates();
                resetTimers();
            });

            SocketService.on('ratesUpdated', function(newRates) {
                console.log('Rates updated via socket');
                $scope.allRates = newRates;
                updateDisplayedRates();
            });
        }

        // --- Logic ---
        function updateDisplayedRates() {
            var capacity = $scope.settings.gridColumns * $scope.settings.gridRows;
            var rates = [];
            
            if ($scope.allRates.length === 0) {
                $scope.displayedRates = [];
                return;
            }

            for (var i = 0; i < capacity; i++) {
                var index = (startIndex + i) % $scope.allRates.length;
                rates.push($scope.allRates[index]);
            }
            $scope.displayedRates = rates;
        }

        function startTimers() {
            // Highlight Timer
            highlightTimer = $interval(function() {
                var capacity = $scope.settings.gridColumns * $scope.settings.gridRows;
                $scope.activeCardIndex = ($scope.activeCardIndex + 1) % capacity;
            }, $scope.settings.highlightInterval);

            // Page Rotation Timer
            rotationTimer = $interval(function() {
                var capacity = $scope.settings.gridColumns * $scope.settings.gridRows;
                startIndex = (startIndex + capacity) % $scope.allRates.length;
                $scope.activeCardIndex = 0;
                updateDisplayedRates();
            }, $scope.settings.rotationInterval);
        }

        function resetTimers() {
            if (angular.isDefined(highlightTimer)) {
                $interval.cancel(highlightTimer);
            }
            if (angular.isDefined(rotationTimer)) {
                $interval.cancel(rotationTimer);
            }
            startTimers();
        }

        // --- Config Mode ---
        $scope.toggleConfigMode = function() {
            $scope.isConfigMode = !$scope.isConfigMode;
        };

        // UI Form temporary state
        $scope.form = {
            newMarqueeItem: ''
        };

        $scope.saveSettings = function() {
            DataService.saveSettings($scope.settings).then(function() {
                alert('Configuration sauvegardée !');
            }, function() {
                alert('Erreur lors de la sauvegarde.');
            });
        };

        // Marquee Logic
        $scope.addMarqueeItem = function() {
            if ($scope.form.newMarqueeItem && $scope.form.newMarqueeItem.trim()) {
                $scope.settings.marqueeItems.push($scope.form.newMarqueeItem);
                $scope.form.newMarqueeItem = '';
            }
        };

        $scope.removeMarqueeItem = function(index) {
            $scope.settings.marqueeItems.splice(index, 1);
        };

        $scope.moveMarqueeItem = function(index, direction) {
            var items = $scope.settings.marqueeItems;
            var newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex >= 0 && newIndex < items.length) {
                var temp = items[index];
                items[index] = items[newIndex];
                items[newIndex] = temp;
            }
        };

        // Media Logic
        $scope.uploadMedia = function(files) {
            if (!files || files.length === 0) return;
            
            // Sequential upload
            var promises = [];
            for (var i = 0; i < files.length; i++) {
                promises.push(DataService.uploadFile(files[i]));
            }

            Promise.all(promises).then(function(responses) {
                $scope.$apply(function() {
                    responses.forEach(function(res) {
                        if (res && res.url) {
                            $scope.settings.mediaUrls.push(res.url);
                        }
                    });
                });
            });
        };

        $scope.removeMedia = function(index) {
            $scope.settings.mediaUrls.splice(index, 1);
        };

        $scope.moveMedia = function(index, direction) {
            var items = $scope.settings.mediaUrls;
            var newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex >= 0 && newIndex < items.length) {
                var temp = items[index];
                items[index] = items[newIndex];
                items[newIndex] = temp;
            }
        };

        // --- Cleanup ---
        $scope.$on('$destroy', function() {
            if (angular.isDefined(highlightTimer)) $interval.cancel(highlightTimer);
            if (angular.isDefined(rotationTimer)) $interval.cancel(rotationTimer);
        });
    }

})();
