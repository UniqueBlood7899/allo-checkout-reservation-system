/**
 * Premium Seed — Allo Checkout Reservation System
 *
 * 4 specialized warehouses × 100 curated products × ~300 inventory rows.
 * Deterministic: stable hardcoded IDs, no faker. Idempotent via upsert.
 *
 * Warehouse specializations:
 *   wh-nyc — NYC Fulfillment Hub      → audio, electronics, peripherals, accessories
 *   wh-lax — LA Distribution Center   → footwear, fitness, wearables, bags
 *   wh-aus — Austin Tech Center        → gaming, home-office, peripherals, electronics
 *   wh-chi — Chicago Logistics Hub     → bags, accessories, mixed
 *
 * Stock state coverage (intentional edge cases):
 *   qty=1  → 8 products (concurrency race condition showcase)
 *   qty=3  → 6 products (low-stock badge)
 *   qty=0  → partial OOS at specific warehouses
 *   qty=0  → Nova Standing Desk — fully depleted everywhere
 */

import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Check your .env file.')
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

const WAREHOUSES = [
  { id: 'wh-nyc', name: 'NYC Fulfillment Hub',       location: 'New York, NY' },
  { id: 'wh-lax', name: 'LA Distribution Center',    location: 'Los Angeles, CA' },
  { id: 'wh-aus', name: 'Austin Tech Center',         location: 'Austin, TX' },
  { id: 'wh-chi', name: 'Chicago Logistics Hub',      location: 'Chicago, IL' },
]

// ─── Products ─────────────────────────────────────────────────────────────────
// { id, name, sku, price (as number), description }

const PRODUCTS = [
  // ── Audio (10) ──────────────────────────────────────────────────────────
  { id: 'prod-aud-001', name: 'Nova ANC Headphones',          sku: 'AUD-ANC-NVA-001', price: 189.99, description: '40hr active noise cancellation with premium leather ear cups' },
  { id: 'prod-aud-002', name: 'Aura Studio Monitors',         sku: 'AUD-MON-AUR-002', price: 349.99, description: 'Reference-grade near-field monitors for professional mixing' },
  { id: 'prod-aud-003', name: 'Echo True Wireless Earbuds',   sku: 'AUD-TWS-ECH-003', price:  89.99, description: 'IPX5 earbuds with 32hr total playtime and wireless charging case' },
  { id: 'prod-aud-004', name: 'Drift Open-Ear Buds',          sku: 'AUD-OEB-DRF-004', price: 119.99, description: 'Bone-adjacent open-ear design for ambient awareness during workouts' },
  { id: 'prod-aud-005', name: 'Lunar DAC Amplifier',          sku: 'AUD-DAC-LNR-005', price: 229.99, description: 'High-resolution USB DAC/amp with balanced 4.4mm output' },
  { id: 'prod-aud-006', name: 'Vibe Portable Speaker',        sku: 'AUD-SPK-VIB-006', price:  79.99, description: '360° waterproof speaker with 20hr battery and party sync' },
  { id: 'prod-aud-007', name: 'Halo Gaming Headset',          sku: 'AUD-GHS-HAL-007', price: 149.99, description: '7.1 virtual surround with detachable cardioid mic and RGB lighting' },
  { id: 'prod-aud-008', name: 'Zenith Bone Conduction',       sku: 'AUD-BCN-ZNT-008', price: 159.99, description: 'Open-ear bone conduction headphones for runners, IP67-rated' },
  { id: 'prod-aud-009', name: 'Apex Sport Earphones',         sku: 'AUD-EPH-APX-009', price:  59.99, description: 'Wired in-ear monitors with replaceable MMCX cables' },
  { id: 'prod-aud-010', name: 'Pulse Studio Headphones',      sku: 'AUD-STD-PLS-010', price: 279.99, description: '50mm planar-adjacent drivers with foldable aluminum frame' },

  // ── Electronics (10) ────────────────────────────────────────────────────
  { id: 'prod-elc-011', name: 'Prism 4K Webcam',              sku: 'ELC-CAM-PRS-011', price: 199.99, description: '4K 30fps webcam with auto-focus and dual noise-cancelling mics' },
  { id: 'prod-elc-012', name: 'Flash USB-C Hub 7-in-1',       sku: 'ELC-HUB-FLS-012', price:  69.99, description: 'Slim aluminum hub with 4K HDMI, 100W PD, and 3× USB-A ports' },
  { id: 'prod-elc-013', name: 'Arc Portable Charger 26800mAh',sku: 'ELC-CHG-ARC-013', price:  89.99, description: '65W GaN tri-port power bank with digital battery display' },
  { id: 'prod-elc-014', name: 'Helios LED Desk Lamp',         sku: 'ELC-LMP-HLS-014', price:  49.99, description: 'Adjustable color temperature desk lamp with wireless charging base' },
  { id: 'prod-elc-015', name: 'Strobe LED Strip Kit 5m',      sku: 'ELC-LED-STB-015', price:  34.99, description: 'RGBIC addressable LED strip with app control and music sync' },
  { id: 'prod-elc-016', name: 'Titan UPS 650VA',              sku: 'ELC-UPS-TTN-016', price: 139.99, description: 'Battery backup UPS with surge protection and 4 output sockets' },
  { id: 'prod-elc-017', name: 'Core Smart Power Strip',       sku: 'ELC-PWR-COR-017', price:  54.99, description: '6-outlet smart strip with USB-C PD, energy monitoring, and voice control' },
  { id: 'prod-elc-018', name: 'Nimbus Air Purifier',          sku: 'ELC-AIR-NMB-018', price: 179.99, description: 'H13 HEPA 3-stage purifier with CADR 300 and PM2.5 sensor display' },
  { id: 'prod-elc-019', name: 'Echo Smart Display 10"',       sku: 'ELC-DSP-ECH-019', price: 249.99, description: '10" smart home hub display with ambient mode and device control' },
  { id: 'prod-elc-020', name: 'Quartz Monitor Light',         sku: 'ELC-LGT-QTZ-020', price:  69.99, description: 'USB-powered monitor light bar with auto-dimming and color temperature' },

  // ── Gaming (10) ─────────────────────────────────────────────────────────
  { id: 'prod-gam-021', name: 'Vertex Mechanical Keyboard',   sku: 'GAM-KB-VTX-021',  price: 159.99, description: 'TKL hot-swap mechanical keyboard with per-key RGB and PBT keycaps' },
  { id: 'prod-gam-022', name: 'Apex Pro Controller',          sku: 'GAM-CTL-APX-022', price:  89.99, description: 'Hall-effect wireless controller with haptic triggers and 40hr battery' },
  { id: 'prod-gam-023', name: 'Phantom Gaming Mouse',         sku: 'GAM-MSE-PHM-023', price:  79.99, description: '26K DPI optical sensor, 65g ultralight shell with honeycomb design' },
  { id: 'prod-gam-024', name: 'Rift RGB Mouse Pad XL',        sku: 'GAM-PAD-RFT-024', price:  39.99, description: '900×400mm hard surface mat with 16-zone RGB border' },
  { id: 'prod-gam-025', name: 'Nova Streaming Deck',          sku: 'GAM-SDK-NVA-025', price: 199.99, description: '15-key LCD stream controller with customizable profiles and plugins' },
  { id: 'prod-gam-026', name: 'Prism Capture Card 4K',        sku: 'GAM-CAP-PRS-026', price: 149.99, description: 'USB 3.0 capture card supporting 4K60 passthrough and 1080p60 encoding' },
  { id: 'prod-gam-027', name: 'Storm Cooling Pad Pro',        sku: 'GAM-CPD-STM-027', price:  49.99, description: 'Dual 140mm fan laptop cooling pad with 5-height adjustment and RGB' },
  { id: 'prod-gam-028', name: 'Atlas Headset Stand',          sku: 'GAM-STD-ATL-028', price:  29.99, description: 'Weighted aluminum headset stand with USB-A passthrough hub' },
  { id: 'prod-gam-029', name: 'Vector USB Switch 4-Port',     sku: 'GAM-USB-VCT-029', price:  44.99, description: 'One-touch USB KVM switch sharing 4 USB devices between 2 computers' },
  { id: 'prod-gam-030', name: 'Halo Full-Size Keyboard',      sku: 'GAM-KBF-HAL-030', price: 129.99, description: 'Full-size gaming keyboard with optical switches and magnetic wrist rest' },

  // ── Footwear (10) ───────────────────────────────────────────────────────
  { id: 'prod-ftw-031', name: 'Atlas Trail Runner',           sku: 'FTW-TRL-ATL-031', price: 134.99, description: 'Rock-plate trail shoe with Vibram outsole and responsive foam stack' },
  { id: 'prod-ftw-032', name: 'Strider Road Shoe',            sku: 'FTW-RD-STR-032',  price: 119.99, description: 'Neutral-cushion road runner with breathable engineered mesh upper' },
  { id: 'prod-ftw-033', name: 'Zenith Hiking Boot',           sku: 'FTW-HIK-ZNT-033', price: 189.99, description: 'Waterproof Gore-Tex mid-cut hiking boot with Vibram Megagrip outsole' },
  { id: 'prod-ftw-034', name: 'Drift Everyday Sneaker',       sku: 'FTW-SNK-DRF-034', price:  99.99, description: 'Low-profile lifestyle sneaker with premium suede toe cap' },
  { id: 'prod-ftw-035', name: 'Apex Performance Cleat',       sku: 'FTW-CLT-APX-035', price: 129.99, description: 'Firm-ground football cleat with TPU chassis and sock-fit upper' },
  { id: 'prod-ftw-036', name: 'Nova Recovery Slide',          sku: 'FTW-SLD-NVA-036', price:  49.99, description: 'Contoured foam recovery sandal with adjustable single-strap' },
  { id: 'prod-ftw-037', name: 'Pulse Low-Top Trainer',        sku: 'FTW-LT-PLS-037',  price:  89.99, description: 'Court-inspired low-top with herringbone outsole for indoor sports' },
  { id: 'prod-ftw-038', name: 'Halo Court Shoe',              sku: 'FTW-CRT-HAL-038', price: 109.99, description: 'Lateral support court shoe with non-marking rubber and cushioned insole' },
  { id: 'prod-ftw-039', name: 'Vector Minimalist Flat',       sku: 'FTW-MIN-VCT-039', price:  79.99, description: 'Zero-drop minimalist flat with 4mm outsole and wide toe box' },
  { id: 'prod-ftw-040', name: 'Storm Waterproof Boot',        sku: 'FTW-WPB-STM-040', price: 159.99, description: 'Insulated winter boot with 200g Thinsulate lining and waterproof shell' },

  // ── Wearables (10) ──────────────────────────────────────────────────────
  { id: 'prod-wrb-041', name: 'Pulse Smartwatch Pro',         sku: 'WRB-SW-PLS-041',  price: 299.99, description: 'AMOLED smartwatch with ECG, SpO2, sleep staging, and 14-day battery' },
  { id: 'prod-wrb-042', name: 'Arc Fitness Band',             sku: 'WRB-FB-ARC-042',  price:  89.99, description: 'Slim fitness band with 24/7 heart rate, stress tracking, and 7-day battery' },
  { id: 'prod-wrb-043', name: 'Echo Smart Ring',              sku: 'WRB-SR-ECH-043',  price: 199.99, description: 'Titanium smart ring with sleep, HRV, and activity tracking' },
  { id: 'prod-wrb-044', name: 'Nova GPS Watch',               sku: 'WRB-GPS-NVA-044', price: 349.99, description: 'Multi-band GPS sports watch with topographic maps and 21-day battery' },
  { id: 'prod-wrb-045', name: 'Prism Smart Glasses',          sku: 'WRB-GL-PRS-045',  price: 249.99, description: 'UV400 smart glasses with open-ear speakers and 6hr audio playback' },
  { id: 'prod-wrb-046', name: 'Halo Heart Rate Monitor',      sku: 'WRB-HRM-HAL-046', price:  69.99, description: 'Dual chest strap HRM with ANT+ and Bluetooth dual-band support' },
  { id: 'prod-wrb-047', name: 'Zenith Sleep Tracker',         sku: 'WRB-ST-ZNT-047',  price: 129.99, description: 'Contactless under-mattress sleep tracker with bedroom environment sensing' },
  { id: 'prod-wrb-048', name: 'Vector Sports Watch',          sku: 'WRB-SPT-VCT-048', price: 179.99, description: 'Solar-assist sports watch with barometric altimeter and 30-day battery' },
  { id: 'prod-wrb-049', name: 'Apex Health Band',             sku: 'WRB-HB-APX-049',  price: 149.99, description: 'CGM-compatible health band with skin temp, SpO2, and hydration reminders' },
  { id: 'prod-wrb-050', name: 'Drift Smart Sunglasses',       sku: 'WRB-SGS-DRF-050', price: 219.99, description: 'Polarized smart sunglasses with bone conduction audio and gesture control' },

  // ── Fitness (10) ────────────────────────────────────────────────────────
  { id: 'prod-fit-051', name: 'Atlas Resistance Bands Set',   sku: 'FIT-RBD-ATL-051', price:  34.99, description: '5-band progressive resistance set with carabiners and door anchor' },
  { id: 'prod-fit-052', name: 'Storm Adjustable Dumbbells',   sku: 'FIT-DBL-STM-052', price: 299.99, description: 'Dial-adjust 5–52.5lb dumbbell pair with stand, replaces 15 sets' },
  { id: 'prod-fit-053', name: 'Nova Yoga Mat Premium',        sku: 'FIT-YMT-NVA-053', price:  59.99, description: '6mm non-slip natural rubber yoga mat with alignment lines' },
  { id: 'prod-fit-054', name: 'Pulse Jump Rope Pro',          sku: 'FIT-JRP-PLS-054', price:  29.99, description: 'Ball-bearing speed rope with adjustable cable and counter handle' },
  { id: 'prod-fit-055', name: 'Apex Pull-Up Bar',             sku: 'FIT-PUB-APX-055', price:  79.99, description: 'Multi-grip doorframe pull-up bar with foam grips, no screws required' },
  { id: 'prod-fit-056', name: 'Halo Ab Roller Pro',           sku: 'FIT-ABR-HAL-056', price:  24.99, description: 'Dual-wheel ab roller with ergonomic knurled handles and knee pad' },
  { id: 'prod-fit-057', name: 'Zenith Foam Roller 33cm',      sku: 'FIT-FRL-ZNT-057', price:  34.99, description: 'Deep-tissue foam roller with tri-zone texture and EVA core' },
  { id: 'prod-fit-058', name: 'Drift Kettlebell 24kg',        sku: 'FIT-KTB-DRF-058', price:  89.99, description: 'Competition-grade cast iron kettlebell with flat base and color coding' },
  { id: 'prod-fit-059', name: 'Vector Gym Bag 45L',           sku: 'FIT-GBG-VCT-059', price:  59.99, description: 'Ventilated gym bag with separate wet compartment and shoe tunnel' },
  { id: 'prod-fit-060', name: 'Core Balance Board',           sku: 'FIT-BBD-COR-060', price:  69.99, description: 'Cork-top wobble balance board for stability and rehab training' },

  // ── Bags (10) ───────────────────────────────────────────────────────────
  { id: 'prod-bag-061', name: 'Nova Commuter Pack 22L',       sku: 'BAG-CMT-NVA-061', price:  89.99, description: 'Clamshell commuter backpack with 15" laptop sleeve and hidden zips' },
  { id: 'prod-bag-062', name: 'Apex Camera Backpack 25L',     sku: 'BAG-CAM-APX-062', price: 129.99, description: 'Modular camera backpack with customizable dividers and tripod straps' },
  { id: 'prod-bag-063', name: 'Zenith Travel Duffel 40L',     sku: 'BAG-DFL-ZNT-063', price:  99.99, description: 'Packable 40L duffel with removable shoulder strap and carry-on compliance' },
  { id: 'prod-bag-064', name: 'Prism Tote Organizer',         sku: 'BAG-TOT-PRS-064', price:  49.99, description: 'Structured nylon tote with built-in organizer panel and magnetic closure' },
  { id: 'prod-bag-065', name: 'Atlas Laptop Sleeve 15"',      sku: 'BAG-SLV-ATL-065', price:  39.99, description: 'Neoprene laptop sleeve with felt lining and front accessory pocket' },
  { id: 'prod-bag-066', name: 'Drift Crossbody Sling 8L',     sku: 'BAG-SLG-DRF-066', price:  54.99, description: 'Convertible sling bag with anti-slash panel and RFID-blocked pocket' },
  { id: 'prod-bag-067', name: 'Echo Packing Cube Set',        sku: 'BAG-PCB-ECH-067', price:  34.99, description: '4-piece compression packing cube set with mesh top panels' },
  { id: 'prod-bag-068', name: 'Storm Weekender Bag 32L',      sku: 'BAG-WKD-STM-068', price: 119.99, description: 'Waxed canvas weekender with leather accents and dedicated shoe pocket' },
  { id: 'prod-bag-069', name: 'Halo Tech Organizer',          sku: 'BAG-TCO-HAL-069', price:  44.99, description: 'Cable and tech organizer case with elastic loops and velcro dividers' },
  { id: 'prod-bag-070', name: 'Vector Waist Pack 3L',         sku: 'BAG-WST-VCT-070', price:  34.99, description: 'Slim waist pack with water-resistant coating and quick-release buckle' },

  // ── Peripherals (10) ────────────────────────────────────────────────────
  { id: 'prod-per-071', name: 'Arc Wireless Mouse',           sku: 'PER-MSE-ARC-071', price:  69.99, description: 'Tri-mode wireless mouse with 4K polling rate and 70hr battery life' },
  { id: 'prod-per-072', name: 'Prism Slim Keyboard BT',       sku: 'PER-KB-PRS-072',  price:  99.99, description: 'Ultra-slim Bluetooth keyboard with scissor switches and 3-device pairing' },
  { id: 'prod-per-073', name: 'Nova Vertical Mouse',          sku: 'PER-VME-NVA-073', price:  59.99, description: 'Ergonomic vertical mouse with adjustable DPI and wired/wireless modes' },
  { id: 'prod-per-074', name: 'Halo Trackpad Pro',            sku: 'PER-TRP-HAL-074', price: 149.99, description: 'Large-format haptic trackpad with gesture support and wireless charging' },
  { id: 'prod-per-075', name: 'Zenith Wrist Rest Set',        sku: 'PER-WRS-ZNT-075', price:  29.99, description: 'Memory foam wrist rest set (keyboard + mouse) with anti-slip base' },
  { id: 'prod-per-076', name: 'Pulse USB-C Docking Station',  sku: 'PER-DKS-PLS-076', price: 179.99, description: '14-in-1 Thunderbolt 4 dock with dual 4K, 96W PD, and 2.5G Ethernet' },
  { id: 'prod-per-077', name: 'Atlas Cable Management Kit',   sku: 'PER-CMK-ATL-077', price:  19.99, description: '45-piece cable organizer kit with velcro straps, clips, and cable box' },
  { id: 'prod-per-078', name: 'Drift Monitor Arm Dual',       sku: 'PER-MNA-DRF-078', price: 119.99, description: 'Dual monitor arm with gas spring, cable channel, and VESA 75/100 support' },
  { id: 'prod-per-079', name: 'Core Laptop Stand',            sku: 'PER-LST-COR-079', price:  49.99, description: 'Adjustable aluminum laptop stand with 6-height levels and folding design' },
  { id: 'prod-per-080', name: 'Storm KVM Switch 4-Port',      sku: 'PER-KVM-STM-080', price:  89.99, description: 'USB-C 4K KVM switch with hotkey control for 2 computers, 4 USB devices' },

  // ── Home Office (10) ────────────────────────────────────────────────────
  { id: 'prod-hom-081', name: 'Apex 4K Monitor 27"',          sku: 'HOM-MON-APX-081', price: 449.99, description: '4K IPS 27" monitor with USB-C 96W PD, 144Hz, and factory color calibration' },
  { id: 'prod-hom-082', name: 'Nova Standing Desk 60"',        sku: 'HOM-DSK-NVA-082', price: 699.99, description: 'Electric height-adjustable desk with memory presets and integrated cable tray' },
  { id: 'prod-hom-083', name: 'Prism Desk Divider',           sku: 'HOM-DIV-PRS-083', price:  79.99, description: 'Acoustic felt desk divider with magnetic mount and cable pass-through' },
  { id: 'prod-hom-084', name: 'Atlas Ergonomic Chair',        sku: 'HOM-CHR-ATL-084', price: 599.99, description: 'Full-mesh ergonomic task chair with lumbar support and 4D adjustable armrests' },
  { id: 'prod-hom-085', name: 'Zenith Monitor Light Bar',     sku: 'HOM-LTB-ZNT-085', price:  59.99, description: 'Clip-on monitor light bar with asymmetric optics and wireless dial control' },
  { id: 'prod-hom-086', name: 'Echo Desk Organizer Set',      sku: 'HOM-ORG-ECH-086', price:  39.99, description: '5-piece modular desk organizer set with premium bamboo finish' },
  { id: 'prod-hom-087', name: 'Pulse Ambient Light Panel',    sku: 'HOM-LPL-PLS-087', price:  89.99, description: 'RGBIC flat panel light for desk setups with scene modes and music sync' },
  { id: 'prod-hom-088', name: 'Halo USB Speakerphone',        sku: 'HOM-SPK-HAL-088', price: 119.99, description: '360° omnidirectional speakerphone with AI noise suppression and USB-C' },
  { id: 'prod-hom-089', name: 'Drift Under-Desk Drawer',      sku: 'HOM-DRW-DRF-089', price:  54.99, description: 'Clamp-mount under-desk drawer with soft-close rail and cable routing slot' },
  { id: 'prod-hom-090', name: 'Core Monitor Privacy Filter',  sku: 'HOM-PRV-COR-090', price:  44.99, description: 'Anti-glare privacy filter for 27" monitors with magnetic installation' },

  // ── Accessories (10) ────────────────────────────────────────────────────
  { id: 'prod-acc-091', name: 'Nova Phone Stand MagSafe',     sku: 'ACC-STD-NVA-091', price:  39.99, description: 'Adjustable MagSafe-compatible desk stand with 360° rotation and cable clip' },
  { id: 'prod-acc-092', name: 'Pulse Cable Clips 20-Pack',    sku: 'ACC-CLP-PLS-092', price:  12.99, description: 'Self-adhesive silicone cable clips in 3 sizes with reusable backing' },
  { id: 'prod-acc-093', name: 'Atlas Screen Protector Kit',   sku: 'ACC-SPK-ATL-093', price:  19.99, description: 'Tempered glass screen protector kit with alignment frame and cleaning set' },
  { id: 'prod-acc-094', name: 'Drift Cleaning Kit Pro',       sku: 'ACC-CLN-DRF-094', price:  24.99, description: '10-piece screen and keyboard cleaning kit with premium microfiber cloths' },
  { id: 'prod-acc-095', name: 'Zenith Wireless Charger Duo',  sku: 'ACC-WCH-ZNT-095', price:  59.99, description: 'Dual-coil wireless charging pad supporting 15W fast charge for 2 devices' },
  { id: 'prod-acc-096', name: 'Echo Smart Tracker 4-Pack',    sku: 'ACC-TRK-ECH-096', price:  89.99, description: 'Bluetooth item trackers with replaceable battery and precision finding mode' },
  { id: 'prod-acc-097', name: 'Halo HDMI 2.1 Cable 2m',       sku: 'ACC-CBL-HAL-097', price:  24.99, description: '48Gbps HDMI 2.1 braided cable supporting 8K60 and 4K144 with DSC' },
  { id: 'prod-acc-098', name: 'Prism USB-C Adapter Kit',      sku: 'ACC-ADP-PRS-098', price:  34.99, description: '6-piece USB-C adapter kit covering HDMI, VGA, DisplayPort, and USB-A' },
  { id: 'prod-acc-099', name: 'Vector Cable Organizer',       sku: 'ACC-CBO-VCT-099', price:  14.99, description: 'Leather-wrapped desktop cable organizer with 5 slots and weighted base' },
  { id: 'prod-acc-100', name: 'Core Scratch Repair Kit',      sku: 'ACC-RPK-COR-100', price:  19.99, description: 'Screen and chassis scratch repair kit with UV-cure polymer and applicator' },
]

// ─── Inventory Distribution ───────────────────────────────────────────────────
// Format: [productId, nycQty, laxQty, ausQty, chiQty]
//
// Edge cases (marked with comments):
//   [1]  = qty=1 race condition showcase (8 products)
//   [L]  = qty=3 low-stock badge (6 products)
//   [0]  = qty=0 partial OOS at that warehouse

const INV: [string, number, number, number, number][] = [
  // Audio — NYC strong
  ['prod-aud-001',  1, 15, 10, 20], // [1] NYC last unit
  ['prod-aud-002', 25,  8,  5, 12],
  ['prod-aud-003', 50, 20, 15, 30],
  ['prod-aud-004', 30, 12,  8, 15],
  ['prod-aud-005', 20,  5,  8,  3], // [L] CHI low
  ['prod-aud-006', 40, 25, 15, 35],
  ['prod-aud-007', 20, 10, 25, 15],
  ['prod-aud-008', 15, 20,  8, 10],
  ['prod-aud-009', 60, 30, 20, 40],
  ['prod-aud-010', 18,  6,  5,  3], // [L] CHI low

  // Electronics — NYC + AUS strong
  ['prod-elc-011', 30,  8, 35, 15],
  ['prod-elc-012', 45,  0, 40, 25], // [0] LAX OOS
  ['prod-elc-013', 50, 20, 35, 30],
  ['prod-elc-014', 40, 15, 30, 25],
  ['prod-elc-015', 60, 30, 45, 50],
  ['prod-elc-016', 25,  5, 20, 15],
  ['prod-elc-017', 55, 20, 40, 35],
  ['prod-elc-018', 20, 15, 12, 18],
  ['prod-elc-019',  3,  0, 15,  8], // [L] NYC low, [0] LAX OOS
  ['prod-elc-020', 35, 12, 28, 20],

  // Gaming — AUS strong
  ['prod-gam-021',  8,  5,  1, 10], // [1] AUS last unit
  ['prod-gam-022',  0, 10, 40, 20], // [0] NYC OOS
  ['prod-gam-023', 10,  8, 50, 25],
  ['prod-gam-024', 15, 10, 60, 30],
  ['prod-gam-025',  5,  3,  3,  8], // [L] LAX+AUS low
  ['prod-gam-026',  8,  5, 30, 12],
  ['prod-gam-027', 10,  8, 45, 20],
  ['prod-gam-028', 20, 12, 55, 30],
  ['prod-gam-029', 12,  6, 35, 18],
  ['prod-gam-030', 10,  5, 40, 15],

  // Footwear — LAX strong
  ['prod-ftw-031',  3, 50,  5, 20], // [L] NYC low
  ['prod-ftw-032', 15, 65,  8, 25],
  ['prod-ftw-033', 10,  1,  4, 15], // [1] LAX last unit
  ['prod-ftw-034', 18, 60, 10, 30],
  ['prod-ftw-035', 12, 40,  8, 20],
  ['prod-ftw-036', 20, 75, 12, 35],
  ['prod-ftw-037', 15, 55, 10, 28],
  ['prod-ftw-038', 12, 45,  8, 22],
  ['prod-ftw-039',  8, 30,  0,  0], // [0] AUS+CHI OOS
  ['prod-ftw-040', 10, 35,  6, 18],

  // Wearables — LAX strong
  ['prod-wrb-041', 15,  1,  8, 12], // [1] LAX last unit
  ['prod-wrb-042', 20, 45, 12, 18],
  ['prod-wrb-043', 10, 25,  8, 15],
  ['prod-wrb-044',  8,  3,  5, 10], // [L] LAX low
  ['prod-wrb-045',  6, 20,  5,  8],
  ['prod-wrb-046', 25, 40, 15, 20],
  ['prod-wrb-047', 12, 30,  8, 15],
  ['prod-wrb-048', 10, 35,  6, 12],
  ['prod-wrb-049',  8, 28,  5, 10],
  ['prod-wrb-050',  5, 18,  4,  8],

  // Fitness — LAX strong
  ['prod-fit-051', 15, 50, 10, 30],
  ['prod-fit-052',  5,  1,  3,  8], // [1] LAX last unit
  ['prod-fit-053', 20, 60, 15, 35],
  ['prod-fit-054', 30, 70, 20, 45],
  ['prod-fit-055', 15, 40, 10, 25],
  ['prod-fit-056', 25, 55, 18, 35],
  ['prod-fit-057', 20, 65, 15, 40],
  ['prod-fit-058', 10, 35,  8, 20],
  ['prod-fit-059', 18, 45, 12, 28],
  ['prod-fit-060', 12, 30,  8, 18],

  // Bags — CHI strong
  ['prod-bag-061', 20, 30, 10, 45],
  ['prod-bag-062', 15, 20,  8, 30],
  ['prod-bag-063', 18, 35, 10, 50],
  ['prod-bag-064', 25, 20,  8, 55],
  ['prod-bag-065', 30, 25, 15, 60],
  ['prod-bag-066', 20, 30, 10, 45],
  ['prod-bag-067', 35, 40, 15, 70],
  ['prod-bag-068',  8, 12,  5,  3], // [L] CHI low
  ['prod-bag-069', 30, 25, 20, 50],
  ['prod-bag-070', 25, 35, 12, 55],

  // Peripherals — NYC + AUS strong
  ['prod-per-071', 40, 10, 45, 20],
  ['prod-per-072', 30,  8, 35, 15],
  ['prod-per-073', 25,  8, 30, 12],
  ['prod-per-074', 15,  5, 20,  8],
  ['prod-per-075', 50, 15, 55, 25],
  ['prod-per-076',  1,  3, 12,  5], // [1] NYC last unit
  ['prod-per-077', 60, 20, 65, 35],
  ['prod-per-078', 20,  8, 25, 10],
  ['prod-per-079', 35, 12, 40, 18],
  ['prod-per-080', 15,  5, 20,  8],

  // Home Office — AUS strong
  ['prod-hom-081',  5,  3,  1,  4], // [1] AUS last unit
  ['prod-hom-082',  0,  0,  1,  0], // [1] AUS last unit in the world
  ['prod-hom-083', 20,  5, 30, 12],
  ['prod-hom-084',  8,  4, 12,  6],
  ['prod-hom-085', 25, 10, 35, 15],
  ['prod-hom-086', 30, 12, 40, 20],
  ['prod-hom-087', 15,  8, 25, 10],
  ['prod-hom-088', 12,  6, 20,  8],
  ['prod-hom-089', 20,  8, 28, 12],
  ['prod-hom-090', 18,  5, 22, 10],

  // Accessories — NYC + CHI strong
  ['prod-acc-091', 50, 30, 25, 45],
  ['prod-acc-092', 80, 40, 35, 60],
  ['prod-acc-093', 60, 30, 25, 50],
  ['prod-acc-094', 45, 25, 20, 40],
  ['prod-acc-095', 35, 20, 18, 30],
  ['prod-acc-096', 25, 15, 12, 20],
  ['prod-acc-097', 55, 30, 25, 45],
  ['prod-acc-098', 40, 22, 18, 35],
  ['prod-acc-099', 65, 35, 30, 55],
  ['prod-acc-100', 50, 28, 22, 40],
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = createClient()

  try {
    // 0. Remove any leftover non-stable-ID rows (e.g. from test suite beforeEach fixtures)
    //    Stable product IDs start with "prod-", stable warehouse IDs with "wh-"
    console.log('Cleaning up non-seed rows...')
    const stableProductIds = PRODUCTS.map(p => p.id)
    const stableWarehouseIds = WAREHOUSES.map(w => w.id)

    // Delete inventory for non-stable products/warehouses first (FK constraint)
    await prisma.inventory.deleteMany({
      where: {
        OR: [
          { productId:   { notIn: stableProductIds } },
          { warehouseId: { notIn: stableWarehouseIds } },
        ],
      },
    })
    await prisma.reservation.deleteMany({
      where: {
        OR: [
          { productId:   { notIn: stableProductIds } },
          { warehouseId: { notIn: stableWarehouseIds } },
        ],
      },
    })
    await prisma.product.deleteMany({
      where: { id: { notIn: stableProductIds } },
    })
    await prisma.warehouse.deleteMany({
      where: { id: { notIn: stableWarehouseIds } },
    })

    // 1. Upsert warehouses
    console.log('Seeding warehouses...')
    for (const wh of WAREHOUSES) {
      await prisma.warehouse.upsert({
        where:  { id: wh.id },
        update: { name: wh.name, location: wh.location },
        create: wh,
      })
    }

    // 2. Upsert products
    console.log('Seeding products...')
    for (const p of PRODUCTS) {
      await prisma.product.upsert({
        where:  { id: p.id },
        update: { name: p.name, sku: p.sku, price: p.price, description: p.description },
        create: p,
      })
    }

    // 3. Upsert inventory rows
    console.log('Seeding inventory...')
    const warehouseIds = ['wh-nyc', 'wh-lax', 'wh-aus', 'wh-chi'] as const
    let invCount = 0

    for (const [productId, nycQty, laxQty, ausQty, chiQty] of INV) {
      const qtys = [nycQty, laxQty, ausQty, chiQty]
      for (let i = 0; i < warehouseIds.length; i++) {
        const warehouseId = warehouseIds[i]
        const qty = qtys[i]
        const invId = `inv-${productId.slice(5)}-${warehouseId.slice(3)}`

        await prisma.inventory.upsert({
          where:  { id: invId },
          update: { qty, reservedQty: 0 },
          create: { id: invId, productId, warehouseId, qty, reservedQty: 0 },
        })
        invCount++
      }
    }

    // Summary
    const edge1    = INV.filter(([,nyc,lax,aus,chi]) => Math.min(nyc,lax,aus,chi) >= 0 && [nyc,lax,aus,chi].some(q => q === 1)).length
    const lowStock = INV.filter(([,nyc,lax,aus,chi]) => [nyc,lax,aus,chi].some(q => q > 0 && q <= 5)).length
    const oos      = INV.filter(([,nyc,lax,aus,chi]) => [nyc,lax,aus,chi].some(q => q === 0)).length

    console.log(`\n✅ Seed complete:`)
    console.log(`   ${WAREHOUSES.length} warehouses`)
    console.log(`   ${PRODUCTS.length} products`)
    console.log(`   ${invCount} inventory rows`)
    console.log(`   ${edge1} products with qty=1 edge case`)
    console.log(`   ${lowStock} products with low-stock warehouse`)
    console.log(`   ${oos} products with OOS at one or more warehouses`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
