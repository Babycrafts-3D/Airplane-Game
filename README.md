# Wolkenhaven

Sprookjesachtige luchtverkeersleider-game voor iOS en Android: teken met je vinger een route van elk
binnenkomend vliegtuig naar de landingsbaan. Toestellen mogen elkaar niet raken (binnen 60 m is een
bijna-botsing, binnen 10 m een botsing). Zes eilanden, oplopend in moeilijkheid, met wind, meerdere
banen, watervliegtuigen en helikopters. Na een mislukte missie krijg je een herhaling en een analyse
van wat er precies misging.

## Stack
- Vite + TypeScript, Canvas 2D (alle graphics procedureel getekend, geen assets)
- Capacitor 7 voor de native iOS/Android-shell
- PWA-manifest, dus ook direct installeerbaar vanuit de browser

## Ontwikkelen
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

## Android (Android Studio nodig)
```bash
npm run cap:android   # bouwt web, synct naar android/ en opent Android Studio
```
Daarna in Android Studio: Build > Generate Signed Bundle voor de Play Store.

## iOS (Mac met Xcode nodig)
```bash
npm run cap:ios       # bouwt web, synct naar ios/ en opent Xcode
```
Op de Mac eerst eenmalig `cd ios/App && pod install`. Daarna in Xcode: signing team kiezen, archiveren, uploaden naar TestFlight.

## Iconen
`npm run icons` genereert PWA-iconen en Android launcher icons uit een SVG (scripts/icons.mjs).
Voor iOS: `public/icons/icon-1024.png` in Xcode slepen naar Assets > AppIcon.

## Structuur
- `src/game/` simulatie: vliegtuigen (echte types), levels, wind, botsingen, post-mortem analyse
- `src/render/` terrein, decor, vliegtuigtekeningen, effecten, HUD
- `src/ui/` DOM-schermen en de herhaling
