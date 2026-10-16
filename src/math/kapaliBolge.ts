import type { MathObject, Point2D, PointObject } from '@/types/math';

const ayni = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-7;
const icinde = (p: Point2D, ring: Point2D[]) => {
  let sonuc = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[j], b=ring[i];
    const cross=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x);
    if (Math.abs(cross)<1e-7 && p.x>=Math.min(a.x,b.x)-1e-7 && p.x<=Math.max(a.x,b.x)+1e-7 && p.y>=Math.min(a.y,b.y)-1e-7 && p.y<=Math.max(a.y,b.y)+1e-7) return true;
    if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) sonuc=!sonuc;
  }
  return sonuc;
};

/** Doğru parçalarının oluşturduğu kapalı yüzlerden tıklanan en küçük yüzü bulur.
 * Aynı konumda farklı kimlikli uçlar birleşir; açık zincirler alan olarak kabul edilmez.
 */
export function parcalardanKapaliBolge(objects: readonly MathObject[], tiklama: Point2D): string[] | null {
  const nodes: PointObject[]=[];
  const canonical=new Map<string,number>();
  for (const o of objects) if (o.type==='point' && o.visible!==false) {
    let index=nodes.findIndex((p)=>ayni(p,o));
    if(index<0){index=nodes.length;nodes.push(o);}
    canonical.set(o.id,index);
  }
  const edges=new Map<number,Set<number>>();
  const bagla=(a:number,b:number)=>{if(!edges.has(a))edges.set(a,new Set());edges.get(a)!.add(b);};
  for(const s of objects) if(s.type==='segment' && s.visible!==false && !s.olcumSekli){
    const a=canonical.get(s.startPointId),b=canonical.get(s.endPointId);
    if(a===undefined||b===undefined||a===b)continue;
    bagla(a,b);bagla(b,a);
  }
  const neighbors=new Map([...edges].map(([i,es])=>[i,[...es].sort((a,b)=>Math.atan2(nodes[a].y-nodes[i].y,nodes[a].x-nodes[i].x)-Math.atan2(nodes[b].y-nodes[i].y,nodes[b].x-nodes[i].x))]));
  const visited=new Set<string>();
  let chosen:number[]|null=null, best=Infinity;
  const limit=[...edges.values()].reduce((n,es)=>n+es.size,0)+1;
  for(const [start,ns] of neighbors) for(const next of ns){
    if(visited.has(`${start}:${next}`))continue;
    let a=start,b=next; const ring:number[]=[];
    for(let count=0;count<limit;count++){
      const key=`${a}:${b}`;
      if(visited.has(key))break;
      visited.add(key);ring.push(a);
      const ns2=neighbors.get(b)!;
      const c=ns2[(ns2.indexOf(a)-1+ns2.length)%ns2.length];
      a=b;b=c;
      if(a===start&&b===next)break;
    }
    if(a!==start||b!==next||ring.length<3||new Set(ring).size!==ring.length)continue;
    const pts=ring.map(i=>nodes[i]);
    const area=pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p.x*q.y-p.y*q.x;},0)/2;
    if(area>1e-8&&area<best&&icinde(tiklama,pts)){chosen=ring;best=area;}
  }
  return chosen?.map(i=>nodes[i].id)??null;
}
