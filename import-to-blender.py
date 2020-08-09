import json
import bpy
import mathutils
from math import radians, tau

with open("C:/Users/adroitwhiz/Documents/ae-gltf-camera/cam.json") as f:
    data = json.load(f)
    for camdata in data['cameras']:
        cam = bpy.data.cameras.new(camdata['name'])
        camobj = bpy.data.objects.new(camdata['name'], cam)

        for index, keyframe in enumerate(camdata['position']['keyframes'], camdata['position']['startFrame']):
            camobj.location = (keyframe[0] * 0.01, keyframe[2] * 0.01, keyframe[1] * -0.01)
            camobj.keyframe_insert('location', frame=index)

        prev_rot = None
        camobj.rotation_mode = 'QUATERNION'
        for index, keyframe in enumerate(camdata['rotation']['keyframes'], camdata['rotation']['startFrame']):
            rot = mathutils.Matrix.Identity(3)

            # Orientate X upwards
            rot.rotate(mathutils.Euler((radians(90), 0, 0)))

            # Apply AE orientation
            rot.rotate(mathutils.Euler((radians(keyframe[0]), radians(keyframe[2]), radians(-keyframe[1])), 'YZX'))

            quat = rot.to_quaternion()

            # Prevent discontinuities in the rotation which can mess up motion blur
            # I'm really glad I remembered make_compatible exists before I spent too much time trying to do this myself
            if prev_rot:
                quat.make_compatible(prev_rot)

            camobj.rotation_quaternion = quat
            camobj.keyframe_insert('rotation_quaternion', frame=index)

            prev_rot = quat

        if isinstance(camdata['fov'], dict):
            for index, keyframe in enumerate(camdata['fov']['keyframes'], camdata['fov']['startFrame']):
                cam.angle_x = radians(keyframe)
                cam.keyframe_insert('lens', frame=index)
        else:
            cam.angle_x = radians(camdata['fov'])

        bpy.context.collection.objects.link(camobj)
    bpy.context.view_layer.update()