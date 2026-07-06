# Mağaza Başvuru Notları — OTONBU GARAGE

Bu dosya, App Store Connect ve Google Play Console'a girilecek **hazır metinleri**
içerir. Uygulama giriş (auth) arkasında olduğu için hakeme çalışan bir demo hesabı
+ açık talimat vermek ZORUNLU — yoksa "giriş yapamadık" reddi gelir (en yaygın ret sebebi).

---

## 1. Demo hesabı (önce sen oluştur)

Hakem yeni kayıt + e-posta doğrulamasıyla uğraşmasın diye **önceden doğrulanmış bir
müşteri hesabı** hazırla:

1. Uygulamada normal kayıt ol (örn. `demo@otonbugarage.com` / güçlü bir şifre).
2. Gelen doğrulama e-postasındaki linke tıkla → hesap doğrulanır.
3. (Önerilir) Bu hesaba 1 araç ekle ki hakem randevu akışını görebilsin.
4. Aşağıdaki nota bu e-posta + şifreyi yaz.

> Not: Giriş ekranında hCaptcha kutusu build'de `EXPO_PUBLIC_HCAPTCHA_SITE_KEY`
> tanımlıysa görünür. Görünüyorsa hakemin kutuyu işaretlemesi gerekir — notta belirttik.

---

## 2. App Store Connect

**App Review Information → Sign-In required:** AÇIK (Yes)
**User name / Password:** demo hesabının e-postası / şifresi

**App Review Information → Notes (İngilizce, olduğu gibi yapıştır):**

```
OTONBU GARAGE is a mobile app for a car care & detailing service franchise
operating in Sakarya, Türkiye. The whole app is behind a login.

HOW TO SIGN IN
- Open the app, on the login screen enter the e-mail and password below.
- A hCaptcha checkbox may appear on the login screen — please complete it, then tap "Giriş Yap" (Log In).

DEMO ACCOUNT (customer role)
- E-mail: [demo@otonbugarage.com — buraya yaz]
- Password: [şifre — buraya yaz]

WHAT YOU CAN REVIEW
- Browse services and the store, view campaigns.
- Add a vehicle under "Araçlarım" (My Vehicles).
- Book an appointment ("Randevu Al"). Payment method is "pay at the branch" —
  NO real payment is charged in the app. Online payment is not enabled in this version.
- Notifications, loyalty points ("OTONBU Puanı"), profile.

ACCOUNT DELETION (Guideline 5.1.1(v))
- In-app: Profil (Profile) → "Verilerimi Sil" (Delete my data). This anonymizes
  personal data; legally required accounting records are kept unlinkable to the user.

NOTES
- The app language is Turkish.
- Subscriptions are intentionally disabled in this version.
- Privacy Policy: https://otonbu-gizlilik.otonbugarage.workers.dev
```

---

## 3. Google Play Console

**App content → App access:** "All or some functionality is restricted" seç →
her akış için giriş gerektiğini belirt ve aşağıyı gir:

```
Login is required to use the app.
- On the login screen enter the e-mail and password below.
- If a hCaptcha checkbox appears, complete it, then tap "Giriş Yap".

Demo account (customer):
E-mail: [demo@otonbugarage.com — buraya yaz]
Password: [şifre — buraya yaz]

No real payment is charged (appointments use "pay at branch").
Account deletion: Profile → "Verilerimi Sil".
```

**App content → Data safety:** Bölüm 4'teki tabloyu kullan.
**Privacy Policy URL:** https://otonbu-gizlilik.otonbugarage.workers.dev

---

## 4. Data Safety (Google) / Privacy Nutrition Labels (Apple) — toplanan veri

Gizlilik politikasıyla tutarlı doldur. Uygulamanın topladığı veri:

| Veri türü | Toplanıyor mu | Amaç | Kullanıcıya bağlı |
|---|---|---|---|
| Ad, e-posta, telefon | Evet | Hesap, hizmet ifası, iletişim | Evet |
| Araç bilgisi + belge görselleri (ruhsat/kasko) | Evet | Hizmet ifası | Evet |
| Fotoğraflar (profil, iş öncesi/sonrası) | Evet | Hizmet kaydı | Evet |
| Ödeme kayıtları (KART BİLGİSİ HARİÇ) | Evet | Tahsilat, muhasebe | Evet |
| Uygulama içi işlem (randevu, sipariş, puan) | Evet | Hizmet işletimi | Evet |
| Çökme/hata teşhis kayıtları (Sentry) | Evet | Kararlılık/teşhis | Evet* |
| Push token | Evet | Bildirim | Evet |
| Konum (GPS) | **HAYIR** | — | — |

*Sentry cihaz/hata bilgisi toplar; "app functionality / analytics" olarak beyan et.
Verinin şifreli aktarıldığını (HTTPS) ve kullanıcının silme talep edebildiğini işaretle.
Hiçbir veri reklam amacıyla üçüncü tarafa **satılmaz/paylaşılmaz**.

---

## 5. Yayın öncesi son kontrol
- [ ] Demo hesabı oluşturuldu + doğrulandı + araç eklendi, kimlik bilgileri notlara yazıldı
- [ ] Gizlilik politikası URL'si iki mağazaya da girildi
- [ ] Data safety / privacy labels dolduruldu
- [ ] Gizlilik politikasındaki yürürlük tarihi yazıldı
- [ ] (Gerçek kullanıcı akışı için) e-posta doğrulama deep-link'i canlıda çalışıyor:
      Supabase → Authentication → URL Configuration → Redirect allowlist'te
      `otonbu://(auth)/onay` ekli mi kontrol et
