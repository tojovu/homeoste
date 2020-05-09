/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
	var initializing = false;

	// The base JQClass implementation (does nothing)
	window.JQClass = function(){};

	// Collection of derived classes
	JQClass.classes = {};
 
	// Create a new JQClass that inherits from this class
	JQClass.extend = function extender(prop) {
		var base = this.prototype;

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (var name in prop) {
			// Check if we're overwriting an existing function
			prototype[name] = typeof prop[name] == 'function' &&
				typeof base[name] == 'function' ?
				(function(name, fn){
					return function() {
						var __super = this._super;

						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = function(args) {
							return base[name].apply(this, args || []);
						};

						var ret = fn.apply(this, arguments);				

						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						this._super = __super;

						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}

		// The dummy class constructor
		function JQClass() {
			// All construction is actually done in the init method
			if (!initializing && this._init) {
				this._init.apply(this, arguments);
			}
		}

		// Populate our constructed prototype object
		JQClass.prototype = prototype;

		// Enforce the constructor to be what we expect
		JQClass.prototype.constructor = JQClass;

		// And make this class extendable
		JQClass.extend = extender;

		return JQClass;
	};
})();

(function($) { // Ensure $, encapsulate

	/** Abstract base class for collection plugins v1.0.1.
		Written by Keith Wood (kbwood{at}iinet.com.au) December 2013.
		Licensed under the MIT (http://keith-wood.name/licence.html) license.
		@module $.JQPlugin
		@abstract */
	JQClass.classes.JQPlugin = JQClass.extend({

		/** Name to identify this plugin.
			@example name: 'tabs' */
		name: 'plugin',

		/** Default options for instances of this plugin (default: {}).
			@example defaultOptions: {
 	selectedClass: 'selected',
 	triggers: 'click'
 } */
		defaultOptions: {},
		
		/** Options dependent on the locale.
			Indexed by language and (optional) country code, with '' denoting the default language (English/US).
			@example regionalOptions: {
	'': {
		greeting: 'Hi'
	}
 } */
		regionalOptions: {},
		
		/** Names of getter methods - those that can't be chained (default: []).
			@example _getters: ['activeTab'] */
		_getters: [],

		/** Retrieve a marker class for affected elements.
			@private
			@return {string} The marker class. */
		_getMarker: function() {
			return 'is-' + this.name;
		},
		
		/** Initialise the plugin.
			Create the jQuery bridge - plugin name <code>xyz</code>
			produces <code>$.xyz</code> and <code>$.fn.xyz</code>. */
		_init: function() {
			// Apply default localisations
			$.extend(this.defaultOptions, (this.regionalOptions && this.regionalOptions['']) || {});
			// Camel-case the name
			var jqName = camelCase(this.name);
			// Expose jQuery singleton manager
			$[jqName] = this;
			// Expose jQuery collection plugin
			$.fn[jqName] = function(options) {
				var otherArgs = Array.prototype.slice.call(arguments, 1);
				if ($[jqName]._isNotChained(options, otherArgs)) {
					return $[jqName][options].apply($[jqName], [this[0]].concat(otherArgs));
				}
				return this.each(function() {
					if (typeof options === 'string') {
						if (options[0] === '_' || !$[jqName][options]) {
							throw 'Unknown method: ' + options;
						}
						$[jqName][options].apply($[jqName], [this].concat(otherArgs));
					}
					else {
						$[jqName]._attach(this, options);
					}
				});
			};
		},

		/** Set default values for all subsequent instances.
			@param options {object} The new default options.
			@example $.plugin.setDefauls({name: value}) */
		setDefaults: function(options) {
			$.extend(this.defaultOptions, options || {});
		},
		
		/** Determine whether a method is a getter and doesn't permit chaining.
			@private
			@param name {string} The method name.
			@param otherArgs {any[]} Any other arguments for the method.
			@return {boolean} True if this method is a getter, false otherwise. */
		_isNotChained: function(name, otherArgs) {
			if (name === 'option' && (otherArgs.length === 0 ||
					(otherArgs.length === 1 && typeof otherArgs[0] === 'string'))) {
				return true;
			}
			return $.inArray(name, this._getters) > -1;
		},
		
		/** Initialise an element. Called internally only.
			Adds an instance object as data named for the plugin.
			@param elem {Element} The element to enhance.
			@param options {object} Overriding settings. */
		_attach: function(elem, options) {
			elem = $(elem);
			if (elem.hasClass(this._getMarker())) {
				return;
			}
			elem.addClass(this._getMarker());
			options = $.extend({}, this.defaultOptions, this._getMetadata(elem), options || {});
			var inst = $.extend({name: this.name, elem: elem, options: options},
				this._instSettings(elem, options));
			elem.data(this.name, inst); // Save instance against element
			this._postAttach(elem, inst);
			this.option(elem, options);
		},

		/** Retrieve additional instance settings.
			Override this in a sub-class to provide extra settings.
			@param elem {jQuery} The current jQuery element.
			@param options {object} The instance options.
			@return {object} Any extra instance values.
			@example _instSettings: function(elem, options) {
 	return {nav: elem.find(options.navSelector)};
 } */
		_instSettings: function(elem, options) {
			return {};
		},

		/** Plugin specific post initialisation.
			Override this in a sub-class to perform extra activities.
			@param elem {jQuery} The current jQuery element.
			@param inst {object} The instance settings.
			@example _postAttach: function(elem, inst) {
 	elem.on('click.' + this.name, function() {
 		...
 	});
 } */
		_postAttach: function(elem, inst) {
		},

		/** Retrieve metadata configuration from the element.
			Metadata is specified as an attribute:
			<code>data-&lt;plugin name>="&lt;setting name>: '&lt;value>', ..."</code>.
			Dates should be specified as strings in this format: 'new Date(y, m-1, d)'.
			@private
			@param elem {jQuery} The source element.
			@return {object} The inline configuration or {}. */
		_getMetadata: function(elem) {
			try {
				var data = elem.data(this.name.toLowerCase()) || '';
				data = data.replace(/'/g, '"');
				data = data.replace(/([a-zA-Z0-9]+):/g, function(match, group, i) { 
					var count = data.substring(0, i).match(/"/g); // Handle embedded ':'
					return (!count || count.length % 2 === 0 ? '"' + group + '":' : group + ':');
				});
				data = $.parseJSON('{' + data + '}');
				for (var name in data) { // Convert dates
					var value = data[name];
					if (typeof value === 'string' && value.match(/^new Date\((.*)\)$/)) {
						data[name] = eval(value);
					}
				}
				return data;
			}
			catch (e) {
				return {};
			}
		},

		/** Retrieve the instance data for element.
			@param elem {Element} The source element.
			@return {object} The instance data or {}. */
		_getInst: function(elem) {
			return $(elem).data(this.name) || {};
		},
		
		/** Retrieve or reconfigure the settings for a plugin.
			@param elem {Element} The source element.
			@param name {object|string} The collection of new option values or the name of a single option.
			@param [value] {any} The value for a single named option.
			@return {any|object} If retrieving a single value or all options.
			@example $(selector).plugin('option', 'name', value)
 $(selector).plugin('option', {name: value, ...})
 var value = $(selector).plugin('option', 'name')
 var options = $(selector).plugin('option') */
		option: function(elem, name, value) {
			elem = $(elem);
			var inst = elem.data(this.name);
			if  (!name || (typeof name === 'string' && value == null)) {
				var options = (inst || {}).options;
				return (options && name ? options[name] : options);
			}
			if (!elem.hasClass(this._getMarker())) {
				return;
			}
			var options = name || {};
			if (typeof name === 'string') {
				options = {};
				options[name] = value;
			}
			this._optionsChanged(elem, inst, options);
			$.extend(inst.options, options);
		},
		
		/** Plugin specific options processing.
			Old value available in <code>inst.options[name]</code>, new value in <code>options[name]</code>.
			Override this in a sub-class to perform extra activities.
			@param elem {jQuery} The current jQuery element.
			@param inst {object} The instance settings.
			@param options {object} The new options.
			@example _optionsChanged: function(elem, inst, options) {
 	if (options.name != inst.options.name) {
 		elem.removeClass(inst.options.name).addClass(options.name);
 	}
 } */
		_optionsChanged: function(elem, inst, options) {
		},
		
		/** Remove all trace of the plugin.
			Override <code>_preDestroy</code> for plugin-specific processing.
			@param elem {Element} The source element.
			@example $(selector).plugin('destroy') */
		destroy: function(elem) {
			elem = $(elem);
			if (!elem.hasClass(this._getMarker())) {
				return;
			}
			this._preDestroy(elem, this._getInst(elem));
			elem.removeData(this.name).removeClass(this._getMarker());
		},

		/** Plugin specific pre destruction.
			Override this in a sub-class to perform extra activities and undo everything that was
			done in the <code>_postAttach</code> or <code>_optionsChanged</code> functions.
			@param elem {jQuery} The current jQuery element.
			@param inst {object} The instance settings.
			@example _preDestroy: function(elem, inst) {
 	elem.off('.' + this.name);
 } */
		_preDestroy: function(elem, inst) {
		}
	});
	
	/** Convert names from hyphenated to camel-case.
		@private
		@param value {string} The original hyphenated name.
		@return {string} The camel-case version. */
	function camelCase(name) {
		return name.replace(/-([a-z])/g, function(match, group) {
			return group.toUpperCase();
		});
	}
	
	/** Expose the plugin base.
		@namespace "$.JQPlugin" */
	$.JQPlugin = {
	
		/** Create a new collection plugin.
			@memberof "$.JQPlugin"
			@param [superClass='JQPlugin'] {string} The name of the parent class to inherit from.
			@param overrides {object} The property/function overrides for the new class.
			@example $.JQPlugin.createPlugin({
 	name: 'tabs',
 	defaultOptions: {selectedClass: 'selected'},
 	_initSettings: function(elem, options) { return {...}; },
 	_postAttach: function(elem, inst) { ... }
 }); */
		createPlugin: function(superClass, overrides) {
			if (typeof superClass === 'object') {
				overrides = superClass;
				superClass = 'JQPlugin';
			}
			superClass = camelCase(superClass);
			var className = camelCase(overrides.name);
			JQClass.classes[className] = JQClass.classes[superClass].extend(overrides);
			new JQClass.classes[className]();
		}
	};

})(jQuery);


//
// SmoothScroll for websites v1.2.1
// Licensed under the terms of the MIT license.
//
// You may use it in your theme if you credit me.
// It is also free to use on any individual website.
//
// Exception:
// The only restriction would be not to publish any
// extension for browsers or native application
// without getting a permission first.
//

// People involved
//  - Balazs Galambosi (maintainer)
//  - Michael Herf     (Pulse Algorithm)

(function(){

// Scroll Variables (tweakable)
	var defaultOptions = {

		// Scrolling Core
		frameRate        : 150, // [Hz]
		animationTime    : 400, // [px]
		stepSize         : 120, // [px]

		// Pulse (less tweakable)
		// ratio of "tail" to "acceleration"
		pulseAlgorithm   : true,
		pulseScale       : 8,
		pulseNormalize   : 1,

		// Acceleration
		accelerationDelta : 20,  // 20
		accelerationMax   : 1,   // 1

		// Keyboard Settings
		keyboardSupport   : true,  // option
		arrowScroll       : 50,     // [px]

		// Other
		touchpadSupport   : true,
		fixedBackground   : true,
		excluded          : ""
	};

	var options = defaultOptions;


// Other Variables
	var isExcluded = false;
	var isFrame = false;
	var direction = { x: 0, y: 0 };
	var initDone  = false;
	var root = document.documentElement;
	var activeElement;
	var observer;
	var deltaBuffer = [ 120, 120, 120 ];

	var key = { left: 37, up: 38, right: 39, down: 40, spacebar: 32,
		pageup: 33, pagedown: 34, end: 35, home: 36 };


	/***********************************************
	 * SETTINGS
	 ***********************************************/

	var options = defaultOptions;


	/***********************************************
	 * INITIALIZE
	 ***********************************************/

	/**
	 * Tests if smooth scrolling is allowed. Shuts down everything if not.
	 */
	function initTest() {

		var disableKeyboard = false;

		// disable keyboard support if anything above requested it
		if (disableKeyboard) {
			removeEvent("keydown", keydown);
		}

		if (options.keyboardSupport && !disableKeyboard) {
			addEvent("keydown", keydown);
		}
	}

	/**
	 * Sets up scrolls array, determines if frames are involved.
	 */
	function init() {

		if (!document.body) return;

		var body = document.body;
		var html = document.documentElement;
		var windowHeight = window.innerHeight;
		var scrollHeight = body.scrollHeight;

		// check compat mode for root element
		root = (document.compatMode.indexOf('CSS') >= 0) ? html : body;
		activeElement = body;

		initTest();
		initDone = true;

		// Checks if this script is running in a frame
		if (top != self) {
			isFrame = true;
		}

		/**
		 * This fixes a bug where the areas left and right to
		 * the content does not trigger the onmousewheel event
		 * on some pages. e.g.: html, body { height: 100% }
		 */
		else if (scrollHeight > windowHeight &&
			(body.offsetHeight <= windowHeight ||
			html.offsetHeight <= windowHeight)) {

			// DOMChange (throttle): fix height
			var pending = false;
			var refresh = function () {
				if (!pending && html.scrollHeight != document.height) {
					pending = true; // add a new pending action
					setTimeout(function () {
						html.style.height = document.height + 'px';
						pending = false;
					}, 500); // act rarely to stay fast
				}
			};
			html.style.height = 'auto';
			setTimeout(refresh, 10);

			// clearfix
			if (root.offsetHeight <= windowHeight) {
				var underlay = document.createElement("div");
				underlay.style.clear = "both";
				body.appendChild(underlay);
			}
		}

		// disable fixed background
		if (!options.fixedBackground && !isExcluded) {
			body.style.backgroundAttachment = "scroll";
			html.style.backgroundAttachment = "scroll";
		}
	}


	/************************************************
	 * SCROLLING
	 ************************************************/

	var que = [];
	var pending = false;
	var lastScroll = +new Date;

	/**
	 * Pushes scroll actions to the scrolling queue.
	 */
	function scrollArray(elem, left, top, delay) {

		delay || (delay = 1000);
		directionCheck(left, top);

		if (options.accelerationMax != 1) {
			var now = +new Date;
			var elapsed = now - lastScroll;
			if (elapsed < options.accelerationDelta) {
				var factor = (1 + (30 / elapsed)) / 2;
				if (factor > 1) {
					factor = Math.min(factor, options.accelerationMax);
					left *= factor;
					top  *= factor;
				}
			}
			lastScroll = +new Date;
		}

		// push a scroll command
		que.push({
			x: left,
			y: top,
			lastX: (left < 0) ? 0.99 : -0.99,
			lastY: (top  < 0) ? 0.99 : -0.99,
			start: +new Date
		});

		// don't act if there's a pending queue
		if (pending) {
			return;
		}

		var scrollWindow = (elem === document.body);

		var step = function (time) {

			var now = +new Date;
			var scrollX = 0;
			var scrollY = 0;

			for (var i = 0; i < que.length; i++) {

				var item = que[i];
				var elapsed  = now - item.start;
				var finished = (elapsed >= options.animationTime);

				// scroll position: [0, 1]
				var position = (finished) ? 1 : elapsed / options.animationTime;

				// easing [optional]
				if (options.pulseAlgorithm) {
					position = pulse(position);
				}

				// only need the difference
				var x = (item.x * position - item.lastX) >> 0;
				var y = (item.y * position - item.lastY) >> 0;

				// add this to the total scrolling
				scrollX += x;
				scrollY += y;

				// update last values
				item.lastX += x;
				item.lastY += y;

				// delete and step back if it's over
				if (finished) {
					que.splice(i, 1); i--;
				}
			}

			// scroll left and top
			if (scrollWindow) {
				window.scrollBy(scrollX, scrollY);
			}
			else {
				if (scrollX) elem.scrollLeft += scrollX;
				if (scrollY) elem.scrollTop  += scrollY;
			}

			// clean up if there's nothing left to do
			if (!left && !top) {
				que = [];
			}

			if (que.length) {
				requestFrame(step, elem, (delay / options.frameRate + 1));
			} else {
				pending = false;
			}
		};

		// start a new queue of actions
		requestFrame(step, elem, 0);
		pending = true;
	}


	/***********************************************
	 * EVENTS
	 ***********************************************/

	/**
	 * Mouse wheel handler.
	 * @param {Object} event
	 */
	function wheel(event) {

		if (!initDone) {
			init();
		}

		var target = event.target;
		var overflowing = overflowingAncestor(target);

		// use default if there's no overflowing
		// element or default action is prevented
		if (!overflowing || event.defaultPrevented ||
			isNodeName(activeElement, "embed") ||
			(isNodeName(target, "embed") && /\.pdf/i.test(target.src))) {
			return true;
		}

		var deltaX = event.wheelDeltaX || 0;
		var deltaY = event.wheelDeltaY || 0;

		// use wheelDelta if deltaX/Y is not available
		if (!deltaX && !deltaY) {
			deltaY = event.wheelDelta || 0;
		}

		// check if it's a touchpad scroll that should be ignored
		if (!options.touchpadSupport && isTouchpad(deltaY)) {
			return true;
		}

		// scale by step size
		// delta is 120 most of the time
		// synaptics seems to send 1 sometimes
		if (Math.abs(deltaX) > 1.2) {
			deltaX *= options.stepSize / 120;
		}
		if (Math.abs(deltaY) > 1.2) {
			deltaY *= options.stepSize / 120;
		}

		scrollArray(overflowing, -deltaX, -deltaY);
		event.preventDefault();
	}

	/**
	 * Keydown event handler.
	 * @param {Object} event
	 */
	function keydown(event) {

		var target   = event.target;
		var modifier = event.ctrlKey || event.altKey || event.metaKey ||
			(event.shiftKey && event.keyCode !== key.spacebar);

		// do nothing if user is editing text
		// or using a modifier key (except shift)
		// or in a dropdown
		if ( /input|textarea|select|embed/i.test(target.nodeName) ||
			target.isContentEditable ||
			event.defaultPrevented   ||
			modifier ) {
			return true;
		}
		// spacebar should trigger button press
		if (isNodeName(target, "button") &&
			event.keyCode === key.spacebar) {
			return true;
		}

		var shift, x = 0, y = 0;
		var elem = overflowingAncestor(activeElement);
		var clientHeight = elem.clientHeight;

		if (elem == document.body) {
			clientHeight = window.innerHeight;
		}

		switch (event.keyCode) {
			case key.up:
				y = -options.arrowScroll;
				break;
			case key.down:
				y = options.arrowScroll;
				break;
			case key.spacebar: // (+ shift)
				shift = event.shiftKey ? 1 : -1;
				y = -shift * clientHeight * 0.9;
				break;
			case key.pageup:
				y = -clientHeight * 0.9;
				break;
			case key.pagedown:
				y = clientHeight * 0.9;
				break;
			case key.home:
				y = -elem.scrollTop;
				break;
			case key.end:
				var damt = elem.scrollHeight - elem.scrollTop - clientHeight;
				y = (damt > 0) ? damt+10 : 0;
				break;
			case key.left:
				x = -options.arrowScroll;
				break;
			case key.right:
				x = options.arrowScroll;
				break;
			default:
				return true; // a key we don't care about
		}

		scrollArray(elem, x, y);
		event.preventDefault();
	}

	/**
	 * Mousedown event only for updating activeElement
	 */
	function mousedown(event) {
		activeElement = event.target;
	}


	/***********************************************
	 * OVERFLOW
	 ***********************************************/

	var cache = {}; // cleared out every once in while
	setInterval(function () { cache = {}; }, 10 * 1000);

	var uniqueID = (function () {
		var i = 0;
		return function (el) {
			return el.uniqueID || (el.uniqueID = i++);
		};
	})();

	function setCache(elems, overflowing) {
		for (var i = elems.length; i--;)
			cache[uniqueID(elems[i])] = overflowing;
		return overflowing;
	}

	function overflowingAncestor(el) {
		var elems = [];
		var rootScrollHeight = root.scrollHeight;
		do {
			var cached = cache[uniqueID(el)];
			if (cached) {
				return setCache(elems, cached);
			}
			elems.push(el);
			if (rootScrollHeight === el.scrollHeight) {
				if (!isFrame || root.clientHeight + 10 < rootScrollHeight) {
					return setCache(elems, document.body); // scrolling root in WebKit
				}
			} else if (el.clientHeight + 10 < el.scrollHeight) {
				overflow = getComputedStyle(el, "").getPropertyValue("overflow-y");
				if (overflow === "scroll" || overflow === "auto") {
					return setCache(elems, el);
				}
			}
		} while (el = el.parentNode);
	}


	/***********************************************
	 * HELPERS
	 ***********************************************/

	function addEvent(type, fn, bubble) {
		window.addEventListener(type, fn, (bubble||false));
	}

	function removeEvent(type, fn, bubble) {
		window.removeEventListener(type, fn, (bubble||false));
	}

	function isNodeName(el, tag) {
		return (el.nodeName||"").toLowerCase() === tag.toLowerCase();
	}

	function directionCheck(x, y) {
		x = (x > 0) ? 1 : -1;
		y = (y > 0) ? 1 : -1;
		if (direction.x !== x || direction.y !== y) {
			direction.x = x;
			direction.y = y;
			que = [];
			lastScroll = 0;
		}
	}

	var deltaBufferTimer;

	function isTouchpad(deltaY) {
		if (!deltaY) return;
		deltaY = Math.abs(deltaY)
		deltaBuffer.push(deltaY);
		deltaBuffer.shift();
		clearTimeout(deltaBufferTimer);
		var allDivisable = (isDivisible(deltaBuffer[0], 120) &&
		isDivisible(deltaBuffer[1], 120) &&
		isDivisible(deltaBuffer[2], 120));
		return !allDivisable;
	}

	function isDivisible(n, divisor) {
		return (Math.floor(n / divisor) == n / divisor);
	}

	var requestFrame = (function () {
		return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			function (callback, element, delay) {
				window.setTimeout(callback, delay || (1000/60));
			};
	})();


	/***********************************************
	 * PULSE
	 ***********************************************/

	/**
	 * Viscous fluid with a pulse for part and decay for the rest.
	 * - Applies a fixed force over an interval (a damped acceleration), and
	 * - Lets the exponential bleed away the velocity over a longer interval
	 * - Michael Herf, http://stereopsis.com/stopping/
	 */
	function pulse_(x) {
		var val, start, expx;
		// test
		x = x * options.pulseScale;
		if (x < 1) { // acceleartion
			val = x - (1 - Math.exp(-x));
		} else {     // tail
			// the previous animation ended here:
			start = Math.exp(-1);
			// simple viscous drag
			x -= 1;
			expx = 1 - Math.exp(-x);
			val = start + (expx * (1 - start));
		}
		return val * options.pulseNormalize;
	}

	function pulse(x) {
		if (x >= 1) return 1;
		if (x <= 0) return 0;

		if (options.pulseNormalize == 1) {
			options.pulseNormalize /= pulse_(1);
		}
		return pulse_(x);
	}

	var isChrome = /chrome/i.test(window.navigator.userAgent);
	var wheelEvent = null;
	if ("onwheel" in document.createElement("div"))
		wheelEvent = "wheel";
	else if ("onmousewheel" in document.createElement("div"))
		wheelEvent = "mousewheel";

	if (wheelEvent && isChrome) {
		addEvent(wheelEvent, wheel);
		addEvent("mousedown", mousedown);
		addEvent("load", init);
	}

})();
