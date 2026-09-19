"""Blender 5.2.2: read-only source -> deterministic standard camera rig and PNGs."""
import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--blend', required=True, type=Path)
parser.add_argument('--model', required=True)
parser.add_argument('--number', required=True)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--scene')
parser.add_argument('--device', choices=['cpu', 'metal'], default='cpu')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert bpy.app.version == (5, 2, 2), f'Requires Blender 5.2.2; got {bpy.app.version_string}'
assert re.fullmatch(r'[A-Z]{2}-\d{2}[A-Z]?', args.model), 'Invalid model'
series = args.model.split('-')[0]
assert re.fullmatch(r'2\d{2,3}' if series == 'HW' else r'[1-9]\d{3}', args.number), 'Invalid hull number'
source = args.blend.resolve(strict=True)
assert source.suffix.lower() == '.blend', 'Expected .blend'
repo = Path(__file__).resolve().parents[4]
output = args.output.resolve()
assert not output.is_relative_to(repo), 'Render outputs must stay outside the Git repository'
assert not output.exists() or not any(output.iterdir()), 'Use an empty output directory'
source_hash = sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
assert not bpy.data.libraries, 'Pack/link-independent source required'
for image in bpy.data.images:
    if image.source == 'FILE' and not image.packed_file:
        assert Path(bpy.path.abspath(image.filepath)).is_file(), f'Missing image: {image.name}'
        raise AssertionError(f'Pack external image before rendering: {image.name}')
for font in bpy.data.fonts:
    assert font.filepath == '<builtin>' or font.packed_file, f'Pack font: {font.name}'
if args.scene:
    original = bpy.data.scenes[args.scene]
else:
    # Exterior scenes are authored first; an explicit selector handles other libraries.
    candidates = [s for s in bpy.data.scenes if '内部' not in s.name and '客舱' not in s.name]
    assert len(candidates) == 1, 'Use --scene to select the exterior scene'
    original = candidates[0]
assert original.unit_settings.system == 'METRIC' and original.unit_settings.scale_length == 1, 'Require metric scale 1'
objects = [o for o in original.objects if o.type in {'MESH', 'FONT', 'CURVE', 'SURFACE', 'META'}
           and not o.hide_render and any(re.match(r'^(0[1-9]|[1-7]\d)\b', c.name) for c in o.users_collection)]
assert objects, 'No vessel geometry in numbered collections 01–79'
identity = [o.data.body for o in objects if o.type == 'FONT']
assert any(args.model in label for label in identity), 'Model text does not match source'
assert any(args.number == label.strip() for label in identity), 'Hull number does not match source'
points = [o.matrix_world @ Vector(corner) for o in objects for corner in o.bound_box]
assert all(math.isfinite(v) for p in points for v in p), 'Non-finite geometry'
low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
size = high - low
assert min(size) > 0, 'Degenerate bounds'
center = (low + high) / 2
length = max(size)
scene = bpy.data.scenes.new('ZEP · Standard views')
for obj in objects:
    scene.collection.objects.link(obj)
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.seed = 227
scene.cycles.use_animated_seed = False
scene.cycles.max_bounces = 12
scene.cycles.transmission_bounces = 10
scene.cycles.device = 'CPU'
if args.device == 'metal':
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    devices = [d for d in prefs.devices if d.type == 'METAL']
    assert devices, 'Metal device unavailable; explicitly choose --device cpu'
    for device in prefs.devices:
        device.use = device in devices
    scene.cycles.device = 'GPU'
scene.render.resolution_x = 2560
scene.render.resolution_y = 1920
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.render.film_transparent = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 10
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
world = bpy.data.worlds.new('ZEP black engineering background')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.002, 0.002, 0.002, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
scene.world = world
lights = []
for name, direction, power, area in [
    ('key', (-.8, -1, 1.5), 55, .85), ('fill', (1, -.3, .5), 25, 1),
    ('rim', (.3, 1, 1), 75, .7), ('underside', (-.4, .2, -1), 35, .8),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power * length * length
    data.shape = 'DISK'
    data.size = area * length
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = center + Vector(direction) * length
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
    lights.append({'name': name, 'location': list(light.location), 'power_w': data.energy, 'size_m': data.size, 'color': list(data.color)})
camera_data = bpy.data.cameras.new('ZEP standard camera')
camera = bpy.data.objects.new('ZEP standard camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = 70
camera_data.sensor_width = 36
camera_data.clip_start = .01
camera_data.clip_end = length * 20
camera_data.ortho_scale = length * 1.48
output.mkdir(parents=True, exist_ok=True)
manifest = {
    'schemaVersion': 1, 'model': args.model, 'series': series, 'number': args.number,
    'source': {'filename': source.name, 'sha256': source_hash, 'scene': original.name},
    'blender': bpy.app.version_string, 'rendererSha256': sha(Path(__file__)),
    'coordinates': {'forward': '-Y', 'starboard': '+X', 'up': '+Z', 'units': 'm', 'scale': 1},
    'bounds': {'min': list(low), 'max': list(high), 'width': size.x, 'length': size.y, 'height': size.z},
    'render': {'engine': 'CYCLES', 'device': args.device, 'samples': 64, 'seed': 227, 'denoise': True,
               'width': 2560, 'height': 1920, 'maxBounces': 12, 'transmissionBounces': 10,
               'viewTransform': 'AgX', 'look': scene.view_settings.look, 'exposure': 0, 'gamma': 1,
               'worldColor': [0.002, 0.002, 0.002], 'worldStrength': .25, 'lights': lights},
    'views': {},
}
views = {'front': (0, -1, 0), 'rear': (0, 1, 0), 'port': (-1, 0, 0),
         'starboard': (1, 0, 0), 'top': (0, 0, 1), 'bottom': (0, 0, -1),
         'three-quarter': (1, -1.35, .95)}
for name, direction in views.items():
    camera_data.type = 'PERSP' if name == 'three-quarter' else 'ORTHO'
    camera.location = center + Vector(direction).normalized() * length * 2.5
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    path = output / f'{name}.png'
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    manifest['views'][name] = {'file': path.name, 'sha256': sha(path), 'bytes': path.stat().st_size,
        'width': 2560, 'height': 1920, 'camera': {'type': camera_data.type, 'lensMm': 70,
        'sensorWidthMm': 36, 'orthoScale': camera_data.ortho_scale, 'location': list(camera.location),
        'target': list(center), 'matrixWorld': [list(row) for row in camera.matrix_world]}}
assert sha(source) == source_hash, 'Source changed during rendering; discard this render set'
(output / 'render-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('ZEP_RENDER_COMPLETE', args.model, output)
