define(function() {
    return {
	getUserMedia: (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator),
	getAudioContext: (window.AudioContext || window.webkitAudioContext).bind(window)
    };
});
