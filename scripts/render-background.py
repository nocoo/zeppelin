"""Render the authored asteroid environment without its embedded vessel; never save the source."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--blend', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = args.blend.resolve(strict=True)
output = args.output.resolve()
assert not output.is_relative_to(Path(__file__).resolve().parents[1])
assert not output.exists() or not any(output.iterdir()), 'Use an empty external directory'
def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
source_hash = sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
scene = bpy.context.scene
assert scene.name == '小行星带 · 2227号航行'
hidden = []
for collection in bpy.data.collections:
    if re.match(r'^(0[1-9]|1[0-6])\b', collection.name):
        collection.hide_render = True
        hidden.append(collection.name)
assert len(hidden) == 16, 'Expected vessel collections 01–16'
scene.camera = scene.objects['Camera · 02 碎石带穿行']
scene.render.resolution_x, scene.render.resolution_y = 2800, 1750
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.film_transparent = False
scene.cycles.samples = 96
scene.cycles.seed = 227
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'
prefs.get_devices()
devices = [d for d in prefs.devices if d.type == 'METAL']
assert devices, 'Metal device required'
for device in prefs.devices:
    device.use = device in devices
scene.cycles.device = 'GPU'
output.mkdir(parents=True, exist_ok=True)
image = output / 'asteroid-belt.png'
scene.render.filepath = str(image)
bpy.ops.render.render(write_still=True)
assert sha(source) == source_hash, 'Source changed during render'
receipt = {
    'name': '小行星带', 'id': 'asteroid-belt',
    'source': {'filename': source.name, 'sha256': source_hash, 'scene': scene.name},
    'rendererSha256': sha(Path(__file__)), 'blender': bpy.app.version_string,
    'excludedCollections': hidden,
    'render': {'engine': 'CYCLES', 'samples': 96, 'seed': 227, 'device': 'metal',
               'width': 2800, 'height': 1750, 'camera': scene.camera.name,
               'matrixWorld': [list(row) for row in scene.camera.matrix_world]},
    'image': {'file': image.name, 'sha256': sha(image), 'bytes': image.stat().st_size},
}
(output / 'render-manifest.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print('ZEP_BACKGROUND_COMPLETE', output)
