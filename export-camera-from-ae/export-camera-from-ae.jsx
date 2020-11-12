
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
    // @include 'lib/util.js'

    var fileVersion = 1;
    var settingsVersion = '0.1';
    var settingsFilePath = Folder.userData.fullName + '/cam-export-settings.json';

    function showDialog(cb, opts) {
        // helpTip doesn't work on groups so I need to apply the same helpTip string to both the controls themselves
        // and their labels :(
        var centeredCameraHelpTip = "Has the same effect as \"Centered Comp Camera\" in the Cinema 4D plugin";

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
                    centeredCamera: c.Group({
                        label: c.StaticText({
                            text: 'Comp camera is centered',
                            helpTip: centeredCameraHelpTip
                        }),
                        value: c.Checkbox({
                            value: false,
                            helpTip: centeredCameraHelpTip
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
            centeredCamera: window.settings.centeredCamera,
            selectedLayersOnly: window.settings.selectedLayersOnly,
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
                selectedLayersOnly: controls.selectedLayersOnly.value.value
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
            var savePath = File.saveDialog('Choose the path and name for the layer data file', 'Layer data:*.json').fsName;
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

    function main() {
        getCompositionViewer().setActive();
        var activeComp = app.project.activeItem;

        var validLayers = [];
        for (var i = 1; i <= activeComp.layers.length; i++) {
            if (activeComp.layers[i] instanceof CameraLayer) {
                validLayers.push(activeComp.layers[i]);
            }
        }

        var d = showDialog(
            function(settings) {
                runExport(settings, {
                    validLayers: validLayers,
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
        var validLayers = opts.validLayers;
        var activeComp = opts.activeComp;
        var layersToExport;
        if (settings.selectedLayersOnly) {
            layersToExport = [];
            for (var i = 0; i < activeComp.selectedLayers.length; i++) {
                // For some reason validLayers.includes doesn't work here
                for (var j = 0; j < validLayers.length; j++) {
                    if (validLayers[i] === activeComp.selectedLayers[i]) {
                        layersToExport.push(activeComp.selectedLayers[i]);
                        break;
                    }
                }
            }
        } else {
            layersToExport = validLayers;
        }

        var json = {
            layers: [],
            compSize: [activeComp.width, activeComp.height],
            frameRate: activeComp.frameRate,
            version: fileVersion
        };

        function zoomToAngle(zoom) {
            return Math.atan((activeComp.width/zoom)/2)*(360/Math.PI);
        }

        // `toWorld` only works inside expressions, so add a null object whose expression we will set and then evaluate
        // using `valueAtTime`.
        var evaluator = activeComp.layers.addNull();
        // Move the evaluator layer to the bottom to avoid messing up expressions which rely on layer indices
        evaluator.moveToEnd();
        try {
            evaluator.threeDLayer = true;

            for (var j = 0; j < layersToExport.length; j++) {
                var AELayer = layersToExport[j];

                // avoid floating point weirdness by rounding, just in case
                var startTime, duration;
                switch (settings.timeRange) {
                    case 'workArea':
                        startTime = activeComp.workAreaStart;
                        duration = activeComp.workAreaDuration;
                        break;
                    case 'layerDuration':
                        startTime = AELayer.inPoint;
                        duration = AELayer.outPoint - AELayer.inPoint;
                        break;
                    case 'wholeComp':
                    default:
                        startTime = 0;
                        duration = activeComp.duration;
                        break;
                }
                var startFrame = Math.round(startTime * activeComp.frameRate);
                var endFrame = startFrame + Math.round(duration * activeComp.frameRate);

                var exportedObject = {
                    name: AELayer.name,
                    position: {startFrame: startFrame, keyframes: []},
                    rotation: {startFrame: startFrame, keyframes: []}
                };

                json.layers.push(exportedObject);

                evaluator.transform.position.expression = "thisComp.layer(\"" + exportedObject.name + "\").toWorld([0, 0, 0])";
                evaluator.transform.orientation.expression = "var C = thisComp.layer(\"" + exportedObject.name + "\");\
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

                var fovVaries = AELayer.zoom.isTimeVarying;
                exportedObject.fov = fovVaries ? {startFrame: startFrame, keyframes: []} : zoomToAngle(AELayer.zoom.value)

                for (var i = startFrame; i < endFrame; i++) {
                    var time =  i / activeComp.frameRate;
                    var posVal = evaluator.transform.position.valueAtTime(time, false);
                    if (settings.centeredCamera) {
                        posVal[0] -= activeComp.width / 2;
                        posVal[1] -= activeComp.height / 2;
                    }
                    exportedObject.position.keyframes.push(posVal);
                    exportedObject.rotation.keyframes.push(evaluator.transform.orientation.valueAtTime(time, false));
                    if (fovVaries) exportedObject.fov.keyframes.push(zoomToAngle(AELayer.zoom.valueAtTime(time, false)));
                }
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
        main();
    } catch (err) {
        alert(err);
    }
}