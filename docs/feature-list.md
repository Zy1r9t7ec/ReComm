# ReComm — Feature List

> **Purpose of this document:** A quick-reference guide to every feature in the ReComm platform. Each feature has a short description, which stage it belongs to, and which user (Customer or Merchant) it serves.
>
> **Last updated:** April 2026

---

## System Overview

ReComm has two primary user surfaces:
- **Customer Flow** — The guided return experience a customer goes through on their phone
- **Merchant Dashboard** — The operational intelligence layer for brands/stores

Features are grouped by the **5 core stages** of the platform, followed by the Merchant Dashboard features.

---

## Stage 1 — Pre-Return Intervention

> *Goal: Resolve the return before it enters logistics. Target: resolve 25–40% of initiated returns here.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 1.1 | **Return Reason Selector** | Customer selects a reason for return from a structured list (e.g., "Not Charging", "Wrong Size", "Damaged on Arrival"). Reason is captured as a structured data point, not free text. |
| 1.2 | **SKU-Aware Troubleshooter** | Based on the specific product (SKU) and selected return reason, the system surfaces product-specific troubleshooting steps. These are not generic — they are tailored (e.g., "Hold the power button for 8 seconds" shown only for specific powerbank models). |
| 1.3 | **Resolution Rate Display** | Alongside the troubleshooting step, the system shows how many other customers with the same issue resolved it using this fix (e.g., "This resolved the issue for 74% of customers"). Builds trust in the suggestion. |
| 1.4 | **Continue / Cancel Branch** | After attempting a troubleshooter fix, the customer either cancels the return (issue resolved) or confirms it didn't work and continues. Both paths are **equally visible** — the continue path is never hidden or de-emphasised. |

---

## Stage 2 — Guided Video Recording

> *Goal: Capture high-quality, structured video evidence of the product's condition before any logistics cost is incurred.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 2.1 | **Camera Activation with Consent Gate** | Before the camera is turned on, the customer sees a clear, standalone consent step (not buried in ToS). Under DPDP Act 2023, this is a legal requirement. Camera only activates after explicit confirmation. |
| 2.2 | **SKU-Specific Recording Script** | The recording UI shows a step-by-step prompt sequence tailored to the product — what to show, at what angle, and in what order (e.g., "Show front label → Show USB ports → Press power button on camera"). |
| 2.3 | **Real-Time Quality Detector** | Analyses the camera feed every 500ms for lighting and focus quality. Only flags an issue if poor quality persists across multiple frames (not on a single bad frame). Tells the customer specifically what to fix (e.g., "Move to a brighter area"). |
| 2.4 | **Voice Prompt During Recording** | Customer is prompted to speak their return reason aloud while recording. This voice input is used in Stage 3 for cross-validation against visuals. |
| 2.5 | **Recording Progress Indicator** | Shows the customer which prompt step they are on and how many remain. Keeps the experience from feeling open-ended. |
| 2.6 | **Video Upload with Progress + Retry** | Video uploads show a clear progress bar. On failure (poor network), the customer gets a clear retry option — no silent failure or lost progress. Video is capped at 90 seconds maximum. |
| 2.7 | **Photo + Voice Note Fallback** | For customers who cannot or will not record video (old devices, accessibility needs), a fallback path allows photo upload + voice note. Flagged for closer review in the inspection pipeline. |
| 2.8 | **Offline Video Storage (IndexedDB)** | If upload fails due to network loss, the recorded video is persisted locally in IndexedDB on the device. An automatic retry is triggered when connectivity is restored, so no recording is ever lost silently. |
| 2.9 | **FCM Push Notification — Verdict Delivery** | After submitting media, the customer may close the browser tab. Firebase Cloud Messaging (FCM) sends a push notification with the final return verdict (approved/rejected/escalated) so the result is delivered even if the session is closed. |
| 2.10 | **Language Toggle (Hindi / English)** | The entire customer flow supports both Hindi and English. A persistent toggle in the UI lets the customer switch language at any step. All recording prompts, troubleshooter steps, consent text, and decision messages are available in both languages. |

---

## Stage 3 — Multimodal AI Inspection

> *Goal: Determine product identity, condition, and fraud signals automatically — in parallel — before routing decisions are made.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 3.1 | **Product Identity Verification** | Checks whether the product in the video matches the original order using logos, form factor, colour, and brand markings. Low confidence → human review (not automatic rejection). |
| 3.2 | **Damage Assessment & Condition Grading** | Scans the video for visible defects (scratches, cracks, missing parts, water damage, heavy use). Outputs a structured defect list and assigns one of four grades: **A** (perfect), **B** (cosmetic damage), **C** (functional defect), **Scrap** (beyond recovery). |
| 3.3 | **Voice Transcription** | Transcribes the customer's spoken return reason from the recording into text. Used as an input to cross-validation. |
| 3.4 | **Voice-Visual Cross-Validation** | Compares the transcribed reason with the visual evidence. Inconsistency (e.g., customer says "screen cracked" but no damage is visible) is logged as a fraud signal — one input among several, not a sole decision factor. |
| 3.5 | **Composite Fraud Score** | Aggregates multiple signals (identity match confidence, voice-visual consistency, customer return history) into a single probabilistic fraud score. Never binary — used as a weighted input in the policy engine. |
| 3.6 | **Human Escalation Trigger** | If AI confidence on any inspection task falls below a defined threshold, the case is immediately flagged for human review rather than auto-decided. Threshold is configurable per merchant. |
| 3.7 | **AI Correction Feedback Loop** | When a human reviewer overrides an AI decision, the case is automatically logged as a labelled training example. Enables continuous model improvement over time. |

---

## Stage 4 — Policy Adjudication & Customer Communication

> *Goal: Apply the merchant's return policy to the inspection result and communicate the outcome to the customer in plain language — instantly.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 4.1 | **Policy Engine** | Evaluates the inspection result against configurable merchant rules: condition grade, purchase date vs. return window, customer return history, and whether the defect matches known manufacturer fault patterns. |
| 4.2 | **Five Decision Outcomes** | The engine produces exactly one of five outcomes: **Approved** (full refund), **Partial Refund** (cosmetic damage), **Warranty Escalation** (manufacturer fault), **Rejected** (outside window or fraud), **Human Escalation** (ambiguous case). |
| 4.3 | **Warranty Fault Pattern Matching** | Checks whether the identified defect matches a library of known manufacturer defect patterns for that SKU. If matched, automatically routes to warranty escalation instead of standard returns. |
| 4.4 | **Customer-Facing Decision Message** | Generates a plain-language, empathetic explanation of the outcome for the customer. No legal boilerplate. Message is immediate — not queued for human drafting. |
| 4.5 | **Merchant Policy Configuration** | Merchants can set return windows, condition thresholds, fraud rejection thresholds, and escalation rules via the dashboard — without code changes. |

---

## Stage 5 — Intelligent Rerouting

> *Goal: Route every returned product to its highest-value physical destination, minimising logistics cost and maximising recovery value.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 5.1 | **Grade A Routing — Hyperlocal Hub Restock** | Grade A (perfect condition) items are matched to the nearest dark store or fulfilment hub in the same city with active demand for the SKU and available capacity. Product is available for resale within hours. |
| 5.2 | **Grade B Routing — Regional Resale + Auto-Listing** | Grade B (cosmetic damage) items are routed to the nearest secondary market fulfilment partner. An AI-generated graded product listing (using the defect summary) is auto-drafted and ready before the product ships. |
| 5.3 | **Grade C Routing — Refurb or Warranty Centre** | Grade C (functional defect) items go to the brand's authorised service centre (if it's a manufacturer fault) or to the nearest refurbishment centre (if customer-caused). The AI defect report travels with the product as a ready-made work order. |
| 5.4 | **Scrap Routing — Certified E-Waste Partner** | Scrap items are matched to the nearest certified e-waste recycler. Carbon offset from responsible disposal is calculated and displayed. |
| 5.5 | **Hub Matching Engine** | Matches products to hubs based on proximity (pincode-to-hub distance), current SKU demand at each hub, and hub capacity. Pincode-to-hub distances are cached to avoid redundant API calls. |
| 5.6 | **Impact Metrics Display** | Every routing decision surfaces three metrics for the customer and merchant: **Value Recovered (₹)**, **Distance Saved (km)** vs. central warehouse routing, and **CO₂ Avoided (kg)** using the GLEC Framework emission factor (0.00021 kg CO₂/tonne-km). |
| 5.7 | **Mock Hub Dataset (Prototype)** | For prototype/demo purposes, a seeded dataset representing 5 Indian cities with 3–5 hubs each is used. Clearly documented as a placeholder for real 3PL and dark store inventory APIs in production. |

---

## Merchant Dashboard Features

> *Goal: Turn every return event into actionable operational intelligence for the brand.*

| # | Feature | Short Description |
|---|---------|-------------------|
| 6.1 | **Return Rate by SKU** | Shows which products are returned most, with filters by return reason, condition grade, and time period. Helps identify problematic products at a glance. |
| 6.2 | **Fraud Detection Feed** | Maps geographic clusters of flagged returns and shows the specific inconsistencies (visual + voice) that triggered each flag. Lets fraud teams investigate patterns quickly. |
| 6.3 | **Revenue Recovery Tracker** | Running total of value recovered via Grade A restock and Grade B resale, compared against estimated write-off under a standard return-and-discard workflow. The commercial ROI of the platform in one number. |
| 6.4 | **Product Quality Intelligence** | AI-generated insight cards per SKU — flags recurring defect patterns backed by video evidence. Example: "PB-200 has a 23% return rate; 68% cite USB-C port defect." Actionable for R&D and QC teams. |
| 6.5 | **Troubleshooter Effectiveness Report** | Shows what % of initiated returns were resolved by the pre-return troubleshooter, broken down by product and reason code. Measures the direct cost-saving impact of Stage 1. |
| 6.6 | **Human Review Queue** | Interface for reviewers to see all escalated cases, view the video evidence, read the AI analysis, and make an override decision. Overrides are logged as training data (Feature 3.7). |
| 6.7 | **Merchant Policy Manager** | UI for merchants to configure return window, fraud thresholds, escalation rules, and manufacturer fault patterns — without engineering involvement. |

---

## Feature Summary Count

| Surface | Stage | Feature Count |
|---------|-------|---------------|
| Customer | Stage 1 — Pre-Return Intervention | 4 |
| Customer | Stage 2 — Guided Video Recording | 10 |
| AI Engine | Stage 3 — Multimodal Inspection | 7 |
| System | Stage 4 — Policy & Communication | 5 |
| System | Stage 5 — Intelligent Rerouting | 7 |
| Merchant | Dashboard | 7 |
| **Total** | | **40 features** |

---

*This document should be the first point of reference when scoping sprints, assigning development tasks, or onboarding new contributors.*
