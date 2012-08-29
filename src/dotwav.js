var assert = require("assert"),
	bitster = require("bitster");

//
var asciiToByteArray = bitster.Raw.Byte.Array.Stream.from.Byte.String.Stream;
var byteArrayToAscii = bitster.Raw.Byte.String.Stream.from.Byte.Array.Stream;
var numberToLong = bitster.LE.Long.Array.from.Number;

//
function shortArrayToByteArray(data) { // TODO: Move to bitster
	var ret = new Array(data.length / 2);

	var j = 0;

	for (var i = 0, length = data.length; i < length; i++) {
		ret[j++] = data[i] & 0xFF;
		ret[j++] = data[i] >> 8 & 0xFF;
	}

	return ret;
}

//
function samplesToData(samples, sampleDepth) {
	if (sampleDepth == 8) {
		return samples;
	} else if (sampleDepth == 16) {
		return shortArrayToByteArray(samples);
	}
}

//
function getMinMax(data) {
	var
		min = Infinity,
		max = -Infinity;

	for(var i = 0, length = data.length; i < length; i++) {
		var val = data[i];

		if(val < min) {
			min = val;
		} else if(val > max) {
			max = val;
		}
	}

	return {
		'min' : min,
		'max' : max
	};
}

//
function interleaveChannels(channels, sampleDepth) {
	if(channels.length == 1) {
		return channels[0];
	}

	var ret = new Array(channels[0].length + channels[1].length);

	var j = 0;

	for(var i = 0, length = channels[0].length; i < length; i++) {
			ret[j++] = channels[0][i];
			ret[j++] = channels[1][i];
	}

	return ret;
}

//
function toURL(values) {
	var out = "";

	for (var i = 0, length = values.length; i < length; i++) {
		var hex = values[i].toString(16);

		if (hex.length == 1) {
			hex = "0" + hex;
		}

		out += "%" + hex;
	}

	return out.toUpperCase();
}

//
function fmtSubChunk(channels, sampleDepth, sampleRate) {
	var byteRate = sampleRate * channels * sampleDepth / 8;
	var blockAlign = channels * sampleDepth / 8;

	return [].concat(
		asciiToByteArray("fmt "),
		numberToLong(16),
		[1, 0],
		[channels, 0],
		numberToLong(sampleRate),
		numberToLong(byteRate),
		[blockAlign, 0],
		[sampleDepth, 0]
	);
}

//
function dataSubChunk(channels, sampleDepth, samples) {
	return [].concat(
		asciiToByteArray("data"),
		numberToLong(samples.length * sampleDepth / 8),
		samplesToData(samples, sampleDepth)
	);
}

//
function chunkSize(fmt, data) {
	return numberToLong(4 + (8 + fmt.length) + (8 + data.length));
}

//
function riffChunk(channels, sampleDepth, sampleRate, samples) {
	var fmt = fmtSubChunk(channels, sampleDepth, sampleRate);

	var data = dataSubChunk(channels, sampleDepth, samples);

	var header = [].concat(
		asciiToByteArray("RIFF"),
		chunkSize(fmt, data),
		asciiToByteArray("WAVE")
	);

	return [].concat(
		header,
		fmt,
		data
	);
}

//
function normalize(data, sampleDepth, min, max, low, high) {
	var length = data.length;

	var ret;

	if(sampleDepth == 8) {
		ret = new Int8Array(length);
	} else if(sampleDepth == 16) {
		ret = new Int16Array(length);
	}

	var range = max - min;

	var outRange = high - low;

	for(var i = 0; i < length; i++) {
		ret[i] = low + (data[i] - min) / range * outRange;
	}

	return ret;
}

//
var DotWAV = function(options) { // TODO, make (options, audioData)
	assert.ok(options instanceof Object, "Options is provided as an object");
	assert.ok(typeof options.sampleRate == "number", "options.sampleRate provided as a number");

	assert.ok(typeof options.sampleDepth == "number", "options.sampleDepth provided as a number");
	assert.ok(options.sampleDepth == 8 || options.sampleDepth == 16, "options.sampleDepth is 8 or 16");

	assert.ok(
		options.data instanceof Array ||
		(
			options.data instanceof Object &&
			options.data.left instanceof Array &&
			options.data.right instanceof Array &&
			options.data.left.length == options.data.right.length
		),
		"options.data is an array of samples or an object containing left and right channel data arrays of equal length"
	);

	assert.ok(
		!options.normalize ||
		typeof options.normalize == "boolean" ||
		options.normalize instanceof Object && (
			typeof options.normalize.min == "number" &&
			typeof options.normalize.max == "number"
		),
		"Normalize is boolean if provided"
	);

	this.options = options;

	this.generate();
};

DotWAV.prototype = {
	'generate' : function() {
		var channels;

		if(this.options.data instanceof Array) {
			channels = [this.options.data];
		} else if(this.options.data instanceof Object) {
			channels = [this.options.data.left, this.options.data.right];
		}

		var low, high;

		if(this.options.sampleDepth == 8) {
			low = -0x80;
			high = 0x7F;
		} else if(this.options.sampleDepth == 16) {
			low = -0x8000;
			high = 0x7FFF;
		}

		if(this.options.normalize) {
			for(var i = 0; i < channels.length; i++) {
				var min, max;

				if(typeof this.options.normalize == "boolean") {
					var minmax = getMinMax(channels[i]);

					min = minmax.min;
					max = minmax.max;
				} else {
					min = this.options.normalize.min;
					max = this.options.normalize.max;
				}

				channels[i] = normalize(channels[i], this.options.sampleDepth, min, max, low, high);
			}
		}

		this.data = riffChunk(
			channels.length,
			this.options.sampleDepth,
			this.options.sampleRate,
			interleaveChannels(channels)
		);
	},

	'getData' : function(type) {
		switch(type) {
			case "url":
				return "data:audio/x-wav," + toURL(this.data);

			case "base64":
				return "data:audio/x-wav;base64," + btoa(byteArrayToAscii(this.data)); // TODO: Polyfill

			case "raw":
				return byteArrayToAscii(this.data);

			case "uint8":
				return new Uint8Array(this.data);

			case "array":
				return this.data;

			default:
				throw new Error("Invalid data type");
		};
	}
};

module.exports = DotWAV;