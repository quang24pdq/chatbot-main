/**
 * jquery.mask.js
 * @version: v1.13.4
 * @author: Igor Escobar
 *
 * Created by Igor Escobar on 2012-03-10. Please report any bug at http://blog.igorescobar.com
 *
 * Copyright (c) 2012 Igor Escobar http://blog.igorescobar.com
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/* jshint laxbreak: true */
/* global define, jQuery, Zepto */

'use strict';

// UMD (Universal Module Definition) patterns for JavaScript modules that work everywhere.
// https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
(function (factory) {

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery || Zepto);
    }

}(function ($) {

    var GonrinMask = function (el, gonrinmask, options) {
        el = $(el);

        var jGonrinMask = this, oldValue = el.val(), regexGonrinMask;

        gonrinmask = typeof gonrinmask === 'function' ? gonrinmask(el.val(), undefined, el,  options) : gonrinmask;

        var p = {
            invalid: [],
            getCaret: function () {
                try {
                    var sel,
                        pos = 0,
                        ctrl = el.get(0),
                        dSel = document.selection,
                        cSelStart = ctrl.selectionStart;

                    // IE Support
                    if (dSel && navigator.appVersion.indexOf('MSIE 10') === -1) {
                        sel = dSel.createRange();
                        sel.moveStart('character', el.is('input') ? -el.val().length : -el.text().length);
                        pos = sel.text.length;
                    }
                    // Firefox support
                    else if (cSelStart || cSelStart === '0') {
                        pos = cSelStart;
                    }

                    return pos;
                } catch (e) {}
            },
            setCaret: function(pos) {
                try {
                    if (el.is(':focus')) {
                        var range, ctrl = el.get(0);

                        if (ctrl.setSelectionRange) {
                            ctrl.setSelectionRange(pos,pos);
                        } else if (ctrl.createTextRange) {
                            range = ctrl.createTextRange();
                            range.collapse(true);
                            range.moveEnd('character', pos);
                            range.moveStart('character', pos);
                            range.select();
                        }
                    }
                } catch (e) {}
            },
            events: function() {
                el
                .on('input.gonrinmask keyup.gonrinmask', p.behaviour)
                .on('paste.gonrinmask drop.gonrinmask', function() {
                    setTimeout(function() {
                        el.keydown().keyup();
                    }, 100);
                })
                .on('change.gonrinmask', function(){
                    el.data('changed', true);
                })
                .on('blur.gonrinmask', function(){
                    if (oldValue !== el.val() && !el.data('changed')) {
                        el.triggerHandler('change');
                    }
                    el.data('changed', false);
                })
                // it's very important that this callback remains in this position
                // otherwhise oldValue it's going to work buggy
                .on('blur.gonrinmask', function() {
                    oldValue = el.val();
                })
                // select all text on focus
                .on('focus.gonrinmask', function (e) {
                    if (options.selectOnFocus === true) {
                        $(e.target).select();
                    }
                })
                // clear the value if it not complete the gonrinmask
                .on('focusout.gonrinmask', function() {
                    if (options.clearIfNotMatch && !regexGonrinMask.test(p.val())) {
                       p.val('');
                   }
                });
            },
            getRegexGonrinMask: function() {
                var gonrinmaskChunks = [], translation, pattern, optional, recursive, oRecursive, r;

                for (var i = 0; i < gonrinmask.length; i++) {
                    translation = jGonrinMask.translation[gonrinmask.charAt(i)];

                    if (translation) {

                        pattern = translation.pattern.toString().replace(/.{1}$|^.{1}/g, '');
                        optional = translation.optional;
                        recursive = translation.recursive;

                        if (recursive) {
                            gonrinmaskChunks.push(gonrinmask.charAt(i));
                            oRecursive = {digit: gonrinmask.charAt(i), pattern: pattern};
                        } else {
                            gonrinmaskChunks.push(!optional && !recursive ? pattern : (pattern + '?'));
                        }

                    } else {
                        gonrinmaskChunks.push(gonrinmask.charAt(i).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                    }
                }

                r = gonrinmaskChunks.join('');

                if (oRecursive) {
                    r = r.replace(new RegExp('(' + oRecursive.digit + '(.*' + oRecursive.digit + ')?)'), '($1)?')
                         .replace(new RegExp(oRecursive.digit, 'g'), oRecursive.pattern);
                }

                return new RegExp(r);
            },
            destroyEvents: function() {
                el.off(['input', 'keydown', 'keyup', 'paste', 'drop', 'blur', 'focusout', ''].join('.gonrinmask '));
            },
            val: function(v) {
                var isInput = el.is('input'),
                    method = isInput ? 'val' : 'text',
                    r;

                if (arguments.length > 0) {
                    if (el[method]() !== v) {
                        el[method](v);
                    }
                    r = el;
                } else {
                    r = el[method]();
                }

                return r;
            },
            getMCharsBeforeCount: function(index, onCleanVal) {
                for (var count = 0, i = 0, gonrinmaskL = gonrinmask.length; i < gonrinmaskL && i < index; i++) {
                    if (!jGonrinMask.translation[gonrinmask.charAt(i)]) {
                        index = onCleanVal ? index + 1 : index;
                        count++;
                    }
                }
                return count;
            },
            caretPos: function (originalCaretPos, oldLength, newLength, gonrinmaskDif) {
                var translation = jGonrinMask.translation[gonrinmask.charAt(Math.min(originalCaretPos - 1, gonrinmask.length - 1))];

                return !translation ? p.caretPos(originalCaretPos + 1, oldLength, newLength, gonrinmaskDif)
                                    : Math.min(originalCaretPos + newLength - oldLength - gonrinmaskDif, newLength);
            },
            behaviour: function(e) {
                e = e || window.event;
                p.invalid = [];
                var keyCode = e.keyCode || e.which;
                if ($.inArray(keyCode, jGonrinMask.byPassKeys) === -1) {

                    var caretPos = p.getCaret(),
                        currVal = p.val(),
                        currValL = currVal.length,
                        changeCaret = caretPos < currValL,
                        newVal = p.getGonrinMasked(),
                        newValL = newVal.length,
                        gonrinmaskDif = p.getMCharsBeforeCount(newValL - 1) - p.getMCharsBeforeCount(currValL - 1);

                    p.val(newVal);

                    // change caret but avoid CTRL+A
                    if (changeCaret && !(keyCode === 65 && e.ctrlKey)) {
                        // Avoid adjusting caret on backspace or delete
                        if (!(keyCode === 8 || keyCode === 46)) {
                            caretPos = p.caretPos(caretPos, currValL, newValL, gonrinmaskDif);
                        }
                        p.setCaret(caretPos);
                    }

                    return p.callbacks(e);
                }
            },
            getGonrinMasked: function(skipGonrinMaskChars) {
                var buf = [],
                    value = p.val(),
                    m = 0, gonrinmaskLen = gonrinmask.length,
                    v = 0, valLen = value.length,
                    offset = 1, addMethod = 'push',
                    resetPos = -1,
                    lastgonrinmaskChar,
                    check;

                if (options.reverse) {
                    addMethod = 'unshift';
                    offset = -1;
                    lastgonrinmaskChar = 0;
                    m = gonrinmaskLen - 1;
                    v = valLen - 1;
                    check = function () {
                        return m > -1 && v > -1;
                    };
                } else {
                    lastgonrinmaskChar = gonrinmaskLen - 1;
                    check = function () {
                        return m < gonrinmaskLen && v < valLen;
                    };
                }

                while (check()) {
                    var gonrinmaskDigit = gonrinmask.charAt(m),
                        valDigit = value.charAt(v),
                        translation = jGonrinMask.translation[gonrinmaskDigit];

                    if (translation) {
                        if (valDigit.match(translation.pattern)) {
                            buf[addMethod](valDigit);
                             if (translation.recursive) {
                                if (resetPos === -1) {
                                    resetPos = m;
                                } else if (m === lastgonrinmaskChar) {
                                    m = resetPos - offset;
                                }

                                if (lastgonrinmaskChar === resetPos) {
                                    m -= offset;
                                }
                            }
                            m += offset;
                        } else if (translation.optional) {
                            m += offset;
                            v -= offset;
                        } else if (translation.fallback) {
                            buf[addMethod](translation.fallback);
                            m += offset;
                            v -= offset;
                        } else {
                          p.invalid.push({p: v, v: valDigit, e: translation.pattern});
                        }
                        v += offset;
                    } else {
                        if (!skipGonrinMaskChars) {
                            buf[addMethod](gonrinmaskDigit);
                        }

                        if (valDigit === gonrinmaskDigit) {
                            v += offset;
                        }

                        m += offset;
                    }
                }

                var lastgonrinmaskCharDigit = gonrinmask.charAt(lastgonrinmaskChar);
                if (gonrinmaskLen === valLen + 1 && !jGonrinMask.translation[lastgonrinmaskCharDigit]) {
                    buf.push(lastgonrinmaskCharDigit);
                }

                return buf.join('');
            },
            callbacks: function (e) {
                var val = p.val(),
                    changed = val !== oldValue,
                    defaultArgs = [val, e, el, options],
                    callback = function(name, criteria, args) {
                        if (typeof options[name] === 'function' && criteria) {
                            options[name].apply(this, args);
                        }
                    };

                callback('onChange', changed === true, defaultArgs);
                callback('onKeyPress', changed === true, defaultArgs);
                callback('onComplete', val.length === gonrinmask.length, defaultArgs);
                callback('onInvalid', p.invalid.length > 0, [val, e, el, p.invalid, options]);
            }
        };


        // public methods
        jGonrinMask.gonrinmask = gonrinmask;
        jGonrinMask.options = options;
        jGonrinMask.remove = function() {
            var caret = p.getCaret();
            p.destroyEvents();
            p.val(jGonrinMask.getCleanVal());
            p.setCaret(caret - p.getMCharsBeforeCount(caret));
            return el;
        };

        // get value without gonrinmask
        jGonrinMask.getCleanVal = function() {
           return p.getGonrinMasked(true);
        };

       jGonrinMask.init = function(onlyGonrinMask) {
            onlyGonrinMask = onlyGonrinMask || false;
            options = options || {};

            jGonrinMask.byPassKeys = $.jGonrinMaskGlobals.byPassKeys;
            jGonrinMask.translation = $.jGonrinMaskGlobals.translation;

            jGonrinMask.translation = $.extend({}, jGonrinMask.translation, options.translation);
            jGonrinMask = $.extend(true, {}, jGonrinMask, options);

            regexGonrinMask = p.getRegexGonrinMask();

            if (onlyGonrinMask === false) {

                if (options.placeholder) {
                    el.attr('placeholder' , options.placeholder);
                }

                // this is necessary, otherwise if the user submit the form
                // and then press the "back" button, the autocomplete will erase
                // the data. Works fine on IE9+, FF, Opera, Safari.
                if ($('input').length && 'oninput' in $('input')[0] === false && el.attr('autocomplete') === 'on') {
                  el.attr('autocomplete', 'off');
                }

                p.destroyEvents();
                p.events();

                var caret = p.getCaret();
                p.val(p.getGonrinMasked());
                p.setCaret(caret + p.getMCharsBeforeCount(caret, true));

            } else {
                p.events();
                p.val(p.getGonrinMasked());
            }
        };

        jGonrinMask.init(!el.is('input'));
    };

    $.gonrinmaskWatchers = {};
    var HTMLAttributes = function () {
            var input = $(this),
                options = {},
                prefix = 'data-gonrinmask-',
                gonrinmask = input.attr('data-gonrinmask');

            if (input.attr(prefix + 'reverse')) {
                options.reverse = true;
            }

            if (input.attr(prefix + 'clearifnotmatch')) {
                options.clearIfNotMatch = true;
            }

            if (input.attr(prefix + 'selectonfocus') === 'true') {
               options.selectOnFocus = true;
            }

            if (notSameGonrinMaskObject(input, gonrinmask, options)) {
                return input.data('gonrinmask', new GonrinMask(this, gonrinmask, options));
            }
        },
        notSameGonrinMaskObject = function(field, gonrinmask, options) {
            options = options || {};
            var gonrinmaskObject = $(field).data('gonrinmask'),
                stringify = JSON.stringify,
                value = $(field).val() || $(field).text();
            try {
                if (typeof gonrinmask === 'function') {
                    gonrinmask = gonrinmask(value);
                }
                return typeof gonrinmaskObject !== 'object' || stringify(gonrinmaskObject.options) !== stringify(options) || gonrinmaskObject.gonrinmask !== gonrinmask;
            } catch (e) {}
        };


    $.fn.gonrinmask = function(gonrinmask, options) {
        options = options || {};
        var selector = this.selector,
            globals = $.jGonrinMaskGlobals,
            interval = $.jGonrinMaskGlobals.watchInterval,
            gonrinmaskFunction = function() {
                if (notSameGonrinMaskObject(this, gonrinmask, options)) {
                    return $(this).data('gonrinmask', new GonrinMask(this, gonrinmask, options));
                }
            };

        $(this).each(gonrinmaskFunction);

        if (selector && selector !== '' && globals.watchInputs) {
            clearInterval($.gonrinmaskWatchers[selector]);
            $.gonrinmaskWatchers[selector] = setInterval(function(){
                $(document).find(selector).each(gonrinmaskFunction);
            }, interval);
        }
        return this;
    };

    $.fn.ungonrinmask = function() {
        clearInterval($.gonrinmaskWatchers[this.selector]);
        delete $.gonrinmaskWatchers[this.selector];
        return this.each(function() {
            var dataGonrinMask = $(this).data('gonrinmask');
            if (dataGonrinMask) {
                dataGonrinMask.remove().removeData('gonrinmask');
            }
        });
    };

    $.fn.cleanVal = function() {
        return this.data('gonrinmask').getCleanVal();
    };

    $.applyDataGonrinMask = function(selector) {
        selector = selector || $.jGonrinMaskGlobals.gonrinmaskElements;
        var $selector = (selector instanceof $) ? selector : $(selector);
        $selector.filter($.jGonrinMaskGlobals.dataGonrinMaskAttr).each(HTMLAttributes);
    };

    var globals = {
        gonrinmaskElements: 'input,td,span,div',
        dataGonrinMaskAttr: '*[data-gonrinmask]',
        dataGonrinMask: true,
        watchInterval: 300,
        watchInputs: true,
        watchDataGonrinMask: false,
        byPassKeys: [9, 16, 17, 18, 36, 37, 38, 39, 40, 91],
        translation: {
            '0': {pattern: /\d/},
            '9': {pattern: /\d/, optional: true},
            '#': {pattern: /\d/, recursive: true},
            'A': {pattern: /[a-zA-Z0-9]/},
            'S': {pattern: /[a-zA-Z]/}
        }
    };

    $.jGonrinMaskGlobals = $.jGonrinMaskGlobals || {};
    globals = $.jGonrinMaskGlobals = $.extend(true, {}, globals, $.jGonrinMaskGlobals);

    // looking for inputs with data-mask attribute
    if (globals.dataGonrinMask) { $.applyDataGonrinMask(); }

    setInterval(function(){
        if ($.jGonrinMaskGlobals.watchDataGonrinMask) { $.applyDataGonrinMask(); }
    }, globals.watchInterval);
}));
