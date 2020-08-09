
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
                            cameraDuration: c.RadioButton({
                                text: 'Camera layer duration'
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
                cameraDuration: window.settings.timeRange.value.cameraDuration,
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

        var json = {
            cameras: [],
            compSize: [activeComp.width, activeComp.height],
            frameRate: activeComp.frameRate,
            version: fileVersion
        };

        function zoomToAngle(zoom) {
            return Math.atan((activeComp.width/zoom)/2)*(360/Math.PI);
        }

        var evaluator = activeComp.layers.addNull();
        try {
            evaluator.threeDLayer = true;

            for (var j = 0; j < selection.length; j++) {
                if (!(selection[j] instanceof CameraLayer)) continue;
                var AECamera = selection[j];

                // avoid floating point weirdness by rounding, just in case
                var startTime, duration;
                switch (settings.timeRange) {
                    case 'workArea':
                        startTime = activeComp.workAreaStart;
                        duration = activeComp.workAreaDuration;
                        break;
                    case 'cameraDuration':
                        startTime = AECamera.inPoint;
                        duration = AECamera.outPoint - AECamera.inPoint;
                        break;
                    case 'wholeComp':
                    default:
                        startTime = 0;
                        duration = activeComp.duration;
                        break;
                }
                var startFrame = Math.round(startTime * activeComp.frameRate);
                var endFrame = startFrame + Math.round(duration * activeComp.frameRate);

                var camera = {
                    name: AECamera.name,
                    position: {startFrame: startFrame, keyframes: []},
                    rotation: {startFrame: startFrame, keyframes: []}
                };

                json.cameras.push(camera);

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

                var fovVaries = AECamera.zoom.isTimeVarying;
                camera.fov = fovVaries ? {startFrame: startFrame, keyframes: []} : zoomToAngle(AECamera.zoom.value)

                for (var i = startFrame; i < endFrame; i++) {
                    var time =  i / activeComp.frameRate;
                    var posVal = evaluator.transform.position.valueAtTime(time, false);
                    if (settings.centeredCamera) {
                        posVal[0] -= activeComp.width / 2;
                        posVal[1] -= activeComp.height / 2;
                    }
                    camera.position.keyframes.push(posVal);
                    camera.rotation.keyframes.push(evaluator.transform.orientation.valueAtTime(time, false));
                    if (fovVaries) camera.fov.keyframes.push(zoomToAngle(AECamera.zoom.valueAtTime(time, false)));
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
        var d = showDialog(main);
        d.window.show();
    } catch (err) {
        alert(err);
    }
}