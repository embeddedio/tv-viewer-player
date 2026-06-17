(function() {
    'use strict';

    angular
        .module('currencyApp')
        .factory('SocketService', SocketService);

    SocketService.$inject = ['socketFactory'];

    function SocketService(socketFactory) {
        // Create the raw io socket with robust options
        var myIoSocket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        // Create the angular wrapper
        var mySocket = socketFactory({
            ioSocket: myIoSocket
        });

        return mySocket;
    }
})();