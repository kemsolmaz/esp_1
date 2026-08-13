# Vamos — Premium Güncelleme

## Cloudflare Pages'e Yükleme
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets.
2. Bu klasördeki tüm dosyaları (index.html, a1-a2.html, b1.html, b2.html, c1.html, c2.html, assets/) sürükle-bırak yükle.
3. Build command / output directory gerekmiyor — statik site olduğu için doğrudan yayınlanır.
4. Yayınlandıktan sonra kendi domainini "Custom domains" kısmından bağlayabilirsin.

## Bu Güncellemede Neler Değişti

**İçerik**
- Her seviyede kelime sayısı 12'den 76–84'e çıkarıldı (A1-A2: 84, B1: 81, B2: 78, C1: 77, C2: 76).
- Her kelimeye gerçek bağlamda örnek cümle + Türkçe çevirisi eklendi.
- Kelime kartlarının arkasında artık sadece anlam değil, örnek cümle de gösteriliyor.

**Yeni Özellikler**
- 🔊 Telaffuz: her kartta ve bulmaca çözümünde tek tıkla İspanyolca sesli okuma (tarayıcı üstü, ek maliyet yok).
- 🔀 Kart karıştırma butonu.
- 🔥 Günlük çalışma serisi (streak) takibi.
- Seviye tamamlama yüzdesi + ilerleme çubuğu.
- Konfeti animasyonu (eşleştirme oyununu tamamlayınca).
- İlerlemeyi dışa/içe aktarma (JSON dosyası) — öğrenci ilerlemesini öğretmene gönderebilir.

**Teknik / Kritik Düzeltme**
- Eski sistem `window.storage` kullanıyordu — bu sadece Claude Artifacts ortamında çalışır, Cloudflare gibi bağımsız hosting'te **çalışmazdı**. `localStorage`'a çevrildi, artık bağımsız hosting'te sorunsuz çalışıyor.
- Mobilde seviye menüsü (Kelime Kartları / Eşleştirme / Bulmaca / İlerleme sekmeleri) önceden tamamen gizleniyordu ve erişilemiyordu — hamburger menü eklenerek düzeltildi.
- Not: İlerleme artık öğrencinin kendi tarayıcısında saklanıyor (cihaza özel). Merkezi/bulut bir öğretmen paneli istersen bu ayrı bir backend (ör. Cloudflare Workers + D1/KV) gerektirir — istersen bir sonraki adımda bunu da kurabiliriz.
