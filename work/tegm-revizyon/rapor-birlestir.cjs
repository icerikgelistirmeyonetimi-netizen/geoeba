const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,''));
const drawing = read('drawing-status.json');
const data = read('data-graph-status.json');
const algorithm = read('algorithm-status.json');
const rows = [...drawing.rows.map(r=>({...r,status:'uygulandı'})),...data.rows.map(r=>({report:r.report,row:r.row,status:({implemented:'uygulandı',already_satisfied:'zaten karşılanmış',clarification:'yanıt bekliyor',excluded_by_user:'kapsam dışı'})[r.status],detail:r.note}))];
for (const r of algorithm.completed) for(const row of r.rows) rows.push({report:r.report,row,status:'uygulandı',detail:r.detail});
for (const r of algorithm.unclear) rows.push({report:r.report,row:r.row,status:'yanıt bekliyor',detail:r.question});
rows.push({report:'ortaokul',row:2,status:'kapsam dışı',detail:'Sınıf seçimi ve program yılına bağlı erişim değişikliği uygulanmadı.'});
for (const row of [61,65]) rows.push({report:'ortaokul',row,status:'uygulandı',detail:'Ortaokul oturumunda yakınsama grafiği, logaritmik ölçek ve Büyük Sayılar Kanunu bölümü gösterilmiyor.'});
rows.push({report:'ortaokul',row:62,status:'uygulandı',detail:'Karşılaştırma etiketleri Öznel Olasılık, Deneysel Olasılık ve Teorik Olasılık oldu.'});
for (const row of [63,64]) rows.push({report:'ortaokul',row,status:'kapsam dışı',detail:'Sınıf seçimine bağlı olasılık ekranı/deney erişimi revizyonu uygulanmadı.'});
rows.push({report:'ortaokul',row:66,status:'uygulandı',detail:'Yapışır ifadesi yerine deneme sayısıyla deneysel oranın teorik olasılığa yaklaşma eğilimi açıklandı.'});
rows.push({report:'ortaokul',row:67,status:'uygulandı',detail:'3B sahne küçültüldü; geniş ekranda veri/kontrol ve grafik sütunlarına daha çok alan ayrıldı.'});
rows.push({report:'ortaokul',row:68,status:'zaten karşılanmış',detail:'Mevcut gerçek madeni para yüzleri tarayıcıda doğrulandı.'});
for (const row of [7,8,9]) rows.push({report:'ilkokul',row,status:'uygulandı',detail:'Torba şeffaflaştırıldı; gerçek renk/adetlerde bilyeler 3B ve SVG gösterimine eklendi.'});
rows.sort((a,b)=>a.report.localeCompare(b.report)||a.row-b.row);
const eksik=[];
for(const [report,end] of [['ilkokul',24],['ortaokul',76]]) for(let row=2;row<=end;row++) if(!rows.some(r=>r.report===report&&r.row===row))eksik.push({report,row});
if(eksik.length)throw new Error(JSON.stringify(eksik));
const output={date:'2026-10-15',scope:'İki TEGM inceleme raporu ve kademe oturumu',row_numbering:'DOCX tablo satırlarının sıfırdan başlayan indeksidir; kaynak raporlarda tespit numarası hücreleri boştur.',summary:rows.reduce((a,r)=>({...a,[r.status]:(a[r.status]||0)+1}),{}),session:['İlk açılışta adalar görünür. Atölye ile mevcut sınıf yaklaşması ve EBA yüklemesi tamamlanır; aynı EBA ekranında üç kademe kutusu alttan yükselir.','Atölyedeki uygulamalar ve araçlar seçili kademeye göre açılır.','Oturum değiştirme, sınıf yaklaşmasını tekrarlamadan aynı EBA ekranındaki kutulara döndürür.','Sınıf seçimine ilişkin rapor revizyonları uygulanmadı.'],questions:[{report:'ortaokul',row:72,question:'7. sınıf algoritma içerikleri hangi öğrenme çıktısına göre revize edilmeli? Çıktı kodu ve ilgili görev belirtilmemiş.'},{report:'ilkokul',row:10,question:'4. sınıf örneğindeki sütun grafiği şekil grafiğiyle değiştirilsin mi? Raporda hem kaldırılması hem 2018 programının korunması isteniyor; mevcut örnek korundu.'}],rows};
output.session.push('Çizim, 3B sahne, veri-grafik ve olasılık kayıtları kademe bazında ayrıldı; eski ortak kayıtlar silinmedi.');
output.visual_checks = [
  'İlk açılışta adalar; Atölye içinde yüklemeden sonra aynı EBA zemininde üç oturum kutusu.',
  'İlkokul, ortaokul ve lise girişleri; stüdyo araçlarının seçilen kademeye uyarlanması.',
  'Stüdyo ve Başlat menüsünden Oturumu değiştir ile giriş ekranına dönüş.',
  'Ortaokulda doğrusal fonksiyon şablonu ve −x grafiği.',
  '1440×900 olasılık ekranı: veri/grafik sütunları geniş, yakınsama bölümü yok.',
  'İlkokulda şeffaf torbanın içinde doğru sayıda ve renkte bilye.',
  'İlkokul yatay nesne grafiği ile ayrı çetele ve sıklık tabloları.',
  '5. sınıf algoritmada dört gösterim sekmesi ve aritmetik açıklama paneli.'
];
if(fs.existsSync(path.join(root,'final-tests.json'))) {
  const t=read('final-tests.json');
  output.tests={total:t.numTotalTests,passed:t.numPassedTests,failed:t.numFailedTests,success:t.success,report:'final-tests.json'};
}
fs.writeFileSync(path.join(root,'revizyon-durumu.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));

