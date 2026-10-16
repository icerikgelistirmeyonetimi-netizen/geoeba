"""Render the saved canyon scene without rebuilding or exporting geometry."""
import bpy, os, sys

HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
from detaylari_render import _configure_gpu

scene=bpy.context.scene
_configure_gpu(scene)
scene.render.resolution_x=2400
scene.render.resolution_y=1600
scene.render.resolution_percentage=100
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8'
scene.render.filepath=os.path.join(HERE,'fen-kesif-vadisi.png')
# Renk canlılığı: web sahnesi çıktı gölgelendiricisinde doğrusal doygunluğu DOYGUNLUK kadar
# artırır (fenGorunum.ts). Poster aynı çarpanı görünüm dönüşümünden önce kompozitörde uygular.
DOYGUNLUK=1.22
scene.use_nodes=True
scene.render.use_compositing=True
tree=scene.node_tree
for node in list(tree.nodes):tree.nodes.remove(node)
katmanlar=tree.nodes.new('CompositorNodeRLayers')
doygunluk=tree.nodes.new('CompositorNodeHueSat')
doygunluk.inputs['Saturation'].default_value=DOYGUNLUK
cikti=tree.nodes.new('CompositorNodeComposite')
tree.links.new(katmanlar.outputs['Image'],doygunluk.inputs['Image'])
tree.links.new(doygunluk.outputs['Image'],cikti.inputs['Image'])
# Keep the completed render available if a destination is temporarily held open.
bpy.ops.render.render(write_still=False)
result=bpy.data.images['Render Result']
try:
    result.save_render(scene.render.filepath,scene=scene)
except RuntimeError:
    scene.render.image_settings.file_format='JPEG'
    scene.render.image_settings.quality=96
    scene.render.filepath=os.path.join(HERE,'fen-kesif-vadisi.jpg')
    result.save_render(scene.render.filepath,scene=scene)
print('POSTER_READY',scene.render.filepath,flush=True)
