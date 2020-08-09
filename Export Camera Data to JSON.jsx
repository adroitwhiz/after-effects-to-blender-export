
/*
Copyright (c) 2020 adroitwhiz

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


{
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

// Polyfill for Array.prototype.every
Array.prototype.every||(Array.prototype.every=function(r,t){"use strict";var e,n;if(null==this)throw new TypeError("this is null or not defined");var o=Object(this),i=o.length>>>0;if("function"!=typeof r)throw new TypeError;for(arguments.length>1&&(e=t),n=0;n<i;){var y;if(n in o&&(y=o[n],!r.call(e,y,n,o)))return!1;n++}return!0});

// Polyfill for Array.prototype.find
Array.prototype.find||(Array.prototype.find=function(r){if(null===this)throw new TypeError("Array.prototype.find called on null or undefined");if("function"!=typeof r)throw new TypeError("callback must be a function");for(var n=Object(this),t=n.length>>>0,o=arguments[1],e=0;e<t;e++){var f=n[e];if(r.call(o,f,e,n))return f}});

// Polyfill for Array.prototype.filter
Array.prototype.filter||(Array.prototype.filter=function(r){"use strict";if(void 0===this||null===this)throw new TypeError;var t=Object(this),e=t.length>>>0;if("function"!=typeof r)throw new TypeError;for(var i=[],o=arguments.length>=2?arguments[1]:void 0,n=0;n<e;n++)if(n in t){var f=t[n];r.call(o,f,n,t)&&i.push(f)}return i});

// Polyfill for Array.prototype.forEach
Array.prototype.forEach||(Array.prototype.forEach=function(a,b){var c,d;if(null===this)throw new TypeError(" this is null or not defined");var e=Object(this),f=e.length>>>0;if("function"!=typeof a)throw new TypeError(a+" is not a function");for(arguments.length>1&&(c=b),d=0;d<f;){var g;d in e&&(g=e[d],a.call(c,g,d,e)),d++}});

// Polyfill for Array.prototype.includes
Array.prototype.includes||(Array.prototype.includes=function(r,t){if(null==this)throw new TypeError('"this" is null or not defined');var e=Object(this),n=e.length>>>0;if(0===n)return!1;for(var i=0|t,o=Math.max(i>=0?i:n-Math.abs(i),0);o<n;){if(function(r,t){return r===t||"number"==typeof r&&"number"==typeof t&&isNaN(r)&&isNaN(t)}(e[o],r))return!0;o++}return!1});

// Polyfill for Array.prototype.indexOf
Array.prototype.indexOf||(Array.prototype.indexOf=function(r,t){var n;if(null==this)throw new TypeError('"this" is null or not defined');var e=Object(this),i=e.length>>>0;if(0===i)return-1;var o=0|t;if(o>=i)return-1;for(n=Math.max(o>=0?o:i-Math.abs(o),0);n<i;){if(n in e&&e[n]===r)return n;n++}return-1});

// Polyfill for Array.prototype.some
Array.prototype.some||(Array.prototype.some=function(r){"use strict";if(null==this)throw new TypeError("Array.prototype.some called on null or undefined");if("function"!=typeof r)throw new TypeError;for(var e=Object(this),o=e.length>>>0,t=arguments.length>=2?arguments[1]:void 0,n=0;n<o;n++)if(n in e&&r.call(t,e[n],n,e))return!0;return!1});

// Polyfill for String.prototype.trim
String.prototype.trim||(String.prototype.trim=function(){return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")});

//  json2.js
//  2017-06-12
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(
//                         +a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]
//                      ));
//                  }
//                  return value;
//              }
//          });

//          myData = JSON.parse(
//              "[\"Date(09/09/2001)\"]",
//              function (key, value) {
//                  var d;
//                  if (
//                      typeof value === "string"
//                      && value.slice(0, 5) === "Date("
//                      && value.slice(-1) === ")"
//                  ) {
//                      d = new Date(value.slice(5, -1));
//                      if (d) {
//                          return d;
//                      }
//                  }
//                  return value;
//              }
//          );

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return (n < 10)
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());


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


    var settingsVersion = '0.1';
    var settingsFilePath = Folder.userData.fullName + '/cam-export-settings.json';

    function showDialog(cb) {
        var c = controlFunctions;
        var resourceString = createResourceString(
            c.Dialog({
                text: 'AE Camera Export',
                settings: c.Group({
                    orientation: 'column',
                    alignment: ['fill', 'fill'],
                    alignChildren: ['left', 'top'],
                    saveDestination: c.Group({
                        alignment: ['fill', 'fill'],
                        label: c.StaticText({text: 'Save to'}),
                        savePath: c.EditText({
                            alignment: ['fill', 'fill'],
                            minimumSize: [400, 0]
                        }),
                        saveBrowse: c.Button({
                            properties: {name: 'browse'},
                            text: 'Browse',
                            alignment: ['right', 'right']
                        })
                    }),
                    timeRange: c.Group({
                        label: c.StaticText({text: 'Time range'}),
                        value: c.Group({
                            wholeComp: c.RadioButton({
                                text: 'Whole comp',
                                value: true
                            }),
                            workArea: c.RadioButton({
                                text: 'Work area'
                            }),
                            // TODO: automatically detect per camera and channel whether to animate and when
                            /*automatic: c.RadioButton({
                                text: 'Automatic'
                            })*/
                        })
                    }),
                    centeredCamera: c.Group({
                        label: c.StaticText({text: 'Comp camera is centered'}),
                        value: c.Checkbox({
                            value: false
                        })
                    })
                }),
                separator: c.Group({ preferredSize: ['', 3] }),
                buttons: c.Group({
                    alignment: 'right',
                    doExport: c.Button({
                        properties: { name: 'ok' },
                        text: 'Export'
                    }),
                    cancel: c.Button({
                        properties: { name: 'cancel' },
                        text: 'Cancel'
                    })
                })
            })
        );

        var window = new Window(resourceString, 'Camera Export', undefined, {resizeable: false});

        var controls = {
            savePath: window.settings.saveDestination.savePath,
            saveBrowse: window.settings.saveDestination.saveBrowse,
            timeRange: {
                wholeComp: window.settings.timeRange.value.wholeComp,
                workArea: window.settings.timeRange.value.workArea,
                // automatic: window.settings.timeRange.value.automatic
            },
            centeredCamera: window.settings.centeredCamera,
            exportButton: window.buttons.doExport,
            cancelButton: window.buttons.cancel
        };

        window.onShow = function() {
            // Give uniform width to all labels
            var groups = toArray(window.settings.children);
            var labelWidths = groups.map(function(group) { return group.children[0].size.width; });
            var maxLabelWidth = Math.max.apply(Math, labelWidths);
            groups.forEach(function (group) {
                group.children[0].size.width = maxLabelWidth;
            });

            // Give uniform width to inputs
            var valueWidths = groups.map(function(group) {
                return last(group.children).bounds.right - group.children[1].bounds.left;
            });
            var maxValueWidth = Math.max.apply(Math, valueWidths);
            groups.forEach(function (group) {
                var multipleControls = group.children.length > 2;
                if (!multipleControls) {
                    group.children[1].size.width = maxValueWidth;
                }
            });

            window.layout.layout(true);
        };

        /*window.onResize = function() {
            window.layout.resize();
            window.layout.layout();
        }*/

        function getSettings() {
            var timeRange = null;
            for (var opt in controls.timeRange) {
                if (controls.timeRange.hasOwnProperty(opt) &&
                    controls.timeRange[opt].value) {
                        timeRange = opt;
                        break;
                    }
            }
            return {
                savePath: controls.savePath.text,
                timeRange: timeRange,
                centeredCamera: controls.centeredCamera.value.value,
            };
        }

        function applySettings(settings) {
            if (!settings) return;
            controls.savePath.text = settings.savePath;
            for (var button in controls.timeRange) {
                if (!controls.timeRange.hasOwnProperty(button)) continue;
                controls.timeRange[button].value = button === settings.timeRange;
            }
            controls.centeredCamera.value.value = settings.centeredCamera;
        }

        controls.saveBrowse.onClick = function() {
            var savePath = File.saveDialog('Choose the path and name for the camera data file', 'Camera data:*.json').fsName;
            controls.savePath.text = savePath;
        }

        controls.exportButton.onClick = function() {
            try {
                cb(getSettings());
                writeSettingsFile(getSettings(), settingsVersion);
            } catch (err) {
                alert(err);
            }
            window.close();
        };

        applySettings(readSettingsFile(settingsVersion));

        return window;
    }

    function getCompositionViewer() {
        var project = app.project;
        if (!project) {
            throw new Error("Project does not exist.");
        }

        var activeViewer = app.activeViewer;
        if (activeViewer.type !== ViewerType.VIEWER_COMPOSITION) {
            throw new Error('Switch to the composition viewer.');
        }

        return activeViewer;
    }

    function main(settings) {
        getCompositionViewer().setActive();
        var activeComp = app.project.activeItem;

        var selection = activeComp.selectedLayers;
        var selectedCameras = [];
        for (var i = 0; i < selection.length; i++) {
            if (selection[i] instanceof CameraLayer) {
                selectedCameras.push(selection[i]);
            }
        }

        var json = {
            cameras: [],
            compSize: [activeComp.width, activeComp.height],
            frameRate: activeComp.frameRate
        };

        // avoid floating point weirdness by rounding, just in case
        var startFrame = Math.round(settings.timeRange === 'workArea' ? activeComp.workAreaStart * activeComp.frameRate : 0);
        var numFrames = Math.round((settings.timeRange === 'workArea' ? activeComp.workAreaDuration : activeComp.duration) * activeComp.frameRate);

        for (var i = 0; i < selectedCameras.length; i++) {
            var camera = selectedCameras[i];

            var cameraJson = {
                name: camera.name,
                position: {startFrame: startFrame, keyframes: []},
                rotation: {startFrame: startFrame, keyframes: []},
                _original: camera
            };

            json.cameras.push(cameraJson);
        }

        function zoomToAngle(zoom) {
            return Math.atan((activeComp.width/zoom)/2)*(360/Math.PI);
        }

        var evaluator = activeComp.layers.addNull();
        try {
            evaluator.threeDLayer = true;

            for (var j = 0; j < json.cameras.length; j++) {
                var camera = json.cameras[j];

                evaluator.transform.position.expression = "thisComp.layer(\"" + camera.name + "\").toWorld([0, 0, 0])";
                evaluator.transform.orientation.expression = "var C = thisComp.layer(\"" + camera.name + "\");\
                    u = normalize(C.toWorldVec([1,0,0]));\
                    v = normalize(C.toWorldVec([0,1,0]));\
                    w = normalize(C.toWorldVec([0,0,1]));\
                    sinb = clamp(w[0],-1,1);\
                    b = Math.asin(sinb);\
                    cosb = Math.cos(b);\
                    if (Math.abs(cosb) > .0005){\
                    c = -Math.atan2(v[0],u[0]);\
                    a = -Math.atan2(w[1],w[2]);\
                    }else{\
                    a = Math.atan2(u[1],v[1]);\
                    c = 0;\
                    }\
                    [radiansToDegrees(a),radiansToDegrees(b),radiansToDegrees(c)]";

                var fovVaries = camera._original.zoom.isTimeVarying;
                camera.fov = fovVaries ? {startFrame: startFrame, keyframes: []} : zoomToAngle(camera._original.zoom.value)

                for (var i = startFrame; i < startFrame + numFrames; i++) {
                    var time =  i / activeComp.frameRate;
                    var posVal = evaluator.transform.position.valueAtTime(time, false);
                    if (settings.centeredCamera) {
                        posVal[0] -= activeComp.width / 2;
                        posVal[1] -= activeComp.height / 2;
                    }
                    camera.position.keyframes.push(posVal);
                    camera.rotation.keyframes.push(evaluator.transform.orientation.valueAtTime(time, false));
                    if (fovVaries) camera.fov.keyframes.push(zoomToAngle(camera._original.zoom.valueAtTime(time, false)));
                }

                delete camera._original;
            }
        } finally {
            evaluator.remove();
        }

        var savePath = settings.savePath.replace(/\.\w+$/, '.json');
        writeTextFile(savePath, JSON.stringify(json, null, 2));
    }

    try {
        // If we can't get the composition viewer, fail early rather than baiting the user into filling out all the
        // settings in the dialog just for it to fail when they click Export
        getCompositionViewer();
        var d = showDialog(main);
        d.window.show();
    } catch (err) {
        alert(err);
    }
}