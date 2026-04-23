# ReComm — Agentic Architecture

> **Purpose of this document:** Defines the agentic system architecture replacing the original pipeline-based design. Explains the reasoning for the shift, the agent graph, each agent's responsibilities and tools, error-handling behaviour, and how agents interact with the data models and APIs defined in `requirements.md`.
>
> **Last updated:** April 2026

---

## 1. Why Agentic Over Pipeline?

The original design was a **linear pipeline** — Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5. While simple to reason about, a pipeline has structural weaknesses that directly conflict with ReComm's product constraints:

| Pipeline Limitation | How it Hurts ReComm |
|---------------------|---------------------|
| A failed stage blocks all downstream stages | If transcription fails, the entire inspection stalls — even though damage assessment doesn't depend on voice |
| Confidence handling is hard-coded (if score < X → escalate) | Can't reason about *why* confidence is low or whether a retry with a different prompt would help |
| Error paths are fixed and binary | No ability to degrade gracefully — it's pass or escalate, nothing in between |
| No retry intelligence | A transient Google AI Studio timeout fails the same way as a genuine low-confidence result |
| No shared reasoning context | Each stage operates on the output blob of the previous one — no accumulated understanding |
| Training data from escalations only | The reasoning that led to a decision is not naturally captured |

**An agentic architecture solves all of these:**

- A central **Orchestrator Agent** maintains a shared `ReturnContext` for the entire session and reasons about partial results
- Specialist sub-agents are independently resumable and retryable
- Each agent can use tools, inspect its own output confidence, request additional information, or hand off to another agent
- Every decision step produces a **reasoning trace** — logged automatically as structured training data
- Failures in one agent do not cascade to others; the orchestrator decides what to do with partial information

---

## 2. Agent Graph

```
                      ┌─────────────────────────────┐
                      │     ReturnOrchestrator       │
                      │   (Central Reasoning Agent)  │
                      └──────────────┬──────────────┘
                                     │ manages ReturnContext
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌──────────────────┐    ┌───────────────────────┐   ┌─────────────────────┐
│ TroubleshooterAgent│  │    InspectionAgent     │   │   PolicyAgent       │
│  (Stage 1)        │  │  (Stage 3 — parallel)  │   │   (Stage 4)         │
└──────────────────┘    └───────────────────────┘   └─────────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                      ▼
      ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
      │ IdentityTool    │  │ DamageTool       │  │ VoiceTool            │
      │ (Gemini Vision) │  │ (Gemini Vision   │  │ (Gemini Audio +      │
      │                 │  │  structured out) │  │  cross-validation)   │
      └─────────────────┘  └──────────────────┘  └──────────────────────┘

          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌──────────────────┐    ┌───────────────────────┐   ┌─────────────────────┐
│  FraudAgent       │  │    RoutingAgent         │   │ CommunicationAgent  │
│  (Fraud Scoring)  │  │    (Stage 5)            │   │ (Customer Message + │
│                   │  │                         │   │  FCM Push)          │
└──────────────────┘    └───────────────────────┘   └─────────────────────┘
```

**Key principle:** The `ReturnOrchestrator` never calls the Google AI Studio API directly. It delegates to specialist agents and reasons about their outputs. Agents are the only entities that call external tools.

---

## 3. Shared Context Object — `ReturnContext`

All agents read from and write to a single `ReturnContext` object maintained by the orchestrator for the duration of a return session. This replaces the "pass output blob to next stage" pattern.

```json
{
  "return_id": "RTN-00892",
  "customer_id": "CUST-00123",
  "order_id": "ORD-47291",
  "sku_id": "PB-200",
  "return_reason_code": "not_charging",
  "pre_return_resolved": false,

  "media": {
    "type": "video",
    "upload_path": "gs://recomm-returns/RTN-00892/video.mp4",
    "signed_url": "https://...",
    "duration_seconds": 45,
    "fallback_used": false
  },

  "inspection": {
    "identity": { "confidence": 0.97, "match": true, "agent_reasoning": "..." },
    "damage": {
      "defects": [{ "code": "USB_PORT_LOOSE", "severity": "functional" }],
      "grade": "C",
      "confidence": 0.91,
      "agent_reasoning": "..."
    },
    "voice": {
      "transcript": "It's not charging at all, I've tried multiple cables",
      "confidence": 0.88,
      "available": true
    },
    "cross_validation": {
      "consistent": true,
      "fraud_signal_weight": 0.05,
      "agent_reasoning": "..."
    }
  },

  "fraud": {
    "composite_score": 0.08,
    "signals": {
      "identity_mismatch": 0.03,
      "voice_visual_inconsistency": 0.05,
      "customer_trust_score": 0.82,
      "return_frequency_flag": false
    }
  },

  "policy_decision": {
    "outcome": "warranty_escalation",
    "refund_amount_inr": 1299,
    "reasoning_trace": "Grade C + 12 days since purchase + USB_PORT_LOOSE matches known PB-200 manufacturer fault",
    "confidence": 0.95
  },

  "routing": {
    "hub_id": "HYD-SC-01",
    "hub_type": "service_centre",
    "distance_saved_km": 312,
    "co2_avoided_kg": 0.014,
    "value_recovered_inr": 1299,
    "secondary_listing_draft": null,
    "warranty_claim_payload": {
      "sku_id": "PB-200",
      "defect_code": "USB_PORT_LOOSE",
      "is_manufacturer_fault": true,
      "video_signed_url": "https://...",
      "service_centre_id": "HYD-SC-01"
    }
  },

  "orchestrator_log": [
    { "step": "troubleshooter", "agent": "TroubleshooterAgent", "status": "done", "result": "not_resolved" },
    { "step": "inspection", "agent": "InspectionAgent", "status": "done", "retries": 0 },
    { "step": "fraud_scoring", "agent": "FraudAgent", "status": "done" },
    { "step": "policy", "agent": "PolicyAgent", "status": "done" },
    { "step": "routing", "agent": "RoutingAgent", "status": "done" },
    { "step": "communication", "agent": "CommunicationAgent", "status": "done" }
  ]
}
```

The `orchestrator_log` is the audit trail — it records every agent invocation, retry, and status. It feeds directly into the training data store.

---

## 4. Agent Definitions

### 4.1 ReturnOrchestrator

**Role:** Central coordinator. Maintains `ReturnContext`. Decides which agents to invoke, in what order, and what to do with their outputs. The only agent that can make cross-cutting decisions (e.g., "inspection returned low confidence on identity — should I retry with a frame subset or escalate directly?").

**Does NOT:** Call the Google AI Studio API, write to storage, or send notifications directly.

**Decision logic:**

```
Start Return Session
  → Invoke TroubleshooterAgent
    → If resolved: close session, update pre_return_resolved = true
    → If not resolved: continue

Invoke InspectionAgent (async, non-blocking)
  → On partial failure: check which sub-tasks failed
    → If identity failed only: flag identity_confidence = 0, continue with damage + voice
    → If damage failed: retry once with frame subset prompt
    → If both identity + damage failed: escalate to human review immediately
    → If voice failed: set voice.available = false, continue without it (non-blocking)
  → On success: write results to ReturnContext

Invoke FraudAgent in parallel with PolicyAgent once inspection is complete
  → FraudAgent timeout: 5 seconds
  → PolicyAgent WAITS for FraudAgent result up to 5s
  → If FraudAgent times out: PolicyAgent proceeds with neutral fraud_score = 0.5
    and sets ReturnContext.fraud.score_available = false
    → PolicyAgent notes the absence in its reasoning_trace
    → Conservative defaults apply: Grade C → Human Escalation (not auto-approve)

Invoke RoutingAgent after PolicyAgent returns decision

Invoke CommunicationAgent last with final ReturnContext

Log orchestrator_log to training data store
```

**Error handling posture:** Fail-narrow, not fail-wide. A single sub-task failure should not block the return. The orchestrator reasons about which failures are blocking and which are tolerable.

---

### 4.2 TroubleshooterAgent

**Role:** Determines whether the return can be resolved before entering the logistics flow.

**Tools:**
- `get_sku_troubleshooter_steps(sku_id, reason_code)` → Returns product-specific fix steps and historical resolution rate
- `write_pre_return_flag(return_id, resolved: bool)` → Writes `pre_return_resolved` to `ReturnContext`

**Error handling:**
- If SKU has no troubleshooter entry → skip troubleshooter, proceed directly to recording (do not show an empty step)
- Tool call timeout → skip, log, proceed

---

### 4.3 InspectionAgent

**Role:** Orchestrates the three parallel Gemini calls and synthesises results into the `inspection` block of `ReturnContext`. This is the most complex agent because it manages internal parallelism and partial failure.

**Internal sub-tasks (run in parallel):**

| Sub-task | Tool | Failure behaviour |
|----------|------|-------------------|
| Identity check | `gemini_identity_check(video_path, sku_catalogue_image)` | Low confidence → flag, do not block |
| Damage assessment | `gemini_damage_assessment(video_path, sku_id)` | Retry once with prompt variant; if still fails → escalate |
| Voice transcription | `gemini_transcribe_audio(audio_path)` | Set `voice.available = false`; cross-validation skipped |
| Voice-visual cross-validation | `gemini_cross_validate(transcript, defect_list)` | Only runs if transcription succeeded |

**Retry logic:**
- Each tool call: up to **3 retries** with exponential backoff (1s, 2s, 4s)
- On persistent failure of damage assessment: switch to photo fallback path if photos are available; otherwise escalate
- Confidence threshold for damage: `>= 0.75` to auto-grade; below this → human review flag is set, but processing continues

**Output:** Populates `ReturnContext.inspection`. Writes `agent_reasoning` string for each sub-task (Gemini's chain-of-thought output, truncated to 500 chars).

---

### 4.4 FraudAgent

**Role:** Aggregates all available signals into a single composite fraud score. Runs in parallel with PolicyAgent after inspection completes.

**Tools:**
- `get_customer_trust_score(customer_id)` → `{ trust_score, total_returns, fraud_flags_lifetime }`
- `check_return_frequency(customer_id, window_days: 30)` → Returns whether customer exceeds frequency threshold
- `aggregate_fraud_signals(identity_confidence, voice_visual_consistent, trust_score, frequency_flag)` → Weighted composite score (0.0–1.0)

**Weighting (configurable per merchant):**

| Signal | Default Weight |
|--------|---------------|
| Identity match confidence (inverted) | 30% |
| Voice-visual inconsistency flag | 25% |
| Customer trust score (inverted) | 30% |
| Return frequency flag | 15% |

**Error handling:** If trust score lookup fails → default to neutral score (0.5) and flag absence in `ReturnContext` for the PolicyAgent to note. Never block on this.

---

### 4.5 PolicyAgent

**Role:** Applies merchant return policy to the full inspection and fraud context. Produces a single decision outcome with a human-readable reasoning trace.

**Tools:**
- `get_merchant_policy(merchant_id)` → Return window, fraud rejection threshold, partial refund rules
- `lookup_manufacturer_fault(sku_id, defect_code)` → Checks if defect matches known manufacturer fault library
- `evaluate_return_window(order_date, return_date, window_days)` → Returns within-window boolean

**Decision logic (agent reasons over these inputs, in order):**

```
1. Is return within merchant's return window?
   → No → Rejected (unless warranty fault detected — see step 3)

2. Is fraud score above merchant rejection threshold?
   → Yes → Rejected (log fraud signal detail)

3. Does defect match manufacturer fault library?
   → Yes → Warranty Escalation (overrides rejection if manufacturer fault, even outside window)

4. Is AI inspection confidence below human review threshold?
   → Yes → Human Escalation (do not auto-decide)

5. What is the condition grade?
   → A → Approved, full refund
   → B → Partial Refund (refund % configurable by merchant)
   → C → Approved with routing to refurb centre
   → Scrap → Approved with write-off (or Rejected, merchant-configurable)
```

**Why this is agentic, not just a rule engine:** The PolicyAgent reasons over the *combined context* and can explain its decision in natural language. It does not just check rules sequentially — it weighs conflicting signals (e.g., Grade C but trust score 0.95 and within window) and produces a justified outcome. The `reasoning_trace` it writes is the explanation a human reviewer would read if the case were escalated.

**Parallelism and wait behaviour:** PolicyAgent fires immediately after InspectionAgent completes. It waits up to **5 seconds** for FraudAgent to write `ReturnContext.fraud`. If FraudAgent has not responded within 5s, PolicyAgent reads `fraud.score_available = false` from context and applies a `neutral_fraud_score = 0.5`. The absence is noted in `reasoning_trace` so human reviewers know the fraud signal was unavailable. This prevents deadlock while keeping the decision defensible.

**Error handling:** If merchant policy fetch fails → apply conservative defaults (reject if outside 7 days, escalate all C/Scrap). Log the degraded mode in `orchestrator_log`.

---

### 4.6 RoutingAgent

**Role:** Given the policy decision and customer location, selects the optimal physical destination and calculates impact metrics.

**Tools:**
- `get_nearest_hub(pincode, hub_type, sku_id)` → Returns hub from cached pincode-to-hub table (cache miss → live lookup)
- `check_hub_capacity(hub_id)` → Returns available capacity; if full, moves to next nearest hub
- `calculate_co2_saved(distance_saved_km, weight_kg)` → Uses GLEC factor 0.00021
- `estimate_recovery_value(grade, sku_id)` → Estimated resale/refurb value in ₹
- `generate_listing_draft(defect_summary, grade, sku_id)` → AI-generated Grade B resale listing
- `get_ewaste_partner(pincode)` → Nearest certified e-waste recycler for Scrap grade

**Routing decision map:**

| Grade | Decision | Tools invoked |
|-------|----------|---------------|
| A | Dark store restock | `get_nearest_hub(type=dark_store)` |
| B | Resale hub + listing | `get_nearest_hub(type=resale_partner)` + `generate_listing_draft` |
| C — manufacturer fault | Service centre | `get_nearest_hub(type=service_centre)` |
| C — customer damage | Refurb centre | `get_nearest_hub(type=refurb_centre)` |
| Scrap | E-waste | `get_ewaste_partner` |

**Error handling:** If nearest hub is over capacity → automatically try next nearest (up to 3 hops). If no hub found in city → fall back to regional hub. If all regional hubs fail → route to central warehouse and log degraded routing.

**`generate_listing_draft` — Prompt Template:**
```
System: You are a product listing writer for a refurbished goods marketplace.
Create a short, honest, and appealing product listing for a returned item.
Never hide defects. Use simple language. Maximum 120 words.

User:
Product: {sku_name} by {brand}
Condition grade: B (cosmetic damage only, fully functional)
Defects found: {defect_summary}   ← from InspectionAgent damage output
Original price: ₹{original_price}

Write:
1. Title (max 10 words)
2. Condition label (one of: "Like New", "Good", "Fair")
3. Description (max 80 words, honest about defects)
4. Suggested resale price in ₹ (apply 15–30% discount based on defect severity)
```

**Output schema** (structured JSON from Gemma 4):
```json
{
  "title": "Portronics PB-200 Powerbank — Good Condition",
  "condition_label": "Good",
  "description": "Fully functional 10,000mAh powerbank with minor scuff on the back panel...",
  "suggested_price_inr": 949
}
```
Character limits enforced by Gemma 4 structured output schema (`maxLength` on each field). Listing is written to `ReturnContext.routing.secondary_listing_draft`.

---

### 4.7 CommunicationAgent

**Role:** Generates the customer-facing decision message and triggers FCM push notification. Runs last, after all other agents are complete.

**Tools:**
- `generate_customer_message(decision, grade, refund_amount, language, routing_summary)` → Calls Gemini to produce empathetic plain-language message in Hindi or English
- `send_fcm_notification(customer_id, title, body)` → Sends push notification if customer has closed the tab
- `write_to_firestore(merchant_id, return_id, summary)` → Triggers Firestore listener update for merchant dashboard

**Prompt Templates — Customer Decision Message:**

These are the base templates passed to Gemma 4. The model fills in the variables and adjusts tone — it does not generate from scratch, preventing hallucinated policies.

**English template:**
```
System: You are ReComm's customer support voice. Write in warm, plain English.
Never use legal language. Maximum 60 words. Do not mention internal systems.

Outcome: {decision}              ← one of the 5 policy outcomes
Refund amount: ₹{refund_amount}  ← 0 if rejected
Grade: {grade}
Reason summary: {reasoning_trace} ← PolicyAgent output, condensed
Routing: {routing_summary}       ← hub type and city
```

**Hindi template:**
```
System: आप ReComm के कस्टमर सपोर्ट की आवाज़ हैं। सरल हिंदी में लिखें।
कानूनी भाषा न लिखें। अधिकतम 60 शब्द।

[Same variable block as English template]
```

**Character limits (enforced via structured output):**
- Message body: max 350 characters
- Notification title (FCM): max 50 characters
- Notification body (FCM): max 100 characters

**Fallback template** (used if Gemma 4 generation fails or output is too short):
```
EN: "Your return for {sku_name} has been {decision_label}. {refund_line} We'll be in touch shortly."
HI: "आपकी {sku_name} की वापसी {decision_label} हुई है। {refund_line} हम जल्द ही संपर्क करेंगे।"
```

**Error handling:**
- If FCM send fails → log, do not retry (notification is supplementary; primary verdict is in the app)
- If message generation produces content below minimum length or in wrong language → fall back to template message, log failure
- Firestore write failure → retry once; if fails, queue for delayed write

---

## 5. Error Handling — Principles Summary

| Scenario | Behaviour |
|----------|-----------|
| Transient Google AI Studio timeout | Retry up to 3× with exponential backoff |
| Persistent Google AI Studio API failure on one sub-task | Degrade gracefully: continue without that signal, flag in `ReturnContext` |
| Persistent failure on damage assessment | Human escalation: most critical signal — cannot grade without it |
| Voice transcription unavailable | Non-blocking: skip cross-validation, note in fraud score weighting |
| Identity confidence low | Continue processing, flag identity_confidence in context — do not auto-reject |
| Merchant policy fetch fails | Apply conservative defaults, log degraded mode |
| Hub capacity full | Try next nearest (up to 3 hops), then regional fallback |
| FCM push fails | Log and move on — not a blocking error |
| Any agent exceeds timeout (30s) | Orchestrator escalates to human review for that step only |

---

## 6. Reasoning Traces & Training Data

Every agent writes an `agent_reasoning` field to `ReturnContext` for each decision it makes. This is the chain-of-thought output from Gemini, trimmed to 500 characters, stored as a string.

At the end of every return session (successful or escalated), the orchestrator writes the full `ReturnContext` — including all `agent_reasoning` fields and the `orchestrator_log` — to the training data store.

When a human reviewer overrides a decision, the override is attached to the same `ReturnContext` record. The record is then a complete labelled training example: inputs, agent reasoning, original decision, human override, and reviewer notes. This is far richer than the "log the override" approach in a pipeline system.

---

## 7. Updated Data Flow — Agentic Version

```
Customer initiates return
        │
        ▼
ReturnOrchestrator creates ReturnContext (return_id, session start)
        │
        ▼
TroubleshooterAgent
  → Tools: get_sku_troubleshooter_steps, write_pre_return_flag
  → Outcome: resolved (session closes) OR not_resolved (continue)
        │ not_resolved
        ▼
[Customer records video / submits photos]
        │
        ▼
InspectionAgent  ←── 3 sub-tasks run in PARALLEL
  ├── IdentityTool (Gemini Vision)
  ├── DamageTool  (Gemini Vision structured)
  └── VoiceTool   (Gemini Audio + cross-validation)
  → Each writes to ReturnContext.inspection
  → Agent reasons about partial failures and retries
        │
        ├──────────────────────────────┐
        ▼                              ▼
FraudAgent                        (waits for InspectionAgent)
  → Tools: trust_score,           PolicyAgent
    frequency_check, aggregate    → Tools: merchant_policy,
  → Writes ReturnContext.fraud       fault_library, window_check
        │                         → Writes ReturnContext.policy_decision
        └──────────────────────────────┤
                                       ▼
                                  RoutingAgent
                                  → Tools: hub_match, co2_calc,
                                    listing_draft, ewaste_lookup
                                  → Writes ReturnContext.routing
                                       │
                                       ▼
                                  CommunicationAgent
                                  → Tools: message_gen (Gemini),
                                    FCM push, Firestore write
                                       │
                                       ▼
                              ReturnContext written to
                              training data store (full trace)
```

---

## 8. Technology Mapping

| Agent / Component | Technology |
|-------------------|-----------|
| Orchestrator + all agents | **Gemini Function Calling** via Google AI Studio API |
| All vision + audio analysis tools | **Gemma 4** via Google AI Studio API |
| Agent session state (`ReturnContext`) | **Firestore** document (real-time, survives tab close) |
| Merchant dashboard real-time updates | **Firestore listeners** on `/merchants/{id}/returns` |
| Async task queue (agent invocation) | **Cloud Tasks** (triggered via GCS Pub/Sub `ObjectFinalize` event) |
| Offline video buffer (client) | **IndexedDB** |
| Push notifications | **Firebase Cloud Messaging (FCM)** |
| Hub distance cache | **Redis** (Cloud Memorystore) |
| Video storage | **Google Cloud Storage** (private bucket, XML multipart resumable uploads, 15-min signed URL TTL, 90-day deletion TTL) |
| Training data store | **BigQuery** table — append-only, one row per `ReturnContext` |

---

## 9. What Changes vs. the Original Pipeline

| Dimension | Pipeline (Old) | Agentic (New) |
|-----------|---------------|---------------|
| Error handling | Fixed fallback paths | Orchestrator reasons about each failure |
| Confidence handling | Hard threshold → escalate | Agent explains *why* confidence is low and decides whether to retry or escalate |
| Parallelism | Stage 3 only | FraudAgent + PolicyAgent run in parallel; InspectionAgent sub-tasks in parallel |
| Training data | Human override only | Full session `ReturnContext` + reasoning traces logged for every return |
| Partial failure | Blocks downstream stage | Non-blocking; orchestrator continues with available signals |
| Decision explainability | Not captured | `agent_reasoning` + `orchestrator_log` captured on every case |
| Retry logic | Not defined | Per-agent: up to 3× with exponential backoff |
| Voice transcription failure | Stalls inspection | Non-blocking; fraud agent notes absence and adjusts weighting |

---

*Read this document alongside `requirements.md` (data models, API contracts, privacy rules) and `feature-list.md` (feature scope per stage).*
