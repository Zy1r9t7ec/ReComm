# ReComm — Project Requirements & Reference Document

> **Purpose of this document:** A single source of truth for anyone starting work on ReComm. Covers the product context, technical requirements, data models, API contracts, privacy obligations, and development constraints — everything needed before writing the first line of code.
>
> **Last updated:** April 2026

---

## 1. Project Context

### What is ReComm?

ReComm is an AI-first reverse logistics platform for e-commerce. It transforms the product return process from a reactive logistics operation into a proactive intelligence system. The central insight is: **shift all decision-making to the moment a return is initiated**, before any logistics cost is incurred.

### Who are the Users?

| User Type | What they experience |
|-----------|----------------------|
| **End Customer** | A guided, conversational return flow on mobile — troubleshooter → camera recording → instant decision |
| **Merchant / Brand** | An operational dashboard showing return analytics, fraud signals, recovered revenue, and product quality intelligence |
| **Human Reviewer** | An internal queue interface to review AI-escalated cases and override decisions |

### Why does it exist?

Three structural problems in e-commerce returns:
1. **Fraud is caught after cost is sunk** (warehouse, not at initiation)
2. **Good products lose value in transit** (all returns go to central warehouse regardless of condition)
3. **Routing decisions are made too late** (condition is unknown at initiation)

ReComm fixes all three by collecting video evidence, running AI inspection at initiation, and routing products intelligently before they move.

### SDG Alignment (Important for Demo/Pitch)

| SDG | Relevance |
|-----|-----------|
| SDG 12 — Responsible Consumption | Reduces product waste via graded resale/refurb/recycling |
| SDG 13 — Climate Action | Minimises logistics CO₂ via proximity-based routing |
| SDG 8 — Decent Work & Economic Growth | Creates value in secondary markets and for refurbishers |

---

## 2. Core Constraints

These are non-negotiable product constraints derived from the overview document. They must be respected in every design and implementation decision.

### UX Constraints

| Constraint | Rationale |
|-----------|-----------|
| The pre-return troubleshooter must never feel like a barrier. The "Continue Return" button must be equally visible as the "Cancel Return" button. | Users who feel trapped abandon the flow entirely — worse than just processing the return. |
| Video must be capped at **90 seconds maximum**. | Low-end Android devices, slow Indian mobile networks. File size is a real constraint. |
| Upload must show progress and offer a **retry on failure**. No silent failures. | Poor network reliability in Tier 2/3 Indian markets. |
| The quality detector must only warn after **sustained poor quality across multiple frames**, not on a single bad frame. | Over-firing causes abandonment. One dark frame ≠ bad recording. |
| Every step must have a **clear escape path** to photo fallback without losing progress. | Accessibility, low-end device compatibility. |
| The product must work on **low-end Android devices** with poor cameras. | Majority of Indian smartphone users. |

### AI & Inspection Constraints

| Constraint | Rationale |
|-----------|-----------|
| Never auto-approve or auto-reject on low-confidence AI output. Every low-confidence case goes to **human review**. | Cost of false rejection (angry customer, chargeback) >> cost of a 2-minute human review. |
| Identity verification will produce false negatives for opened/unusual packaging. Handle with **human review**, not auto-flag. | Model limitation that must be designed around. |
| Voice-visual inconsistency is a **probabilistic signal**, not a definitive fraud indicator. Weight it accordingly. | Customers may state reasons poorly due to nerves/language. |
| Human override decisions must be **logged as training data** automatically. | Continuous improvement of the AI models. |

### Routing Constraints

| Constraint | Rationale |
|-----------|-----------|
| For the prototype, use a **seeded mock dataset** of 5 Indian cities × 3–5 hubs. Document it clearly as a placeholder. | Real 3PL and dark store inventory APIs are not available for prototype stage. |
| **Cache pincode-to-hub distances**. Two returns from the same pincode must not trigger two separate API calls for the same hubs. | Performance and cost efficiency. |
| CO₂ calculation must use **GLEC Framework emission factor: 0.00021 kg CO₂ per tonne-kilometre**. | Independently verifiable methodology. Required for credibility. |

### Privacy & Legal Constraints

| Constraint | Law / Rationale |
|-----------|-----------------|
| **Explicit, standalone consent** must be captured before camera activation — not buried in ToS. | India's Digital Personal Data Protection Act (DPDP Act, 2023) |
| Videos stored in a **private, access-controlled bucket with signed URL access only**. | DPDP Act 2023 compliance. |
| **90-day auto-deletion policy** on videos — set from day one, not added later. | DPDP Act 2023 compliance. |
| **Voice transcripts must be anonymised** before long-term storage. | DPDP Act 2023 compliance. |
| The **merchant dashboard must never expose raw return videos** — only AI-generated text outputs. | Privacy protection; merchants do not need access to footage to act on insights. |

---

## 3. System Architecture — Agentic Flow

> ⚠️ **The original pipeline design has been replaced by an agentic architecture.** See [`architecture.md`](./architecture.md) for the full agent definitions, tool specs, error-handling principles, and the `ReturnContext` shared state model. This section shows the high-level flow for orientation.

The system is built around a **ReturnOrchestrator** agent that coordinates six specialist sub-agents. All agents share a `ReturnContext` Firestore document as their working memory.

```
Customer initiates return
        │
        ▼
ReturnOrchestrator  ─── creates ReturnContext (Firestore)
        │
        ▼
TroubleshooterAgent
        │ Input:  product SKU, return reason
        │ Output: pre_return_resolved: true | false → written to ReturnContext
        │ not_resolved
        ▼
[Customer records video / submits photos]
        │
        ▼
InspectionAgent  ← 3 sub-tasks in PARALLEL (Gemma 4 via Google AI Studio API)
        ├── Identity check (Gemini Vision)
        ├── Damage assessment + grading (Gemini Vision, structured output)
        └── Voice transcription + cross-validation (Gemini Audio)
        │ Retries failed sub-tasks independently; voice failure is non-blocking
        │ Output: grade (A/B/C/Scrap) + defect list + agent_reasoning traces
        │
        ├────────────────────────────────────┐
        ▼                                    ▼
FraudAgent (parallel)              PolicyAgent (parallel)
  trust score + frequency             merchant policy + fault library
  → ReturnContext.fraud               → ReturnContext.policy_decision
        │                                    │
        └────────────────┬───────────────────┘
                         ▼
                    RoutingAgent
                    hub match + CO₂ calc + listing draft
                    → ReturnContext.routing
                         │
                         ▼
                   CommunicationAgent
                   Gemini message generation + FCM push + Firestore write
                         │
                         ▼
            Full ReturnContext (including all agent_reasoning traces)
            written to BigQuery training data store
```

**Key agentic properties:**
- The Orchestrator reasons about partial failures — a failed voice transcription does not block damage assessment or grading
- Every agent writes a `agent_reasoning` string (Gemini chain-of-thought) → every return becomes training data
- Human override on any escalated case is attached to the same `ReturnContext` record → rich labelled example

---

## 4. Condition Grading System

The condition grade is the central data point that flows through Stages 3, 4, and 5.

| Grade | Meaning | Stage 4 Typical Outcome | Stage 5 Routing |
|-------|---------|------------------------|-----------------|
| **A** | Perfect condition | Approved (full refund) | Nearest dark store / hyperlocal hub restock |
| **B** | Cosmetic damage only | Partial refund | Regional resale hub + AI-generated listing |
| **C** | Functional defect | Warranty Escalation or Approved | Authorised service centre (manufacturer fault) or refurb centre (customer damage) |
| **Scrap** | Beyond recovery | Rejected or Approved with write-off | Certified e-waste recycler |

---

## 5. Policy Engine — Five Decision Outcomes

| Outcome | Triggers |
|---------|---------|
| **Approved** | Grade A or B within return window, fraud score below threshold |
| **Partial Refund** | Grade B with cosmetic damage partially attributed to customer |
| **Warranty Escalation** | Defect matches manufacturer fault pattern in library |
| **Rejected** | Outside return window, OR fraud score above rejection threshold |
| **Human Escalation** | AI inspection confidence below threshold, OR ambiguous case |

---

## 6. Technical Requirements

### 6.1 Frontend (Customer Flow)

| Requirement | Detail |
|-------------|--------|
| Platform | **Progressive Web App (PWA)** — chosen over React Native. Rationale: PWA ships faster for a prototype, `getUserMedia` on Android Chrome covers camera needs, IndexedDB works natively, and FCM tokens are available via the Push API. H.264 encoding is handled client-side via `MediaRecorder` with `video/mp4` MIME type on Chrome for Android. React Native would give better low-end camera control but adds build/deployment overhead that is unacceptable for GSC timeline. **This resolves Open Question #1.** |
| Target devices | Low-end Android (Android 8+), 2GB RAM, slow 4G network |
| Camera API | `getUserMedia` (web) or native camera API |
| Video constraints | Max 90s, encode to H.264/MP4 before upload |
| Real-time quality check | Client-side frame analysis every 500ms during recording |
| Upload | Chunked upload with progress indicator and retry logic |
| Offline handling | Video persisted to **IndexedDB** on upload failure; background sync retries automatically on reconnection. Blob stored with `return_id` key so it survives tab refresh. |
| Push notifications | **Firebase Cloud Messaging (FCM)** — device token collected at return initiation; verdict notification pushed when inspection completes, even if customer has closed the tab. |
| Accessibility | Fallback to photo + voice note if camera unavailable |
| Language | **Hindi and English** — persistent language toggle in the UI. All prompts, consent text, troubleshooter steps, and decision messages must exist in both languages. i18n keys maintained in a single JSON locale file per language. |

### 6.2 Frontend (Merchant Dashboard)

| Requirement | Detail |
|-------------|--------|
| Platform | Web app (desktop-first, responsive) |
| Charts | Return rate trends, fraud cluster maps, revenue recovery totals |
| Real-time updates | **Firestore listeners** — dashboard widgets subscribe to Firestore document paths (`/merchants/{id}/returns`, `/merchants/{id}/fraud_flags`). Changes written by the backend trigger live UI updates without polling. |
| Human review queue | Minimum viable interface: **(1) Case list** — sortable by date, grade, escalation reason; **(2) Case detail panel** — signed-URL video playback (reviewer only), AI inspection summary, fraud score breakdown, PolicyAgent reasoning_trace; **(3) Override controls** — dropdown for decision (Approved / Partial Refund / Rejected / Warranty Escalation), freetext notes field (required), Submit button. Override writes to `POST /api/v1/reviews/{return_id}/override`. No other UI surface is needed for v1. |
| Policy manager | Form-based configuration for return windows, thresholds, fault patterns |

### 6.3 Backend

| Component | Requirement |
|-----------|-------------|
| API style | REST (Cloud Run) |
| Agent runtime | **Custom Orchestrator** — hosts ReturnOrchestrator + all sub-agents using Gemini Function Calling via Google AI Studio API |
| Async invocation | **Cloud Tasks** — agent sessions started as async tasks; results written to Firestore ReturnContext |
| Video storage | Private GCS bucket with signed URL access; 90-day TTL |
| Session state | **Firestore** — one document per return (`/returns/{return_id}`); agents read/write ReturnContext here |
| Policy engine | Configurable rule context passed to PolicyAgent (JSON config per merchant); no separate rule engine needed |
| Routing engine | RoutingAgent tool: hub-matching with pincode-to-hub distance cache (Redis / Cloud Memorystore) |
| Training data | **BigQuery** — append-only table; full `ReturnContext` written at end of every session |
| Human override logging | Override attached to BigQuery row for that `return_id`; record becomes labelled training example |
| Auth | Firebase Auth — separate roles for Customer, Merchant, Reviewer |

### 6.4 AI / ML — Gemini Function Calling via Google AI Studio API

All AI reasoning is driven by **Gemma 4 via Google AI Studio API** using **Function Calling** — agents are given a defined tool set, reason over inputs, call tools, and produce structured outputs. This replaces the previous task-runner model.

| Agent | Model | Mode | Notes |
|-------|-------|------|-------|
| **InspectionAgent — Identity check** | Gemma 4 | Vision + Function Calling | Compares video frames to SKU catalogue image; returns confidence score |
| **InspectionAgent — Damage assessment** | Gemma 4 | Vision + Structured Output | Returns defect list + grade as JSON; retries once with prompt variant if < 0.75 confidence |
| **InspectionAgent — Voice transcription** | Gemma 4 | Audio input | Non-blocking; cross-validation skipped if transcription unavailable |
| **InspectionAgent — Cross-validation** | Gemma 4 | Text reasoning | Flags voice-visual inconsistencies as weighted fraud signal |
| **PolicyAgent** | Gemma 4 | Function Calling | Calls merchant policy + fault library tools; produces decision + reasoning_trace |
| **CommunicationAgent** | Gemma 4 | Text generation | Generates empathetic customer message in Hindi or English |

### 6.5 Data Storage

| Data Type | Storage | Retention |
|-----------|---------|-----------|
| Return videos | GCS private bucket (signed URL access) | **90 days auto-delete** |
| Voice transcripts | Stored within ReturnContext in Firestore — anonymised | Cleared after 90 days with video |
| ReturnContext (session state) | **Firestore** `/returns/{return_id}` | Active session; archived to BigQuery on close |
| Full session + reasoning traces | **BigQuery** (append-only, one row per return) | Indefinite (training data) |
| Human override records | Attached to BigQuery row for the same `return_id` | Indefinite |
| Hub/city dataset (prototype) | Seeded JSON / Firestore collection | Prototype only |
| Pincode-to-hub distance cache | **Redis** (Cloud Memorystore) | Refreshed every 24h |
| Customer Trust Score | Firestore — per `customer_id` | Indefinite; updated after every return event |
| Offline video buffer | IndexedDB (client-side, per device) | Cleared on successful upload |

---

## 7. Mock Data Requirements (Prototype)

For the prototype / Google Solutions Challenge submission, real 3PL inventory data is not available. The following mock data sets must be seeded.

### 7.1 City & Hub Dataset (5 cities × 3–5 hubs each)

```json
{
  "cities": [
    {
      "city": "Hyderabad",
      "hubs": [
        { "hub_id": "HYD-01", "type": "dark_store",     "pincode": "500032", "capacity": 200, "lat": 17.385, "lng": 78.486 },
        { "hub_id": "HYD-02", "type": "resale_partner", "pincode": "500016", "capacity": 150, "lat": 17.361, "lng": 78.474 },
        { "hub_id": "HYD-03", "type": "refurb_centre",  "pincode": "500072", "capacity": 100, "lat": 17.433, "lng": 78.448 },
        { "hub_id": "HYD-04", "type": "service_centre", "pincode": "500003", "capacity":  80, "lat": 17.395, "lng": 78.474 }
      ]
    },
    {
      "city": "Mumbai",
      "hubs": [
        { "hub_id": "BOM-01", "type": "dark_store",     "pincode": "400051", "capacity": 300, "lat": 19.018, "lng": 72.849 },
        { "hub_id": "BOM-02", "type": "resale_partner", "pincode": "400016", "capacity": 200, "lat": 19.040, "lng": 72.839 },
        { "hub_id": "BOM-03", "type": "refurb_centre",  "pincode": "400063", "capacity": 120, "lat": 19.187, "lng": 72.848 },
        { "hub_id": "BOM-04", "type": "service_centre", "pincode": "400093", "capacity":  90, "lat": 19.218, "lng": 72.978 }
      ]
    },
    {
      "city": "Delhi",
      "hubs": [
        { "hub_id": "DEL-01", "type": "dark_store",     "pincode": "110001", "capacity": 250, "lat": 28.631, "lng": 77.219 },
        { "hub_id": "DEL-02", "type": "resale_partner", "pincode": "110020", "capacity": 180, "lat": 28.543, "lng": 77.206 },
        { "hub_id": "DEL-03", "type": "refurb_centre",  "pincode": "110092", "capacity": 100, "lat": 28.669, "lng": 77.293 },
        { "hub_id": "DEL-04", "type": "service_centre", "pincode": "110030", "capacity":  75, "lat": 28.520, "lng": 77.158 }
      ]
    },
    {
      "city": "Bangalore",
      "hubs": [
        { "hub_id": "BLR-01", "type": "dark_store",     "pincode": "560001", "capacity": 220, "lat": 12.975, "lng": 77.608 },
        { "hub_id": "BLR-02", "type": "resale_partner", "pincode": "560038", "capacity": 160, "lat": 12.935, "lng": 77.624 },
        { "hub_id": "BLR-03", "type": "refurb_centre",  "pincode": "560043", "capacity": 110, "lat": 12.849, "lng": 77.661 },
        { "hub_id": "BLR-04", "type": "service_centre", "pincode": "560102", "capacity":  70, "lat": 12.908, "lng": 77.648 }
      ]
    },
    {
      "city": "Chennai",
      "hubs": [
        { "hub_id": "CHE-01", "type": "dark_store",     "pincode": "600017", "capacity": 180, "lat": 13.085, "lng": 80.210 },
        { "hub_id": "CHE-02", "type": "resale_partner", "pincode": "600032", "capacity": 140, "lat": 13.042, "lng": 80.233 },
        { "hub_id": "CHE-03", "type": "refurb_centre",  "pincode": "600097", "capacity":  90, "lat": 12.901, "lng": 80.228 }
      ]
    }
  ]
}
```

### 7.2 SKU Catalogue (Sample)

```json
{
  "skus": [
    {
      "sku_id": "PB-200",
      "name": "Portronics Powerbank PB-200",
      "brand": "Portronics",
      "category": "Electronics",
      "weight_kg": 0.22,
      "known_defects": [
        { "defect_code": "USB_PORT_LOOSE", "description": "USB-C port becomes loose after 3-6 months", "is_manufacturer_fault": true }
      ],
      "troubleshooter_steps": [
        { "reason": "not_charging", "step": "Hold the power button for 8 seconds to reset the battery controller.", "resolution_rate": 0.74 }
      ]
    }
  ]
}
```

### 7.3 Customer Return History (Sample)

Seeded with a small set of customer profiles with varying return frequency — used by the policy engine to weight fraud score.

### 7.4 Customer Trust Score Model

Every registered customer has a `customer_trust_score` record. This is a first-class data model — not a derived metric — because the policy engine inputs it directly.

```json
{
  "customer_id": "CUST-00123",
  "trust_score": 0.82,
  "total_returns": 4,
  "fraud_flags_lifetime": 0,
  "returns_resolved_by_troubleshooter": 1,
  "average_grade_on_approved_returns": "B",
  "last_updated": "2026-04-10T14:00:00Z"
}
```

**Score range:** 0.0 (highest risk) → 1.0 (highest trust)  
**Update trigger:** Recalculated after every return event (approval, rejection, fraud flag, or override).

**Recalculation formula:**
```
new_score = clamp(
  (current_score × 0.70) + (event_delta × 0.30),
  min=0.0, max=1.0
)
```
70% weight on history (decay factor — avoids single events swinging the score wildly),  
30% weight on the most recent event (recency signal).

**Event delta values:**

| Event | Delta |
|-------|-------|
| Troubleshooter resolved return (no logistics) | `+0.08` |
| Return approved, Grade A | `+0.05` |
| Return approved, Grade B or C | `+0.02` |
| Return out of window — normal (not fraud) | `-0.05` |
| Human reviewer overturns AI rejection (false positive) | `+0.10` |
| Fraud flag raised (score > merchant threshold) | `-0.20` |
| Human reviewer confirms fraud flag | `-0.25` |

**Policy engine use:** A trust score below a configurable threshold (default `0.4`) lowers the auto-approval ceiling — e.g., Grade A still requires human review if score < 0.4. This makes the feedback loop visible in the demo: a flagged return immediately lowers the score and raises scrutiny on the next return.

---

## 8. CO₂ Calculation — Methodology

**Emission factor:** `0.00021 kg CO₂ per tonne-kilometre` (GLEC Framework — Global Logistics Emissions Council)

**Formula:**
```
CO₂ Avoided (kg) = (Route Distance Saved km) × (Product Weight kg / 1000) × 0.00021
```

**Route Distance Saved** = Distance to central warehouse – Distance to selected local/regional hub

This factor must be cited in the demo and documentation by name (GLEC Framework) so judges and reviewers can independently verify the methodology.

---

## 9. Privacy & Legal Checklist

Before launch (including prototype demo), verify all items below are in place:

- [ ] **Camera consent gate** — standalone screen, not buried in ToS, required before camera activation
- [ ] **Signed URL video access** — no public URLs to return videos at any point
- [ ] **90-day auto-delete policy** set on video bucket
- [ ] **Voice transcripts anonymised** before storage (customer name and identifiers removed)
- [ ] **Merchant dashboard** shows only AI-generated text — never raw video playback
- [ ] **DPDP Act 2023** compliance review completed before user data is collected

---

## 10. API Contracts (Draft)

### 10.1 Initiate Return
```
POST /api/v1/returns/initiate
Body: { order_id, sku_id, return_reason_code, customer_id }
Response: { return_id, troubleshooter_step (if applicable), next_step: "troubleshooter" | "recording" }
```

### 10.2 Confirm Troubleshooter Outcome
```
POST /api/v1/returns/{return_id}/troubleshooter
Body: { resolved: true | false }
Response: { next_step: "closed" | "recording" }
// Side effect: writes pre_return_resolved: true/false to the Return record
```

### 10.3 Upload Video / Photos
```
POST /api/v1/returns/{return_id}/media
Body: multipart — video file or photos + voice note
Response: { upload_id, status: "processing" }
```

### 10.4 Get Inspection Result
```
GET /api/v1/returns/{return_id}/inspection
Response: {
  status: "pending" | "done",
  grade,
  defects[],
  fraud_score,
  identity_confidence,
  decision,
  customer_message,
  routing: {
    hub_id,
    hub_type,
    distance_saved_km,
    co2_avoided_kg,
    value_recovered_inr,
    secondary_listing_draft: {          // present only for Grade B
      title,
      condition_label,
      defect_summary,
      suggested_price_inr
    },
    warranty_claim_payload: {           // present only for Warranty Escalation
      sku_id,
      defect_code,
      defect_description,
      is_manufacturer_fault,
      video_signed_url,
      defect_report_url,
      service_centre_id,
      service_centre_name,
      raised_at
    }
  }
}
```

### 10.5 Human Reviewer Override
```
POST /api/v1/reviews/{return_id}/override
Body: { reviewer_id, decision, notes }
Response: { acknowledged: true }
```

### 10.6 Merchant Dashboard — Returns Summary
```
GET /api/v1/merchant/{merchant_id}/returns/summary
Query: ?from=&to=&sku_id=&grade=
Response: { total_returns, by_sku[], by_grade[], fraud_flags[], revenue_recovered }
```

---

## 11. Folder Structure (Suggested)

```
/
├── client/                  # Customer-facing mobile app
│   ├── src/
│   │   ├── stages/          # One folder per stage (stage1/, stage2/, ...)
│   │   ├── components/      # Shared UI components
│   │   └── api/             # API client layer
│
├── dashboard/               # Merchant + Reviewer web dashboard
│   ├── src/
│   │   ├── pages/           # Returns, Fraud, Recovery, Quality, Queue
│   │   └── components/
│
├── backend/
│   ├── api/                 # REST/GraphQL routes
│   ├── services/
│   │   ├── inspection/      # Stage 3 — AI inspection orchestrator
│   │   ├── policy/          # Stage 4 — Policy engine
│   │   ├── routing/         # Stage 5 — Hub matching engine
│   │   └── troubleshooter/  # Stage 1 — SKU-specific fix lookup
│   ├── models/              # Data models
│   └── jobs/                # Async jobs (video processing, AI calls)
│
├── data/
│   ├── mock/                # Seeded hub dataset, SKU catalogue, customer profiles
│   └── training/            # Human override logs (training data)
│
└── docs/
    ├── feature-list.md      # This project's feature list
    ├── requirements.md      # This document
    └── ReComm Overview.md   # Original product overview
```

---

## 12. Demo / Submission Requirements

*(For Google Solutions Challenge)*

| Item | Requirement |
|------|-------------|
| Demo format | End-to-end working prototype, following the exact workflow in Section 6 of the overview (Hyderabad powerbank scenario) |
| Duration | Target 4 minutes — a working demo beats slides |
| Must show | All three impact metrics on screen: Value Recovered (₹), Distance Saved (km), CO₂ Avoided (kg) |
| Must frame | ReComm as a **sustainability + economic inclusion** platform, not just cost reduction |
| Must quantify | Troubleshooter resolution rate — even a simulated figure (e.g. "31% of returns resolved before logistics") |
| SDG framing | Lead with SDG 12, 13, and 8 — judges evaluate on social impact |
| CO₂ methodology | Cite GLEC Framework by name in the demo or voiceover |

---

## 13. Open Questions for the Team

These are decisions that need to be made before implementation begins:

1. ~~**Native app vs PWA?**~~ — **Resolved: PWA.** `getUserMedia` + `MediaRecorder` on Android Chrome handles camera and H.264 encoding. IndexedDB and FCM Push API available natively. Eliminates React Native build overhead for GSC prototype.
2. ~~**Which vision model for inspection?**~~ — **Resolved: Gemma 4 via Google AI Studio API** for all agents. Required for Google Solutions Challenge scoring.
3. ~~**Where does AI run?**~~ — **Resolved: server-side calling Google AI Studio API.** Agents run on Cloud Run; client only handles media capture and upload.
4. **Policy engine implementation** — PolicyAgent reasons over merchant policy JSON config using Gemma 4 Function Calling. No separate rule DSL needed.
5. ~~**Real-time vs. polling for inspection results**~~ — **Resolved: Firestore listeners** on merchant dashboard; **FCM push** for customer verdict delivery.
6. ~~**Which cities / hubs in the mock dataset?**~~ — **Resolved: Hyderabad, Mumbai, Delhi, Bangalore, Chennai.** Full hub data seeded in §7.1.

---

*Read this alongside [`architecture.md`](./architecture.md) for the full agentic design, and [`feature-list.md`](./feature-list.md) for feature scope per stage.*
