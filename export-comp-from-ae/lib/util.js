// A collection of helpful utility functions, (mostly) shamelessly stolen from Rhubarb Lip Sync
// https://github.com/DanielSWolf/rhubarb-lip-sync
// Their license is as follows:
/*
Copyright (c) 2015-2016 Daniel Wolf

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Polyfill for Object.assign
"function"!=typeof Object.assign&&(Object.assign=function(a,b){"use strict";if(null==a)throw new TypeError("Cannot convert undefined or null to object");for(var c=Object(a),d=1;d<arguments.length;d++){var e=arguments[d];if(null!=e)for(var f in e)Object.prototype.hasOwnProperty.call(e,f)&&(c[f]=e[f])}return c});

// Polyfill for Array.isArray
Array.isArray||(Array.isArray=function(r){return"[object Array]"===Object.prototype.toString.call(r)});

// Polyfill for Array.prototype.map
Array.prototype.map||(Array.prototype.map=function(r){var t,n,o;if(null==this)throw new TypeError("this is null or not defined");var e=Object(this),i=e.length>>>0;if("function"!=typeof r)throw new TypeError(r+" is not a function");for(arguments.length>1&&(t=arguments[1]),n=new Array(i),o=0;o<i;){var a,p;o in e&&(a=e[o],p=r.call(t,a,o,e),n[o]=p),o++}return n});

// Polyfill for Array.prototype.forEach
Array.prototype.forEach||(Array.prototype.forEach=function(a,b){var c,d;if(null===this)throw new TypeError(" this is null or not defined");var e=Object(this),f=e.length>>>0;if("function"!=typeof a)throw new TypeError(a+" is not a function");for(arguments.length>1&&(c=b),d=0;d<f;){var g;d in e&&(g=e[d],a.call(c,g,d,e)),d++}});

// Polyfill for Array.prototype.indexOf
Array.prototype.indexOf||(Array.prototype.indexOf=function(r,t){var n;if(null==this)throw new TypeError('"this" is null or not defined');var e=Object(this),i=e.length>>>0;if(0===i)return-1;var o=0|t;if(o>=i)return-1;for(n=Math.max(o>=0?o:i-Math.abs(o),0);n<i;){if(n in e&&e[n]===r)return n;n++}return-1});

// @include "json2.js"

// Object containing functions to create control description trees.
// For instance, `controls.StaticText({ text: 'Hello world' })`
// returns `{ __type__: StaticText, text: 'Hello world' }`.
var controlFunctions = (function() {
    var controlTypes = [
        // Strangely, 'dialog' and 'palette' need to start with a lower-case character
        ['Dialog', 'dialog'], ['Palette', 'palette'],
        'Panel', 'Group', 'TabbedPanel', 'Tab', 'Button', 'IconButton', 'Image', 'StaticText',
        'EditText', 'Checkbox', 'RadioButton', 'Progressbar', 'Slider', 'Scrollbar', 'ListBox',
        'DropDownList', 'TreeView', 'ListItem', 'FlashPlayer'
    ];
    var result = {};
    controlTypes.forEach(function(type){
        var isArray = Array.isArray(type);
        var key = isArray ? type[0] : type;
        var value = isArray ? type[1] : type;
        result[key] = function(options) {
            return Object.assign({ __type__: value }, options);
        };
    });
    return result;
})();

// ExtendScript's resource strings are a pain to write.
// This function allows them to be written in JSON notation, then converts them into the required
// format.
// For instance, this string: '{ "__type__": "StaticText", "text": "Hello world" }'
// is converted to this: 'StaticText { "text": "Hello world" }'.
// This code relies on the fact that, contrary to the language specification, all major JavaScript
// implementations keep object properties in insertion order.
function createResourceString(tree) {
    var result = JSON.stringify(tree, null, 2);
    result = result.replace(/(\{\s*)"__type__":\s*"(\w+)",?\s*/g, '$2 $1');
    return result;
}

function readTextFile(fileOrPath) {
    var filePath = fileOrPath.fsName || fileOrPath;
    var file = new File(filePath);
    function check() {
        if (file.error) throw new Error('Error reading file "' + filePath + '": ' + file.error);
    }
    try {
        file.open('r'); check();
        file.encoding = 'UTF-8'; check();
        var result = file.read(); check();
        return result;
    } finally {
        file.close(); check();
    }
}

function writeTextFile(fileOrPath, text) {
    var filePath = fileOrPath.fsName || fileOrPath;
    var file = new File(filePath);
    function check() {
        if (file.error) throw new Error('Error writing file "' + filePath + '": ' + file.error);
    }
    try {
        file.open('w'); check();
        file.encoding = 'UTF-8'; check();
        file.write(text); check();
    } finally {
        file.close(); check();
    }
}

function readSettingsFile(version) {
    try {
        var settings = JSON.parse(readTextFile(settingsFilePath));
        if (version === settings.version) return settings;
        return null;
    } catch (e) {
        return null;
    }
}

function writeSettingsFile(settings, version) {
    try {
        writeTextFile(settingsFilePath, JSON.stringify(Object.assign({}, settings, {version: version}), null, 2));
    } catch (e) {
        alert('Error persisting settings. ' + e.message);
    }
}
