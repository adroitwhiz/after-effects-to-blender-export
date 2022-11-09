
/*
Copyright (c) 2020-2022 adroitwhiz

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
    // @include 'lib/util.js'

    var fileVersion = 2;
    var settingsVersion = '0.2';
    var settingsFilePath = Folder.userData.fullName + '/cam-export-settings.json';

    function showDialog(cb, opts) {
        var c = controlFunctions;
        var resourceString = createResourceString(
            c.Dialog({
                text: 'AE to Blender Export',
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
                            layerDuration: c.RadioButton({
                                text: 'Layer duration'
                            }),
                            // TODO: automatically detect per layer and channel whether to animate and when
                            /*automatic: c.RadioButton({
                                text: 'Automatic'
                            })*/
                        })
                    }),
                    selectedLayersOnly: c.Group({
                        label: c.StaticText({
                            text: 'Export selected layers only'
                        }),
                        value: c.Checkbox({
                            value: opts.selectionExists,
                            enabled: opts.selectionExists
                        })
                    }),
                    bakeTransforms: c.Group({
                        label: c.StaticText({
                            text: 'Bake transforms',
                            helpTip: "Calculate all transforms in After Effects. This may help if Blender is importing some transforms incorrectly."
                        }),
                        value: c.Checkbox({
                            value: opts.bakeTransforms,
                            enabled: opts.bakeTransforms
                        })
                    }),
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

        var window = new Window(resourceString, 'Blender Export', undefined, {resizeable: false});

        var controls = {
            savePath: window.settings.saveDestination.savePath,
            saveBrowse: window.settings.saveDestination.saveBrowse,
            timeRange: {
                wholeComp: window.settings.timeRange.value.wholeComp,
                workArea: window.settings.timeRange.value.workArea,
                layerDuration: window.settings.timeRange.value.layerDuration,
                // automatic: window.settings.timeRange.value.automatic
            },
            selectedLayersOnly: window.settings.selectedLayersOnly,
            bakeTransforms: window.settings.bakeTransforms,
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
                selectedLayersOnly: controls.selectedLayersOnly.value.value,
                bakeTransforms: controls.bakeTransforms.value.value
            };
        }

        function applySettings(settings) {
            if (!settings) return;
            controls.savePath.text = settings.savePath;
            for (var button in controls.timeRange) {
                if (!controls.timeRange.hasOwnProperty(button)) continue;
                controls.timeRange[button].value = button === settings.timeRange;
            }
            controls.bakeTransforms.value.value = settings.bakeTransforms;
        }

        controls.saveBrowse.onClick = function() {
            var savePath = File.saveDialog('Choose the path and name for the layer data file', 'Layer data:*.json').fsName;
            controls.savePath.text = savePath;
        }

        controls.exportButton.onClick = function() {
            try {
                cb(getSettings());
                writeSettingsFile(getSettings(), settingsVersion);
            } catch (err) {
                showBugReportWindow(err);
            }
            window.close();
        };

        applySettings(readSettingsFile(settingsVersion));

        return window;
    }

    function showBugReportWindow(err) {
        var c = controlFunctions;
        var resourceString = createResourceString(
            c.Dialog({
                text: 'Error',
                header: c.StaticText({
                    text: 'The script has encountered an error. You can report it and paste the error message below into the report:',
                    alignment: ['left', 'top']
                }),
                errorInfo: c.EditText({
                    alignment: ['fill', 'fill'],
                    minimumSize: [400, 100],
                    properties: {multiline: true}
                }),
                separator: c.Group({ preferredSize: ['', 3] }),
                buttons: c.Group({
                    close: c.Button({
                        properties: { name: 'close' },
                        text: 'Close'
                    }),
                    alignment: 'right',
                    report: c.Button({
                        properties: { name: 'report' },
                        text: 'Report Bug',
                        active: true
                    })
                })
            })
        );

        var window = new Window(resourceString, 'Error', undefined, {resizeable: false});
        window.errorInfo.text = err.message;

        window.buttons.report.onClick = function() {
            var url = 'https://github.com/adroitwhiz/after-effects-to-blender-export/issues/new?assignees=&labels=bug%2C+export&template=issue-exporting-from-after-effects.md';
            system.callSystem(($.os.indexOf('Win') !== -1 ? 'explorer' : 'open') + ' "' + url + '"');
        }

        window.buttons.close.onClick = function() {
            window.close();
        };

        window.show();
    }

    function checkPermissions() {
        if (app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') === 1) {
            return true;
        }
        var c = controlFunctions;
        var resourceString = createResourceString(
            c.Dialog({
                text: 'Error',
                header: c.StaticText({
                    text: 'The "Allow Scripts to Write Files and Access Network" setting is disabled, and must be enabled in order for this script to work.',
                    alignment: ['left', 'top']
                }),
                separator: c.Group({ preferredSize: ['', 3] }),
                buttons: c.Group({
                    alignment: 'right',
                    close: c.Button({
                        properties: { name: 'close' },
                        text: 'Close'
                    }),
                    openSettings: c.Button({
                        properties: { name: 'openSettings' },
                        text: 'Open Script Settings',
                        active: true
                    })
                })
            })
        );

        var window = new Window(resourceString, 'Error', undefined, {resizeable: false});

        window.buttons.openSettings.onClick = function() {
            // Open the Scripting and Expressions settings dialog (command #3131, as documented... nowhere)
            // This won't work if called inside the callback for some reason (thanks Adobe!) so use scheduleTask
            app.scheduleTask("app.executeCommand(3131)", 0, false);
            window.close();
        }

        window.buttons.close.onClick = function() {
            window.close();
        }

        window.show();
        return false;
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

    function main() {
        if (!checkPermissions()) return;
        getCompositionViewer().setActive();
        var activeComp = app.project.activeItem;
        if (!activeComp) {
            // This is the case if e.g. you've just created the project and the two big "New Composition" and
            // "New Composition From Footage" are showing where the composition viewer would be. The active viewer
            // is of ViewerType.VIEWER_COMPOSITION, but there's no actual composition open.
            throw new Error('No composition is currently open.');
        }

        var d = showDialog(
            function(settings) {
                runExport(settings, {
                    activeComp: activeComp
                })
            },
            {
                selectionExists: activeComp.selectedLayers.length > 0
            }
        );
        d.window.show();
    }

    function runExport(settings, opts) {
        var activeComp = opts.activeComp;
        var layersToExport = [];
        if (settings.selectedLayersOnly) {
            var layerIndicesMarkedForExport = {};
            for (var i = 0; i < activeComp.selectedLayers.length; i++) {
                var layer = activeComp.selectedLayers[i];
                layersToExport.push(layer);
                layerIndicesMarkedForExport[layer.index] = true;

                // If not baking transforms (also baking parents' transforms into child layers),
                // make sure to export all the selected layers' parents as well so that the children
                // can have the parent transforms applied to them
                if (!settings.bakeTransforms) {
                    var parent = layer.parent;
                    while (parent) {
                        if (!(parent.index in layerIndicesMarkedForExport)) {
                            layersToExport.push(parent);
                            layerIndicesMarkedForExport[parent.index] = true;
                        }
                        parent = parent.parent;
                    }
                }
            }
        } else {
            for (var i = 1; i <= activeComp.layers.length; i++) {
                var layer = activeComp.layers[i];
                layersToExport.push(layer);
            }
        }

        var json = {
            layers: [],
            sources: [],
            comp: {
                width: activeComp.width,
                height: activeComp.height,
                name: activeComp.name,
                pixelAspect: activeComp.pixelAspect,
                frameRate: activeComp.frameRate,
                workArea: [activeComp.workAreaStart, activeComp.workAreaDuration + activeComp.workAreaStart]
            },
            transformsBaked: settings.bakeTransforms,
            version: fileVersion
        };

        var exportedSources = [];

        function unenum(val) {
            switch (val) {
                case KeyframeInterpolationType.LINEAR: return 'linear';
                case KeyframeInterpolationType.BEZIER: return 'bezier';
                case KeyframeInterpolationType.HOLD: return 'hold';
            }

            throw new Error('Could not un-enum ' + val);
        }

        function startAndEndFrame(layer) {
            var startTime, duration;
            switch (settings.timeRange) {
                case 'workArea':
                    startTime = activeComp.workAreaStart;
                    duration = activeComp.workAreaDuration;
                    break;
                case 'layerDuration':
                    startTime = layer.inPoint;
                    duration = layer.outPoint - layer.inPoint;
                    break;
                case 'wholeComp':
                default:
                    startTime = 0;
                    duration = activeComp.duration;
                    break;
            }
            // avoid floating point weirdness by rounding, just in case
            var startFrame = Math.floor(startTime * activeComp.frameRate);
            var endFrame = startFrame + Math.ceil(duration * activeComp.frameRate);
            return [startFrame, endFrame];
        }

        function escapeStringForLiteral(str) {
            return str.replace(/(\\|")/g, '\\$1');
        }

        if (settings.bakeTransforms) {
            // Adding a layer deselects all others, so save the original selection here.
            var selectedLayers = [];
            for (var i = 0; i < activeComp.selectedLayers.length; i++) {
                selectedLayers.push(activeComp.selectedLayers[i]);
            }

            // `toWorld` only works inside expressions, so add a null object whose expression we will set and then evaluate
            // using `valueAtTime`.
            var evaluator = activeComp.layers.addNull();
            // Move the evaluator layer to the bottom to avoid messing up expressions which rely on layer indices
            evaluator.moveToEnd();
            // Adding a new effect invalidates references to all other effects in the stack, so create all effects first
            // before obtaining references to them. I thought JS was a garbage-collected language, Adobe!
            for (var i = 0; i < 4; i++) {
                evaluator.property("Effects").addProperty("ADBE Point3D Control");
            }
            var evalPoint1 = evaluator.property("Effects").property(1);
            var evalPoint2 = evaluator.property("Effects").property(2);
            var evalPoint3 = evaluator.property("Effects").property(3);
            var evalPoint4 = evaluator.property("Effects").property(4);
        }

        // Takes as input a list of 4 transformed points and returns the 3x4 affine transformation matrix that applies
        // such a transform. Assumes that the "source" points are [0, 0, 0], [1, 0, 0], [0, 1, 0], and [0, 0, 1].
        // The 4th row will always be [0, 0, 0, 1], and is thus omitted.
        function pointsToAffineMatrix(p0, p1, p2, p3) {
            return [
                p1[0] - p0[0],
                p2[0] - p0[0],
                p3[0] - p0[0],
                p0[0],
                p1[1] - p0[1],
                p2[1] - p0[1],
                p3[1] - p0[1],
                p0[1],
                p1[2] - p0[2],
                p2[2] - p0[2],
                p3[2] - p0[2],
                p0[2]
            ];
        };

        function exportBakedTransform(layer) {
            // It's possible to construct a 3D affine transform matrix given a mapping from 4 source points to 4 destination points.
            // The source points are the arguments of the toWorld functions, and the destination points are their results.
            // We calculate this affine transform matrix once per frame then decompose it on the Blender side.
            evalPoint1.property(1).expression = "thisComp.layer(\"" + escapeStringForLiteral(layer.name) + "\").toWorld([0, 0, 0])";
            evalPoint2.property(1).expression = "thisComp.layer(\"" + escapeStringForLiteral(layer.name) + "\").toWorld([1, 0, 0])";
            evalPoint3.property(1).expression = "thisComp.layer(\"" + escapeStringForLiteral(layer.name) + "\").toWorld([0, 1, 0])";
            evalPoint4.property(1).expression = "thisComp.layer(\"" + escapeStringForLiteral(layer.name) + "\").toWorld([0, 0, 1])";

            // Bake keyframe data
            var startEnd = startAndEndFrame(layer);
            var startFrame = startEnd[0];
            var endFrame = startEnd[1];

            var keyframes = [];

            for (var i = startFrame; i < endFrame; i++) {
                var time =  i / activeComp.frameRate;
                var point1Val = evalPoint1.property(1).valueAtTime(time, false /* preExpression */);
                var point2Val = evalPoint2.property(1).valueAtTime(time, false /* preExpression */);
                var point3Val = evalPoint3.property(1).valueAtTime(time, false /* preExpression */);
                var point4Val = evalPoint4.property(1).valueAtTime(time, false /* preExpression */);
                var matrix = pointsToAffineMatrix(
                        point1Val,
                        point2Val,
                        point3Val,
                        point4Val
                );
                keyframes.push(matrix);
            }

            return {
                startFrame: startFrame,
                keyframes: keyframes
            }
        }

        function exportProperty(prop, layer, exportedProp, channelOffset) {
            var valType = prop.propertyValueType;
            // The ternary conditional operator is left-associative in ExtendScript. HATE. HATE. HATE. HATE. HATE. HATE. HATE. HATE.
            var numDimensions = (valType === PropertyValueType.ThreeD || valType === PropertyValueType.ThreeD_SPATIAL ? 3 :
                (valType === PropertyValueType.TwoD || valType === PropertyValueType.TwoD_SPATIAL ? 2 :
                    1));

            if (prop.isSeparationFollower && numDimensions > 1) {
                throw new Error('Separation follower cannot have more than 1 dimension');
            }

            if (typeof exportedProp === 'undefined') {
                exportedProp = {numDimensions: numDimensions, channels: []};
                for (var i = 0; i < numDimensions; i++) {
                    exportedProp.channels.push({});
                }
            }

            if (prop.isSeparationLeader && prop.dimensionsSeparated) {
                for (var i = 0; i < numDimensions; i++) {
                    var dimProp = prop.getSeparationFollower(i);
                    exportProperty(dimProp, layer, exportedProp, i);
                }

                return exportedProp;
            }

            if (typeof channelOffset === 'undefined') channelOffset = 0;

            if (prop.isTimeVarying) {
                if (
                    (!prop.expressionEnabled) &&
                    (valType === PropertyValueType.ThreeD ||
                    valType === PropertyValueType.TwoD ||
                    valType === PropertyValueType.OneD)
                ) {
                    // Export keyframe Bezier data directly
                    for (var i = 0; i < numDimensions; i++) {
                        exportedProp.channels[i + channelOffset].isKeyframed = true;
                        exportedProp.channels[i + channelOffset].keyframesFormat = 'bezier';
                        exportedProp.channels[i + channelOffset].keyframes = [];
                    }

                    for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                        var time = prop.keyTime(keyIndex);
                        var value = prop.keyValue(keyIndex);
                        var easeIn = prop.keyInTemporalEase(keyIndex);
                        var easeOut = prop.keyOutTemporalEase(keyIndex);
                        var interpolationIn = unenum(prop.keyInInterpolationType(keyIndex));
                        var interpolationOut = unenum(prop.keyOutInterpolationType(keyIndex));
                        for (var i = 0; i < numDimensions; i++) {
                            exportedProp.channels[i + channelOffset].keyframes.push({
                                value: Array.isArray(value) ? value[i] : value,
                                easeIn: {
                                    speed: easeIn[i].speed,
                                    influence: easeIn[i].influence
                                },
                                easeOut: {
                                    speed: easeOut[i].speed,
                                    influence: easeOut[i].influence
                                },
                                time: prop.keyTime(keyIndex),
                                interpolationIn: interpolationIn,
                                interpolationOut: interpolationOut
                            })
                        }
                    }
                } else {
                    // Bake keyframe data
                    var startEnd = startAndEndFrame(layer);
                    var startFrame = startEnd[0];
                    var endFrame = startEnd[1];

                    for (var i = 0; i < numDimensions; i++) {
                        exportedProp.channels[i + channelOffset].isKeyframed = true;
                        exportedProp.channels[i + channelOffset].keyframesFormat = 'calculated';
                        exportedProp.channels[i + channelOffset].startFrame = startFrame;
                        exportedProp.channels[i + channelOffset].keyframes = [];
                    }

                    for (var i = startFrame; i < endFrame; i++) {
                        var time =  i / activeComp.frameRate;
                        var propVal = prop.valueAtTime(time, false /* preExpression */);
                        for (var j = 0; j < numDimensions; j++) {
                            exportedProp.channels[j + channelOffset].keyframes.push(Array.isArray(propVal) ? propVal[j] : propVal);
                        }
                    }
                }
            } else {
                for (var i = 0; i < numDimensions; i++) {
                    exportedProp.channels[i + channelOffset].isKeyframed = false;
                    exportedProp.channels[i + channelOffset].value = Array.isArray(prop.value) ? prop.value[i] : prop.value;
                }
            }

            return exportedProp;
        }

        function exportSource(source) {
            var exportedSource = {
                height: source.height,
                width: source.width,
                name: source.name
            };
            if (source instanceof FootageItem) {
                if (source.mainSource instanceof SolidSource) {
                    exportedSource.type = 'solid';
                    exportedSource.color = source.mainSource.color;
                } else if (source.mainSource instanceof FileSource) {
                    exportedSource.type = 'file';
                    exportedSource.file = source.mainSource.file.absoluteURI;
                } else {
                    exportedSource.type = 'unknown';
                }
            } else {
                exportedSource.type = 'unknown';
            }
            return exportedSource;
        }

        function exportLayer (layer) {
            var layerType;
            if (layer instanceof CameraLayer) {
                layerType = 'camera';
            } else if (layer instanceof AVLayer) {
                layerType = 'av';
            } else {
                layerType = 'unknown';
            }

            var exportedObject = {
                name: layer.name,
                type: layerType,
                index: layer.index,
                parentIndex: layer.parent ? layer.parent.index : null
            };

            if (settings.bakeTransforms) {
                exportedObject.transform = exportBakedTransform(layer);
            } else {
                exportedObject.position = exportProperty(layer.position, layer);
                exportedObject.rotationX = exportProperty(layer.xRotation, layer);
                exportedObject.rotationY = exportProperty(layer.yRotation, layer);
                exportedObject.rotationZ = exportProperty(layer.rotation, layer);
                exportedObject.orientation = exportProperty(layer.orientation, layer);
            }

            if (layer instanceof CameraLayer) {
                exportedObject.zoom = exportProperty(layer.zoom, layer);
            }

            // The "Point of Interest" property exists and is not hidden, meaning it's taking effect
            // Interestingly, `pointOfInterest.canSetExpression` is always true for other layer types
            if (
                (layer instanceof CameraLayer || layer instanceof LightLayer) &&
                layer.pointOfInterest.canSetExpression &&
                !settings.bakeTransforms
            ) {
                exportedObject.pointOfInterest = exportProperty(layer.pointOfInterest, layer);
            }

            if (layer instanceof AVLayer) {
                // Export layer source
                var alreadyExported = false;
                for (var i = 0; i < exportedSources.length; i++) {
                    if (exportedSources[i] === layer.source) {
                        alreadyExported = true;
                        break;
                    }
                }
                if (!alreadyExported) {
                    exportedSources.push(layer.source);
                    json.sources.push(exportSource(layer.source));
                }
                exportedObject.source = exportedSources.indexOf(layer.source);

                if (!settings.bakeTransforms) {
                    exportedObject.anchorPoint = exportProperty(layer.anchorPoint, layer);
                    exportedObject.scale = exportProperty(layer.scale, layer);
                }
                exportedObject.opacity = exportProperty(layer.opacity, layer);
                exportedObject.nullLayer = layer.nullLayer;
            }

            return exportedObject;
        }

        try {
            for (var j = 0; j < layersToExport.length; j++) {
                try {
                    var exportedLayer = exportLayer(layersToExport[j]);
                    json.layers.push(exportedLayer);
                } catch (err) {
                    // Give specific information on what layer is causing the problem
                    // This allows the user to fix it by deselecting the layer, and makes debugging easier
                    throw new Error('Error exporting layer "' + layersToExport[j].name + '"\nOn line ' + err.line + ': ' + err.message);
                }
            }
        } finally {
            if (settings.bakeTransforms) {
                evaluator.remove();
                for (var i = 0; i < selectedLayers.length; i++) {
                    selectedLayers[i].selected = true;
                }
            }
        }

        var savePath = settings.savePath.replace(/\.\w+$/, '.json');
        writeTextFile(savePath, JSON.stringify(json, null, 2));
    }

    try {
        // If we can't get the composition viewer, fail early rather than baiting the user into filling out all the
        // settings in the dialog just for it to fail when they click Export
        getCompositionViewer();
        main();
    } catch (err) {
        alert(err.message, 'Error');
    }
}