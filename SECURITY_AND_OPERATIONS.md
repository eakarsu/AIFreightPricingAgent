# Security and operations

Run `scripts/bootstrap.sh`, export `DATABASE_URL`, run `scripts/migrate.sh`, then `./start.sh`. Startup performs no installation, schema mutation, seeding, port killing, or provider calls. The old generated gap endpoints are no longer mounted. No generic demo seed is supplied for governed quotes.

`/api/governed-quotes` stores tenant-isolated, idempotent shipment quote requests with explicit units. Cost, accessorial, margin, and sell-price calculations are deterministic. Current rate evidence, pricing authority, expiry, optimistic versions, override reasons, and immutable audit events gate offers and bookings. Integration runs preserve data-as-of and failure states so stale rates cannot silently masquerade as current.

Production still requires contracted TMS, carrier/market-rate, map/fuel, CRM, tendering and billing adapters; commercial-rate entitlements; unit and lane mapping; reconciliation; and pricing-authority acceptance tests. The system does not auto-book freight or claim financial/commercial validation.
