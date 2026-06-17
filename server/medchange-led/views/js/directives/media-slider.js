(function() {
    'use strict';

    angular
        .module('currencyApp')
        .directive('mediaSlider', mediaSlider);

    function mediaSlider($timeout) {
        return {
            restrict: 'E',
            scope: {
                urls: '=',
                interval: '='
            },
            templateUrl: 'js/directives/templates/media-slider.html',
            link: function(scope, element, attrs) {
                scope.currentIndex = 0;
                var timer;

                scope.isVideo = function(url) {
                    if (!url) return false;
                    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
                };

                function nextSlide() {
                    if (!scope.urls || scope.urls.length === 0) return;
                    
                    scope.currentIndex = (scope.currentIndex + 1) % scope.urls.length;
                    console.log("MediaSlider: Next Slide -> Index", scope.currentIndex);
                    processCurrentSlide();
                }

                function processCurrentSlide() {
                    // Cancel any existing timer
                    if (timer) {
                        $timeout.cancel(timer);
                    }

                    if (!scope.urls || scope.urls.length === 0) return;

                    // Safety check for index
                    if (scope.currentIndex >= scope.urls.length) {
                        scope.currentIndex = 0;
                    }

                    var currentUrl = scope.urls[scope.currentIndex];
                    if (!currentUrl) {
                        console.warn("MediaSlider: Current URL is undefined, skipping");
                        timer = $timeout(nextSlide, 1000);
                        return;
                    }

                    var isVid = scope.isVideo(currentUrl) && !currentUrl.includes('giphy.com');
                    console.log("MediaSlider: Processing", isVid ? "Video" : "Image", currentUrl);

                    if (isVid) {
                        // Video logic
                        $timeout(function() {
                            // Select video by data-index to be precise
                            var video = element[0].querySelector('video[data-index="' + scope.currentIndex + '"]');
                            var allVideos = element.find('video');
                            
                            // Pause all others
                            for(var i=0; i<allVideos.length; i++) {
                                if (allVideos[i] !== video) allVideos[i].pause();
                            }

                            if (video) {
                                video.currentTime = 0;
                                video.play().then(function(){
                                    console.log("MediaSlider: Video playing");
                                }).catch(function(e){ 
                                    console.warn("MediaSlider: Autoplay blocked/failed, skipping in 3s", e);
                                    timer = $timeout(nextSlide, 3000);
                                });
                            } else {
                                console.warn("MediaSlider: Video element not found in DOM");
                                timer = $timeout(nextSlide, 3000);
                            }
                        });
                    } else {
                        // Image logic
                        var delay = parseInt(scope.interval, 10) || 8000;
                        console.log("MediaSlider: Image timer set for", delay, "ms");
                        timer = $timeout(nextSlide, delay);
                    }
                }

                scope.onVideoEnded = function() {
                    console.log("MediaSlider: Video ended event");
                    nextSlide();
                };

                // Watch URLs
                scope.$watch('urls', function(newVal) {
                    if (newVal && newVal.length > 0) {
                        console.log("MediaSlider: URLs updated", newVal.length);
                        if (scope.currentIndex >= newVal.length) {
                            scope.currentIndex = 0;
                        }
                        processCurrentSlide();
                    }
                }, true);

                // Watch Interval
                scope.$watch('interval', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        console.log("MediaSlider: Interval updated to", newVal);
                        var currentUrl = scope.urls && scope.urls[scope.currentIndex];
                        // Only restart if currently on an image (videos control their own timing via duration)
                        if (currentUrl && (!scope.isVideo(currentUrl) || currentUrl.includes('giphy.com'))) {
                            processCurrentSlide();
                        }
                    }
                });

                scope.$on('$destroy', function() {
                    if (timer) $timeout.cancel(timer);
                });
            }
        };
    }
})();