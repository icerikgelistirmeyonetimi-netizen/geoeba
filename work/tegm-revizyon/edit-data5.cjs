const fs=require('fs');const b='src/components/uygulamalar/veri-grafik/';const edit=(f,fn)=>fs.writeFileSync(b+f,fn(fs.readFileSync(b+f,'utf8')));
edit('NoktaGrafigi.tsx',s=>s.replace("import { EksenOklari }", "import { NesneGrafigi } from './NesneGrafigi';\nimport { EksenOklari }").replace('  return (\n    <svg\n      ref={svgRef}',"  if (isaret === 'nesne') return <NesneGrafigi tablo={tablo} sutun={sutun} sira={kategoriSirasi} genislik={W} yukseklik={H} onSatirSec={onSatirSec} />;\n  return (\n    <svg\n      ref={svgRef}"));
edit('OrnekGalerisi.tsx',s=>s.replace("import React", "import { NesneIsareti } from './nesneSimgeleri';\nimport React").replace('  if (tur === \'daire\') {',`  if (ornek.sinif === 1 || ornek.sinif === 2) {
    return [3, 4, 2].flatMap((adet, i) => Array.from({length: adet}, (_, j) =>
      ornek.sinif === 1 ? <g key={i + '-' + j} transform={\`translate(\${9+j*7}, \${10+i*10})\`}><NesneIsareti nesne={i === 0 ? 'top' : i === 1 ? 'araba' : 'ayicik'} r={3} dolgu={kategoriRengi('',i)} kenar="none" kenarKalinligi={0}/></g> : <rect key={i + '-' + j} x={8+j*7} y={7+i*10} width={5} height={5} fill={kategoriRengi('',i)} />));
  }
  if (tur === 'daire') {`));
// Araştırma özeti bağımsız öğrenci kategorileri değildir: deneme sayısına göre değişim çizilebilir.
edit('durum.ts',s=>s.replace("if (d.sekme === 'cizgi' && cizgiSiraNotuGerekli", "if (d.sekme === 'cizgi' && d.etkinKume === 'tablom' && sayisalDegiskenSayisi(etkinTablo(d)) > 0 && cizgiSiraNotuGerekli"));
edit('index.tsx',s=>s.replace('const cizgiUygun = !cizgiSiraNotuGerekli(tablo);',"const cizgiUygun = etkinKume === 'ozet' || !cizgiSiraNotuGerekli(tablo);"));
