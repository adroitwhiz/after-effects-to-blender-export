import json
import bpy
from bpy_extras.io_utils import ImportHelper
import mathutils
from math import radians, tau

bl_info = {
    "name": "Import AE Camera Keyframe Data",
    "description": "Import After Effects camera keyframe data into Blender",
    "author": "adroitwhiz",
    "version": (0, 2),
    "blender": (2, 80, 0),
    "category": "Import-Export"
}

class ImportAECameraData(bpy.types.Operator, ImportHelper):
    """Import After Effects camera data, as exported by the corresponding AE script"""
    bl_idname = "import.ae_camera"
    bl_label = "Import AE Camera Data"
    filename_ext = ".json"
    filter_glob = bpy.props.StringProperty(
        default="*.json",
        options={'HIDDEN'},
    )

    def execute(self, context):
        with open(self.filepath) as f:
            data = json.load(f)

            if data.get('version', 0) > 1:
                self.report({'WARNING'}, 'This file is too new. Update this add-on.')
                return {'CANCELLED'}

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

                camobj.select_set(True)
            bpy.context.view_layer.update()

            return {'FINISHED'}

def menu_func_import(self, context):
    self.layout.operator(ImportAECameraData.bl_idname, text="After Effects camera data (.json)")

def register():
    bpy.utils.register_class(ImportAECameraData)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)

def unregister():
    bpy.utils.unregister_class(ImportAECameraData)
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)

if __name__ == "__main__":
    register()
