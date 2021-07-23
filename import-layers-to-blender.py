import json
import bpy
import bmesh
from bpy_extras.io_utils import ImportHelper
import mathutils
from math import radians, tau, pi

bl_info = {
    "name": "Import After Effects Layers",
    "description": "Import After Effects layers into Blender",
    "author": "adroitwhiz",
    "version": (0, 3),
    "blender": (2, 90, 0),
    "category": "Import-Export"
}

class ImportAELayers(bpy.types.Operator, ImportHelper):
    """Import After Effects layes, as exported by the corresponding AE script"""
    bl_idname = "import.ae_layers"
    bl_label = "Import AE Layers"
    filename_ext = ".json"
    filter_glob: bpy.props.StringProperty(
        default="*.json",
        options={'HIDDEN'},
    )

    def make_or_get_fcurve(self, action, data_path, index=-1):
        '''Returns an F-curve controlling a certain datapath on the given action, creating one if it does not already exist.

        Args:
            action (bpy.types.Action): The action to return an F-curve from
            data_path (str): The datapath which the F-curve controls
            index (int, optional): The index of the property, for multidimensional properties like location, rotation, and scale.

        Returns:
            FCurve: The F-curve controlling the given datapath
        '''
        for fc in action.fcurves:
            if (fc.data_path != data_path):
                continue
            if index<0 or index==fc.array_index:
                return fc
        # the action didn't have the fcurve we needed, yet
        return action.fcurves.new(data_path, index=index)

    def import_bezier_keyframe_channel(self, fcurve, keyframes, framerate, mul = 1, add = 0):
        '''Imports a given keyframe channel in Bezier format onto a given F-curve.

        Args:
            fcurve (FCurve): The F-curve to import the keyframes into.
            keyframes: The keyframes.
            framerate (int): The scene's framerate.
            mul (int, optional): Multiply all keyframes by this value. Defaults to 1.
            add (int, optional): Add this value to all keyframes. Defaults to 0.
        '''
        fcurve.keyframe_points.add(len(keyframes))
        for i in range(len(keyframes)):
            keyframe = keyframes[i]
            k = fcurve.keyframe_points[i]
            if keyframe['interpolationOut'] == 'hold':
                k.interpolation = 'CONSTANT'
            k.handle_left_type = 'FREE'
            k.handle_right_type = 'FREE'
            x = keyframe['time'] * framerate
            y = keyframe['value']
            k.co = [x, y * mul + add]
            if i > 0:
                # After Effects keyframe handles have a "speed" (in units per second) which determines the vertical
                # position of the handle, and an "influence" (as a percentage of the distance to the previous/next
                # keyframe) which determines the horizontal position and also scales the vertical position.
                easeIn = keyframe['easeIn']
                prev_to_cur_duration = (keyframe['time'] - keyframes[i - 1]['time']) * framerate
                influence = easeIn['influence'] * 0.01
                k.handle_left = [
                    x - (prev_to_cur_duration * influence),
                    (y - (easeIn['speed'] * influence * (prev_to_cur_duration / framerate))) * mul + add
                ]
            if i != len(keyframes) - 1:
                easeOut = keyframe['easeOut']
                cur_to_next_duration = (keyframes[i + 1]['time'] - keyframe['time']) * framerate
                influence = easeOut['influence'] * 0.01
                k.handle_right = [
                    x + (cur_to_next_duration * influence),
                    (y + (easeOut['speed'] * influence * (cur_to_next_duration / framerate))) * mul + add
                ]

    def import_baked_keyframe_channel(self, fcurve, keyframes, startFrame, framerate, mul = 1, add = 0):
        '''Import a given keyframe channel in "calculated"/baked format onto a given F-curve.

        Args:
            fcurve (FCurve): The F-curve to import the keyframes into.
            keyframes: The keyframes.
            startFrame (int): The frame number at which the keyframe data starts.
            framerate (int): The scene's framerate.
            mul (int, optional): Multiply all keyframes by this value. Defaults to 1.
            add (int, optional): Add this value to all keyframes. Defaults to 0.
        '''
        # TODO: convert from comp framerate to blend framerate
        fcurve.keyframe_points.add(len(keyframes))
        for i in range(len(keyframes)):
            keyframe = keyframes[i]
            k = fcurve.keyframe_points[i]
            k.co_ui = [i + startFrame, keyframe * mul + add]
            k.interpolation = 'LINEAR'

    def ensure_action_exists(self, obj):
        '''Create animation data and an Action for a given object if it does not already exist.

        Args:
            obj (bpy.types.Object): The object to create animation data and an Action for.
        '''
        if obj.animation_data is None:
            obj.animation_data_create()
        if obj.animation_data.action is None:
            obj.animation_data.action = bpy.data.actions.new(obj.name + 'Action')

    def import_property(self, obj, data_path, data_index, prop_data, framerate, mul = 1, add = 0):
        '''Imports a given property from the JSON file onto a given Blender object.

        Args:
            obj (bpy_struct): The object to import the property onto.
            data_path (str): The destination data path of the property.
            data_index (int): The index into the destination data path, for multidimensional properties. -1 for single-dimension properties.
            prop_data: The JSON property data.
            framerate (int): The scene's framerate.
            mul (int, optional): Multiply the property by this value. Defaults to 1.
            add (int, optional): Add this value to the property. Defaults to 0.
        '''
        if prop_data['isKeyframed']:
            self.ensure_action_exists(obj)
            fcurve = self.make_or_get_fcurve(obj.animation_data.action, data_path, data_index)
            if prop_data['keyframesFormat'] == 'bezier':
                self.import_bezier_keyframe_channel(
                    fcurve,
                    prop_data['keyframes'],
                    framerate,
                    mul,
                    add
                )
            else:
                self.import_baked_keyframe_channel(
                    fcurve,
                    prop_data['keyframes'],
                    prop_data['startFrame'],
                    framerate,
                    mul,
                    add
                )
        else:
            cur_val = getattr(obj, data_path)
            if data_index == -1:
                cur_val = prop_data['value'] * mul + add
            else:
                cur_val[data_index] = prop_data['value'] * mul + add
            setattr(obj, data_path, cur_val)

    def execute(self, context):
        scale_factor = 0.01
        with open(self.filepath) as f:
            data = json.load(f)

            fileVersion = data.get('version', 0)
            if fileVersion != 2:
                if fileVersion > 2:
                    warning = 'This file is too new. Update this add-on.'
                else:
                    warning = 'This file is too old. Re-export it using a newer version of this add-on.'
                self.report({'WARNING'}, warning)
                return {'CANCELLED'}

            added_objects = []

            imported_objects = []
            innermost_objects_by_index = dict()

            for layer in data['layers']:
                if layer['type'] == 'av':
                    if layer['nullLayer']:
                        obj_data = None
                    else:
                        width = data['sources'][layer['source']]['width'] * scale_factor
                        height = data['sources'][layer['source']]['height'] * scale_factor
                        verts = [
                            (0, 0, -height),
                            (width, 0, -height),
                            (width, 0, 0),
                            (0, 0, 0)
                        ]
                        obj_data = bpy.data.meshes.new(layer['name'])
                        obj_data.from_pydata(verts, [], [[0, 1, 2, 3]])
                        obj_data.uv_layers.new()
                elif layer['type'] == 'camera':
                    obj_data = bpy.data.cameras.new(layer['name'])
                elif layer['type'] == 'unknown':
                    obj_data = None
                obj = bpy.data.objects.new(layer['name'], obj_data)
                added_objects.append(obj)

                layer_source = data['sources'][layer['source']] if 'source' in layer else None

                layer_center = (layer_source['width'] / 2, layer_source['height'] / 2) if layer_source is not None else (0.0, 0.0)

                innermost_objects_by_index[layer['index']] = obj

                transform_target = obj

                if 'anchorPoint' in layer and (
                    any(channel['isKeyframed'] for channel in layer['anchorPoint']['channels']) or
                    any(abs(channel['value']) >= 1e-15 for channel in layer['anchorPoint']['channels'])
                ):
                    anchor_parent = bpy.data.objects.new(layer['name'] + ' Anchor Point', None)
                    anchor_parent.empty_display_type = 'ARROWS'
                    added_objects.append(anchor_parent)
                    self.import_property(
                        obj=transform_target,
                        data_path='location',
                        data_index=0,
                        prop_data=layer['anchorPoint']['channels'][0],
                        framerate=data['frameRate'],
                        mul=-scale_factor
                    )
                    self.import_property(
                        obj=transform_target,
                        data_path='location',
                        data_index=2,
                        prop_data=layer['anchorPoint']['channels'][1],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )
                    self.import_property(
                        obj = transform_target,
                        data_path='location',
                        data_index=1,
                        prop_data=layer['anchorPoint']['channels'][2],
                        framerate=data['frameRate'],
                        mul=-scale_factor
                    )
                    transform_target.parent = anchor_parent
                    transform_target = anchor_parent

                if 'scale' in layer:
                    self.import_property(
                        obj=transform_target,
                        data_path='scale',
                        data_index=0,
                        prop_data=layer['scale']['channels'][0],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )
                    self.import_property(
                        obj=transform_target,
                        data_path='scale',
                        data_index=2,
                        prop_data=layer['scale']['channels'][1],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )
                    self.import_property(
                        obj = transform_target,
                        data_path='scale',
                        data_index=1,
                        prop_data=layer['scale']['channels'][2],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )

                ANGLE_CONVERSION_FACTOR = pi / 180
                if layer['type'] == 'camera':
                    # Rotate camera upwards 90 degrees along the X axis
                    transform_target.rotation_mode = 'ZYX'
                    channel_order = [0, 1, 2]
                    channel_add = [pi / 2, 0, 0]
                    channel_multiply = [1, -1, -1]
                else:
                    transform_target.rotation_mode = 'YZX'
                    channel_order = [0, 2, 1]
                    channel_add = [0, 0, 0]
                    channel_multiply = [1, -1, 1]

                for index, prop_name in enumerate(['rotationX', 'rotationY', 'rotationZ']):
                    if prop_name in layer:
                        self.import_property(
                            obj=transform_target,
                            data_path='rotation_euler',
                            data_index=channel_order[index],
                            prop_data=layer[prop_name]['channels'][0],
                            framerate=data['frameRate'],
                            mul=ANGLE_CONVERSION_FACTOR * channel_multiply[index],
                            add=channel_add[index]
                        )

                if 'orientation' in layer:
                    all_keyframed = all(channel['isKeyframed'] for channel in layer['orientation']['channels'])
                    none_keyframed = all(not channel['isKeyframed'] for channel in layer['orientation']['channels'])

                    if not (all_keyframed or none_keyframed):
                        raise ValueError('Orientation keyframe channels should either all be keyframed or all be not keyframed')

                    if not (none_keyframed and all(abs(channel['value']) < 1e-15 for channel in layer['orientation']['channels'])):
                        orientation_parent = bpy.data.objects.new(layer['name'] + ' Orientation', None)
                        orientation_parent.empty_display_type = 'ARROWS'
                        added_objects.append(orientation_parent)

                        if all_keyframed:
                            if any(channel['keyframesFormat'] != 'calculated' for channel in layer['orientation']['channels']):
                                raise ValueError('Orientation keyframes must be in "calculated" format')

                            orientation_parent.rotation_mode = 'QUATERNION'
                            self.ensure_action_exists(orientation_parent)
                            num_keyframes = len(layer['orientation']['channels'][0]['keyframes'])
                            start_frame = layer['orientation']['channels'][0]['startFrame']
                            rot_fcurves = [self.make_or_get_fcurve(orientation_parent.animation_data.action, 'rotation_quaternion', i) for i in range(4)]
                            for fcurve in rot_fcurves:
                                fcurve.keyframe_points.add(num_keyframes)
                                for i in range(num_keyframes):
                                    fcurve.keyframe_points[i].interpolation = 'LINEAR'

                            prev_angle = None
                            for i, (x, y, z) in enumerate(zip(*(channel['keyframes'] for channel in layer['orientation']['channels']))):
                                angle = mathutils.Matrix.Identity(3)
                                # Apply AE orientation
                                angle.rotate(mathutils.Euler((radians(x), radians(z), radians(-y)), 'YZX'))
                                # Prevent discontinuities in the rotation which can mess up motion blur.
                                # Euler angles also have a make_compatible function, but it doesn't always work, so it's necessary to use quaternions.
                                quat = angle.to_quaternion()
                                if prev_angle:
                                    quat.make_compatible(prev_angle)

                                prev_angle = quat

                                for j in range(4):
                                    k = rot_fcurves[j].keyframe_points[i]
                                    k.co_ui = [i + start_frame, quat[j]]
                        else:
                            orientation_parent.rotation_mode = 'YZX'
                            orientation_parent.rotation_euler = [
                                radians(layer['orientation']['channels'][0]['value']),
                                radians(layer['orientation']['channels'][2]['value']),
                                radians(-layer['orientation']['channels'][1]['value'])
                            ]

                        transform_target.parent = orientation_parent
                        transform_target = orientation_parent

                if 'pointOfInterest' in layer:
                    point_of_interest_parent = bpy.data.objects.new(layer['name'] + ' Point Of Interest Constraint', None)
                    point_of_interest_parent.empty_display_type = 'ARROWS'
                    added_objects.append(point_of_interest_parent)

                    point_of_interest = bpy.data.objects.new(layer['name'] + ' Point Of Interest', None)
                    added_objects.append(point_of_interest)

                    self.import_property(
                        obj=point_of_interest,
                        data_path='location',
                        data_index=0,
                        prop_data=layer['pointOfInterest']['channels'][0],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )
                    self.import_property(
                        obj=point_of_interest,
                        data_path='location',
                        data_index=2,
                        prop_data=layer['pointOfInterest']['channels'][1],
                        framerate=data['frameRate'],
                        mul=-scale_factor
                    )
                    self.import_property(
                        obj = point_of_interest,
                        data_path='location',
                        data_index=1,
                        prop_data=layer['pointOfInterest']['channels'][2],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )

                    track_constraint = point_of_interest_parent.constraints.new('TRACK_TO')
                    track_constraint.owner_space = 'LOCAL'
                    track_constraint.target = point_of_interest
                    track_constraint.track_axis = 'TRACK_Y'
                    track_constraint.up_axis = 'UP_Z'

                    transform_target.parent = point_of_interest_parent
                    transform_target = point_of_interest_parent

                if 'position' in layer:
                    self.import_property(
                        obj=transform_target,
                        data_path='location',
                        data_index=0,
                        prop_data=layer['position']['channels'][0],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )
                    self.import_property(
                        obj=transform_target,
                        data_path='location',
                        data_index=2,
                        prop_data=layer['position']['channels'][1],
                        framerate=data['frameRate'],
                        mul=-scale_factor
                    )
                    self.import_property(
                        obj = transform_target,
                        data_path='location',
                        data_index=1,
                        prop_data=layer['position']['channels'][2],
                        framerate=data['frameRate'],
                        mul=scale_factor
                    )

                if layer['type'] == 'camera':
                    self.import_property(
                        obj=obj_data,
                        data_path='lens',
                        data_index=-1,
                        prop_data=layer['zoom']['channels'][0],
                        framerate=data['frameRate'],
                        # 36 = default camera sensor size
                        mul=36 / data['compSize'][0]
                    )

                imported_objects.append((transform_target, layer))

            for obj, layer in imported_objects:
                if layer['parentIndex'] is not None:
                    obj.parent = innermost_objects_by_index[layer['parentIndex']]

            for obj in added_objects:
                bpy.context.collection.objects.link(obj)
                obj.select_set(True)

            bpy.context.view_layer.update()

            return {'FINISHED'}

def menu_func_import(self, context):
    self.layout.operator(ImportAELayers.bl_idname, text="After Effects layer data (.json)")

def register():
    bpy.utils.register_class(ImportAELayers)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)

def unregister():
    bpy.utils.unregister_class(ImportAELayers)
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)

if __name__ == "__main__":
    register()
