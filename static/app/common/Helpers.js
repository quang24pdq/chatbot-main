define(function (require) {
	return class Helper {
		constructor() {
			return;
		};

		static now_timestamp() {
            return moment.now();
        }

		static utcTimestampNow() {
			return moment.now();
		}

		static localToTimestamp(datetime) {
            return moment(datetime).unix() * 1000
        }

        static utcToLocal(utcTime, format = "YYYY-MM-DD HH:mm") {
			return moment(utcTime).local().format(format);
		}

		static formatTimestampToDatetime(timestamp, options = {}) {
			var format = "DD/MM/YYYY HH:mm";
			if (options && options.format) {
				format = options.format;
			}
			return moment(timestamp).local().format(format);
		}


		/**
         *
         * @param {*} type
         * @param {*} base
         * @param {*} uppercase
         */
		static generateHashKey(type = "mix", base = 32, uppercase = false) {
			var charsets = null;
			if (type == "number") {
				charsets = "1234567890";
			} else if (type == "string") {
				charsets = "abcdefghijklmnopqrstuvwxyz";
			} else {
				charsets = "abcdefghijklmnopqrs-tuvwxyz1234567890" + "abcdefghijklmnopqrstuvwxyz".toLocaleUpperCase();
			}

			if (uppercase) {
				charsets = charsets.toUpperCase().split("");
			} else {
				charsets = charsets.split("");
			}
			var hash = "";
			var limit = 5;
			var stringDistance = 0;
			if (base >= 16) {
				stringDistance = Math.ceil(base / limit);
			}
			if (stringDistance > 0) {
				for (var i = 0; i < base; i++) {
					if (i === stringDistance - 1) {
						hash += "-";
						stringDistance += Math.ceil(base / limit);
					}
					hash += charsets[Math.floor(Math.random() * charsets.length)];
				}
			} else {
				for (var i = 0; i < base; i++) {
					hash += charsets[Math.floor(Math.random() * charsets.length)];
				}
			}

			return hash;
		}

		static objectExtend(obj, src) {
			Object.keys(src).forEach(function (key) { obj[key] = src[key]; });
			return obj;
		}

		static validateVariable(variable) {
			var regex = new RegExp("^[a-z][a-zA-Z0-9]*$", "g");
			console.log(regex.test(variable));
			return true;
		}
	}
});