define(function(require) {
	"use strict";
	var $                = require('jquery'),
		_                = require('underscore'),
		Backbone         = require('backbone')
	
	var currencyFormat = {
		symbol : "VNĐ",		// default currency symbol is '$'
		format : "%v %s",	// controls output: %s = symbol, %v = value (can be object, see docs)
		decimal : ",",		// decimal point separator
		thousand : ".",		// thousands separator
		precision : 0,		// decimal places
		grouping : 3		// digit grouping (not implemented yet)
	};

	return Backbone.View.extend({
		
		/**
		 * Render template of active status 
		 */
		statusRender: function(status) {
			if (!status) {
				return "<div class='text-center'><span class='glyphicon glyphicon-remove'></span></div>";
			}
			return "<div class='text-center' style='color: blue;'><span class='glyphicon glyphicon-ok'></span></div>";
		},

		/**
		 * Format datetime
		 */
		datetimeFormat: function(datetime, formatString, align=null) {
			var format = (formatString != null) ? formatString : "DD-MM-YYYY HH:mm:ss";
			if (align == null) {
				//// for a timezone that is +7 UTC hours === utcOffset(420)
				return moment(datetime).isValid() ? moment(datetime).utcOffset(420).format(format) : "";
			}
			return moment(datetime).isValid() ? `<div style="text-align: ${align}">${moment(datetime).utcOffset(420).format(format)}</div>` : "";
			
		},
		
		/**
		 * Format currency number
		 */
		currencyFormat: function(amount, alignRight = false, symbol = "VNĐ") {
			if (typeof amount !== "number") {
				return "Argument 1 must be a number";
			}
			
			var result = accounting.formatMoney(amount,
				 		 symbol,
						 currencyFormat.precision,
						 currencyFormat.thousand,
						 currencyFormat.decimal,
						 currencyFormat.format);
			
			if (alignRight === true) {
				return `<div class='text-right'>${result}</div>`;
			}
			return result;
		}
		
		
	});
});
