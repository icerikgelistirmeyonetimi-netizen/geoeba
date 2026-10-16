import { describe, it, expect } from 'vitest';
import type { MathObject, PointObject, PolygonObject } from '@/types/math';
import { parcalardanKapaliBolge } from '../kapaliBolge';
import { insaGeometrisi } from '../insaGosterimi';
import { calculateDistance, calculatePolygonArea, calculatePolygonPerimeter } from '../geometry';
import { regularPolygonVertices } from '../regularPolygon';
import { esitlikIsaretleri } from '../esitlikIsaretleri';
import { alan, olcuMetni, VARSAYILAN_YAZIM } from '../matematikYazimi';
import { parseProjectFile } from '../projectFile';
import { cizimOlculeri } from '@/components/workspace/cisimYerlesimi';
const pt=(id:string,x:number,y:number):PointObject=>({id,type:'point',label:id,showLabel:true,x,y,color:'#000',visible:true,isIndependent:true,createdAt:0});
const seg=(a:string,b:string):MathObject=>({id:a+b,type:'segment',label:a+b,showLabel:false,startPointId:a,endPointId:b,color:'#000',visible:true,createdAt:0});
const kare=():MathObject[]=>[pt('A',0,0),pt('B',4,0),pt('C',4,3),pt('D',0,3),seg('A','B'),seg('B','C'),seg('C','D'),seg('D','A')];
describe('TEGM: doğru parçalarıyla kapalı bölge',()=>{
  it('iç bölgeyi alanı 12, çevresi 14 olan dinamik çokgen olarak tanır',()=>{
    const objects=kare();const ids=parcalardanKapaliBolge(objects,{x:2,y:1})!;
    const pts=ids.map(id=>objects.find(o=>o.id===id) as PointObject);
    expect(new Set(ids)).toEqual(new Set(['A','B','C','D']));
    expect(calculatePolygonArea(pts)).toBe(12);expect(calculatePolygonPerimeter(pts)).toBe(14);
  });
  it('açık zincir ve bölgenin dışı alan sayılmaz',()=>{
    expect(parcalardanKapaliBolge(kare().slice(0,-1),{x:2,y:1})).toBeNull();
    expect(parcalardanKapaliBolge(kare(),{x:8,y:1})).toBeNull();
  });
  it('aynı konumdaki ayrı uç kimlikleri birleşir; dışarı uzanan dal kapalı yüzü bozmaz',()=>{
    const objects=kare();objects[7]=seg('D','E');objects.push(pt('E',0,0),pt('F',7,0),seg('B','F'));
    expect(parcalardanKapaliBolge(objects,{x:2,y:1})).toHaveLength(4);
  });
  it('köşegenle bölünmüş şeklin tıklanan üçgenini ölçer',()=>{
    expect(parcalardanKapaliBolge([...kare(),seg('A','C')],{x:3,y:0.5})).toHaveLength(3);
  });
});
describe('TEGM: inşa ilişkileri',()=>{
  const points=[pt('A',-2,0),pt('B',2,0),pt('C',1,3)];
  const nesne=(tur:NonNullable<MathObject['insaGosterimi']>['tur']):MathObject=>({...seg('A','B'),insaGosterimi:{tur,pointIds:['A','B','C']}});
  it('orta dikmenin pergel çemberleri eş yarıçaplıdır ve kesişimleri iki uca eşit uzaklıktadır',()=>{
    const g=insaGeometrisi(nesne('perp_bisector'),points)!;
    expect(g.cemberler[0].r).toBe(g.cemberler[1].r);
    for(const p of g.noktalar) expect(calculateDistance(p,points[0])).toBeCloseTo(calculateDistance(p,points[1]),12);
    expect(g.dik!.u.x*g.dik!.v.x+g.dik!.u.y*g.dik!.v.y).toBeCloseTo(0,12);
  });
  it('dik doğru işareti gerçek izdüşüm ayağındadır',()=>{
    expect(insaGeometrisi(nesne('perpendicular'),points)!.dik!.kose).toEqual({x:1,y:0});
  });
  it('açıortayın pergel kesişimi iki eş yarıçaplı çember üzerindedir',()=>{
    const g=insaGeometrisi(nesne('angle_bisector'),points)!;
    const k=g.noktalar[2];
    for(const c of g.cemberler.slice(1)) expect(calculateDistance(k,c.merkez)).toBeCloseTo(c.r,12);
  });
  it('orta noktanın iki yarısı aynı uzunluktadır',()=>{
    const g=insaGeometrisi(nesne('midpoint'),points)!;
    expect(calculateDistance(...g.esitParcalar[0])).toBe(calculateDistance(...g.esitParcalar[1]));
  });
  it('inşa gösterimi kayıttan yüklenebilir; bilinmeyen inşa türü reddedilir',()=>{
    const objects=[...points,{...nesne('perpendicular'), id:'gosterim'}];
    expect(parseProjectFile({objects}).objects.at(-1)?.insaGosterimi).toEqual(objects.at(-1)!.insaGosterimi);
    expect(()=>parseProjectFile({objects:[...points,{...nesne('perpendicular'),insaGosterimi:{tur:'bilinmeyen',pointIds:['A','B','C']}}]})).toThrow();
  });
});
describe('TEGM: düzgün çokgen ve birim yazımı',()=>{
  it.each([3,4,5,6,7,8,10,12])('%i-genin bütün kenarları aynı eşitlik çentiğini alır',n=>{
    const pts=regularPolygonVertices(n,3).map((p,i)=>pt(`P${i}`,p.x,p.y));
    const poly:PolygonObject={id:'poly',type:'polygon',label:'çokgen',showLabel:false,pointIds:pts.map(p=>p.id),color:'#000',visible:true,createdAt:0};
    const marks=esitlikIsaretleri([...pts,poly]).isaretler;
    expect(marks).toHaveLength(n);expect(new Set(marks.map(m=>m.sayi)).size).toBe(1);
  });
  it('ortaokul alan etiketinde birimkare açık yazılır',()=>{
    expect(olcuMetni(alan([],12),{...VARSAYILAN_YAZIM,alanBirimiAcik:true})).toBe('Alan = 12 birimkare');
  });
  it.each(['cube','sphere','cylinder','prism','triangular_prism'] as const)('ilkokulda zeminde çizilen %s cisminin boyutları tam sayıdır',tur=>{
    const d=cizimOlculeri(tur,5.3,true);
    expect(Object.values(d).every(Number.isInteger)).toBe(true);
  });
});
