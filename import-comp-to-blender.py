import json
import bpy
from bpy.types import FCurve, Camera, TimelineMarker, Object
from typing import Callable, Optional, Tuple
from bpy_extras.io_utils import ImportHelper
from mathutils import Euler, Matrix, Quaternion, Vector
from math import radians, pi, floor, ceil, isclose
from fractions import Fraction
from itertools import chain
from dataclasses import dataclass

bl_info = {
    "name": "Import After Effects Composition",
    "description": "Import layers from an After Effects composition into Blender",
    "author": "adroitwhiz",
    "version": (0, 5, 2),
    "blender": (2, 91, 0),
    "category": "Import-Export",
    "doc_url": "https://github.com/adroitwhiz/after-effects-to-blender-export/",
    "tracker_url": "https://github.com/adroitwhiz/after-effects-to-blender-export/issues/new?assignees=&labels=bug%2C+import&projects=&template=issue-importing-into-blender.md"
}

# Blender will warn users if they enable this addon in an older version of Blender than is officially supported,
# but will not prevent them from using it. This warning is apparently not visible enough, and Blender will throw an
# obscure error when those users attempt to actually use the add-on. Instead, prevent the add-on from being enabled in
# versions of Blender too old to allow it to function.
if bpy.app.version < bl_info['blender']:
    min_blender_version_string = '.'.join(str(ver) for ver in bl_info['blender'])
    raise Exception(f"This add-on is incompatible with Blender versions older than {min_blender_version_string}. Please update to a newer version of Blender.")

@dataclass
class CameraLayer:
    """Camera layer; used for Cameras to Markers functionality"""
    camera: Object
    inFrame: int
    outFrame: int

class ImportAEComp(bpy.types.Operator, ImportHelper):
    """Import layers from an After Effects composition, as exported by the corresponding AE script"""
    bl_idname = "import.ae_comp"
    bl_label = "Import AE Comp"
    bl_options = {"REGISTER", "UNDO", "PRESET"}
    filename_ext = ".json"
    filter_glob: bpy.props.StringProperty(
        default="*.json",
        options={'HIDDEN'},
    )

    scale_factor: bpy.props.FloatProperty(
        name="Scale Factor",
        description="Amount to scale the imported layers by. The default (0.01) maps one pixel to one centimeter",
        min=0.0001,
        max=10000.0,
        default=0.01
    )

    handle_framerate: bpy.props.EnumProperty(
        items=[
            (
                "preserve_frame_numbers",
                "Preserve Frame Numbers",
                "Keep the frame numbers the same, without changing the Blender scene's frame rate, if frame rates differ",
                "",
                0
            ), (
                "set_framerate",
                "Use Comp Frame Rate",
                "Set the Blender scene's frame rate to match that of the imported composition",
                "",
                1
            ), (
                "remap_times",
                "Remap Frame Times",
                "If the Blender scene's frame rate differs, preserve the speed of the imported composition by changing frame numbers",
                "",
                2
            ),
        ],
        name="Handle FPS",
        description="How to handle the frame rate of the imported composition differing from the Blender scene's frame rate",
        default="preserve_frame_numbers"
    )

    comp_center_to_origin: bpy.props.BoolProperty(
        name="Comp Center to Origin",
        description="Translate everything over so that the composition center is at (0, 0, 0) (the origin)",
        default=False
    )

    use_comp_resolution: bpy.props.BoolProperty(
        name="Use Comp Resolution",
        description="Change the scene resolution and pixel aspect ratio to those of the imported composition",
        default=False
    )

    create_new_collection: bpy.props.BoolProperty(
        name="Create New Collection",
        description="Add all the imported layers to a new collection.",
        default=False
    )

    adjust_frame_start_end: bpy.props.BoolProperty(
        name="Adjust Frame Start/End",
        description="Adjust the Start and End frames of the playback/rendering range to the imported composition's work area.",
        default=False
    )

    cameras_to_markers: bpy.props.BoolProperty(
        name="Cameras to Markers",
        description="Create timeline markers and bind them to the imported camera layers' in/out points.",
        default=False
    )

    def make_or_get_fcurve(self, action: 'bpy.types.Action', data_path: str, index=-1) -> 'FCurve':
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

    def import_bezier_keyframe_channel(self, fcurve: 'FCurve', keyframes, framerate: float, mul = 1.0, add = 0.0):
        '''Imports a given keyframe channel in Bezier format onto a given F-curve.

        Args:
            fcurve (FCurve): The F-curve to import the keyframes into.
            keyframes: The keyframes.
            framerate (float): The scene's framerate.
            mul (float, optional): Multiply all keyframes by this value. Defaults to 1.
            add (float, optional): Add this value to all keyframes. Defaults to 0.
        '''
        fcurve.keyframe_points.add(len(keyframes))
        for i, keyframe in enumerate(keyframes):
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

    def import_baked_keyframe_channel(
        self,
        fcurve: FCurve,
        keyframes,
        start_frame: int,
        comp_framerate: float,
        desired_framerate: float,
        supersampling_rate: int,
        mul = 1.0,
        add = 0.0):
        '''Import a given keyframe channel in "calculated"/baked format onto a given F-curve.

        Args:
            fcurve (FCurve): The F-curve to import the keyframes into.
            keyframes: The keyframes.
            start_frame (int): The frame number at which the keyframe data starts.
            comp_framerate (float): The comp's framerate.
            desired_framerate (float): The desired framerate.
            supersampling_rate (int): Multiplier for the framerate; this many keyframes will be created per frame.
            mul (int, optional): Multiply all keyframes by this value. Defaults to 1.
            add (int, optional): Add this value to all keyframes. Defaults to 0.
        '''
        fcurve.keyframe_points.add(len(keyframes))
        for i, keyframe in enumerate(keyframes):
            k = fcurve.keyframe_points[i]
            k.co_ui = [(((i / supersampling_rate) + start_frame) * desired_framerate) / comp_framerate, keyframe * mul + add]
            k.interpolation = 'LINEAR'

    def ensure_action_exists(self, obj: 'bpy.types.Object'):
        '''Create animation data and an Action for a given object if it does not already exist.

        Args:
            obj (bpy.types.Object): The object to create animation data and an Action for.
        '''
        if obj.animation_data is None:
            obj.animation_data_create()
        if obj.animation_data.action is None:
            obj.animation_data.action = bpy.data.actions.new(obj.name + 'Action')

    def import_property(
        self,
        obj: 'bpy.types.Object',
        data_path: str,
        data_index: int,
        prop_data,
        comp_framerate: float,
        desired_framerate: float,
        mul = 1.0,
        add = 0.0):
        '''Imports a given property from the JSON file onto a given Blender object.

        Args:
            obj (bpy_struct): The object to import the property onto.
            data_path (str): The destination data path of the property.
            data_index (int): The index into the destination data path, for multidimensional properties. -1 for single-dimension properties.
            prop_data: The JSON property data.
            comp_framerate (float): The comp's framerate.
            desired_framerate (float): The desired framerate.
            mul (float, optional): Multiply the property by this value. Defaults to 1.
            add (float, optional): Add this value to the property. Defaults to 0.
        '''
        if prop_data['isKeyframed']:
            self.ensure_action_exists(obj)
            fcurve = self.make_or_get_fcurve(obj.animation_data.action, data_path, data_index)
            if prop_data['keyframesFormat'] == 'bezier':
                self.import_bezier_keyframe_channel(
                    fcurve,
                    prop_data['keyframes'],
                    desired_framerate,
                    mul,
                    add
                )
            else:
                self.import_baked_keyframe_channel(
                    fcurve,
                    prop_data['keyframes'],
                    prop_data['startFrame'],
                    comp_framerate,
                    desired_framerate,
                    prop_data['supersampling'],
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

    def import_baked_transform(
        self,
        obj: 'bpy.types.Object',
        data,
        comp_framerate: float,
        desired_framerate: float,
        func: Optional[
            Callable[
                ['Vector', 'Quaternion', 'Vector'],
                Tuple['Vector', 'Quaternion', 'Vector']
            ]
        ] = None):
        '''Import a baked transform (one 4x4 transform matrix per frame) onto a given Blender object.

        Args:
            obj (bpy_struct): The object to import the property onto.
            data: The JSON transform data.
            comp_framerate (float): The comp's framerate.
            desired_framerate (float): The desired framerate.
            func ((Vector, Quaternion, Vector) -> (Vector, Quaternion, Vector), optional): Function to call on each keyframe.
        '''
        self.ensure_action_exists(obj)
        obj.rotation_mode = 'QUATERNION'

        loc_fcurves = [self.make_or_get_fcurve(obj.animation_data.action, 'location', index) for index in range(3)]
        rot_fcurves = [self.make_or_get_fcurve(obj.animation_data.action, 'rotation_quaternion', index) for index in range(4)]
        scale_fcurves = [self.make_or_get_fcurve(obj.animation_data.action, 'scale', index) for index in range(3)]

        keyframes = data['keyframes']
        start_frame = data['startFrame']
        supersampling_rate = data['supersampling']

        for fcurve in chain(loc_fcurves, rot_fcurves, scale_fcurves):
            fcurve.keyframe_points.add(len(keyframes))

        prev_rot = None
        for i, keyframe in enumerate(keyframes):
            mat = Matrix((
                (keyframe[0], keyframe[1], keyframe[2], keyframe[3]),
                (keyframe[4], keyframe[5], keyframe[6], keyframe[7]),
                (keyframe[8], keyframe[9], keyframe[10], keyframe[11]),
                (0.0, 0.0, 0.0, 1.0)
            ))
            loc, rot, scale = mat.decompose()

            if func is not None:
                loc, rot, scale = func(loc, rot, scale)

            if prev_rot is not None:
                rot.make_compatible(prev_rot)
            prev_rot = rot

            kx = (((i / supersampling_rate) + start_frame) * desired_framerate) / comp_framerate
            for j in range(3):
                k = loc_fcurves[j].keyframe_points[i]
                k.co_ui = [kx, loc[j]]
                k.interpolation = 'LINEAR'
            for j in range(4):
                k = rot_fcurves[j].keyframe_points[i]
                k.co_ui = [kx, rot[j]]
                k.interpolation = 'LINEAR'
            for j in range(3):
                k = scale_fcurves[j].keyframe_points[i]
                k.co_ui = [kx, scale[j]]
                k.interpolation = 'LINEAR'

    def import_property_spatial(
        self,
        obj: 'bpy.types.Object',
        data_path: str,
        prop_data,
        comp_framerate: float,
        desired_framerate: float,
        swizzle: Tuple[int, int, int],
        mul: Tuple[float, float, float],
        add: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    ):
        '''Import a 3D spatial property.

        Args:
            obj (bpy_struct): The object to import the property onto.
            data_path (str): The destination property's data path.
            prop_data: The JSON property data.
            comp_framerate (float): The comp's framerate.
            desired_framerate (float): The desired framerate.
            swizzle (int, int, int): The indices to place the destination values onto (e.g. (0, 2, 1) to map
                the channel with source index 1 to destination index 2, and vice versa).
            mul (float, float, float): The (pre-swizzle) values to multiply the keyframe values by.
            add (float, float, float): The (pre-swizzle) values to add to the keyframe values.
        '''
        for i in range(3):
            self.import_property(
                obj=obj,
                data_path=data_path,
                data_index=swizzle[i],
                prop_data=prop_data['channels'][i],
                comp_framerate=comp_framerate,
                desired_framerate=desired_framerate,
                mul=mul[i],
                add=add[i]
            )

    def execute(self, context):
        scale_factor = self.scale_factor

        with open(self.filepath) as f:
            data = json.load(f)

        fileVersion = data.get('version', 0)
        if fileVersion != 3:
            if fileVersion > 3:
                warning = 'This file is too new. Update this add-on.'
            else:
                warning = 'This file is too old. Re-export it using a newer version of this add-on.'
            self.report({'WARNING'}, warning)
            return {'CANCELLED'}

        added_objects = []
        cameras: list[CameraLayer] = []
        camera_in_out_frames: list[int] = []

        imported_objects = []
        innermost_objects_by_index = dict()


        if self.handle_framerate == 'remap_times':
            desired_framerate = context.scene.render.fps
        else:
            desired_framerate = data['comp']['frameRate']

        if self.handle_framerate == 'set_framerate':
            comp_framerate = data['comp']['frameRate']
            if int(comp_framerate) == comp_framerate:
                context.scene.render.fps = comp_framerate
                context.scene.render.fps_base = 1.0
            else:
                ceil_framerate = ceil(comp_framerate)
                # round to 1.001, the proper timebase
                fps_base = round(ceil_framerate / comp_framerate, 5)
                context.scene.render.fps = ceil_framerate
                context.scene.render.fps_base = fps_base

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
            if layer['type'] == 'camera' and 'enabled' in layer and layer['enabled'] and 'inFrame' in layer and 'outFrame' in layer:
                # If this is an enabled camera layer, add it to the "Camera to Markers" data to be imported
                # Older files don't have inFrame/outFrame/enabled properties, so confirm their presence
                # The frames are calculated by multiplying floating-point seconds values by the framerate, so they're
                # often a bit off and need to be rounded to the nearest frame
                cameras.append(CameraLayer(obj, round(layer['inFrame']), round(layer['outFrame'])))
                camera_in_out_frames.append(round(layer['inFrame']))
                camera_in_out_frames.append(round(layer['outFrame']))
            added_objects.append(obj)

            innermost_objects_by_index[layer['index']] = obj

            transform_target = obj

            if data['transformsBaked']:
                # These are used to swap Z and -Y. Not sure this is the best way to do it.
                pre_quat = Quaternion((1.0, 0.0, 0.0), radians(-90.0))
                post_quat = Quaternion((1.0, 0.0, 0.0), radians(180.0 if layer['type'] == 'camera' else 90.0))
                def transform(loc, rot, scale):
                    if self.comp_center_to_origin:
                        loc -= Vector((data['comp']['width'] * 0.5, data['comp']['height'] * 0.5, 0.0))
                    loc = Vector((loc[0] * scale_factor, loc[2] * scale_factor, -loc[1] * scale_factor))
                    scale = Vector((scale[0], scale[2], scale[1]))
                    rot = pre_quat @ rot @ post_quat
                    return loc, rot, scale

                self.import_baked_transform(
                    obj,
                    layer['transform'],
                    comp_framerate=data['comp']['frameRate'],
                    desired_framerate=desired_framerate,
                    func=transform
                )
            else:
                if 'anchorPoint' in layer and (
                    any(channel['isKeyframed'] for channel in layer['anchorPoint']['channels']) or
                    any(abs(channel['value']) >= 1e-15 for channel in layer['anchorPoint']['channels'])
                ):
                    anchor_parent = bpy.data.objects.new(layer['name'] + ' Anchor Point', None)
                    anchor_parent.empty_display_type = 'ARROWS'
                    added_objects.append(anchor_parent)
                    self.import_property_spatial(
                        obj=transform_target,
                        data_path='location',
                        prop_data=layer['anchorPoint'],
                        comp_framerate=data['comp']['frameRate'],
                        desired_framerate=desired_framerate,
                        swizzle=(0, 2, 1),
                        mul=(-scale_factor, scale_factor, -scale_factor)
                    )
                    transform_target.parent = anchor_parent
                    transform_target = anchor_parent

                if 'scale' in layer:
                    self.import_property_spatial(
                        obj=transform_target,
                        data_path='scale',
                        prop_data=layer['scale'],
                        comp_framerate=data['comp']['frameRate'],
                        desired_framerate=desired_framerate,
                        swizzle=(0, 2, 1),
                        mul=(0.01, 0.01, 0.01)
                    )

                ANGLE_CONVERSION_FACTOR = pi / 180
                if layer['type'] == 'camera':
                    # Rotate camera upwards 90 degrees along the X axis
                    transform_target.rotation_mode = 'ZYX'
                    channel_swizzle = (0, 1, 2)
                    channel_add = (pi / 2, 0, 0)
                    channel_multiply = (1, -1, -1)
                else:
                    transform_target.rotation_mode = 'YZX'
                    channel_swizzle = (0, 2, 1)
                    channel_add = (0, 0, 0)
                    channel_multiply = (1, -1, 1)

                for index, prop_name in enumerate(['rotationX', 'rotationY', 'rotationZ']):
                    if prop_name in layer:
                        self.import_property(
                            obj=transform_target,
                            data_path='rotation_euler',
                            data_index=channel_swizzle[index],
                            prop_data=layer[prop_name]['channels'][0],
                            comp_framerate=data['comp']['frameRate'],
                            desired_framerate=desired_framerate,
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
                                angle = Matrix.Identity(3)
                                # Apply AE orientation
                                angle.rotate(Euler((radians(x), radians(z), radians(-y)), 'YZX'))
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

                    self.import_property_spatial(
                        obj=point_of_interest,
                        data_path='location',
                        prop_data=layer['pointOfInterest'],
                        comp_framerate=data['comp']['frameRate'],
                        desired_framerate=desired_framerate,
                        swizzle=(0, 2, 1),
                        mul=(scale_factor, -scale_factor, scale_factor),
                        add=(
                            # TODO: abstract the process of "comp center to origin" for all translations
                            -data['comp']['width'] * 0.5 * self.scale_factor if self.comp_center_to_origin else 0,
                            data['comp']['height'] * 0.5 * self.scale_factor if self.comp_center_to_origin else 0,
                            0
                        )
                    )

                    track_constraint = point_of_interest_parent.constraints.new('TRACK_TO')
                    track_constraint.owner_space = 'LOCAL'
                    track_constraint.target = point_of_interest
                    track_constraint.track_axis = 'TRACK_Y'
                    track_constraint.up_axis = 'UP_Z'

                    transform_target.parent = point_of_interest_parent
                    transform_target = point_of_interest_parent

                should_translate = self.comp_center_to_origin and layer['parentIndex'] is None

                if 'position' in layer:
                    self.import_property_spatial(
                        obj=transform_target,
                        data_path='location',
                        prop_data=layer['position'],
                        comp_framerate=data['comp']['frameRate'],
                        desired_framerate=desired_framerate,
                        swizzle=(0, 2, 1),
                        mul=(scale_factor, -scale_factor, scale_factor),
                        add=(
                            -data['comp']['width'] * 0.5 * self.scale_factor if should_translate else 0,
                            data['comp']['height'] * 0.5 * self.scale_factor if should_translate else 0,
                            0
                        )
                    )

            if layer['type'] == 'camera':
                obj_data.sensor_fit = 'VERTICAL'
                self.import_property(
                    obj=obj_data,
                    data_path='lens',
                    data_index=-1,
                    prop_data=layer['zoom']['channels'][0],
                    comp_framerate=data['comp']['frameRate'],
                    desired_framerate=desired_framerate,
                    # 24 = default camera sensor height
                    mul=24 / data['comp']['height']
                )

            imported_objects.append((transform_target, layer))

        # Baked transforms include parent transforms
        if not data['transformsBaked']:
            for obj, layer in imported_objects:
                if layer['parentIndex'] is not None:
                    obj.parent = innermost_objects_by_index[layer['parentIndex']]

        if self.create_new_collection:
            dst_collection = bpy.data.collections.new(data['comp']['name'])
            context.collection.children.link(dst_collection)
        else:
            dst_collection = context.collection

        for obj in added_objects:
            dst_collection.objects.link(obj)
            obj.select_set(True)

        context.view_layer.update()

        if self.use_comp_resolution:
            render_settings = context.scene.render
            render_settings.resolution_x = data['comp']['width']
            render_settings.resolution_y = data['comp']['height']

            pixel_aspect = data['comp']['pixelAspect']
            # Check whether the pixel aspect ratio can be expressed precisely as a ratio of smallish integers
            pixel_aspect_frac = Fraction(pixel_aspect).limit_denominator(1000)
            if isclose(float(pixel_aspect_frac), pixel_aspect, abs_tol=1e-11):
                render_settings.pixel_aspect_x = pixel_aspect_frac.numerator
                render_settings.pixel_aspect_y = pixel_aspect_frac.denominator
            else:
                # Blender clamps pixel aspect X and Y to never go below 1
                if pixel_aspect > 1:
                    render_settings.pixel_aspect_x = pixel_aspect
                    render_settings.pixel_aspect_y = 1
                else:
                    render_settings.pixel_aspect_x = 1
                    render_settings.pixel_aspect_y = 1 / pixel_aspect

        if self.adjust_frame_start_end:
            # Compensate for floating-point error
            # TODO: there should be a lot less floating-point error. ExtendScript is probably printing floats poorly.
            context.scene.frame_start = floor(data['comp']['workArea'][0] * desired_framerate + 1e-13)
            # After Effects' work area excludes the end point; Blender's includes it. Subtract 1 from the end.
            context.scene.frame_end = ceil(data['comp']['workArea'][1] * desired_framerate - 1e-13) - 1

        if self.cameras_to_markers:
            # Keep track of existing markers to avoid adding new ones in the same place
            existing_markers: dict[int, TimelineMarker] = dict()
            for marker in context.scene.timeline_markers.values():
                existing_markers[marker.frame] = marker

            camera_in_out_frames.sort()
            prev_enabled_camera = None

            # Check all the camera layer in/out points, since those are the only places a camera change can occur
            for frame in camera_in_out_frames:
                # Find the topmost camera layer
                enabled_camera = None
                for camera in cameras:
                    if camera.inFrame <= frame and camera.outFrame > frame:
                        enabled_camera = camera
                        break

                # If the camera changed, add or update the marker at that frame
                if enabled_camera != prev_enabled_camera:
                    prev_enabled_camera = enabled_camera
                    if enabled_camera is None:
                        continue
                    marker = existing_markers.get(frame)
                    if marker is None:
                        marker = context.scene.timeline_markers.new(f'M_{enabled_camera.camera.name}', frame=frame)
                    marker.camera = enabled_camera.camera

        return {'FINISHED'}

    def draw(self, context: 'bpy.types.Context'):
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False

        col = layout.column()
        col.prop(self, 'scale_factor')
        col.prop(self, 'handle_framerate')

        col = layout.column()
        # Give the checkboxes room to breathe. Ideally, this wouldn't be necessary, but the default width is just a few
        # pixels too small and truncates the labels.
        col.use_property_split = False
        col.prop(self, 'comp_center_to_origin')
        col.prop(self, 'use_comp_resolution')
        col.prop(self, 'create_new_collection')
        col.prop(self, 'adjust_frame_start_end')
        col.prop(self, 'cameras_to_markers')

def menu_func_import(self, context):
    self.layout.operator(ImportAEComp.bl_idname, text="After Effects composition data, converted (.json)")

def register():
    bpy.utils.register_class(ImportAEComp)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)

def unregister():
    bpy.utils.unregister_class(ImportAEComp)
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)

if __name__ == "__main__":
    register()
