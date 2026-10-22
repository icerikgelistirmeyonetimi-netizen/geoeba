// 3D Geometri, Projeksiyon ve Katı Cisim Motoru
import { Point3D, Face3D, Edge3D, Solid3DObject, Solid3DType, type UcgenTabani } from '@/types/workspace3d';

/**
 * 3D Noktayı X, Y, Z eksenlerinde derece cinsinden döndürür
 */
export function rotatePoint3D(p: Point3D, rotDeg: Point3D): Point3D {
  const radX = (rotDeg.x * Math.PI) / 180;
  const radY = (rotDeg.y * Math.PI) / 180;
  const radZ = (rotDeg.z * Math.PI) / 180;

  // X ekseni etrafında dönme
  const y1 = p.y * Math.cos(radX) - p.z * Math.sin(radX);
  const z1 = p.y * Math.sin(radX) + p.z * Math.cos(radX);
  const x1 = p.x;

  // Y ekseni etrafında dönme
  const x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  const z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  const y2 = y1;

  // Z ekseni etrafında dönme
  const x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  const y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

/**
 * Katı Cisim Mesh Üretimi (Köşeler, Ayrıtlar, Yüzler)
 */
/**
 * Üçgen prizmanın taban üçgeninin tepe noktasının yerel x'i (taban −w/2 … w/2, tepe z = h'de): ikizkenar ve eşkenar
 * üçgende 0, dik üçgende −w/2 (dik açı sol taban köşesinde; sol yan yüz dik durur).
 */
export function ucgenTepeX(solid: Pick<Solid3DObject, 'dimensions' | 'tabanUcgeni'>): number {
  return solid.tabanUcgeni === 'dik' ? -(solid.dimensions.width || 3) / 2 : 0;
}

/** Eşkenar üçgen tabanın yüksekliği: kenar · √3 / 2 */
export const eskenarYuksekligi = (kenar: number) => (kenar * Math.sqrt(3)) / 2;

/** Taban üçgeninin türü verilen ölçülerde gerçekten ne? (ikizkenar seçili olsa da h = a·√3/2 ise eşkenardır.) */
export function ucgenTabaniniBul(solid: Pick<Solid3DObject, 'dimensions' | 'tabanUcgeni'>): UcgenTabani {
  if (solid.tabanUcgeni === 'dik') return 'dik';
  const w = solid.dimensions.width || 3;
  const h = solid.dimensions.height || 3;
  return Math.abs(h - eskenarYuksekligi(w)) < 0.005 ? 'eskenar' : 'ikizkenar';
}

function eksenEtrafindaDondur(p: Point3D, merkez: Point3D, eksen: Point3D, rad: number): Point3D {
  if (Math.abs(rad) < 1e-9) return { ...p };
  const dx = p.x - merkez.x;
  const dy = p.y - merkez.y;
  const dz = p.z - merkez.z;
  const len = Math.hypot(eksen.x, eksen.y, eksen.z);
  if (len < 1e-9) return { ...p };
  const kx = eksen.x / len;
  const ky = eksen.y / len;
  const kz = eksen.z / len;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dot = kx * dx + ky * dy + kz * dz;
  const cx = ky * dz - kz * dy;
  const cy = kz * dx - kx * dz;
  const cz = kx * dy - ky * dx;
  return {
    x: merkez.x + dx * c + cx * s + kx * dot * (1 - c),
    y: merkez.y + dy * c + cy * s + ky * dot * (1 - c),
    z: merkez.z + dz * c + cz * s + kz * dot * (1 - c),
  };
}

function yuzEtiketOnceligi(label?: string): number {
  if (!label) return 99;
  if (label.includes('Alt') || label.includes('Taban')) return 0;
  if (label.includes('Arka')) return 1;
  if (label.includes('Ön')) return 2;
  if (label.includes('Sol')) return 3;
  if (label.includes('Sağ')) return 4;
  if (label.includes('Üst')) return 5;
  return 10;
}

/**
 * Yüzey veya köşe silindiğinde (ya da deforme edildiğinde) çok yüzlü cismin
 * kalan yüzeylerinden komşuluk ağacı (BFS spanning tree) kurarak açınımı dinamik yeniden hesaplar.
 */
function dinamikCokYuzluAcinimi(solid: Solid3DObject): {
  vertices: Point3D[];
  faces: Face3D[];
  edges: Edge3D[];
} {
  const u = Math.min(1, Math.max(0, solid.unfoldProgress || 0));
  const kapali = generateSolidMesh({ ...solid, unfoldProgress: 0 });
  if (kapali.faces.length === 0) {
    return { vertices: [], faces: [], edges: [] };
  }

  const tamKapali = generateSolidMesh({
    ...solid,
    unfoldProgress: 0,
    deletedFaces: undefined,
    deletedVertices: undefined,
  });
  const cisimMerkez = tamKapali.vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x / tamKapali.vertices.length, y: acc.y + v.y / tamKapali.vertices.length, z: acc.z + v.z / tamKapali.vertices.length }),
    { x: 0, y: 0, z: 0 }
  );
  const upVec = rotatePoint3D({ x: 0, y: 0, z: 1 }, solid.rotation);

  const yuzBilgileri = kapali.faces.map((f, idx) => {
    const pts = f.vertexIndices.map((vi) => ({ ...kapali.vertices[vi] }));
    const merkez = pts.reduce(
      (acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length, z: acc.z + p.z / pts.length }),
      { x: 0, y: 0, z: 0 }
    );
    let n = computeFaceNormal(pts, pts.map((_, i) => i)) || f.normal || { x: 0, y: 0, z: 1 };
    const disaVektor = { x: merkez.x - cisimMerkez.x, y: merkez.y - cisimMerkez.y, z: merkez.z - cisimMerkez.z };
    if (n.x * disaVektor.x + n.y * disaVektor.y + n.z * disaVektor.z < 0) {
      n = { x: -n.x, y: -n.y, z: -n.z };
    }
    return {
      idx,
      origFaceIndex: f.faceIndex ?? idx,
      label: f.label,
      pts,
      merkez,
      disNormal: n,
    };
  });

  const noktaYakin = (a: Point3D, b: Point3D) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-3;

  interface MenteseBaglantisi {
    komsuIdx: number;
    ortaNokta: Point3D;
    eksen: Point3D;
    maxAci: number;
  }

  const komsuluk: MenteseBaglantisi[][] = yuzBilgileri.map(() => []);

  for (let i = 0; i < yuzBilgileri.length; i++) {
    const fi = yuzBilgileri[i];
    for (let j = i + 1; j < yuzBilgileri.length; j++) {
      const fj = yuzBilgileri[j];
      let ortakKenar: [Point3D, Point3D] | null = null;
      for (let ei = 0; ei < fi.pts.length && !ortakKenar; ei++) {
        const a1 = fi.pts[ei];
        const b1 = fi.pts[(ei + 1) % fi.pts.length];
        for (let ej = 0; ej < fj.pts.length; ej++) {
          const a2 = fj.pts[ej];
          const b2 = fj.pts[(ej + 1) % fj.pts.length];
          if ((noktaYakin(a1, a2) && noktaYakin(b1, b2)) || (noktaYakin(a1, b2) && noktaYakin(b1, a2))) {
            ortakKenar = [a1, b1];
            break;
          }
        }
      }
      if (!ortakKenar) continue;
      const [A, B] = ortakKenar;
      const ex = B.x - A.x;
      const ey = B.y - A.y;
      const ez = B.z - A.z;
      const eLen = Math.hypot(ex, ey, ez);
      if (eLen < 1e-5) continue;
      const eHat = { x: ex / eLen, y: ey / eLen, z: ez / eLen };
      const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 };

      const icVektor = (merkez: Point3D): Point3D => {
        const vx = merkez.x - M.x;
        const vy = merkez.y - M.y;
        const vz = merkez.z - M.z;
        const dot = vx * eHat.x + vy * eHat.y + vz * eHat.z;
        const wx = vx - dot * eHat.x;
        const wy = vy - dot * eHat.y;
        const wz = vz - dot * eHat.z;
        const wLen = Math.hypot(wx, wy, wz) || 1;
        return { x: wx / wLen, y: wy / wLen, z: wz / wLen };
      };

      const uI = icVektor(fi.merkez);
      const uJ = icVektor(fj.merkez);
      const cosAlpha = Math.max(-1, Math.min(1, uI.x * uJ.x + uI.y * uJ.y + uI.z * uJ.z));
      const maxAci = Math.PI - Math.acos(cosAlpha);

      const cx = uI.y * uJ.z - uI.z * uJ.y;
      const cy = uI.z * uJ.x - uI.x * uJ.z;
      const cz = uI.x * uJ.y - uI.y * uJ.x;
      const cLen = Math.hypot(cx, cy, cz);
      const eksenIJ = cLen > 1e-6 ? { x: cx / cLen, y: cy / cLen, z: cz / cLen } : eHat;
      const eksenJI = { x: -eksenIJ.x, y: -eksenIJ.y, z: -eksenIJ.z };

      komsuluk[i].push({ komsuIdx: j, ortaNokta: M, eksen: eksenIJ, maxAci });
      komsuluk[j].push({ komsuIdx: i, ortaNokta: M, eksen: eksenJI, maxAci });
    }
  }

  komsuluk.forEach((liste) => {
    liste.sort((a, b) => yuzEtiketOnceligi(yuzBilgileri[a.komsuIdx].label) - yuzEtiketOnceligi(yuzBilgileri[b.komsuIdx].label));
  });

  const ziyaretEdildi = new Array(yuzBilgileri.length).fill(false);
  const ebeveyn: ( { parentIdx: number; ortaNokta: Point3D; eksen: Point3D; maxAci: number } | null )[] = new Array(yuzBilgileri.length).fill(null);
  const bilesenKoku: number[] = new Array(yuzBilgileri.length).fill(0);

  for (let baslangic = 0; baslangic < yuzBilgileri.length; baslangic++) {
    if (ziyaretEdildi[baslangic]) continue;
    // Bileşendeki tüm yüzleri bul
    const bilesen: number[] = [];
    const q = [baslangic];
    const goruldu = new Set<number>([baslangic]);
    while (q.length > 0) {
      const cur = q.shift()!;
      bilesen.push(cur);
      for (const k of komsuluk[cur]) {
        if (!goruldu.has(k.komsuIdx)) {
          goruldu.add(k.komsuIdx);
          q.push(k.komsuIdx);
        }
      }
    }

    // Kök yüzü seç: varsa Alt Taban (origFaceIndex === 0), yoksa en çok komşusu olan yüz (Üst Taban / yan yüz)
    bilesen.sort((a, b) => {
      const fa = yuzBilgileri[a];
      const fb = yuzBilgileri[b];
      if (fa.origFaceIndex === 0) return -1;
      if (fb.origFaceIndex === 0) return 1;
      if ( komsuluk[b].length !== komsuluk[a].length ) return komsuluk[b].length - komsuluk[a].length;
      return yuzEtiketOnceligi(fa.label) - yuzEtiketOnceligi(fb.label);
    });
    const kok = bilesen[0];

    // BFS ile açınım ağacını kur
    const bfs = [kok];
    ziyaretEdildi[kok] = true;
    bilesenKoku[kok] = kok;
    while (bfs.length > 0) {
      const pIdx = bfs.shift()!;
      for (const bag of komsuluk[pIdx]) {
        if (!ziyaretEdildi[bag.komsuIdx]) {
          ziyaretEdildi[bag.komsuIdx] = true;
          bilesenKoku[bag.komsuIdx] = kok;
          ebeveyn[bag.komsuIdx] = {
            parentIdx: pIdx,
            ortaNokta: bag.ortaNokta,
            eksen: bag.eksen,
            maxAci: bag.maxAci,
          };
          bfs.push(bag.komsuIdx);
        }
      }
    }
  }

  // Kök yüz zeminde değilse (ör. Alt Taban silinmişse), u -> 1 iken kök yüzü de zemin düzlemine yatır
  const kokDuzlemDonusumu = (kokIdx: number, p: Point3D): Point3D => {
    const kok = yuzBilgileri[kokIdx];
    if (kok.origFaceIndex === 0) return p;
    const nDotUp = kok.disNormal.x * upVec.x + kok.disNormal.y * upVec.y + kok.disNormal.z * upVec.z;
    if (Math.abs(nDotUp) > 0.98) {
      // Yatay yüz (ör. Üst Taban): u oranında zemine indir
      const dz = (kok.merkez.x - solid.position.x) * upVec.x + (kok.merkez.y - solid.position.y) * upVec.y + (kok.merkez.z - solid.position.z) * upVec.z;
      return {
        x: p.x - u * dz * upVec.x,
        y: p.y - u * dz * upVec.y,
        z: p.z - u * dz * upVec.z,
      };
    }
    // Eğik veya dik yan yüz: en alt kenarı etrafında dışa doğru zemine yatır
    let enAltOrta = kok.merkez;
    let enAltBirim = { x: 1, y: 0, z: 0 };
    let minYukseklik = Infinity;
    for (let i = 0; i < kok.pts.length; i++) {
      const a = kok.pts[i];
      const b = kok.pts[(i + 1) % kok.pts.length];
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      const yuk = (m.x - solid.position.x) * upVec.x + (m.y - solid.position.y) * upVec.y + (m.z - solid.position.z) * upVec.z;
      if (yuk < minYukseklik) {
        minYukseklik = yuk;
        enAltOrta = m;
        const l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
        enAltBirim = { x: (b.x - a.x) / l, y: (b.y - a.y) / l, z: (b.z - a.z) / l };
      }
    }
    const vx = kok.merkez.x - enAltOrta.x;
    const vy = kok.merkez.y - enAltOrta.y;
    const vz = kok.merkez.z - enAltOrta.z;
    const vDot = vx * enAltBirim.x + vy * enAltBirim.y + vz * enAltBirim.z;
    const ux = vx - vDot * enAltBirim.x;
    const uy = vy - vDot * enAltBirim.y;
    const uz = vz - vDot * enAltBirim.z;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    const u0 = { x: ux / uLen, y: uy / uLen, z: uz / uLen };

    const hx = kok.disNormal.x - nDotUp * upVec.x;
    const hy = kok.disNormal.y - nDotUp * upVec.y;
    const hz = kok.disNormal.z - nDotUp * upVec.z;
    const hLen = Math.hypot(hx, hy, hz) || 1;
    const h0 = { x: hx / hLen, y: hy / hLen, z: hz / hLen };

    const ax = u0.y * h0.z - u0.z * h0.y;
    const ay = u0.z * h0.x - u0.x * h0.z;
    const az = u0.x * h0.y - u0.y * h0.x;
    const aci = Math.acos(Math.max(-1, Math.min(1, u0.x * h0.x + u0.y * h0.y + u0.z * h0.z)));
    const dondurulmus = eksenEtrafindaDondur(p, enAltOrta, { x: ax, y: ay, z: az }, u * aci);
    return {
      x: dondurulmus.x - u * minYukseklik * upVec.x,
      y: dondurulmus.y - u * minYukseklik * upVec.y,
      z: dondurulmus.z - u * minYukseklik * upVec.z,
    };
  };

  const outVertices: Point3D[] = [];
  const outFaces: Face3D[] = [];
  const outEdges: Edge3D[] = [];

  yuzBilgileri.forEach((f, idx) => {
    const zincir: { ortaNokta: Point3D; eksen: Point3D; maxAci: number }[] = [];
    let cur = idx;
    while (ebeveyn[cur]) {
      const eb = ebeveyn[cur]!;
      zincir.push(eb);
      cur = eb.parentIdx;
    }
    const kokIdx = bilesenKoku[idx];

    const donusmusPts = f.pts.map((pt) => {
      let q = { ...pt };
      for (const adim of zincir) {
        q = eksenEtrafindaDondur(q, adim.ortaNokta, adim.eksen, u * adim.maxAci);
      }
      return kokDuzlemDonusumu(kokIdx, q);
    });

    const startIdx = outVertices.length;
    outVertices.push(...donusmusPts);
    const vIndices = donusmusPts.map((_, i) => startIdx + i);
    const normal = computeFaceNormal(outVertices, vIndices) || f.disNormal;
    outFaces.push({
      vertexIndices: vIndices,
      normal,
      label: f.label,
      faceIndex: f.origFaceIndex,
    });
    for (let i = 0; i < vIndices.length; i++) {
      outEdges.push({
        startIdx: vIndices[i],
        endIdx: vIndices[(i + 1) % vIndices.length],
      });
    }
  });

  return { vertices: outVertices, faces: outFaces, edges: outEdges };
}

export function generateSolidMesh(solid: Solid3DObject): {
  vertices: Point3D[];
  faces: Face3D[];
  edges: Edge3D[];
} {
  const { type, dimensions, position, rotation, unfoldProgress = 0 } = solid;
  if (
    unfoldProgress > 0 &&
    (type === 'cube' || type === 'prism' || type === 'pyramid' || type === 'triangular_prism') &&
    (solid.deletedFaces?.length || solid.deletedVertices?.length || (solid.vertexOffsets && Object.keys(solid.vertexOffsets).length > 0))
  ) {
    return dinamikCokYuzluAcinimi(solid);
  }
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  let baseVertices: Point3D[] = [];
  let faces: Face3D[] = [];
  let edges: Edge3D[] = [];

  switch (type) {
    case 'cube':
    case 'prism': {
      const hw = (type === 'cube' ? w : w) / 2;
      const hd = (type === 'cube' ? w : d) / 2;
      const zh = type === 'cube' ? w : h;

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // 6 Bağımsız Yüz Üretimi (Açınım / T-Net):
        // 1. Alt Taban (Z=0 da sabit)
        const faceBottom: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // 2. Arka Yüz (y = +hd menteşesi etrafında dışa doğru katlanır)
        // NOT: ViewCube'ün "ÖN" ön ayarında kamera -y tarafında durur; bu yüzden
        // y = +hd yüzü ARKA, y = -hd yüzü ÖN olarak etiketlenir.
        const faceBack: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: hw, y: hd + zh * s, z: zh * c },
          { x: -hw, y: hd + zh * s, z: zh * c },
        ];

        // 3. Üst Taban (Arka Yüzün üst kenarına bağlı, 2*theta açısıyla düzleme yatar)
        const topD = type === 'cube' ? w : d;
        const s2 = Math.sin(2 * theta);
        const c2 = Math.cos(2 * theta);
        // Üst taban, arka yüzün üst kenarına menteşelidir; theta=0'da o yüzle dik (içe doğru),
        // theta=90°'de onun devamı olarak düzleme yatar.
        const faceTop: Point3D[] = [
          { x: -hw, y: hd + zh * s, z: zh * c },
          { x: hw, y: hd + zh * s, z: zh * c },
          { x: hw, y: hd + zh * s - topD * c2, z: zh * c + topD * s2 },
          { x: -hw, y: hd + zh * s - topD * c2, z: zh * c + topD * s2 },
        ];

        // 4. Ön Yüz (y = -hd menteşesi etrafında dışa doğru katlanır)
        const faceFront: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: -hd - zh * s, z: zh * c },
          { x: hw, y: -hd - zh * s, z: zh * c },
        ];

        // 5. Sol Yüz (x = -hw menteşesi etrafında sola doğru katlanır)
        const faceLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw - zh * s, y: hd, z: zh * c },
          { x: -hw - zh * s, y: -hd, z: zh * c },
        ];

        // 6. Sağ Yüz (x = hw menteşesi etrafında sağa doğru katlanır)
        const faceRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw + zh * s, y: -hd, z: zh * c },
          { x: hw + zh * s, y: hd, z: zh * c },
        ];

        const allFaceList = [
          { name: 'Alt Taban', pts: faceBottom, normal: { x: 0, y: 0, z: -1 } },
          { name: 'Arka Yüz', pts: faceBack, normal: { x: 0, y: c, z: s } },
          { name: 'Üst Taban', pts: faceTop, normal: { x: 0, y: s2, z: c2 } },
          { name: 'Ön Yüz', pts: faceFront, normal: { x: 0, y: -c, z: s } },
          { name: 'Sol Yüz', pts: faceLeft, normal: { x: -c, y: 0, z: s } },
          { name: 'Sağ Yüz', pts: faceRight, normal: { x: c, y: 0, z: s } },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        allFaceList.forEach((f) => {
          const startIndex = baseVertices.length;
          baseVertices.push(...f.pts);
          faces.push({
            vertexIndices: [startIndex, startIndex + 1, startIndex + 2, startIndex + 3],
            normal: f.normal,
            label: f.name,
          });
          edges.push(
            { startIdx: startIndex, endIdx: startIndex + 1 },
            { startIdx: startIndex + 1, endIdx: startIndex + 2 },
            { startIdx: startIndex + 2, endIdx: startIndex + 3 },
            { startIdx: startIndex + 3, endIdx: startIndex }
          );
        });

        break;
      }

      // Kapalı (u === 0) küp:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: -hw, y: hd, z: 0 },
        { x: -hw, y: -hd, z: zh },
        { x: hw, y: -hd, z: zh },
        { x: hw, y: hd, z: zh },
        { x: -hw, y: hd, z: zh },
      ];

      faces = [
        { vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Alt Taban' },
        { vertexIndices: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 }, label: 'Üst Taban' },
        { vertexIndices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 }, label: 'Arka Yüz' },
        { vertexIndices: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 }, label: 'Ön Yüz' },
        { vertexIndices: [0, 3, 7, 4], normal: { x: -1, y: 0, z: 0 }, label: 'Sol Yüz' },
        { vertexIndices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 }, label: 'Sağ Yüz' },
      ];

      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 3 },
        { startIdx: 3, endIdx: 0 },
        { startIdx: 4, endIdx: 5 },
        { startIdx: 5, endIdx: 6 },
        { startIdx: 6, endIdx: 7 },
        { startIdx: 7, endIdx: 4 },
        { startIdx: 0, endIdx: 4 },
        { startIdx: 1, endIdx: 5 },
        { startIdx: 2, endIdx: 6 },
        { startIdx: 3, endIdx: 7 },
      ];
      break;
    }

    case 'pyramid': {
      const hw = w / 2;
      const hd = d / 2;

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));

        // İZOMETRİK AÇILMA: Her üçgen kendi taban kenarı (menteşe) etrafında, KAPALI durumdaki
        // iki yüzlü açıdan başlayarak düzleme kadar döner. Böylece u=0'da dört tepe de (0,0,h)'de
        // birleşir (sıçrama olmaz) ve u=1'de gerçek, katlanabilir açınım elde edilir.
        // Eğik yükseklikler yüz başına farklıdır: taban kenarı w olan yüzler d/2'ye,
        // taban kenarı d olan yüzler w/2'ye bağlıdır (bkz. calculate3DSurfaceArea).
        const slantW = Math.hypot(h, hd); // y = ±hd menteşeli üçgenler (taban kenarı w)
        const slantD = Math.hypot(h, hw); // x = ±hw menteşeli üçgenler (taban kenarı d)
        const tiltW = Math.atan2(hd, h);
        const tiltD = Math.atan2(hw, h);
        // phi: menteşeden tepeye giden doğrultunun düşeyle (z ekseniyle) yaptığı açı
        const phiW = -tiltW + u * (Math.PI / 2 + tiltW);
        const phiD = -tiltD + u * (Math.PI / 2 + tiltD);
        const sW = Math.sin(phiW);
        const cW = Math.cos(phiW);
        const sD = Math.sin(phiD);
        const cD = Math.cos(phiD);

        // 1. Taban
        const ptsBase: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // 2. Arka Üçgen Yüz (y = +hd menteşesi)
        // NOT: ViewCube'ün "ÖN" ön ayarında kamera -y tarafında durur; bu yüzden
        // y = +hd yüzü ARKA, y = -hd yüzü ÖN olarak etiketlenir.
        const ptsBack: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: 0, y: hd + slantW * sW, z: slantW * cW },
        ];

        // 3. Ön Üçgen Yüz (y = -hd menteşesi)
        const ptsFront: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: 0, y: -hd - slantW * sW, z: slantW * cW },
        ];

        // 4. Sol Üçgen Yüz (x = -hw menteşesi)
        const ptsLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw - slantD * sD, y: 0, z: slantD * cD },
        ];

        // 5. Sağ Üçgen Yüz (x = +hw menteşesi)
        const ptsRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw + slantD * sD, y: 0, z: slantD * cD },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        baseVertices.push(...ptsBase);
        faces.push({ vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Kare Taban' });
        edges.push(
          { startIdx: 0, endIdx: 1 },
          { startIdx: 1, endIdx: 2 },
          { startIdx: 2, endIdx: 3 },
          { startIdx: 3, endIdx: 0 }
        );

        const sideTris = [
          { name: 'Arka Üçgen Yüz', pts: ptsBack, normal: { x: 0, y: cW, z: -sW } },
          { name: 'Ön Üçgen Yüz', pts: ptsFront, normal: { x: 0, y: -cW, z: -sW } },
          { name: 'Sol Üçgen Yüz', pts: ptsLeft, normal: { x: -cD, y: 0, z: -sD } },
          { name: 'Sağ Üçgen Yüz', pts: ptsRight, normal: { x: cD, y: 0, z: -sD } },
        ];

        sideTris.forEach((t) => {
          const sIdx = baseVertices.length;
          baseVertices.push(...t.pts);
          faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2], normal: t.normal, label: t.name });
          edges.push(
            { startIdx: sIdx, endIdx: sIdx + 1 },
            { startIdx: sIdx + 1, endIdx: sIdx + 2 },
            { startIdx: sIdx + 2, endIdx: sIdx }
          );
        });

        break;
      }

      // Kapalı piramit:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: -hw, y: hd, z: 0 },
        { x: 0, y: 0, z: h },
      ];
      faces = [
        { vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Kare Taban' },
        { vertexIndices: [3, 2, 4], normal: { x: 0, y: 1, z: 0.5 }, label: 'Arka Üçgen Yüz' },
        { vertexIndices: [0, 1, 4], normal: { x: 0, y: -1, z: 0.5 }, label: 'Ön Üçgen Yüz' },
        { vertexIndices: [0, 3, 4], normal: { x: -1, y: 0, z: 0.5 }, label: 'Sol Üçgen Yüz' },
        { vertexIndices: [1, 2, 4], normal: { x: 1, y: 0, z: 0.5 }, label: 'Sağ Üçgen Yüz' },
      ];
      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 3 },
        { startIdx: 3, endIdx: 0 },
        { startIdx: 0, endIdx: 4 },
        { startIdx: 1, endIdx: 4 },
        { startIdx: 2, endIdx: 4 },
        { startIdx: 3, endIdx: 4 },
      ];
      break;
    }

    case 'triangular_prism': {
      const hw = w / 2;
      const hd = d / 2;
      // Taban üçgeninin tepesi (xz düzleminde): ikizkenar / eşkenar ortada, dik üçgende sol köşenin üstünde
      const ax = ucgenTepeX(solid);

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // Orta Dikdörtgen Taban
        const ptsMid: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // Yan (eğik) yüzlerin genişliği taban üçgeninin o kenarıdır: sol hypot(ax + w/2, h), sağ hypot(w/2 - ax, h)
        // (ikizkenarda ikisi de hypot(w/2, h); dik üçgende sol kenar dik kenar h'dir).
        // Menteşe dönüşü kapalı iki yüzlü açıdan başlar (u=0'da tepe kenarı x=ax, z=h),
        // u=1'de yüzler tabanla aynı düzleme yatar; böylece yanal alan her aşamada korunur.
        const slantL = Math.hypot(ax + hw, h);
        const slantR = Math.hypot(hw - ax, h);
        const a0L = Math.atan2(h, ax + hw);
        const a0R = Math.atan2(h, hw - ax);
        const phiL = a0L + u * (Math.PI - a0L);
        const phiR = a0R + u * (Math.PI - a0R);
        const sPhiL = Math.sin(phiL);
        const cPhiL = Math.cos(phiL);
        const sPhiR = Math.sin(phiR);
        const cPhiR = Math.cos(phiR);

        // Sol Dikdörtgen Yüz (x = -hw menteşesi)
        const ptsLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw + slantL * cPhiL, y: hd, z: slantL * sPhiL },
          { x: -hw + slantL * cPhiL, y: -hd, z: slantL * sPhiL },
        ];

        // Sağ Dikdörtgen Yüz (x = +hw menteşesi)
        const ptsRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw - slantR * cPhiR, y: -hd, z: slantR * sPhiR },
          { x: hw - slantR * cPhiR, y: hd, z: slantR * sPhiR },
        ];

        // Arka Üçgen Kapak (y = +hd menteşesi)
        // NOT: ViewCube'ün "ÖN" ön ayarında kamera -y tarafında durur; bu yüzden
        // y = +hd kapağı ARKA, y = -hd kapağı ÖN olarak etiketlenir.
        const ptsBack: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: ax, y: hd + h * s, z: h * c },
        ];

        // Ön Üçgen Kapak (y = -hd menteşesi)
        const ptsFront: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: ax, y: -hd - h * s, z: h * c },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        const allTriList = [
          { name: 'Alt Dikdörtgen', pts: ptsMid, normal: { x: 0, y: 0, z: -1 }, isQuad: true },
          { name: 'Sol Dikdörtgen', pts: ptsLeft, normal: { x: -sPhiL, y: 0, z: cPhiL }, isQuad: true },
          { name: 'Sağ Dikdörtgen', pts: ptsRight, normal: { x: sPhiR, y: 0, z: cPhiR }, isQuad: true },
          { name: 'Arka Üçgen Kapak', pts: ptsBack, normal: { x: 0, y: c, z: s }, isQuad: false },
          { name: 'Ön Üçgen Kapak', pts: ptsFront, normal: { x: 0, y: -c, z: s }, isQuad: false },
        ];

        allTriList.forEach((f) => {
          const sIdx = baseVertices.length;
          baseVertices.push(...f.pts);
          if (f.isQuad) {
            faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2, sIdx + 3], normal: f.normal, label: f.name });
            edges.push(
              { startIdx: sIdx, endIdx: sIdx + 1 },
              { startIdx: sIdx + 1, endIdx: sIdx + 2 },
              { startIdx: sIdx + 2, endIdx: sIdx + 3 },
              { startIdx: sIdx + 3, endIdx: sIdx }
            );
          } else {
            faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2], normal: f.normal, label: f.name });
            edges.push(
              { startIdx: sIdx, endIdx: sIdx + 1 },
              { startIdx: sIdx + 1, endIdx: sIdx + 2 },
              { startIdx: sIdx + 2, endIdx: sIdx }
            );
          }
        });

        break;
      }

      // Kapalı üçgen prizma:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: ax, y: -hd, z: h },
        { x: -hw, y: hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: ax, y: hd, z: h },
      ];
      faces = [
        { vertexIndices: [0, 1, 4, 3], normal: { x: 0, y: 0, z: -1 }, label: 'Alt Dikdörtgen' },
        { vertexIndices: [1, 2, 5, 4], normal: { x: 0.7, y: 0, z: 0.7 }, label: 'Sağ Dikdörtgen' },
        { vertexIndices: [2, 0, 3, 5], normal: { x: -0.7, y: 0, z: 0.7 }, label: 'Sol Dikdörtgen' },
        { vertexIndices: [0, 1, 2], normal: { x: 0, y: -1, z: 0 }, label: 'Ön Üçgen' },
        { vertexIndices: [3, 4, 5], normal: { x: 0, y: 1, z: 0 }, label: 'Arka Üçgen' },
      ];
      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 0 },
        { startIdx: 3, endIdx: 4 },
        { startIdx: 4, endIdx: 5 },
        { startIdx: 5, endIdx: 3 },
        { startIdx: 0, endIdx: 3 },
        { startIdx: 1, endIdx: 4 },
        { startIdx: 2, endIdx: 5 },
      ];
      break;
    }

    case 'cone': {
      const segments = 48;
      const u = Math.min(1, Math.max(0, unfoldProgress));
      // Yanal (eğik) yükseklik: koninin açınımındaki daire diliminin yarıçapı
      const slant = Math.hypot(r, h);

      baseVertices = [];
      faces = [];
      edges = [];

      if (u > 0) {
        // AÇINIM (NET) - İZOMETRİK AÇILMA:
        // Yan yüzey, tıpkı kağıt bir koniyi bir ayrıtından kesip düzleştirmek gibi açılır.
        // Her aşamada uzunluklar korunur: tepe noktasına uzaklık daima 'slant', yay uzunluğu daima 2*pi*r.
        // Ara aşamada yüzey, taban yarıçapı rho(u) olan kısmi bir konidir:
        //   rho: r -> slant,  yükseklik: h -> 0,  merkez açı: 2*pi -> 2*pi*r/slant
        // Sonuçta düzlemde yarıçapı 'slant', merkez açısı 2*pi*r/slant olan bir DAİRE DİLİMİ kalır.
        const rho = r + (slant - r) * u;
        const apexZ = Math.sqrt(Math.max(0, slant * slant - rho * rho));
        // Açılan yüzeyi taban dairesinin yanına kaydır (üst üste binmesin, dikişte teğet olsun)
        const shiftY = solid.deletedFaces?.includes(0) ? 0 : -u * (r + slant);
        const alpha0 = Math.PI / 2; // yay, tepe noktasından +y yönünde açılır

        baseVertices = [];
        faces = [];
        edges = [];

        // 1) Taban dairesi (yerinde kalır)
        const baseStart = baseVertices.length;
        for (let i = 0; i < segments; i++) {
          const ang = (i * 2 * Math.PI) / segments;
          baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
        }
        faces.push({
          vertexIndices: Array.from({ length: segments }, (_, i) => baseStart + segments - 1 - i),
          normal: { x: 0, y: 0, z: -1 },
          label: 'Daire Taban',
        });
        for (let i = 0; i < segments; i++) {
          edges.push({ startIdx: baseStart + i, endIdx: baseStart + ((i + 1) % segments) });
        }

        // 2) Yan yüzey (kısmi koni -> daire dilimi)
        const latStart = baseVertices.length;
        // segments+1 nokta: dikiş iki kez yer alır, böylece yüzey kesik (açık) olur
        for (let i = 0; i <= segments; i++) {
          const delta = -Math.PI + (i * 2 * Math.PI) / segments; // dikişten işaretli açı farkı
          const arcLen = r * delta; // korunan yay uzunluğu
          const ang = alpha0 + arcLen / rho;
          baseVertices.push({ x: rho * Math.cos(ang), y: rho * Math.sin(ang) + shiftY, z: 0 });
        }

        const apexIdx = baseVertices.length;
        baseVertices.push({ x: 0, y: shiftY, z: apexZ });

        for (let i = 0; i < segments; i++) {
          const a = latStart + i;
          const b = latStart + i + 1;
          const midArc = r * (-Math.PI + ((i + 0.5) * 2 * Math.PI) / segments);
          const midAng = alpha0 + midArc / rho;
          faces.push({
            vertexIndices: [a, b, apexIdx],
            normal: {
              x: Math.cos(midAng) * (apexZ / slant),
              y: Math.sin(midAng) * (apexZ / slant),
              z: rho / slant,
            },
            label: u >= 0.999 ? 'Yan Yüzey (Daire Dilimi)' : 'Yan Yüzey',
          });
          edges.push({ startIdx: a, endIdx: b });
        }
        // Dilimin iki düz kenarı (kesim çizgileri)
        edges.push({ startIdx: latStart, endIdx: apexIdx });
        edges.push({ startIdx: latStart + segments, endIdx: apexIdx });

        break;
      }

      // Kapalı koni
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      const apexIdx = baseVertices.length;
      baseVertices.push({ x: 0, y: 0, z: h });

      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Daire Taban',
      });

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const midAng = ((i + 0.5) * 2 * Math.PI) / segments;
        faces.push({
          vertexIndices: [i, next, apexIdx],
          normal: {
            x: Math.cos(midAng) * (h / Math.max(0.001, slant)),
            y: Math.sin(midAng) * (h / Math.max(0.001, slant)),
            z: r / Math.max(0.001, slant),
          },
          label: 'Yan Yüzey',
        });
        edges.push({ startIdx: i, endIdx: next });
      }
      break;
    }

    case 'cylinder': {
      const segments = 48;
      baseVertices = [];
      const u = Math.min(1, Math.max(0, unfoldProgress));

      if (u > 0) {
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // 1. Yan Yüzey (Açılmış Dikdörtgen Levha):
        // 2*pi*r genişliğinde ve h yüksekliğinde
        const sheetWidth = 2 * Math.PI * r;
        const hwSheet = sheetWidth / 2;

        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          // silindirik yaydan düz çizgiye interpolasyon
          const ang = (i * 2 * Math.PI) / segments - Math.PI / 2;
          const curX = (1 - u) * (r * Math.cos(ang)) + u * (-hwSheet + t * sheetWidth);
          const curY = (1 - u) * (r * Math.sin(ang)) + u * 0;
          const curZ_bottom = 0;
          const curZ_top = h * c;

          baseVertices.push({ x: curX, y: curY, z: curZ_bottom });
          baseVertices.push({ x: curX, y: curY + h * s, z: curZ_top });
        }

        // Alt Daire (Aşağıya doğru katlanır)
        const botCenterIdx = baseVertices.length;
        const botOffsetY = -r * s * 2;
        for (let i = 0; i < segments; i++) {
          const ang = (i * 2 * Math.PI) / segments;
          baseVertices.push({
            x: r * Math.cos(ang),
            y: botOffsetY + r * Math.sin(ang) * (1 - u * 0.2),
            z: 0,
          });
        }

        // Üst Daire (Yukarıya doğru katlanır)
        const topCenterIdx = baseVertices.length;
        const topOffsetY = (h + r * 2) * s;
        for (let i = 0; i < segments; i++) {
          const ang = (i * 2 * Math.PI) / segments;
          baseVertices.push({
            x: r * Math.cos(ang),
            y: topOffsetY + r * Math.sin(ang) * (1 - u * 0.2),
            z: h * c,
          });
        }

        faces = [];
        edges = [];

        // Yan yüzey şeritleri
        for (let i = 0; i < segments - 1; i++) {
          const p1 = i * 2;
          const p2 = i * 2 + 1;
          const p3 = (i + 1) * 2 + 1;
          const p4 = (i + 1) * 2;
          faces.push({
            vertexIndices: [p1, p4, p3, p2],
            normal: { x: 0, y: c, z: s },
            label: 'Yan Yüzey',
            faceIndex: solid.deletedFaces?.length || solid.deletedVertices?.length ? 2 + i : undefined,
          });
          edges.push({ startIdx: p1, endIdx: p4 });
          edges.push({ startIdx: p2, endIdx: p3 });
        }
        edges.push({ startIdx: 0, endIdx: 1 });
        edges.push({ startIdx: (segments - 1) * 2, endIdx: (segments - 1) * 2 + 1 });

        // Alt Daire Yüzü
        faces.push({
          vertexIndices: Array.from({ length: segments }, (_, i) => botCenterIdx + i),
          normal: { x: 0, y: 0, z: -1 },
          label: 'Alt Daire',
          faceIndex: solid.deletedFaces?.length || solid.deletedVertices?.length ? 0 : undefined,
        });
        for (let i = 0; i < segments; i++) {
          edges.push({ startIdx: botCenterIdx + i, endIdx: botCenterIdx + ((i + 1) % segments) });
        }

        // Üst Daire Yüzü
        faces.push({
          vertexIndices: Array.from({ length: segments }, (_, i) => topCenterIdx + i),
          normal: { x: 0, y: 0, z: 1 },
          label: 'Üst Daire',
          faceIndex: solid.deletedFaces?.length || solid.deletedVertices?.length ? 1 : undefined,
        });
        for (let i = 0; i < segments; i++) {
          edges.push({ startIdx: topCenterIdx + i, endIdx: topCenterIdx + ((i + 1) % segments) });
        }

        break;
      }

      // Kapalı silindir:
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: h });
      }

      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Alt Daire',
      });
      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments + i),
        normal: { x: 0, y: 0, z: 1 },
        label: 'Üst Daire',
      });

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          vertexIndices: [i, next, segments + next, segments + i],
          normal: { x: Math.cos(((i + 0.5) * 2 * Math.PI) / segments), y: Math.sin(((i + 0.5) * 2 * Math.PI) / segments), z: 0 },
          label: 'Yan Yüzey',
        });
        edges.push({ startIdx: i, endIdx: next });
        edges.push({ startIdx: segments + i, endIdx: segments + next });
      }
      break;
    }

    case 'sphere': {
      const latCount = 18;
      const lonCount = 32;
      baseVertices = [];

      for (let i = 0; i <= latCount; i++) {
        const theta = (i * Math.PI) / latCount; // 0 to PI
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let j = 0; j < lonCount; j++) {
          const phi = (j * 2 * Math.PI) / lonCount; // 0 to 2PI
          const x = r * sinTheta * Math.cos(phi);
          const y = r * sinTheta * Math.sin(phi);
          const z = r * cosTheta + r; // tabana oturt
          baseVertices.push({ x, y, z });
        }
      }

      for (let i = 0; i < latCount; i++) {
        for (let j = 0; j < lonCount; j++) {
          const first = i * lonCount + j;
          const second = first + lonCount;
          const nextJ = (j + 1) % lonCount;
          const firstNext = i * lonCount + nextJ;
          const secondNext = firstNext + lonCount;

          faces.push({
            vertexIndices: [first, firstNext, secondNext, second],
            normal: { x: baseVertices[first].x / r, y: baseVertices[first].y / r, z: (baseVertices[first].z - r) / r },
            label: 'Küre Yüzeyi',
          });
        }
      }
      break;
    }

    default:
      break;
  }

  // Pozisyon ve kendi etrafındaki rotasyonu uygula
  const transformedVertices = baseVertices.map((v) => {
    const rotated = rotatePoint3D(v, rotation);
    return {
      x: rotated.x + position.x,
      y: rotated.y + position.y,
      z: rotated.z + position.z,
    };
  });

  if (solid.vertexOffsets && Object.keys(solid.vertexOffsets).length > 0) {
    const ham = transformedVertices.map((v) => ({ ...v }));
    const anahtarlar = Object.entries(solid.vertexOffsets).map(([k, off]) => ({ idx: Number(k), off }));
    for (let i = 0; i < transformedVertices.length; i++) {
      let ek: Point3D | undefined = solid.vertexOffsets[i];
      if (!ek) {
        const hv = ham[i];
        for (const a of anahtarlar) {
          const ref = ham[a.idx];
          if (ref && Math.hypot(hv.x - ref.x, hv.y - ref.y, hv.z - ref.z) < 1e-4) {
            ek = a.off;
            break;
          }
        }
      }
      if (ek) {
        transformedVertices[i] = {
          x: ham[i].x + ek.x,
          y: ham[i].y + ek.y,
          z: ham[i].z + ek.z,
        };
      }
    }
  }

  if (solid.deletedFaces?.length || solid.deletedVertices?.length) {
    const silinenKoseSeti = new Set<number>(solid.deletedVertices ?? []);
    for (const dv of solid.deletedVertices ?? []) {
      const ref = transformedVertices[dv];
      if (!ref) continue;
      transformedVertices.forEach((v, idx) => {
        if (Math.hypot(v.x - ref.x, v.y - ref.y, v.z - ref.z) < 1e-4) {
          silinenKoseSeti.add(idx);
        }
      });
    }

    const silinenYuzSeti = new Set<number>(solid.deletedFaces ?? []);
    const yanYuzSilindi =
      (type === 'cylinder' && Array.from(silinenYuzSeti).some((idx) => idx >= 2)) ||
      (type === 'cone' && Array.from(silinenYuzSeti).some((idx) => idx >= 1));
    const kureYuzuSilindi = type === 'sphere' && silinenYuzSeti.size > 0;
    faces.forEach((f, fIdx) => {
      const origIdx = f.faceIndex ?? fIdx;
      if (
        kureYuzuSilindi ||
        f.vertexIndices.some((vi) => silinenKoseSeti.has(vi)) ||
        (yanYuzSilindi && f.label?.startsWith('Yan Yüzey'))
      ) {
        silinenYuzSeti.add(origIdx);
      }
    });

    const kalanYuzler: Face3D[] = [];
    faces.forEach((f, fIdx) => {
      const origIdx = f.faceIndex ?? fIdx;
      if (!silinenYuzSeti.has(origIdx)) {
        kalanYuzler.push({ ...f, faceIndex: origIdx });
      }
    });
    faces = kalanYuzler;

    const noktaEsit = (a: Point3D | undefined, b: Point3D | undefined) =>
      Boolean(a && b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-4);

    edges = edges.filter((e) => {
      if (silinenKoseSeti.has(e.startIdx) || silinenKoseSeti.has(e.endIdx)) return false;
      const va = transformedVertices[e.startIdx];
      const vb = transformedVertices[e.endIdx];
      if (!va || !vb) return false;
      return faces.some((f) => {
        const hasA = f.vertexIndices.some((vi) => vi === e.startIdx || noktaEsit(transformedVertices[vi], va));
        const hasB = f.vertexIndices.some((vi) => vi === e.endIdx || noktaEsit(transformedVertices[vi], vb));
        return hasA && hasB;
      });
    });
  }

  // Yüz normallerini gerçek geometriden hesapla (elle girilen yaklaşık normaller yerine)
  const normalizedFaces = faces.map((f) => ({
    ...f,
    normal: computeFaceNormal(transformedVertices, f.vertexIndices) || f.normal,
  }));

  return {
    vertices: transformedVertices,
    faces: normalizedFaces,
    edges,
  };
}

/**
 * Bir çokgen yüzün birim normalini (Newell yöntemi) hesaplar
 */
export function computeFaceNormal(vertices: Point3D[], indices: number[]): Point3D | null {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < indices.length; i++) {
    const a = vertices[indices[i]];
    const b = vertices[indices[(i + 1) % indices.length]];
    if (!a || !b) return null;
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return null;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Bir çokgen yüzün alanını hesaplar (3B'de Newell vektörünün yarısı)
 */
export function computeFaceArea(vertices: Point3D[], indices: number[]): number {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < indices.length; i++) {
    const a = vertices[indices[i]];
    const b = vertices[indices[(i + 1) % indices.length]];
    if (!a || !b) return 0;
    nx += a.y * b.z - b.y * a.z;
    ny += a.z * b.x - b.z * a.x;
    nz += a.x * b.y - b.x * a.y;
  }
  return Math.hypot(nx, ny, nz) / 2;
}

/**
 * Cismin en büyük boyutu (köşe işaretçisi, taşıma oku gibi yardımcıların ölçeklenmesi için)
 */
export function getSolidExtent(solid: Solid3DObject): number {
  const { width, height, depth, radius } = solid.dimensions;
  const r = radius ? radius * 2 : 0;
  return Math.max(width || 0, height || 0, depth || 0, r, 1);
}

/** Köşe (pivot) işaretçisi yarıçapının cismin en büyük boyutuna oranı. */
export const VERTEX_MARKER_RATIO = 0.04;
/** İşaretçinin ekranda inebileceği en küçük yarıçap (piksel) — uzaklaşınca kaybolmasın. */
export const VERTEX_MARKER_MIN_PX = 5;
/** İşaretçinin ekranda çıkabileceği en büyük yarıçap (piksel) — yakınlaşınca cismi yutmasın. */
export const VERTEX_MARKER_MAX_PX = 14;

/**
 * Köşe (pivot) işaretçisi yarıçapı: cismin boyutuyla orantılı, makul sınırlar içinde
 */
export function getVertexMarkerRadius(solid: Solid3DObject, zoom?: number): number {
  const extent = getSolidExtent(solid);
  // Temel kural: işaretçi cismin boyutuyla ORANTILI olsun.
  const orantili = extent * VERTEX_MARKER_RATIO;

  // zoom verilmezse yalnızca dünya birimi sınırlarıyla kırp (geriye dönük davranış).
  if (!zoom || !(zoom > 0)) {
    return Math.min(0.32, Math.max(0.07, orantili));
  }

  // Perspektif kamerada bir nesnenin ekran yarıçapı = dünyaYarıçapı * zoom olduğundan,
  // piksel sınırlarını dünya birimine çevirip orantılı değeri o bandın içine kıstırıyoruz.
  // Böylece uzaklaşınca işaretçiler kaybolmaz, yakınlaşınca cismi yutan lekelere dönüşmez.
  const enAzDunya = VERTEX_MARKER_MIN_PX / zoom;
  const enCokDunya = VERTEX_MARKER_MAX_PX / zoom;
  return Math.min(enCokDunya, Math.max(enAzDunya, orantili));
}

/**
 * 3D Katı Cisim Hacim Hesabı
 */
export function calculate3DVolume(solid: Solid3DObject): number {
  const { type, dimensions } = solid;
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  switch (type) {
    case 'cube':
      return Math.pow(w, 3);
    case 'prism':
      return w * h * d;
    case 'triangular_prism':
      // Taban üçgeni: taban w, yükseklik h; prizma uzunluğu d
      return (w * h * d) / 2;
    case 'pyramid':
      return (w * d * h) / 3;
    case 'cone':
      return (Math.PI * Math.pow(r, 2) * h) / 3;
    case 'cylinder':
      return Math.PI * Math.pow(r, 2) * h;
    case 'sphere':
      return (4 / 3) * Math.PI * Math.pow(r, 3);
    default:
      return w * h * d;
  }
}

/**
 * 3D Katı Cisim Yüzey Alanı Hesabı
 */
export function calculate3DSurfaceArea(solid: Solid3DObject): number {
  if (
    solid.deletedFaces?.length ||
    solid.deletedVertices?.length ||
    (solid.vertexOffsets && Object.keys(solid.vertexOffsets).length > 0)
  ) {
    const mesh = generateSolidMesh({ ...solid, unfoldProgress: 0 });
    return mesh.faces.reduce((toplam, f) => toplam + computeFaceArea(mesh.vertices, f.vertexIndices), 0);
  }
  const { type, dimensions } = solid;
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  switch (type) {
    case 'cube':
      return 6 * Math.pow(w, 2);
    case 'prism':
      return 2 * (w * d + w * h + d * h);
    case 'triangular_prism': {
      // İki üçgen taban + alt dikdörtgen + iki eğik dikdörtgen (dik üçgende eğik yüzler farklı genişlikte)
      const ax = ucgenTepeX(solid);
      const slantL = Math.hypot(h, ax + w / 2);
      const slantR = Math.hypot(h, w / 2 - ax);
      return 2 * (w * h * 0.5) + w * d + (slantL + slantR) * d;
    }
    case 'pyramid': {
      // w kenarlı yüzlerin eğik yüksekliği d/2'ye, d kenarlı yüzlerinki w/2'ye bağlıdır
      const slantForW = Math.hypot(h, d / 2);
      const slantForD = Math.hypot(h, w / 2);
      return w * d + 2 * (w * slantForW * 0.5) + 2 * (d * slantForD * 0.5);
    }
    case 'cone': {
      const s = Math.sqrt(Math.pow(r, 2) + Math.pow(h, 2));
      return Math.PI * Math.pow(r, 2) + Math.PI * r * s;
    }
    case 'cylinder':
      return 2 * Math.PI * Math.pow(r, 2) + 2 * Math.PI * r * h;
    case 'sphere':
      return 4 * Math.PI * Math.pow(r, 2);
    default:
      return 6 * Math.pow(w, 2);
  }
}

/**
 * Katı Cismin Köşe (K), Ayrıt (E), Yüz (Y) sayıları
 */
export function getSolidPropertyCounts(type: Solid3DType): { vertices: number; edges: number; faces: number; eulerValid: boolean } {
  switch (type) {
    case 'cube':
      return { vertices: 8, edges: 12, faces: 6, eulerValid: 8 - 12 + 6 === 2 };
    case 'prism':
      return { vertices: 8, edges: 12, faces: 6, eulerValid: 8 - 12 + 6 === 2 };
    case 'triangular_prism':
      return { vertices: 6, edges: 9, faces: 5, eulerValid: 6 - 9 + 5 === 2 };
    case 'pyramid':
      return { vertices: 5, edges: 8, faces: 5, eulerValid: 5 - 8 + 5 === 2 };
    // Eğri yüzeyli cisimlerde köşe ve ayrıt sayılmaz (koninin tepe noktası köşe değildir); ilkokul şeridi bu
    // sayıları gösterir ve MAT.3.3.1 içeriğindeki tabloyla (silindir ve koni: 0 köşe, 0 ayrıt) aynı olmalıdır.
    case 'cone':
      return { vertices: 0, edges: 0, faces: 2, eulerValid: false };
    case 'cylinder':
      return { vertices: 0, edges: 0, faces: 3, eulerValid: false };
    case 'sphere':
      return { vertices: 0, edges: 0, faces: 1, eulerValid: false };
    default:
      return { vertices: 8, edges: 12, faces: 6, eulerValid: true };
  }
}
