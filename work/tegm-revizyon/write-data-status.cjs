const fs=require('fs');const cp=require('child_process');
const middle={
22:'Kategorik grafikte sıklık dikey, değişken adı yatay eksene taşındı.',
23:'Öğrenci metinlerinde “koyarak” ifadesi zaten bulunmuyordu; doğrulandı.',
24:'Sütun ve çizgi eksenlerinde açık > biçimli ok uçları kullanılıyor.',
25:'Okun sivri ucu eksen çizgisinin ucuyla hizalı; eksen adındaki ok karakterleri kaldırıldı.',
26:'Açıklık açıklaması ve hesaplama adımı “en büyük değer − en küçük değer” oldu.',
27:'Noktadan sütuna dönüşümde dolgu saydamlığı 0,55; değer çizgileri görünür.',
28:'Daire açıklamasında açı-yüzde arasındaki nokta kaldırıldı; sayısal etiket ayıracı uzun çizgi oldu. Ortaokulda açı zaten tamamen kaldırıldı.',
29:'Ortaokul daire grafiklerinde yaklaşık işareti yerine “yaklaşık” sözcüğü kullanılıyor.',
30:'Ankara sıcaklık tahmin sorusundan sence kaldırıldı ve cümle düzenlendi.',
31:'İki ay arasındaki en fazla sıcaklık artışını soran açık yönerge eklendi.',
32:'Ekim değeri, Eylül–Ekim ve Ekim–Kasım azalışlarını soran yönerge eklendi.',
33:'Sıcaklık değerlerini yinelemeyen “Temmuz ayı ocak ayından yaklaşık 59 kat sıcaktır” iddiasını sorgulayan cümle eklendi.',
34:'Noktalar nereye gitti yerine sütun yüksekliği ile nokta sayısının ilişkisi soruldu.',
35:'Uyku 9→11 olurken Diğer 2→0; kalan etkinlikler sabit. Yönerge, cevap ve öğretmen notu tutarlı.',
36:'Aritmetik ortalama ve ortancanın daha fazla veri bulunan bölgedeki konumunu soran cümle eklendi.',
37:'Başlangıç açıklaması seçilen verilerle grafiklerin oluşturulduğunu açıkça anlatıyor.',
38:'Çizgi grafiği dikey eksen alanı sıfırı kapsıyor; pozitif veride kesilmiş eksen yanıltması giderildi.',
39:'Bağımsız öğrenci verilerinde çizgi sekmesi pasif ve durum dönüşümü sütuna yönlendiriyor.',
40:'Belirsiz istisna sorusu çıkarılıp çalışma sürelerinin açıklığını karşılaştıran soru/cevap eklendi; bu saçılım örneği yalnız lise zenginleştirmesinde.',
41:'Bağımsız ad/kod/kategori ve sayısal öğrenci numarası çizgi grafiğine bağlanamıyor; uyarı, düğme, klavye ve kayıt yüklemesi aynı kurala uyuyor.',
42:'5–8 örneklerinin ve sınıfsız ortaokul oturumunun saçılım sekmesi kaldırıldı; saçılım zenginleştirmeleri ortaokul galerisinden çıkarıldı.',
43:'Sınıf başkanlığı araştırma sorusu adayların aldığı oyların dağılımı olarak düzeltildi.',
44:'Sıklık tablolarından merkez açı ve yüzde hesabı açıklaması kaldırıldı. Göreli sıklık yalnız 6. sınıf para/sayı küpü deney bağlamında açılıyor.',
45:'Ortaokul kategorik değişken görünümünde +Sütun düğmesi kaldırıldı.',
46:'Örneklerin başlıkları ayrı bırakılarak araştırma soruları evren/değişken/zaman ve dağılım-değişim açısından düzenlendi.',
47:'Hazır anket ve ölçüm araştırma soruları dağılımı açıkça soruyor; keşif soruları rehber adımlarında duruyor.',
48:'Araştırma soruları düzeltildi; merkez açı hesaplamaları ortaokul daire görünümünden kaldırıldı.',
49:'Gerçek sıcaklık verilerinin araştırma sorusunda MGM ve ölçüm periyotları belirtildi; mevcut kaynak bağlantıları korundu.',
50:'Fide verisi 0,1 cm duyarlıkta ondalıklı ölçümlere dönüştürüldü, araştırma sorusu ve anlatım güncellendi. Boy ölçümünün veri toplama duyarlığı da 0,1 cm.',
51:'Ortalama mutlak sapma bandı ve kesikli sınırlar altın rengi; ortalama kendi seri renginde.',
52:'Tüm ortaokul örnekleri ve ortaokul serbest/araştırma tablolarında merkez açı metinleri gizlendi.',
53:'Farkların birbirini götürmesi yerine pozitif sapmalar toplamının negatif sapmaların mutlak değerleri toplamına eşitliği açıklandı.',
54:'Saçılım ortaokulda kapalı; lise oturumunda kullanılabilir.',
55:'Daire dilimi seçimindeki merkez açı formülü, derece etiketi ve merkez yayı ortaokulda kaldırıldı.',
56:'6. sınıf daire örneklerinde derece ve merkez açı bulunmuyor.',
57:'Bir dilime dokunun merkez açı hesabı ifadesi ortaokulda değer bilgisini gösteren nötr ipucuyla değiştirildi.',
58:'Araştırma/boş tablolar dahil ortaokul dairelerinde açı gösterimleri kaldırıldı.',
59:'6. sınıf değişkenleri merkez açıyla etiketlenmiyor.',
60:'Uyku 0–24 saat, nabız 1–250 ve ulaşım 0–1440 dakika bağlam sınırları tekli/toplu girişte uygulanıyor. Tablo yapıştırması ve grafik sürüklemesi de aynı sınırdan geçiyor; 25/80 saat ve 500 nabız kabul edilmiyor.'
};
const primary={
10:['clarification','4. sınıf hazır örneğinde sütun grafiği korundu. Rapordaki 2018 programı maddesiyle çelişki parent ile değerlendirildi; sınıf seçimi/program geçiş revizyonları son kullanıcı talimatıyla kapsam dışı.'],
11:['implemented','Şekil grafiğine “Her bir veri bir şekle karşılık gelmektedir.” anahtarı eklendi.'],
12:['implemented','1–4 örneklerde aynı çerçeveli tablo yapısı kullanılıyor; gruplu veriler de bu düzeni izliyor.'],
13:['implemented','Sekme adı “Çetele ve sıklık tablosu” oldu.'],
14:['implemented','İlkokul sınıfsız boş tabloda sütun yerine şekil grafiği ve çetele/sıklık tablosu sunuluyor.'],
21:['implemented','1. sınıf galeri önizlemesi nesne resimleri, 2. sınıf kare şekilleri gösteriyor; gerçek grafiklerle tutarlı.'],
22:['implemented','Çetele ve sıklık iki ayrı başlıklı, çerçeveli tabloda sunuluyor.'],
23:['implemented','1. sınıf nesne grafiği ders kitabı gibi yatay tablo: sol sütunda kategori, sağda eş büyüklükte resimler; her resim 1 öğrenci.'],
24:['excluded_by_user','Program yılı/sınıf seçimi revizyonları son kullanıcı talimatıyla uygulanmadı.']
};
const files=cp.execFileSync('git',['diff','--name-only','--','src/components/uygulamalar/veri-grafik'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\r?\n/).filter(Boolean);
files.push('src/components/uygulamalar/veri-grafik/NesneGrafigi.tsx','src/components/uygulamalar/veri-grafik/veriSinirlari.ts','src/components/uygulamalar/veri-grafik/__tests__/tegm-revizyon.test.tsx');
const out={scope:'Veri ve Grafik',reports:['TEGM ortaokul Dinamik Matematik Yazılımı İnceleme raporu.docx','TEGM Dinamik Matematik Yazılımı İnceleme raporu-1.docx'],rows:[...Object.entries(middle).map(([row,note])=>({report:'ortaokul',row:+row,status:+row===23?'already_satisfied':'implemented',note})),...Object.entries(primary).map(([row,[status,note]])=>({report:'ilkokul',row:+row,status,note}))],clarifications:[{report:'ilkokul',row:10,note:'4. sınıf hazır örneğinde sütun grafiğinin kaldırılması ile aynı rapordaki 2018 programı isteği çelişiyor; program/sınıf geçişi kapsam dışı bırakıldığı için mevcut örnek korundu. Parent kararı doğrultusunda yalnız bu kalan grafik türü konusu istenirse kullanıcıya sorulabilir.'}],user_overrides:['Sınıf seçimi ve 2026–27 program geçişine bağlı erişim değişiklikleri uygulanmadı.','Oturumun kademesi root tarafından sağlanıyor; ortaokul serbest tablolarda ileri lise özellikleri kapalı.'],files,tests:[{command:'npx vitest run src/components/uygulamalar/veri-grafik --reporter=json --outputFile=work/tegm-revizyon/data-tests-final.json',result:'pending-final-rerun',report:'work/tegm-revizyon/data-tests-final.json'},{command:'npx tsc --noEmit --pretty false',result:'passed before final small QA refinements; final rerun pending'}],visual_qa:'Root tarafından localhost tarayıcı kontrolü yürütülüyor.',limitations:['Bağlamsal sınırlar değişken adından tanınır; tamamen yeniden adlandırılmış serbest değişkenin anlamı sistemce çıkarılmaz.','4. sınıf hazır örneğindeki sütun grafiği parent kararıyla korundu.']};
fs.writeFileSync('work/tegm-revizyon/data-graph-status.json',JSON.stringify(out,null,2)+'\n');
