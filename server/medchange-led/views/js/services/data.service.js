(function() {
    'use strict';

    angular
        .module('currencyApp')
        .service('DataService', DataService);

    DataService.$inject = ['$http', '$q'];

    function DataService($http, $q) {
        var apiBase = '/api';

        var service = {
            getConfig: getConfig,
            saveSettings: saveSettings,
            uploadFile: uploadFile
        };

        return service;

        function getConfig() {
            return $http.get(apiBase + '/data')
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching data:', error);
                    return $q.reject(error);
                });
        }

        function saveSettings(settings) {
            return $http.post(apiBase + '/settings', { settings: settings })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error saving settings:', error);
                    return $q.reject(error);
                });
        }

        function uploadFile(file) {
            var formData = new FormData();
            formData.append('file', file);

            return $http.post(apiBase + '/upload', formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            })
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Error uploading file:', error);
                return $q.reject(error);
            });
        }
    }
})();
