'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera3D } from '@/types/workspace3d';
import { Home, RotateCcw, RotateCw } from 'lucide-react';

interface ViewCube3DProps {
  camera: Camera3D;
  setCamera: React.Dispatch<React.SetStateAction<Camera3D>>;
}

interface CubeFace {
  id: string;
  name: string;
  indices: number[];
  normal: { x: number; y: number; z: number };
  targetCamera: { rotX: number; rotY: number };
  color: string;
}

export function ViewCube3D({ camera, setCamera }: ViewCube3DProps) {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const size = 21;
  const cx = 45;
  const cy = 45;

  // 8 Küp Köşesi
  const rawVertices = [
    { x: -size, y: -size, z: -size }, // 0: Sol-Ön-Alt
    { x: size, y: -size, z: -size },  // 1: Sağ-Ön-Alt
    { x: size, y: size, z: -size },   // 2: Sağ-Arka-Alt
    { x: -size, y: size, z: -size },  // 3: Sol-Arka-Alt
    { x: -size, y: -size, z: size },  // 4: Sol-Ön-Üst
    { x: size, y: -size, z: size },   // 5: Sağ-Ön-Üst
    { x: size, y: size, z: size },    // 6: Sağ-Arka-Üst
    { x: -size, y: size, z: size },   // 7: Sol-Arka-Üst
  ];

  // 6 Küp Yüzeyi (Tinkercad Referansı)
  const faces: CubeFace[] = [
    {
      id: 'front',
      name: 'ÖN',
      indices: [0, 1, 5, 4],
      normal: { x: 0, y: -1, z: 0 },
      targetCamera: { rotX: 0, rotY: 0 },
      color: '#e2e8f0',
    },
    {
      id: 'right',
      name: 'SAĞ',
      indices: [1, 2, 6, 5],
      normal: { x: 1, y: 0, z: 0 },
      targetCamera: { rotX: 0, rotY: -90 },
      color: '#e2e8f0',
    },
    {
      id: 'back',
      name: 'ARKA',
      indices: [2, 3, 7, 6],
      normal: { x: 0, y: 1, z: 0 },
      targetCamera: { rotX: 0, rotY: 180 },
      color: '#e2e8f0',
    },
    {
      id: 'left',
      name: 'SOL',
      indices: [3, 0, 4, 7],
      normal: { x: -1, y: 0, z: 0 },
      targetCamera: { rotX: 0, rotY: 90 },
      color: '#e2e8f0',
    },
    {
      id: 'top',
      name: 'ÜST',
      indices: [4, 5, 6, 7],
      normal: { x: 0, y: 0, z: 1 },
      targetCamera: { rotX: 85, rotY: 0 },
      color: '#e2e8f0',
    },
    {
      id: 'bottom',
      name: 'ALT',
      indices: [3, 2, 1, 0],
      normal: { x: 0, y: 0, z: -1 },
      targetCamera: { rotX: -85, rotY: 0 },
      color: '#cbd5e1',
    },
  ];

  // Projeksiyon Hesaplaması
  //
  // Camera3D semantiği (Canvas3D -> buildCameraBasis ile birebir aynı olmalıdır):
  //   forward = ( sin(yaw)·cos(pitch),  cos(yaw)·cos(pitch), -sin(pitch) )
  //   up      = ( sin(yaw)·sin(pitch),  cos(yaw)·sin(pitch),  cos(pitch) )
  // Yani POZİTİF rotX kamerayı zeminin ÜSTÜNE çıkarır. Aşağıdaki formüller
  // (depthCam / upCam) pitch'i ters işaretle kullandığı için radPitch'i
  // negatifleyerek kübü kamerayla aynı yöne bakacak biçimde hizalıyoruz.
  const radPitch = -(camera.rotX * Math.PI) / 180;
  const radYaw = (camera.rotY * Math.PI) / 180;

  const projVertices = rawVertices.map((v) => {
    const x1 = v.x * Math.cos(radYaw) - v.y * Math.sin(radYaw);
    const y1 = v.x * Math.sin(radYaw) + v.y * Math.cos(radYaw);
    const z1 = v.z;

    const xCam = x1;
    const depthCam = y1 * Math.cos(radPitch) + z1 * Math.sin(radPitch);
    const upCam = z1 * Math.cos(radPitch) - y1 * Math.sin(radPitch);

    return {
      x: cx + xCam,
      y: cy - upCam,
      zDepth: depthCam,
    };
  });

  // Görünen Yüzeyleri Hesapla ve Derinliğe Göre Sırala
  const visibleFaces = faces
    .map((face) => {
      const p0 = projVertices[face.indices[0]];
      const p1 = projVertices[face.indices[1]];
      const p2 = projVertices[face.indices[2]];
      const p3 = projVertices[face.indices[3]];

      if (!p0 || !p1 || !p2 || !p3) return null;

      // 2D Eksen Vektörleri (Yüzey Düzlemine Yapışık Koordinat Sistemi)
      // ux, uy: Yüzeyin Yatay Vektörü (Soldan Sağa)
      const ux = (p1.x - p0.x + p2.x - p3.x) / 2;
      const uy = (p1.y - p0.y + p2.y - p3.y) / 2;

      // vx, vy: Yüzeyin Dikey Vektörü (Yukarıdan Aşağıya - SVG Text Uyumlu)
      const vx = (p0.x - p3.x + p1.x - p2.x) / 2;
      const vy = (p0.y - p3.y + p1.y - p2.y) / 2;

      // 2D Determinant / Cross Product (Ön Yüzey / Görünürlük Kontrolü)
      const det = ux * vy - uy * vx;
      if (det <= 15) return null; // Arka veya çok dar açılı yüzey

      const avgZ = (p0.zDepth + p1.zDepth + p2.zDepth + p3.zDepth) / 4;
      const centerX = (p0.x + p1.x + p2.x + p3.x) / 4;
      const centerY = (p0.y + p1.y + p2.y + p3.y) / 4;
      const points = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

      // 100x100 Birimlik Yüzey Düzlem Matrisi
      const matrix = `${ux / 100} ${uy / 100} ${vx / 100} ${vy / 100} ${centerX} ${centerY}`;

      return {
        ...face,
        avgZ,
        centerX,
        centerY,
        points,
        matrix,
        isVisibleText: det > 60,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.avgZ || 0) - (a?.avgZ || 0));

  // Küp Üzerinden Doğrudan Döndürme
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      // Aşağı sürüklemek kamerayı yükseltir (cismin üstünü görürsünüz).
      // Pozitif rotX = kamera zeminin üstünde olduğu için işaret artıdır.
      setCamera((prev) => ({
        ...prev,
        rotY: (prev.rotY - dx * 0.7) % 360,
        rotX: Math.max(-85, Math.min(85, prev.rotX + dy * 0.7)),
      }));
    },
    [setCamera]
  );

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Kamera Görünümünü Ayarla
  const handleSetView = (target: { rotX: number; rotY: number }) => {
    setCamera((prev) => ({
      ...prev,
      rotX: target.rotX,
      rotY: target.rotY,
      panX: 0,
      // Tam tepeden / tam alttan bakışta zemin kaydırması gerekmez
      panY: Math.abs(target.rotX) >= 85 ? 0 : 30,
    }));
  };

  return (
    <div
      className="absolute top-14 left-4 z-30 flex flex-col items-center select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Üst Hızlı Kontrol Düğmeleri (Ev & Döndürme) */}
      <div className="flex items-center gap-1 mb-1.5 p-1 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 shadow-md">
        <button
          onClick={() => handleSetView({ rotX: 25, rotY: -40 })}
          title="İzometrik Başlangıç Görünümü"
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCamera((prev) => ({ ...prev, rotY: (prev.rotY + 45) % 360 }))}
          title="45° Sola Döndür"
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCamera((prev) => ({ ...prev, rotY: (prev.rotY - 45) % 360 }))}
          title="45° Sağa Döndür"
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tinkercad Stili 3D Navigasyon Küpü */}
      <div
        className="w-[90px] h-[90px] rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-lg p-0.5 cursor-grab active:cursor-grabbing flex items-center justify-center relative overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <svg width="90" height="90" className="overflow-visible">
          {visibleFaces.map((face) => {
            if (!face) return null;
            const isHovered = hoveredFace === face.id;

            return (
              <g
                key={`viewcube-${face.id}`}
                className="cursor-pointer group/cube"
                onMouseEnter={() => setHoveredFace(face.id)}
                onMouseLeave={() => setHoveredFace(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetView(face.targetCamera);
                }}
              >
                {/* Yüzey Çokgeni */}
                <polygon
                  points={face.points}
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                  className={`transition-colors stroke-ada-murekkep-2 dark:stroke-ada-fildisi/40 ${
                    isHovered ? 'fill-primary' : 'fill-ada-kum dark:fill-ada-murekkep-2'
                  }`}
                />

                {/* Yüzey Düzlemine 3D Yapışık Yazı (Affine Transform) */}
                {face.isVisibleText && (
                  <g transform={`matrix(${face.matrix})`}>
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="32"
                      fontWeight="900"
                      letterSpacing="2"
                      className={`font-sans select-none pointer-events-none ${
                        isHovered ? 'fill-primary-foreground' : 'fill-ada-murekkep dark:fill-ada-fildisi'
                      }`}
                    >
                      {face.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
