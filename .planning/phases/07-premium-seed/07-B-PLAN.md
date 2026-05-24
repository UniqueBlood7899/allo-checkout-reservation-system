# Plan 07-B: Premium Seed Catalog — 100 Products × 4 Warehouses

**Phase:** 07 — Premium Seed Catalog
**Plan:** B — Full prisma/seed.ts rewrite
**Depends on:** Phase 1 (schema), Plan A (ProductAvatar categories validated)
**Status:** Ready to execute

---

## Goal

Rewrite `prisma/seed.ts` with a curated static catalog:
- 4 specialized warehouses
- 100 products across 10 categories
- ~300 inventory rows with realistic uneven distribution
- All 5 stock states represented intentionally
- Deterministic: stable hardcoded IDs, no faker dependency
- Idempotent: `upsert` with stable IDs (safe to re-run)

---

## Warehouse Specialization Model

```
wh-nyc  — NYC Fulfillment Hub       (New York, NY)     → audio, electronics, peripherals, accessories
wh-lax  — LA Distribution Center    (Los Angeles, CA)  → footwear, fitness, wearables, bags
wh-aus  — Austin Tech Center        (Austin, TX)       → gaming, home-office, peripherals, electronics
wh-chi  — Chicago Logistics Hub     (Chicago, IL)      → bags, accessories, mixed (all categories, lower qty)
```

Each warehouse carries **most** categories but is strong in 3–4 and thin on others.

---

## Inventory Distribution Rules

| Product category | NYC qty | LAX qty | AUS qty | CHI qty |
|-----------------|---------|---------|---------|---------|
| audio | 30–80 | 5–15 | 5–20 | 10–30 |
| electronics | 20–60 | 0–10 | 15–50 | 10–25 |
| gaming | 5–15 | 0–10 | 30–80 | 5–20 |
| footwear | 10–20 | 40–80 | 0–10 | 15–30 |
| wearables | 10–25 | 25–60 | 5–15 | 10–20 |
| fitness | 5–15 | 30–70 | 5–15 | 10–25 |
| bags | 10–25 | 20–50 | 5–15 | 30–60 |
| peripherals | 20–50 | 5–15 | 30–70 | 10–25 |
| home-office | 15–40 | 5–10 | 25–60 | 10–20 |
| accessories | 30–60 | 20–40 | 15–30 | 25–50 |

**Edge cases (hardcoded per product):**
- 8 products get `qty=1` in exactly one warehouse (race condition showcase)
- 12 products get `qty=2–5` in one warehouse (low-stock badge)
- 4 products get `qty=0` in two warehouses (partial out-of-stock)
- 1 product gets `qty=0` everywhere (full out-of-stock showcase)

---

## Full Product Catalog

### Audio (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-aud-001 | Nova ANC Headphones | AUD-ANC-NVA-001 | $189.99 | 40hr active noise cancellation with premium leather ear cups |
| prod-aud-002 | Aura Studio Monitors | AUD-MON-AUR-002 | $349.99 | Reference-grade near-field monitors for professional mixing |
| prod-aud-003 | Echo True Wireless Earbuds | AUD-TWS-ECH-003 | $89.99 | IPX5-rated earbuds with 32hr total playtime and wireless charging case |
| prod-aud-004 | Drift Open-Ear Buds | AUD-OEB-DRF-004 | $119.99 | Bone-adjacent open-ear design for ambient awareness during workouts |
| prod-aud-005 | Lunar DAC Amplifier | AUD-DAC-LNR-005 | $229.99 | High-resolution USB DAC/amp with balanced 4.4mm output |
| prod-aud-006 | Vibe Portable Speaker | AUD-SPK-VIB-006 | $79.99 | 360° waterproof speaker with 20hr battery and party sync |
| prod-aud-007 | Halo Gaming Headset | AUD-GHS-HAL-007 | $149.99 | 7.1 virtual surround with detachable cardioid mic and RGB lighting |
| prod-aud-008 | Zenith Bone Conduction | AUD-BCN-ZNT-008 | $159.99 | Open-ear bone conduction headphones for runners, IP67-rated |
| prod-aud-009 | Apex Sport Earphones | AUD-EPH-APX-009 | $59.99 | Wired in-ear monitors with replaceable MMCX cables |
| prod-aud-010 | Pulse Studio Headphones | AUD-STD-PLS-010 | $279.99 | 50mm planar-adjacent drivers with foldable aluminum frame |

### Electronics (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-elc-011 | Prism 4K Webcam | ELC-CAM-PRS-011 | $199.99 | 4K 30fps webcam with auto-focus, ring light, and dual noise-cancelling mics |
| prod-elc-012 | Flash USB-C Hub 7-in-1 | ELC-HUB-FLS-012 | $69.99 | Slim aluminum hub with 4K HDMI, 100W PD, SD/microSD, and 3× USB-A |
| prod-elc-013 | Arc Portable Charger 26800mAh | ELC-CHG-ARC-013 | $89.99 | 65W GaN tri-port power bank with digital battery display |
| prod-elc-014 | Helios LED Desk Lamp | ELC-LMP-HLS-014 | $49.99 | Adjustable color temperature desk lamp with wireless charging base |
| prod-elc-015 | Strobe LED Strip Kit 5m | ELC-LED-STB-015 | $34.99 | RGBIC addressable LED strip with app control and music sync |
| prod-elc-016 | Titan UPS 650VA | ELC-UPS-TTN-016 | $139.99 | Battery backup UPS with surge protection and 4 output sockets |
| prod-elc-017 | Core Smart Power Strip | ELC-PWR-COR-017 | $54.99 | 6-outlet smart strip with USB-C PD, energy monitoring, and voice control |
| prod-elc-018 | Nimbus Air Purifier | ELC-AIR-NMB-018 | $179.99 | H13 HEPA 3-stage purifier with CADR 300 and PM2.5 sensor |
| prod-elc-019 | Echo Smart Display 10" | ELC-DSP-ECH-019 | $249.99 | 10" smart home hub display with ambient mode and smart device control |
| prod-elc-020 | Quartz Monitor Light | ELC-LGT-QTZ-020 | $69.99 | USB-powered monitor light bar with auto-dimming and color temperature |

### Gaming (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-gam-021 | Vertex Mechanical Keyboard | GAM-KB-VTX-021 | $159.99 | TKL hot-swap mechanical keyboard with per-key RGB and PBT keycaps |
| prod-gam-022 | Apex Pro Controller | GAM-CTL-APX-022 | $89.99 | Hall-effect wireless controller with haptic triggers and 40hr battery |
| prod-gam-023 | Phantom Gaming Mouse | GAM-MSE-PHM-023 | $79.99 | 26K DPI optical sensor, 65g ultralight shell with honeycomb design |
| prod-gam-024 | Rift RGB Mouse Pad XL | GAM-PAD-RFT-024 | $39.99 | 900×400mm hard surface mat with 16-zone RGB border |
| prod-gam-025 | Nova Streaming Deck | GAM-SDK-NVA-025 | $199.99 | 15-key LCD stream controller with customizable profiles and plugins |
| prod-gam-026 | Prism Capture Card 4K | GAM-CAP-PRS-026 | $149.99 | USB 3.0 capture card supporting 4K60 passthrough and 1080p60 encoding |
| prod-gam-027 | Storm Cooling Pad Pro | GAM-CPD-STM-027 | $49.99 | Dual 140mm fan laptop cooling pad with 5-height adjustment and RGB |
| prod-gam-028 | Atlas Headset Stand | GAM-STD-ATL-028 | $29.99 | Weighted aluminum headset stand with USB-A passthrough hub |
| prod-gam-029 | Vector USB Switch 4-Port | GAM-USB-VCT-029 | $44.99 | One-touch USB KVM switch sharing 4 USB devices between 2 computers |
| prod-gam-030 | Halo Full-Size Keyboard | GAM-KBF-HAL-030 | $129.99 | Full-size gaming keyboard with optical switches and magnetic wrist rest |

### Footwear (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-ftw-031 | Atlas Trail Runner | FTW-TRL-ATL-031 | $134.99 | Rock-plate trail shoe with Vibram outsole and responsive foam stack |
| prod-ftw-032 | Strider Road Shoe | FTW-RD-STR-032 | $119.99 | Neutral-cushion road runner with breathable engineered mesh upper |
| prod-ftw-033 | Zenith Hiking Boot | FTW-HIK-ZNT-033 | $189.99 | Waterproof Gore-Tex mid-cut hiking boot with Vibram Megagrip |
| prod-ftw-034 | Drift Everyday Sneaker | FTW-SNK-DRF-034 | $99.99 | Low-profile lifestyle sneaker with premium suede toe cap |
| prod-ftw-035 | Apex Performance Cleat | FTW-CLT-APX-035 | $129.99 | Firm-ground football cleat with TPU chassis and sock-fit upper |
| prod-ftw-036 | Nova Recovery Slide | FTW-SLD-NVA-036 | $49.99 | Contoured foam recovery sandal with adjustable single-strap |
| prod-ftw-037 | Pulse Low-Top Trainer | FTW-LT-PLS-037 | $89.99 | Court-inspired low-top with herringbone outsole for indoor sports |
| prod-ftw-038 | Halo Court Shoe | FTW-CRT-HAL-038 | $109.99 | Lateral support court shoe with non-marking rubber and cushioned insole |
| prod-ftw-039 | Vector Minimalist Flat | FTW-MIN-VCT-039 | $79.99 | Zero-drop minimalist flat with 4mm outsole and wide toe box |
| prod-ftw-040 | Storm Waterproof Boot | FTW-WPB-STM-040 | $159.99 | Insulated winter boot with 200g Thinsulate lining and waterproof shell |

### Wearables (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-wrb-041 | Pulse Smartwatch Pro | WRB-SW-PLS-041 | $299.99 | AMOLED smartwatch with ECG, SpO2, sleep staging, and 14-day battery |
| prod-wrb-042 | Arc Fitness Band | WRB-FB-ARC-042 | $89.99 | Slim fitness band with 24/7 heart rate, stress tracking, and 7-day battery |
| prod-wrb-043 | Echo Smart Ring | WRB-SR-ECH-043 | $199.99 | Titanium smart ring with sleep, HRV, and activity tracking |
| prod-wrb-044 | Nova GPS Watch | WRB-GPS-NVA-044 | $349.99 | Multi-band GPS sports watch with topographic maps and 21-day battery |
| prod-wrb-045 | Prism Smart Glasses | WRB-GL-PRS-045 | $249.99 | UV400 smart glasses with open-ear speakers and 6hr audio playback |
| prod-wrb-046 | Halo Heart Rate Monitor | WRB-HRM-HAL-046 | $69.99 | Dual chest strap HRM with ANT+ and Bluetooth dual-band support |
| prod-wrb-047 | Zenith Sleep Tracker | WRB-ST-ZNT-047 | $129.99 | Contactless under-mattress sleep tracker with bedroom environment sensing |
| prod-wrb-048 | Vector Sports Watch | WRB-SPT-VCT-048 | $179.99 | Solar-assist sports watch with barometric altimeter and 30-day battery |
| prod-wrb-049 | Apex Health Band | WRB-HB-APX-049 | $149.99 | CGM-compatible health band with skin temp, SpO2, and hydration reminders |
| prod-wrb-050 | Drift Smart Sunglasses | WRB-SGS-DRF-050 | $219.99 | Polarized smart sunglasses with bone conduction audio and gesture control |

### Fitness (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-fit-051 | Atlas Resistance Bands Set | FIT-RBD-ATL-051 | $34.99 | 5-band progressive resistance set with carabiners and door anchor |
| prod-fit-052 | Storm Adjustable Dumbbells | FIT-DBL-STM-052 | $299.99 | Dial-adjust 5–52.5lb dumbbell pair with stand, replaces 15 sets |
| prod-fit-053 | Nova Yoga Mat Premium | FIT-YMT-NVA-053 | $59.99 | 6mm non-slip natural rubber yoga mat with alignment lines |
| prod-fit-054 | Pulse Jump Rope Pro | FIT-JRP-PLS-054 | $29.99 | Ball-bearing speed rope with adjustable cable and counter handle |
| prod-fit-055 | Apex Pull-Up Bar | FIT-PUB-APX-055 | $79.99 | Multi-grip doorframe pull-up bar with foam grips, no screws required |
| prod-fit-056 | Halo Ab Roller Pro | FIT-ABR-HAL-056 | $24.99 | Dual-wheel ab roller with ergonomic knurled handles and knee pad |
| prod-fit-057 | Zenith Foam Roller 33cm | FIT-FRL-ZNT-057 | $34.99 | Deep-tissue foam roller with tri-zone texture and EVA core |
| prod-fit-058 | Drift Kettlebell 24kg | FIT-KTB-DRF-058 | $89.99 | Competition-grade cast iron kettlebell with flat base and color coding |
| prod-fit-059 | Vector Gym Bag 45L | FIT-GBG-VCT-059 | $59.99 | Ventilated gym bag with separate wet compartment and shoe tunnel |
| prod-fit-060 | Core Balance Board | FIT-BBD-COR-060 | $69.99 | Cork-top wobble balance board for stability and rehab training |

### Bags (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-bag-061 | Nova Commuter Pack 22L | BAG-CMT-NVA-061 | $89.99 | Clamshell commuter backpack with 15" laptop sleeve and hidden zips |
| prod-bag-062 | Apex Camera Backpack 25L | BAG-CAM-APX-062 | $129.99 | Modular camera backpack with customizable dividers and tripod straps |
| prod-bag-063 | Zenith Travel Duffel 40L | BAG-DFL-ZNT-063 | $99.99 | Packable 40L duffel with removable shoulder strap and carry-on compliance |
| prod-bag-064 | Prism Tote Organizer | BAG-TOT-PRS-064 | $49.99 | Structured nylon tote with built-in organizer panel and magnetic closure |
| prod-bag-065 | Atlas Laptop Sleeve 15" | BAG-SLV-ATL-065 | $39.99 | Neoprene laptop sleeve with felt lining and front accessory pocket |
| prod-bag-066 | Drift Crossbody Sling 8L | BAG-SLG-DRF-066 | $54.99 | Convertible sling bag with anti-slash panel and RFID-blocked pocket |
| prod-bag-067 | Echo Packing Cube Set | BAG-PCB-ECH-067 | $34.99 | 4-piece compression packing cube set with mesh top panels |
| prod-bag-068 | Storm Weekender Bag 32L | BAG-WKD-STM-068 | $119.99 | Premium waxed canvas weekender with leather accents and shoe pocket |
| prod-bag-069 | Halo Tech Organizer | BAG-TCO-HAL-069 | $44.99 | Cable and tech organizer case with elastic loops and velcro dividers |
| prod-bag-070 | Vector Waist Pack 3L | BAG-WST-VCT-070 | $34.99 | Slim waist pack with water-resistant coating and quick-release buckle |

### Peripherals (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-per-071 | Arc Wireless Mouse | PER-MSE-ARC-071 | $69.99 | Tri-mode wireless mouse with 4K polling rate and 70hr battery |
| prod-per-072 | Prism Slim Keyboard BT | PER-KB-PRS-072 | $99.99 | Ultra-slim Bluetooth keyboard with scissor switches and 3-device pairing |
| prod-per-073 | Nova Vertical Mouse | PER-VME-NVA-073 | $59.99 | Ergonomic vertical mouse with adjustable DPI and wired/wireless modes |
| prod-per-074 | Halo Trackpad Pro | PER-TRP-HAL-074 | $149.99 | Large-format haptic trackpad with gesture support and wireless charging |
| prod-per-075 | Zenith Wrist Rest Set | PER-WRS-ZNT-075 | $29.99 | Memory foam wrist rest set (keyboard + mouse) with anti-slip base |
| prod-per-076 | Pulse USB-C Docking Station | PER-DKS-PLS-076 | $179.99 | 14-in-1 Thunderbolt 4 dock with dual 4K, 96W PD, and 2.5G Ethernet |
| prod-per-077 | Atlas Cable Management Kit | PER-CMK-ATL-077 | $19.99 | 45-piece cable organizer kit with velcro straps, clips, and cable box |
| prod-per-078 | Drift Monitor Arm Dual | PER-MNA-DRF-078 | $119.99 | Dual monitor arm with gas spring, cable channel, and VESA 75/100 |
| prod-per-079 | Core Laptop Stand | PER-LST-COR-079 | $49.99 | Adjustable aluminum laptop stand with 6-height levels and folding design |
| prod-per-080 | Storm KVM Switch 4-Port | PER-KVM-STM-080 | $89.99 | USB-C 4K KVM switch with hotkey control for 2 computers sharing 4 USB |

### Home Office (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-hom-081 | Apex 4K Monitor 27" | HOM-MON-APX-081 | $449.99 | 4K IPS 27" monitor with USB-C 96W PD, 144Hz, and factory calibration |
| prod-hom-082 | Nova Standing Desk 60" | HOM-DSK-NVA-082 | $699.99 | Electric height-adjustable desk with memory presets and cable tray |
| prod-hom-083 | Prism Desk Divider | HOM-DIV-PRS-083 | $79.99 | Acoustic felt desk divider with magnetic mount and cable pass-through |
| prod-hom-084 | Atlas Ergonomic Chair | HOM-CHR-ATL-084 | $599.99 | Full-mesh ergonomic task chair with lumbar support and 4D armrests |
| prod-hom-085 | Zenith Monitor Light Bar | HOM-LTB-ZNT-085 | $59.99 | Clip-on monitor light bar with asymmetric optics and wireless dial control |
| prod-hom-086 | Echo Desk Organizer Set | HOM-ORG-ECH-086 | $39.99 | 5-piece modular desk organizer set with bamboo finish |
| prod-hom-087 | Pulse Ambient Light Panel | HOM-LPL-PLS-087 | $89.99 | RGBIC flat panel light for desk setups with scene modes and music sync |
| prod-hom-088 | Halo USB Speakerphone | HOM-SPK-HAL-088 | $119.99 | 360° omnidirectional speakerphone with AI noise suppression and USB-C |
| prod-hom-089 | Drift Under-Desk Drawer | HOM-DRW-DRF-089 | $54.99 | Clamp-mount under-desk drawer with soft-close rail and cable routing slot |
| prod-hom-090 | Core Monitor Privacy Filter | HOM-PRV-COR-090 | $44.99 | Anti-glare privacy filter for 27" monitors with magnetic installation |

### Accessories (10 products)
| ID | Name | SKU | Price | Description |
|----|------|-----|-------|-------------|
| prod-acc-091 | Nova Phone Stand MagSafe | ACC-STD-NVA-091 | $39.99 | Adjustable MagSafe-compatible desk stand with 360° rotation |
| prod-acc-092 | Pulse Cable Clips 20-Pack | ACC-CLP-PLS-092 | $12.99 | Self-adhesive silicone cable clips in 3 sizes with reusable backing |
| prod-acc-093 | Atlas Screen Protector Kit | ACC-SPK-ATL-093 | $19.99 | Tempered glass screen protector kit with alignment frame and cleaning set |
| prod-acc-094 | Drift Cleaning Kit Pro | ACC-CLN-DRF-094 | $24.99 | 10-piece screen and keyboard cleaning kit with microfiber cloths |
| prod-acc-095 | Zenith Wireless Charger Duo | ACC-WCH-ZNT-095 | $59.99 | Dual-coil wireless charging pad supporting 15W fast charge for 2 devices |
| prod-acc-096 | Echo Smart Tracker 4-Pack | ACC-TRK-ECH-096 | $89.99 | Bluetooth item trackers with replaceable battery and precision finding |
| prod-acc-097 | Halo HDMI 2.1 Cable 2m | ACC-CBL-HAL-097 | $24.99 | 48Gbps HDMI 2.1 cable supporting 8K60 and 4K144, braided nylon sleeve |
| prod-acc-098 | Prism USB-C Adapter Kit | ACC-ADP-PRS-098 | $34.99 | 6-piece USB-C adapter kit covering HDMI, VGA, DisplayPort, and USB-A |
| prod-acc-099 | Vector Cable Organizer | ACC-CBO-VCT-099 | $14.99 | Leather-wrapped desktop cable organizer with 5 slots and weighted base |
| prod-acc-100 | Core Scratch Repair Kit | ACC-RPK-COR-100 | $19.99 | Screen and chassis scratch repair kit with UV-cure polymer and applicators |

---

## Inventory Assignment (per product per warehouse)

### Edge case overrides (applied after defaults):
- `qty=1` in one WH: prod-aud-001 (NYC), prod-gam-021 (AUS), prod-ftw-033 (LAX), prod-wrb-041 (LAX), prod-hom-082 (AUS), prod-per-076 (NYC), prod-fit-052 (LAX), prod-hom-081 (AUS)
- `qty=3` in one WH: prod-aud-010 (CHI), prod-elc-019 (NYC), prod-gam-025 (AUS), prod-ftw-031 (NYC), prod-wrb-044 (LAX), prod-bag-068 (CHI)
- `qty=0` at some WH (out-of-stock at that location): prod-elc-019 (LAX=0), prod-gam-022 (NYC=0), prod-ftw-039 (AUS=0, CHI=0)
- `qty=0` everywhere: prod-hom-082 (full out-of-stock — high demand, depleted)

---

## Implementation Structure

```typescript
// prisma/seed.ts

const WAREHOUSES = [
  { id: 'wh-nyc', name: 'NYC Fulfillment Hub', location: 'New York, NY' },
  { id: 'wh-lax', name: 'LA Distribution Center', location: 'Los Angeles, CA' },
  { id: 'wh-aus', name: 'Austin Tech Center', location: 'Austin, TX' },
  { id: 'wh-chi', name: 'Chicago Logistics Hub', location: 'Chicago, IL' },
]

// Products: array of { id, name, sku, price, description }
const PRODUCTS = [ ...100 items... ]

// Inventory: array of { id, productId, warehouseId, qty }
// id convention: `inv-${productId.slice(5)}-${warehouseId.slice(3)}`
// e.g. inv-aud-001-nyc, inv-aud-001-lax
const INVENTORY = [ ...~300 rows... ]

// Seed loop: upsert warehouses → upsert products → upsert inventory
```

---

## Tasks

1. Write the complete `prisma/seed.ts` with all 100 products, 4 warehouses, ~300 inventory rows
2. `npx prisma db seed` — verify seed runs cleanly
3. `GET /api/products` — verify all 100 products returned
4. Commit: `git add prisma/seed.ts && git commit -m "feat(07-B): premium 100-product seed catalog with 4 warehouses"`

---

## Verification

- [ ] `npx prisma db seed` exits 0, prints "✅ Seed complete: 4 warehouses, 100 products, N inventory rows"
- [ ] `GET /api/products | jq length` → 100
- [ ] At least 1 product with `availableQty=1`
- [ ] At least 1 product with `availableQty=0` at some warehouse
- [ ] At least 1 product with `availableQty` between 2 and 5
