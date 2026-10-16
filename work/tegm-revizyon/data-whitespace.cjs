const fs=require('fs');const p='src/components/uygulamalar/veri-grafik/KategorikGrafikler.tsx';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/[ \t]+\r?$/gm,''));
