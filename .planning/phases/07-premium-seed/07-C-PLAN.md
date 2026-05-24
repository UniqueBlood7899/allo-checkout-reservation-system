# Plan 07-C: Seed Execution + API Verification + UI Confirmation

**Phase:** 07 — Premium Seed Catalog
**Plan:** C — Run seed, verify API, confirm UI renders correctly
**Depends on:** Plans A + B complete
**Status:** Ready to execute

---

## Goal

Execute the seed, validate data integrity via the API, and confirm the UI renders
all stock badge states and category icons correctly.

---

## Tasks

### Task 1 — Run the seed

```bash
npx prisma db seed
```

Expected output:
```
✅ Seed complete: 4 warehouses, 100 products, N inventory rows
```

### Task 2 — API verification

```bash
# Count products
curl -s http://localhost:3000/api/products | jq 'length'
# Expected: 100

# Check first product has correct shape
curl -s http://localhost:3000/api/products | jq '.[0] | {name, sku, price, inventory: (.inventory | length)}'

# Find qty=1 (edge case) products
curl -s http://localhost:3000/api/products | jq '[.[] | select(.inventory[].availableQty == 1)] | length'
# Expected: >= 1

# Find low-stock (availableQty <= 5 but > 0)
curl -s http://localhost:3000/api/products | jq '[.[] | .inventory[] | select(.availableQty > 0 and .availableQty <= 5)] | length'
# Expected: >= 8

# Find out-of-stock at some warehouse
curl -s http://localhost:3000/api/products | jq '[.[] | .inventory[] | select(.availableQty == 0)] | length'
# Expected: >= 4

# Verify 4 warehouses
curl -s http://localhost:3000/api/warehouses | jq '[.[] | .name]'
# Expected: NYC Fulfillment Hub, LA Distribution Center, Austin Tech Center, Chicago Logistics Hub
```

### Task 3 — Update STATE.md

Mark Phase 7 complete with product count.

### Task 4 — Commit

```bash
git add prisma/seed.ts components/ProductAvatar.tsx .planning/
git commit -m "feat(07): premium seed catalog — 100 products, 4 warehouses, 10-category icon system"
```

---

## Verification Checklist

### ProductAvatar (Plan A)
- [ ] All 10 categories have distinct icon + gradient
- [ ] No category falls back to `default` Package icon unintentionally
- [ ] `npx tsc --noEmit` clean

### Seed Data (Plan B)
- [ ] 4 warehouses in DB
- [ ] 100 products in DB
- [ ] ~300+ inventory rows
- [ ] `qty=1` edge cases present
- [ ] `qty=0` out-of-stock present
- [ ] Low-stock (2–5) present
- [ ] Seed is idempotent (run twice, same result)

### API (Plan C)
- [ ] `GET /api/products` → 100 items
- [ ] `GET /api/warehouses` → 4 items
- [ ] All inventory fields: `warehouseId`, `warehouseName`, `availableQty`, `qty`

### UI (visual, manual)
- [ ] Product grid shows ~100 cards
- [ ] At least 3 different colored stock badges visible
- [ ] At least 6 different avatar icons visible
- [ ] Reserved button disabled for qty=0 products
- [ ] Page loads without console errors
