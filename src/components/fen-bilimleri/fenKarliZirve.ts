import * as THREE from 'three';

/** Snow follows the existing northern summit, without touching the campus. */
export function karliZirveyiKapla(kok: THREE.Object3D): void {
  const cevre = kok.getObjectByName('environment');
  if (!cevre) return;
  const islenen = new Set<THREE.MeshStandardMaterial>();
  cevre.traverse((nesne) => {
    if (!(nesne instanceof THREE.Mesh)) return;
    for (const malzeme of Array.isArray(nesne.material) ? nesne.material : [nesne.material]) {
      if (!(malzeme instanceof THREE.MeshStandardMaterial) || islenen.has(malzeme)) continue;
      const agac = /forest\d|(?:^|[ ·])leaf2?(?:$|\.)/i.test(malzeme.name);
      if (!agac && !/yumuşak çayır|omuz çayırı|cliff\d|canyon_stratum/i.test(malzeme.name)) continue;
      islenen.add(malzeme);
      const onceki = malzeme.onBeforeCompile;
      malzeme.onBeforeCompile = (shader, renderer) => {
        onceki.call(malzeme, shader, renderer);
        shader.uniforms.uKarRengi = { value: new THREE.Color('#eff6fa') };
        shader.uniforms.uKarAgaci = { value: agac ? 1 : 0 };
        shader.vertexShader = `varying vec3 vKarDunya; varying vec3 vKarNormal;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vKarDunya=(modelMatrix*vec4(transformed,1.)).xyz;
            vKarNormal=normalize(mat3(modelMatrix)*objectNormal);
          `);
        shader.fragmentShader = `varying vec3 vKarDunya; varying vec3 vKarNormal;
          uniform vec3 uKarRengi; uniform float uKarAgaci;\n${shader.fragmentShader}`
          .replace('#include <color_fragment>', `#include <color_fragment>
            vec2 karP=vKarDunya.xz-vec2(12.,-40.);
            float zirve=1.-smoothstep(10.,13.,length(karP));
            float dalga=sin(karP.x*.82+karP.y*.43)*.55
              +sin(karP.y*1.37-karP.x*.28)*.28+sin(karP.x*2.4+karP.y*1.8)*.13;
            float karHatti=8.2+dalga*1.65+uKarAgaci;
            float yukseklik=smoothstep(karHatti-.25,karHatti+.7,vKarDunya.y);
            float egim=smoothstep(.28,.76,normalize(vKarNormal).y);
            egim=mix(egim,1.,smoothstep(13.,16.,vKarDunya.y));
            // Snow settles on the upper needles and crown surfaces; shaded
            // undersides stay green so each tier of the tree remains legible.
            egim=mix(egim,smoothstep(-.04,.57,normalize(vKarNormal).y),uKarAgaci);
            // Kar doğrudan çayıra iner; ara "alpin kaya" bandı yoktur (ızgara kenarlarında
            // testere dişi gibi görünen kahverengi açıklıklar bırakıyordu).
            float kar=zirve*yukseklik*egim;
            diffuseColor.rgb=mix(diffuseColor.rgb,uKarRengi*(.97+dalga*.025),kar);
          `);
      };
      malzeme.customProgramCacheKey = () => `fen-kuzey-karli-zirve-v3-${agac ? 'agac' : 'arazi'}`;
      malzeme.needsUpdate = true;
    }
  });
}
