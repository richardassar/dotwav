var
	DotWAV = require("../")
	domready = require("domready");

var sampleRate = 44100;
var duration = 2;
var length = sampleRate * duration;

var dataL = new Array(length);
var dataR = new Array(length);

for(var i = 0; i < length; i++) {
	dataL[i] = Math.sin(i / sampleRate * Math.PI * 2 * 440);
	dataR[i] = Math.sin(i / sampleRate * Math.PI * 2 * 443);
}

var wav = new DotWAV({
	'sampleRate' : sampleRate,
	'sampleDepth' : 16,
	'data' : {
		'left' : dataL,
		'right' : dataR
	},
	'normalize' : true
});

//
var audioElement = document.createElement('audio');

audioElement.setAttribute("src", wav.getData('url'));
audioElement.setAttribute("controls", "controls");

//
/*window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

var blob = new Blob([wav.getData('uint8').buffer], {'type' : 'audio/wav'});

var src = window.URL.createObjectURL(blob);

//
var anchorElement = document.createElement('a');

anchorElement.innerHTML = "Download...";
anchorElement.href = src;
anchorElement.download = "data.wav";*/

//
domready(function() {
	document.body.appendChild(audioElement);
	//document.body.appendChild(anchorElement);
});