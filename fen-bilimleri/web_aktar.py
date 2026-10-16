"""Export the saved editable scene without rebuilding or rendering it.

blender -b fen-bilimleri/fen-kesif-koyu.blend --python fen-bilimleri/web_aktar.py
"""
import bpy, os, json, time
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.abspath(os.path.join(HERE,'..','public','fen-bilimleri'))
KEYS=['environment']+['grade_'+str(i) for i in range(3,9)]+['lab']
# Canlandırılan hayvanlar ve tıklanabilir fosiller kendi köklerinde, çevreyle birleşmeden aktarılır.
CANLILAR=['kartal_ucan','kartal_tunek','kartal_tunek_ucus','keci_buyuk','keci_kucuk']

def export_keys(scene):
    fosiller=sorted(o.name for o in scene.objects if o.parent is None and o.type=='EMPTY' and o.name.startswith('fosil_'))
    canlilar=[name for name in CANLILAR if name in scene.objects]
    return KEYS+canlilar+fosiller

def combine_meshes(name, entries):
    if len(entries)==1:return entries[0][1]
    began=time.monotonic()
    print('MERGE_BEGIN',name,len(entries),flush=True)
    meshes=[mesh for _,mesh in entries]
    nv=sum(len(m.vertices) for m in meshes);nl=sum(len(m.loops) for m in meshes);nf=sum(len(m.polygons) for m in meshes)
    co=np.empty(nv*3,dtype=np.float32);indices=np.empty(nl,dtype=np.int32)
    starts=np.empty(nf,dtype=np.int32);totals=np.empty(nf,dtype=np.int32)
    materials=np.empty(nf,dtype=np.int32);smooth=np.empty(nf,dtype=np.bool_)
    normals=np.empty(nl*3,dtype=np.float32)
    vo=lo=fo=0
    for m in meshes:
        v=len(m.vertices);l=len(m.loops);f=len(m.polygons)
        m.vertices.foreach_get('co',co[vo*3:(vo+v)*3])
        m.loops.foreach_get('vertex_index',indices[lo:lo+l]);indices[lo:lo+l]+=vo
        m.polygons.foreach_get('loop_start',starts[fo:fo+f]);starts[fo:fo+f]+=lo
        m.polygons.foreach_get('loop_total',totals[fo:fo+f])
        m.polygons.foreach_get('material_index',materials[fo:fo+f])
        m.polygons.foreach_get('use_smooth',smooth[fo:fo+f])
        m.corner_normals.foreach_get('vector',normals[lo*3:(lo+l)*3])
        vo+=v;lo+=l;fo+=f
    merged=bpy.data.meshes.new(name)
    merged.vertices.add(nv);merged.loops.add(nl);merged.polygons.add(nf)
    merged.vertices.foreach_set('co',co);merged.loops.foreach_set('vertex_index',indices)
    merged.polygons.foreach_set('loop_start',starts);merged.polygons.foreach_set('loop_total',totals)
    merged.polygons.foreach_set('material_index',materials);merged.polygons.foreach_set('use_smooth',smooth)
    for material in meshes[0].materials:merged.materials.append(material)
    merged.update(calc_edges=True)
    merged.normals_split_custom_set(normals.reshape((-1,3)))
    # Leave unlinked temporary mesh IDs to process shutdown. Deleting thousands
    # individually repeatedly scans Blender's full database and is very costly.
    print('MERGE_READY',name,round(time.monotonic()-began,2),nv,nf,flush=True)
    return merged

def export_scene(preview=False):
    scene=bpy.context.scene
    # Water junction caps sit clear of the coplanar strips, avoiding self-shadows.
    for obj in scene.objects:
        if obj.name.startswith('Nehir · birleşen kıvrım'):obj.location.z=-7.55
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    counts={};evaluated_roots={}
    keys=export_keys(scene)
    # Evaluate the source in one stable dependency graph. Linking a new object
    # between every evaluation would rebuild a graph of 14,000 parts each time.
    def ozel(obj):
        return {prop:obj[prop] for prop in obj.keys() if isinstance(obj[prop],(str,int,float))}
    for key in keys:
        original=bpy.data.objects[key]
        groups={}      # (alt kök adı ya da None, malzeme anahtarı) -> [(ad, mesh)]
        altkokler={}   # alt kök adı -> (yerel konum, extras); dönen parçalar (fen_ortak.donen_grup)
        def topla(parent,alt):
            for obj in list(parent.children):
                if obj.type=='EMPTY':
                    altkokler[obj.name]=(obj.location.copy(),ozel(obj))
                    topla(obj,obj.name)
                    continue
                if obj.type not in {'MESH','CURVE','FONT','SURFACE'}:continue
                evaluated=obj.evaluated_get(deps)
                mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=False,depsgraph=deps)
                mesh.transform(obj.matrix_local)
                groups.setdefault((alt,tuple(m.name for m in mesh.materials)),[]).append((obj.name,mesh))
        topla(original,None)
        # Kökün özel özellikleri (basamaklar, yön, fosil türü, bakış) glTF extras olarak taşınır.
        evaluated_roots[key]=(original.location.copy(),original.scale.copy(),groups,ozel(original),altkokler)
        print('EVALUATED_ROOT',key,sum(len(g) for g in groups.values()),len(altkokler),flush=True)
    # Merge geometry buffers directly; repeated object operators on the full
    # editable scene would re-evaluate thousands of unrelated source objects.
    collection=bpy.data.collections.new('WEB_EXPORT');scene.collection.children.link(collection)
    for key in keys:
        location,scale,groups,extras,altkokler=evaluated_roots[key]
        parent=bpy.data.objects.new(key+'_web',None);collection.objects.link(parent)
        parent.location=location;parent.scale=scale
        for prop,value in extras.items():parent[prop]=value
        # Dönen alt kökler (fen_ortak.donen_grup) kendi düğümü ve extras'ıyla (eksen) aktarılır.
        alt_dugumler={}
        for alt,(alt_konum,alt_extras) in altkokler.items():
            bpy.data.objects[alt].name=alt+'_source'
            dugum=bpy.data.objects.new(alt,None);collection.objects.link(dugum);dugum.parent=parent
            dugum.location=alt_konum
            for prop,value in alt_extras.items():dugum[prop]=value
            alt_dugumler[alt]=dugum
        for (alt,material_key),meshes in groups.items():
            name=(alt or key)+'__'+(material_key[0].replace('Fen · ','') if material_key else 'stone')
            mesh=combine_meshes(name,meshes)
            obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
            obj.parent=alt_dugumler[alt] if alt else parent
        bpy.data.objects[key].name=key+'_source';parent.name=key
        counts[key]=len(parent.children)
        print('EXPORT_ROOT',key,counts[key],flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:obj.select_set(True)
    os.makedirs(OUT,exist_ok=True)
    temporary=os.path.join(OUT,'fen-kesif-koyu-yeni.glb')
    bpy.ops.export_scene.gltf(filepath=temporary,export_format='GLB',use_selection=True,export_apply=False,
        export_materials='EXPORT',export_cameras=False,export_lights=False,export_extras=True,
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    destination=os.path.join(OUT,'fen-kesif-koyu.glb')
    os.replace(temporary,destination)
    with open(os.path.join(HERE,'uretim-raporu.json'),'w',encoding='utf8') as file:
        json.dump({'buildings':7,'gradePavilions':6,'terrain':'ormanlik-kanyon',
                   'glbBytes':os.path.getsize(destination),'drawMeshes':counts,'preview':preview},file,indent=2)
    print('WEB_EXPORTED',os.path.getsize(destination),counts,flush=True)

if __name__=='__main__':export_scene()
