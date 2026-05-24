# Plan 05-C: End-to-End Smoke Test & Polish

**Phase:** 05 — Checkout UI
**Plan:** C — Verification, polish, final commit
**Depends on:** Plans A + B complete
**Status:** Ready to execute

---

## Goal

1. End-to-end smoke test of the full reservation flow
2. Minor polish: loading skeleton on checkout page, responsive tweaks
3. Final state update and phase completion commit

---

## Tasks

### Task 1 — Manual end-to-end smoke test

With `npm run dev` running:

```
Flow 1: Reserve → Checkout → Confirm
────────────────────────────────────
1. Visit http://localhost:3000
2. Products load with glassmorphic cards ✓
3. Click "Reserve" on a product with stock
4. Drawer slides in from right ✓
5. Timer shows (e.g. "09:58") in cyan JetBrains Mono ✓
6. Click "Go to Checkout"
7. Navigates to /checkout/:id ✓
8. Product info card shows (name, SKU, warehouse, qty) ✓
9. Timer continues ticking ✓
10. Click "Confirm Payment"
11. Spinner shows "Confirming payment..." ✓
12. Success state: "Payment Confirmed" + green checkmark ✓
13. Click "Back to inventory" → returns to / ✓

Flow 2: Reserve → Checkout → Cancel
────────────────────────────────────
1. Reserve a product
2. Navigate to /checkout/:id
3. Click "Cancel reservation"
4. "Reservation Cancelled" state ✓
5. Stock restored (refresh / triggers recount) ✓

Flow 3: Direct URL load of expired/unknown reservation
────────────────────────────────────────────────────────
1. Visit /checkout/nonexistent-id → "Reservation Not Found" ✓
2. Visit /checkout/:expired-id → "Reservation Expired" state ✓
```

### Task 2 — API integration test

```bash
# 1. Create a reservation
RES=$(curl -s -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","warehouseId":"WAREHOUSE_ID","qty":1}')
ID=$(echo $RES | jq -r '.id')
echo "Created: $ID"

# 2. GET the reservation
curl -s http://localhost:3000/api/reservations/$ID | jq '{status,qty,product:.product.name,warehouse:.warehouse.name}'

# 3. Confirm it
curl -s -X POST http://localhost:3000/api/reservations/$ID/confirm | jq '.status'
# Expected: "confirmed"

# 4. Try to confirm again → 409 or 404
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/reservations/$ID/confirm
# Expected: 409 (already confirmed / not pending)
```

### Task 3 — TypeScript final check

```bash
npx tsc --noEmit 2>&1 | head -10
# Expected: (no output — clean)
```

### Task 4 — State.md update + phase complete commit

```bash
git add -A
git commit -m "chore(05): phase 5 complete — checkout UI with full reservation flow"
```

---

## Verification Checklist

### Full flow
- [ ] Product listing page loads at `/`
- [ ] Reserve opens drawer
- [ ] "Go to Checkout" navigates to `/checkout/:id`
- [ ] Checkout page loads reservation from `GET /api/reservations/:id`
- [ ] CountdownTimer ticks from `expiresAt` in cyan
- [ ] Timer turns amber at < 2 min
- [ ] Timer turns red + pulse at < 30s
- [ ] "Confirm Payment" calls confirm API → success state
- [ ] "Cancel reservation" calls release API → released state

### Error states
- [ ] Unknown ID → 404 state shown
- [ ] Expired reservation (status=expired or past expiresAt) → expired state
- [ ] Network error on load → error state with message
- [ ] 410 from confirm API → expired state transition

### Compatibility
- [ ] `npx tsc --noEmit` exits 0
- [ ] No console errors in browser on any phase transition
- [ ] Mobile: drawer is full-width bottom-aligned, checkout page is single-column

### Final project check
- [ ] `GET /api/products` → 200 with seeded data
- [ ] `POST /api/reservations` → 201 or 409
- [ ] `GET /api/reservations/:id` → 200 or 404
- [ ] `POST /api/reservations/:id/confirm` → 200 or 410
- [ ] `POST /api/reservations/:id/release` → 200
- [ ] `GET /api/cron/release-expired` with CRON_SECRET → 200 `{ released, failed, errors }`
