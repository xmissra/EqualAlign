/*!
 * EqualAlign - 1.0
 * A javascript library which aligns adjacent block elements such that they are of equal height
 * Author http://www.missra.com/
 */
(function (window, document, name) {
	'use strict';

	/**
	 * A local reference to the global Math functions.
	 */
	var max = Math.max;
	var min = Math.min;
	var abs = Math.abs;

	/**
	 * Polyfill for getComputedStyle function.
	 * Necessary for use in ie8.
	 */
	if (!window.getComputedStyle) {
		window.getComputedStyle = function (el, pseudo) {
			this.el = el;
			this.getPropertyValue = function (prop) {
				var re = /(\-([a-z]){1})/g;
				if (prop == 'float') prop = 'styleFloat';
				if (re.test(prop)) {
					prop = prop.replace(re, function () {
						return arguments[2].toUpperCase();
					});
				}
				return el.currentStyle[prop] ? el.currentStyle[prop] : null;
			}
			return this;
		}
	}

	/**
	 * Polyfill for forEach function.
	 * Necessary for use in ie8.
	 */
	if (typeof Array.prototype.forEach != 'function') {
		Array.prototype.forEach = function (callback) {
			for (var i = 0; i < this.length; i++) {
				callback.apply(this, [this[i], i, this]);
			}
		};
	}

	/**
	 * Polyfill for Object.keys function.
	 * Necessary for use in ie8.
	 */
	if (!Object.keys) {
		Object.keys = function (obj) {
			var keys = [];

			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					keys.push(i);
				}
			}

			return keys;
		};
	}

	/**
	 * merge objects.
	 * means that properties in dest will be overwritten by the ones in src.
	 * @param {Object} dest
	 * @param {Object} src
	 * @param {Boolean} [merge]
	 * @returns {Object} dest
	 */
	function merge(dest, src, merge) {
		var keys = Object.keys(src);
		var i = 0;
		while (i < keys.length) {
			if (!merge || (merge && dest[keys[i]] === undefined)) {
				dest[keys[i]] = src[keys[i]];
			}
			i++;
		}
		return dest;
	}

	/**
	 * Create Instance of Application
	 * @param {HTMLElement} element
	 * @param {Object} [options]
	 * @constructor
	 */
	function EqualAlign(element, options) {
		options = options || {};
		return new Manager(element, options);
	}
	EqualAlign.defaults = {
		/**
		 * Description
		 * @type {String}
		 * @default 'item'
		 */
		targetClass: 'item',
		threshold: 1,
		beforeRun: function () { },
		afterRun: function () { }
	};

	/**
	 * Manager object to initiate and run the process
	 * Also contains to other managers objects
	 * @param {HTMLElement} el
	 * @param {Object} options
	 */
	function Manager(el, options) {
		var self = this;
		/* Merge default options with new options */
		this.options = merge(options, EqualAlign.defaults, true);
		this.im = new ItemManager(el, options);
		this.eh = new EventHandler();
		this.cm = new ComparisonManager(options);
		this.init(this);
	}
	Manager.prototype = {
		init: function (self) {
			this.eh.addEventListener(window, 'resize', function () {
				Array.prototype.forEach.call(self.im.items, function (el, i) {
					el.setHeight('');
				});
				self.run();
			});
			this.options.beforeRun();
			/* Re-run after images have loaded */
			Array.prototype.forEach.call(this.im.items, function (el, i) {
				var images = el.element.getElementsByTagName('img');
				Array.prototype.forEach.call(images, function (img, i) {
					img.onload = function () {
						self.run();
					}
				});
			});
			this.run();
			this.options.afterRun();
		},
		run: function () {
			for (var i = 0; i < this.im.items.length; i++) {
				for (var j = i + 1; j < this.im.items.length; j++) {
					this.cm.compare(this.im.items[i], this.im.items[j]);
				}
			}
		},
		update: function () {
			this.run();
		},
		destroy: function () {
			this.eh.removeAll();
			this.im.resetItems();
		}
	};

	/**
	 * Keeps reference to target items
	 * @param {Object} el
	 * @param {Object} options
	 */
	function ItemManager(el, options) {
		this.element = el;
		this.options = options;
		this.items = [];
		this.init();
	}
	ItemManager.prototype = {
		init: function () {
			this.items = this.getItems();
		},
		getItems: function () {
			var a = [],
				targetClass = this.options.targetClass;

			if (!this.element) return a;

			if (typeof targetClass === "object") {
				for (var i = 0; i < targetClass.length; i++) {
					var b = this.getItem(targetClass[i]);
					a = a.concat(b);
				}
				return a;
			}

			return this.getItem(targetClass);
		},
		getItem: function (targetClass) {
			var a = [],
				elements = this.element.querySelectorAll('.' + targetClass);


			Array.prototype.forEach.call(elements, function (el, i) {
				a.push(new Item(el));
			});
			return a;

		},
		resetItems: function () {
			Array.prototype.forEach.call(this.items, function (el, i) {
				el.reset();
			});
		}
	};

	/**
	 * Store values for each item
	 * @param {HTMLElement} el
	 */
	function Item(el) {
		this.element = el;
		this.originalMinHeight = el.style.minHeight;
		this.computedStyle = window.getComputedStyle(el, null);

		this._top = this.getTop();
		this._outerHeight = this.getOuterHeight();
		this._paddingTop = this.getCssValue('padding-top');
		this._paddingBottom = this.getCssValue('padding-bottom');
		this._borderTopWidth = (this.getCssValue('border-top-style') === 'none') ? 0 : this.getCssValue('border-top-width');
		this._borderBottomWidth = (this.getCssValue('border-bottom-style') === 'none') ? 0 : this.getCssValue('border-bottom-width');
		this._boxSizing = this.getCssValue('box-sizing');
		this._cushion = this.getCushion();
	}
	Item.prototype = {
		getCssValue: function (val) {
			var VENDOR_PREFIXES = ['', '-webkit-', '-moz-', '-ms-', '-MS-', '-o-'];

			for (var i in VENDOR_PREFIXES) {
				var s = this.computedStyle.getPropertyValue(VENDOR_PREFIXES[i] + val);
				if (s) {
					return s;
				}
			}
			return '';
		},
		isBorderBox: function () {
			return this._boxSizing == 'border-box';
		},
		getCushion: function () {
			return parseInt(this._paddingTop)
				+ parseInt(this._paddingBottom)
				+ parseInt(this._borderTopWidth)
				+ parseInt(this._borderBottomWidth);
		},
		getTop: function () {
			return this.element.offsetTop;
		},
		getOuterHeight: function () {
			//retrieve the float value
			return this.element.getBoundingClientRect().height;
		},
		getElement: function () {
			return this.element;
		},
		setHeight: function (val) {
			this.element.style.minHeight = val;
		},
		reset: function () {
			this.element.style.minHeight = this.originalMinHeight;
		}
	};

	/**
	 * Allows comparisons between items
	 * @param {Object} options
	 */
	function ComparisonManager(options) {
		this.options = options;
		this.test();
	}
	ComparisonManager.prototype = {
		test: function () {
			var body = document.getElementsByTagName("body")[0],
				div = document.createElement("div"),
				container = document.createElement("div");
			container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
			body.appendChild(container).appendChild(div);
			div.style.paddingTop = '20px';
			div.style.boxSizing = 'border-box';
			div.style.minHeight = '100px';
			this.isIe8 = (div.offsetHeight === 100) ? false : true;
			body.removeChild(container);
		},
		compare: function (a, b) {
			a._top = a.getTop();
			a._outerHeight = a.getOuterHeight();
			b._top = b.getTop();
			b._outerHeight = b.getOuterHeight();
			if (!this.isAdjacent(a, b)) return;

			var d = this.getDifference(a, b);

			if (!d > 0) return;

			var larger = this.getLargest(a, b);

			if (!(d < larger * this.options.threshold)) return;

			if (a._top + a._outerHeight < b._top + b._outerHeight) {

				if (this.isIe8) a.setHeight((a._outerHeight + d - a._cushion) + 'px');
				else a.setHeight((a._outerHeight + d - (a.isBorderBox() ? 0 : a._cushion)) + 'px');
			}
			else {
				if (this.isIe8) b.setHeight((b._outerHeight + d - b._cushion) + 'px');
				else b.setHeight((b._outerHeight + d - (b.isBorderBox() ? 0 : b._cushion)) + 'px');
			}
		},

		/**
		 * Determine if 2 items are adjacent.
		 * @param {Object:Item} a
		 * @param {Object:Item} b
		 * @returns {Boolean}
		 */
		isAdjacent: function (a, b) {
			var o = min(a._top + a._outerHeight, b._top + b._outerHeight) - max(a._top, b._top); //Determine if adjacent 
			return o > 0;
		},
		/**
		 * Get the difference between 2 items.
		 * @param {Object:Item} a
		 * @param {Object:Item} b
		 * @returns {Int} d
		 */
		getDifference: function (a, b) {
			var d = abs((b._top + b._outerHeight) - (a._top + a._outerHeight));   //Get the difference
			return d;
		},
		/**
		 * Get the item which stretches farthest
		 * ie. the highest bottom value
		 * @param {Object:Item} a
		 * @param {Object:Item} b
		 * @returns {Object: Item}
		 */
		getLargest: function (a, b) {
			return max(a._outerHeight + (a.isBorderBox() ? a._cushion : 0), b._outerHeight + (b.isBorderBox() ? b._cushion : 0));
		}
	}

	/**
	 * Attach/detach events
	 */
	function EventHandler() {
		this.events = [];
	}
	EventHandler.prototype = {
		addEventListener: function (el, evt, func) {
			this.events.push({
				el: el,
				evt: evt,
				func: func
			});
			if (el.addEventListener) {
				el.addEventListener(evt, func, false);
			}
			else {
				el.attachEvent('on' + evt, func);
			}
		},
		removeEventListener: function (el, evt, func) {
			if (el.removeEventListener) {
				el.removeEventListener(evt, func, false);
			}
			else {
				el.detachEvent('on' + evt, func);
			}
		},
		removeAll: function () {
			for (var i = 0; i < this.events.length; i++) {
				this.removeEventListener(this.events[i].el, this.events[i].evt, this.events[i].func);
			}
		}
	};

	window[name] = EqualAlign;

})(window, document, 'EqualAlign');
