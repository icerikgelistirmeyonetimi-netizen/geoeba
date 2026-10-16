"""Dış dağ kütlesinin jeolojik katmanlarına gömülü stilize fosiller.

Dinozor iskeleti turuncu kumtaşı katmanında (KATMANLAR[8]); amonit, balık, trilobit ve
plesiosaur iskeletleri gri-mavi deniz şeyli katmanındadır (KATMANLAR[6]). Her fosil, duvar
yüzeyine paralel koyu bir "levha" üstünde açık renkli hafif kabartma olarak durur; böylece
uzaktan da okunur. Levha kalın bir sırtla duvara gömülüdür; dış yüzü duvarın yerel
dalgalanmasının en dış noktasına göre ayarlanır, kemikler hiçbir yerde kayaya gömülmez.
Koordinatlar duvar düzlemindedir: sağ (r), yukarı (u), dışa (n). Şelale görünümlerinde
(sağ alttaki dalga düğmesi) güney ve doğu duvarları kameraya döner; fosiller oradadır.
"""
import math, json
from math import sin, cos, pi
from mathutils import Vector, Matrix
import fen_ortak as A
import dag_arazisi as DAG

_M={}

def _palette():
    if _M:return _M
    for key,color,rough in [
        ('kemik',(.87,.81,.66),.85),('kemik_koyu',(.60,.52,.40),.88),('oyuk',(.09,.08,.07),.9),
        ('kabuk',(.78,.68,.50),.72),('kabuk_cizgi',(.40,.31,.22),.8),
        ('levha_sicak',(.26,.185,.12),.92),('levha_soguk',(.21,.19,.165),.92),
    ]:_M[key]=A.material('Fosil · '+key,color,rough)
    return _M


def _ornekle(noktalar,adim):
    """Bir kırık çizgiyi yaklaşık eşit aralıklarla yeniden örnekler."""
    sonuc=[Vector(noktalar[0])]
    kalan=adim
    for a,b in zip(noktalar,noktalar[1:]):
        a=Vector(a);b=Vector(b);uzunluk=(b-a).length
        if uzunluk<1e-6:continue
        t=kalan
        while t<=uzunluk:
            sonuc.append(a.lerp(b,t/uzunluk))
            t+=adim
        kalan=t-uzunluk
    return [(p.x,p.y) for p in sonuc]


class Levha:
    """Duvar üzerinde bir fosil tuvali: sağ (r), yukarı (u) ve dışa (n) eksenli yerel çerçeve."""

    def __init__(self,ad,kenar,konum,derinlik,genislik,yukseklik,levha='levha_sicak',olcek=1.0,egim=0.0):
        pos,sag,yukari,disa=DAG.duvar_yuzeyi(kenar,konum,derinlik)
        c,s=cos(egim),sin(egim)
        self.r=(sag*c+yukari*s).normalized()
        self.u=(yukari*c-sag*s).normalized()
        self.n=disa
        self.olcek=olcek
        self.mat=_palette()
        gen=genislik*olcek;yuk=yukseklik*olcek
        # Duvarın levha alanı içindeki en dış noktası: levha yüzü onun biraz önünde durur.
        en_dis=0.0
        for i in range(5):
            for j in range(3):
                dk=(i/4-.5)*gen*(1 if kenar in ('guney','kuzey') else 1)
                dd=(j/2-.5)*yuk
                try:
                    p,_,_,_=DAG.duvar_yuzeyi(kenar,konum+dk*(1 if kenar in ('guney','dogu') else -1),derinlik+dd)
                    en_dis=max(en_dis,(p-pos).dot(disa))
                except (IndexError,ZeroDivisionError):
                    pass
        self.taban=en_dis+.04
        self.o=pos
        self.rot=Matrix((self.r,self.u,self.n)).transposed().to_euler()
        # Kalın sırtlı levha: dış yüzü self.taban'da, gerisi kayanın içinde.
        disk=A.cyl(ad+' · fosil levhası',self.p(0,0,-.6),1,1.2,self.mat[levha],36)
        disk.rotation_euler=self.rot
        disk.scale=(gen/2,yuk/2,1)

    def p(self,rx,ry,out=.10):
        return self.o+self.r*(rx*self.olcek)+self.u*(ry*self.olcek)+self.n*(self.taban+out)

    def kemik(self,ad,a,b,r=.09,mat='kemik',out=.10):
        return A.bar(ad,self.p(a[0],a[1],out),self.p(b[0],b[1],out),r*self.olcek,self.mat[mat])

    def eklem(self,ad,c,r=.12,mat='kemik',out=.11):
        o=A.sphere(ad,self.p(c[0],c[1],out),(r*self.olcek,r*self.olcek,r*self.olcek*.55),self.mat[mat])
        o.rotation_euler=self.rot
        return o

    def plaka(self,ad,c,sx,sy,kalinlik,mat='kemik',out=.09,egim=0.0):
        o=A.sphere(ad,self.p(c[0],c[1],out),(sx*self.olcek,sy*self.olcek,kalinlik*self.olcek),self.mat[mat])
        donus=Matrix((self.r,self.u,self.n)).transposed()@Matrix.Rotation(egim,3,'Z')
        o.rotation_euler=donus.to_euler()
        return o

    def egri(self,ad,noktalar,r=.08,mat='kemik',out=.10):
        return A.tube(ad,[self.p(x,y,out) for x,y in noktalar],r*self.olcek,self.mat[mat])

    def sarmal(self,ad,noktalar,yaricaplar,mat='kabuk',sides=10):
        """Değişken yarıçaplı boru: kesitleri duvara yarı gömülü (kabartma) sarmal kabuk."""
        merkezler=[self.p(x,y,r*self.olcek*.35+.02) for (x,y),r in zip(noktalar,yaricaplar)]
        verts=[]
        for i,(m,r) in enumerate(zip(merkezler,yaricaplar)):
            t=(merkezler[min(i+1,len(merkezler)-1)]-merkezler[max(0,i-1)]).normalized()
            yan=t.cross(self.n).normalized()
            for j in range(sides):
                a=2*pi*j/sides
                verts.append(m+(cos(a)*self.n+sin(a)*yan)*r*self.olcek)
        faces=[tuple(reversed(range(sides)))]
        for i in range(len(merkezler)-1):
            for j in range(sides):
                k=(j+1)%sides
                faces.append((i*sides+j,i*sides+k,(i+1)*sides+k,(i+1)*sides+j))
        faces.append(tuple((len(merkezler)-1)*sides+j for j in range(sides)))
        o=A.mesh(ad,verts,faces,self.mat[mat])
        for polygon in o.data.polygons:polygon.use_smooth=True
        return o


def dinozor(lv):
    """Uzun boyunlu, dört ayaklı bir otçul dinozorun yan görünüş iskeleti."""
    K='kemik'
    omurga=[(-5.3,1.05),(-4.4,.66),(-3.3,.34),(-2.0,.10),(-.7,0),(.7,.02),(1.9,.16),(2.8,.42)]
    boyun=[(2.8,.42),(3.45,1.05),(3.95,1.85),(4.35,2.6),(4.7,3.2)]
    lv.egri('Dinozor · omurga',omurga,.095)
    lv.egri('Dinozor · boyun omurları',boyun,.085)
    for x,y in _ornekle(omurga,.36):
        r=.16 if x>-2 else .16-.09*min(1,(-2-x)/3.4)
        lv.eklem('Dinozor · omur',(x,y),r)
    for x,y in _ornekle(boyun,.38)[1:]:
        lv.eklem('Dinozor · boyun omuru',(x,y),.13)
    lv.plaka('Dinozor · kafatası',(5.1,3.42),.58,.31,.15,K,egim=-.28)
    lv.kemik('Dinozor · alt çene',(4.75,3.12),(5.62,3.02),.055)
    lv.eklem('Dinozor · göz oyuğu',(5.18,3.5),.10,'oyuk',out=.22)
    lv.eklem('Dinozor · burun deliği',(5.55,3.38),.05,'oyuk',out=.22)
    for i in range(8):
        x=-.95+i*.44
        lv.egri('Dinozor · kaburga',[(x,.05),(x+.2,-.62),(x+.14,-1.4),(x-.12,-2.0)],.062)
    lv.plaka('Dinozor · kalça kemiği',(-1.25,-.08),.6,.44,.13,K)
    lv.plaka('Dinozor · kürek kemiği',(2.45,-.1),.4,.38,.12,K)
    # Yakın taraftaki bacaklar tam kabartma, uzak taraftakiler duvara daha gömülü.
    for x0,dx,out,r in [(-1.05,0,.12,.10),(2.35,0,.12,.10),(-1.4,-.3,.05,.08),(2.05,-.3,.05,.08)]:
        diz=(x0+.16+dx*.3,-1.55);bilek=(x0+dx*.3-.05,-2.85)
        lv.kemik('Dinozor · uyluk',(x0,-.25),diz,r,out=out)
        lv.kemik('Dinozor · kaval',diz,bilek,r*.9,out=out)
        lv.eklem('Dinozor · diz',diz,r*1.35,out=out)
        for tx,ty in [(.62,-.02),(.52,-.16),(.34,-.26)]:
            lv.kemik('Dinozor · ayak parmağı',bilek,(bilek[0]+tx,bilek[1]+ty),r*.7,out=out)


def plesiosaur(lv):
    """Uzun boyunlu, dört yüzgeçli bir deniz sürüngeninin iskeleti."""
    K='kemik'
    omurga=[(-4.1,-.55),(-3.6,-.25),(-2.9,-.05),(-2.1,.05),(-1.2,.12),(0,.15),(1.0,.14),(1.6,.2)]
    boyun=[(1.6,.2),(2.3,.62),(2.95,1.15),(3.5,1.6),(3.95,1.95)]
    lv.egri('Plesiosaur · omurga',omurga,.075)
    lv.egri('Plesiosaur · boyun omurları',boyun,.065)
    for x,y in _ornekle(omurga,.3):
        lv.eklem('Plesiosaur · omur',(x,y),.12 if x>-2.9 else .07)
    for x,y in _ornekle(boyun,.3)[1:]:
        lv.eklem('Plesiosaur · boyun omuru',(x,y),.09)
    lv.plaka('Plesiosaur · kafatası',(4.3,2.05),.42,.22,.12,K,egim=-.3)
    lv.kemik('Plesiosaur · çene',(4.0,1.86),(4.68,1.8),.04)
    lv.eklem('Plesiosaur · göz oyuğu',(4.35,2.12),.07,'oyuk',out=.2)
    for i in range(7):
        x=-1.25+i*.4
        lv.egri('Plesiosaur · kaburga',[(x,.1),(x+.1,-.5),(x,-1.05),(x-.15,-1.4)],.05)
    lv.plaka('Plesiosaur · kalça kemiği',(-1.35,-.15),.4,.3,.1,K)
    lv.plaka('Plesiosaur · omuz kemiği',(1.3,-.1),.36,.3,.1,K)
    for bx,yon in [(1.35,1),(-1.35,-1)]:
        for out,r,dx in [(.12,.07,0),(.05,.055,-.28*yon)]:
            dirsek=(bx+yon*.5+dx,-1.15)
            lv.kemik('Plesiosaur · yüzgeç kemiği',(bx+dx,-.35),dirsek,r,out=out)
            for k in range(4):
                uc=(dirsek[0]+yon*(.35+k*.28),dirsek[1]-.75+k*.12)
                lv.kemik('Plesiosaur · yüzgeç parmağı',dirsek,uc,r*.55,out=out)


def amonit(lv,R=1.4):
    """Logaritmik sarmal kabuk ve dış turdaki oda çizgileri."""
    b=.17;tmax=3.7*pi
    noktalar=[];yaricaplar=[]
    for i in range(46):
        t=tmax*i/45
        r=R*math.exp(-b*(tmax-t))
        noktalar.append((r*cos(t),r*sin(t)))
        yaricaplar.append(.31*r+.025)
    lv.sarmal('Amonit · sarmal kabuk',noktalar,yaricaplar,'kabuk')
    for i in range(18):
        t=tmax-i*.24-.15
        r=R*math.exp(-b*(tmax-t));tr=.31*r+.025
        ic=((r-tr*.9)*cos(t),(r-tr*.9)*sin(t));dis=((r+tr*.9)*cos(t),(r+tr*.9)*sin(t))
        lv.kemik('Amonit · oda çizgisi',ic,dis,.028,'kabuk_cizgi',out=tr*.35+.02+tr*.92)
    lv.eklem('Amonit · göbek',(0,0),.09,'kabuk_cizgi',out=.10)


def balik(lv):
    """Kemikli balık: kafatası, omurga, kaburgalar, sırt dikenleri ve kuyruk ışınları."""
    K='kemik'
    lv.plaka('Balık · kafatası',(.95,.02),.46,.33,.12,K,egim=.05)
    lv.eklem('Balık · göz oyuğu',(1.1,.09),.075,'oyuk',out=.2)
    lv.kemik('Balık · çene',(.72,-.18),(1.3,-.1),.035)
    lv.kemik('Balık · omurga',(-1.05,0),(.62,0),.05)
    for i in range(8):
        x=-.9+i*.22
        lv.eklem('Balık · omur',(x,0),.06)
        lv.kemik('Balık · kaburga',(x+.02,-.03),(x-.13,-.42+.03*abs(i-4)),.026)
        lv.kemik('Balık · sırt dikeni',(x,.03),(x-.1,.36-.03*abs(i-4)),.022)
    for yy in [-.55,-.28,0,.28,.55]:
        lv.kemik('Balık · kuyruk ışını',(-1.05,0),(-1.55,yy),.024)
    for dx,dy in [(-.42,-.25),(-.35,-.42),(-.22,-.5)]:
        lv.kemik('Balık · göğüs yüzgeci',(.55,-.12),(.55+dx,-.12+dy),.022)


def trilobit(lv):
    """Baş kalkanı, sekiz gövde halkası, eksen lobu ve kuyruk kalkanıyla trilobit."""
    K='kemik_koyu'
    lv.plaka('Trilobit · baş kalkanı',(0,.42),.46,.30,.10,K)
    lv.plaka('Trilobit · glabella',(0,.42),.13,.22,.14,K,out=.14)
    for s in (-1,1):lv.eklem('Trilobit · göz',(s*.24,.46),.05,'oyuk',out=.2)
    for i in range(8):
        y=.15-i*.085;w=.42-i*.03
        lv.kemik('Trilobit · gövde halkası',(-w,y),(w,y),.028,K)
    lv.kemik('Trilobit · eksen lobu',(0,.2),(0,-.5),.05,K,out=.14)
    lv.plaka('Trilobit · kuyruk kalkanı',(0,-.6),.26,.16,.09,K)
    for s in (-1,1):lv.egri('Trilobit · anten',[(s*.12,.62),(s*.3,.85),(s*.42,1.05)],.014,K)


def _fosil(kok_adi,tur,yapici,levha_args,**levha_kw):
    """Fosili kendi kökünde kurar; tür ve duvarın dışa bakış yönü (Three koordinatı) extras olur."""
    kok=A.group(kok_adi)
    lv=Levha(*levha_args,**levha_kw)
    yapici(lv)
    kok['tur']=tur
    kok['bakis']=json.dumps([round(lv.n.x,4),round(lv.n.z,4),round(-lv.n.y,4)])
    return kok


def generate():
    """Fosilleri katman merkezlerine, her birini kendi kökünde yerleştirir; DAG.generate() sonrasında çağrılır."""
    d6=DAG.katman_merkez_derinligi(6)
    d8=DAG.katman_merkez_derinligi(8)
    # Güney duvarı, güney şelalesinin doğusu: dinozor turuncu kumtaşında.
    _fosil('fosil_dinozor','dinozor',dinozor,('Dinozor','guney',-8,d8+.3,11.6,6.9,'levha_sicak'),olcek=.86)
    # Güney duvarı, şelalenin batısı: deniz canlıları gri-mavi şeylde.
    _fosil('fosil_amonit_1','amonit',lambda lv:amonit(lv,R=1.35),('Amonit','guney',-36,d6,3.7,3.7,'levha_soguk'))
    _fosil('fosil_balik_1','balik',balik,('Balık','guney',-40.8,d6-1.2,3.4,1.7,'levha_soguk'),egim=.12)
    _fosil('fosil_trilobit_1','trilobit',trilobit,('Trilobit','guney',-32.6,d6+1.3,1.5,2.5,'levha_soguk'),egim=-.2)
    # Doğu duvarı: doğu şelalesinin kuzeyinde plesiosaur, güneyinde balık ve amonit.
    _fosil('fosil_plesiosaur','plesiosaur',plesiosaur,('Plesiosaur','dogu',-14,d6,8.6,4.6,'levha_soguk'))
    _fosil('fosil_balik_2','balik',balik,('Balık 2','dogu',-31,d6-1.0,3.4,1.7,'levha_soguk'),egim=-.1,olcek=.9)
    _fosil('fosil_amonit_2','amonit',lambda lv:amonit(lv,R=1.15),('Amonit 2','dogu',-36.5,d6+.6,3.2,3.2,'levha_soguk'))
    # Güney duvarının doğu ucu, doğu şelalesi görünümünde: amonit ve trilobit.
    _fosil('fosil_amonit_3','amonit',lambda lv:amonit(lv,R=1.25),('Amonit 3','guney',42,d6,3.4,3.4,'levha_soguk'))
    _fosil('fosil_trilobit_2','trilobit',trilobit,('Trilobit 2','guney',38,d6-1.3,1.5,2.5,'levha_soguk'),egim=.15,olcek=.9)
