"""Read-only Blender 5.2.2 -> vessel web LODs. Run with --disable-autoexec."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import bpy


def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--blend', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--model', required=True)
parser.add_argument('--number', required=True)
parser.add_argument('--scene', required=True)
parser.add_argument('--include-scenes', nargs='*', default=[])
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = args.blend.resolve(strict=True)
output = args.output.resolve()
assert bpy.app.version == (5, 2, 2), 'Requires Blender 5.2.2'
assert not output.is_relative_to(Path(__file__).resolve().parents[1]), 'Keep models outside Git'
assert not output.exists() or not any(output.iterdir()), 'Use an empty output directory'
source_hash = sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
assert not bpy.data.libraries, 'Standalone source required'
assert re.fullmatch(r'[A-Z]{2}-\d{2}[A-Z]', args.model), 'Invalid model'
assert re.fullmatch(r'[1-9]\d{3}', args.number), 'Invalid hull'
slug = args.model.lower()
scene = bpy.data.scenes[args.scene]
bpy.context.window.scene = scene
source_scenes = [scene] + [bpy.data.scenes[name] for name in args.include_scenes]
assert scene.unit_settings.system == 'METRIC' and scene.unit_settings.scale_length == 1
objects = list(dict.fromkeys(o for source_scene in source_scenes for o in source_scene.objects if o.type in {'MESH', 'FONT', 'CURVE', 'SURFACE'}
           and not o.hide_render and any(re.match(r'^(0[1-9]|[1-7]\d)\b', c.name) for c in o.users_collection)))
assert any(o.type == 'FONT' and args.model in o.data.body for o in objects), 'Wrong vessel'
assert any(o.type == 'FONT' and args.number == o.data.body.strip() for o in objects), 'Wrong hull'
for image in bpy.data.images:
    assert image.source != 'FILE' or image.packed_file, f'Unpacked image: {image.name}'
for font in bpy.data.fonts:
    assert font.filepath == '<builtin>' or font.packed_file, f'Unpacked font: {font.name}'
# Only the in-memory copy changes. No bpy.ops.wm.save_* call anywhere in this exporter.
for obj in objects:
    for mod in obj.modifiers:
        mod.show_viewport = mod.show_render
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
export_scene = bpy.data.scenes.new(args.model + ' web export')
groups = []
bounds = []
converted = []
for obj in objects:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    if not mesh.vertices:
        bpy.data.meshes.remove(mesh)
        continue
    # Preserve source object-space coordinates before joining: its procedural paint uses Object.
    coords = mesh.attributes.new('source_position', 'FLOAT_VECTOR', 'POINT')
    coords.data.foreach_set('vector', [v for vertex in mesh.vertices for v in vertex.co])
    membership = tuple(s.name for s in source_scenes if obj.name in s.objects)
    if membership not in groups:
        groups.append(membership)
    visibility = mesh.attributes.new('source_scene_group', 'INT', 'FACE')
    visibility.data.foreach_set('value', [groups.index(membership)] * len(mesh.polygons))
    if scene.name in membership:
        bounds.extend(obj.matrix_world @ vertex.co for vertex in mesh.vertices)
    copy = bpy.data.objects.new(obj.name, mesh)
    copy.matrix_world = obj.matrix_world.copy()
    export_scene.collection.objects.link(copy)
    converted.append(copy)
bpy.context.window.scene = export_scene
for obj in converted:
    obj.select_set(True)
bpy.context.view_layer.objects.active = converted[0]
bpy.ops.object.join()
model = bpy.context.object
model.name = args.model + ' / source geometry'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# A shared UV atlas preserves procedural detail between vertices, including source micro-bump.
while model.data.uv_layers:
    model.data.uv_layers.remove(model.data.uv_layers[0])
model.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.1519173, island_margin=.00005, margin_method='FRACTION')
bpy.ops.object.mode_set(mode='OBJECT')
output.mkdir(parents=True)
print('UNWRAPPED', flush=True)
print('EVALUATED', len(objects), len(model.data.vertices), len(model.data.polygons), flush=True)
# Bake the actual Base Color graphs and tangent-space bump, without view-dependent lighting.
materials = list({m for m in model.data.materials if m})
outputs = []
for material in materials:
    tree = material.node_tree
    principled = next((n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if principled is None:
        # The source's view-dependent transparent plume is approximated by translucent emission.
        tree.nodes.clear()
        principled = tree.nodes.new('ShaderNodeBsdfPrincipled')
        principled.inputs['Base Color'].default_value = (0.06, 0.35, 0.8, 1)
        principled.inputs['Emission Color'].default_value = (0.06, 0.35, 0.8, 1)
        principled.inputs['Emission Strength'].default_value = 1.5
        principled.inputs['Alpha'].default_value = .12
        material.surface_render_method = 'BLENDED'
        out = tree.nodes.new('ShaderNodeOutputMaterial')
        tree.links.new(principled.outputs['BSDF'], out.inputs['Surface'])
    attr = tree.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'source_position'
    for link in list(tree.links):
        if link.from_node.type == 'TEX_COORD' and link.from_socket.name == 'Object':
            tree.links.new(attr.outputs['Vector'], link.to_socket)
    out = next(n for n in tree.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
    emission = tree.nodes.new('ShaderNodeEmission')
    color = principled.inputs['Base Color']
    if color.is_linked:
        tree.links.new(color.links[0].from_socket, emission.inputs['Color'])
    else:
        emission.inputs['Color'].default_value = color.default_value
    tree.links.new(emission.outputs[0], out.inputs['Surface'])
    outputs.append((material, principled, out, emission))
export_scene.render.engine = 'CYCLES'
export_scene.cycles.samples = 1
export_scene.render.threads_mode = 'FIXED'
export_scene.render.threads = 10
export_scene.render.bake.target = 'IMAGE_TEXTURES'
export_scene.render.bake.margin = 16

def bake_texture(name, size, kind, data=False):
    image = bpy.data.images.new(name, width=size, height=size, alpha=False, is_data=data)
    if data:
        image.colorspace_settings.name = 'Non-Color'
        image.generated_color = (.5, .5, 1, 1)
    targets = []
    for material in materials:
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        material.node_tree.nodes.active = node
        targets.append(node)
    bpy.ops.object.bake(type=kind)
    image.file_format = 'PNG' if data else 'JPEG'
    image.filepath_raw = str(output / (name + ('.png' if data else '.jpg')))
    image.save()
    for material, node in zip(materials, targets):
        material.node_tree.nodes.remove(node)
    print('BAKED', name, flush=True)
    return image

color_map = bake_texture(slug + '-color', 4096, 'EMIT')
for material, principled, out, emission in outputs:
    tree = material.node_tree
    tree.links.new(principled.outputs[0], out.inputs['Surface'])
    tree.nodes.remove(emission)
normal_map = bake_texture(slug + '-normal', 2048, 'NORMAL', data=True)
for material, principled, out, _ in outputs:
    tree = material.node_tree
    color_node = tree.nodes.new('ShaderNodeTexImage')
    color_node.image = color_map
    tree.links.new(color_node.outputs['Color'], principled.inputs['Base Color'])
    if not principled.inputs['Normal'].is_linked:
        continue
    normal_node = tree.nodes.new('ShaderNodeTexImage')
    normal_node.image = normal_map
    normal = tree.nodes.new('ShaderNodeNormalMap')
    tree.links.new(normal_node.outputs['Color'], normal.inputs['Color'])
    tree.links.new(normal.outputs['Normal'], principled.inputs['Normal'])
model.data.attributes.remove(model.data.attributes['source_position'])
low = [min(p[i] for p in bounds) for i in range(3)]
high = [max(p[i] for p in bounds) for i in range(3)]
manifest = {
    'schemaVersion': 1, 'model': args.model, 'number': args.number,
    'source': {'filename': source.name, 'sha256': source_hash, 'scene': scene.name, 'scenes': [s.name for s in source_scenes]},
    'bounds': {'min': low, 'max': high, 'center': [(a+b)/2 for a,b in zip(low, high)],
               'size': [b-a for a,b in zip(low, high)]},
    'blender': bpy.app.version_string, 'exporterSha256': sha(Path(__file__)),
    'sourceObjects': len(objects), 'coordinates': 'glTF +Y up; source (x,y,z) -> (x,z,-y), metres',
    'materials': len(materials), 'colorBake': 'Cycles EMIT 4096px colour atlas from source Base Color; 2048px tangent normal atlas with procedural bump',
    'limitations': ['Procedural materials use finite-resolution baked textures; real-time lighting differs from Cycles.',
                    'View-dependent exhaust is approximated by translucent emission.'],
    'assets': {},
}
# Split only where source scene visibility differs, retaining shared baked atlases.
for group_index in range(len(groups) - 1):
    bpy.ops.object.select_all(action='DESELECT')
    model.select_set(True)
    bpy.context.view_layer.objects.active = model
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)
    for vertex in model.data.vertices:
        vertex.select = False
    for edge in model.data.edges:
        edge.select = False
    attribute = model.data.attributes['source_scene_group']
    for polygon, value in zip(model.data.polygons, attribute.data):
        polygon.select = value.value == group_index
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
parts = list(export_scene.objects)
for part in parts:
    group_index = part.data.attributes['source_scene_group'].data[0].value
    part.name = args.model + ' / ' + str(group_index)
    part['sourceScenes'] = list(groups[group_index])
    part.data.attributes.remove(part.data.attributes['source_scene_group'])
for lod in ['detail', 'overview']:
    if lod == 'overview':
        for original_image in (color_map, normal_map):
            small = original_image.copy()
            small.name = original_image.name + '-overview'
            small.scale(1024, 1024)
            for material in materials:
                for node in material.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image == original_image:
                        node.image = small
        # Lossless material batching in both levels; overview additionally reduces bevel tessellation.
        for part in parts:
            modifier = part.modifiers.new('Overview simplification', 'DECIMATE')
            modifier.ratio = .32
            modifier.use_collapse_triangulate = True
    bpy.ops.object.select_all(action='DESELECT')
    stats = {'vertices': 0, 'triangles': 0}
    for part in parts:
        if lod == 'overview' and scene.name not in part['sourceScenes']:
            continue
        part.select_set(True)
        evaluated = part.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        stats['vertices'] += len(mesh.vertices)
        stats['triangles'] += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    file = output / f'{slug}-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(file), export_format='GLB', use_selection=True, use_active_scene=True,
        export_apply=True, export_extras=True, export_animations=False, export_cameras=False, export_lights=False,
        export_yup=True, export_texcoords=True, export_vertex_color='NONE',
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=16, export_draco_normal_quantization=12,
        export_draco_color_quantization=10, export_draco_texcoord_quantization=16)
    manifest['assets'][lod] = {'file': file.name, 'sha256': sha(file), 'bytes': file.stat().st_size, **stats}
    print('EXPORTED', lod, manifest['assets'][lod], flush=True)
assert sha(source) == source_hash, 'Source changed during export; discard results'
(output / 'model-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('MODEL_EXPORT_COMPLETE', output, flush=True)
