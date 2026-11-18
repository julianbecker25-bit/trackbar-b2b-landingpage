# Trackbar B2B Landingpage

Das ist die Landingpage für Trackbar B2B, helle Version. Stand 18.11.2026.

## Ordnerstruktur

- `index.html`: die Landingpage
- `assets/`: Bilder und Grafiken
- `demo/`: interaktive Demo mit eigenem JavaScript
- `kunden/`: Kundenseite
- `datenschutz/`: Datenschutzseite
- `netlify/functions/`: Formular- und Lead-Funktionen
- `netlify.toml`, `_headers`, `_redirects`: Netlify-Konfiguration

## Lokal ansehen

Starte im Ordner einen statischen Server:

```
npx serve .
```

Dann öffnest Du die angezeigte Adresse im Browser.

## Formular-Funktionen

Die Funktionen unter `netlify/functions` brauchen diese ENV-Variablen. Hier stehen nur die Namen, keine Werte:

- `TB_ALLOWED_HOSTS`
- `TB_LEAD_NOTIFY_TO`
- `TB_MAIL_FROM`
- `TB_MAIL_REPLY_TO`
- `TB_META_SECRET`
- `TB_RESEND_API_KEY`
- `TB_SEVEN_IO_API_KEY`
- `TB_SITE_URL`
- `TB_SMS_DEFAULT_CC`
- `TB_SMS_SENDER`

## Deploy auf Netlify

```
netlify deploy --dir=. --functions=netlify/functions --site=<eigene Site-ID>
```
