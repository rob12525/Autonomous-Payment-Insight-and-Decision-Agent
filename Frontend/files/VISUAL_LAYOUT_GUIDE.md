# Dashboard Visual Layout Guide

## 🎨 Complete UI Overview

This document provides ASCII art visualizations of the dashboard layout to help you understand the structure.

---

## Main Dashboard (Home Page)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT INTELLIGENCE SYSTEM                              │
│  [Home] [Decisions] [Audit] [Reports] [Settings]              🔍 Search  [👤] │
└────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │  Total   │ │Executed  │ │Rejected  │ │   Avg    │ │   Avg    │ │ Success  ││
│  │Decisions │ │   128    │ │    8     │ │Confidence│ │ Accuracy │ │  Rate    ││
│  │   142    │ │   🟢     │ │   🔴     │ │   78%    │ │   92%    │ │  94.7%   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────┬──────────────────────────┐
│  DECISION TIMELINE   │  DECISION DETAILS     │   SYSTEM HEALTH          │
│  (40% width)         │  (35% width)          │   (25% width)            │
├──────────────────────┼───────────────────────┼──────────────────────────┤
│                      │                       │                          │
│ PENDING APPROVALS(3) │  DECISION DETAIL      │  SUCCESS RATE (24h)      │
│ ┌──────────────────┐ │  ┌─────────────────┐  │  ████████████░░░░ 94.7%  │
│ │ 2m ago           │ │  │ ID: uuid-123    │  │                          │
│ │ send_notification│ │  │ Type: notify    │  │  CONFIDENCE DIST         │
│ │ Confidence: 72% │ │  │ Time: 14:32:15  │  │  0-20%  ░░ 3             │
│ │ Risk: 🟡 Medium │ │  │                 │  │  20-40% ░░░ 5            │
│ │ [APPROVE][REJECT]│ │  │ REASONING       │  │  40-60% ░░░░░ 8          │
│ └──────────────────┘ │  │ • Pattern: high │  │  60-80% ██████ 18        │
│ ┌──────────────────┐ │  │   amount (95%)  │  │  80%+   ████████ 28      │
│ │ 5m ago           │ │  │ • Pattern: week │  │                          │
│ │ freeze_account   │ │  │   end (92%)     │  │  RISK LEVELS             │
│ │ Confidence: 45% │ │  │                 │  │  Low    ████████ 78      │
│ │ Risk: 🔴 High   │ │  │ HYPOTHESIS      │  │  Medium ████ 32          │
│ │ [APPROVE][REJECT]│ │  │ Unusual payment │  │  High   ██ 10            │
│ └──────────────────┘ │  │ pattern detected│  │                          │
│                      │  │                 │  │  ERROR LOG               │
│ RECENT DECISIONS     │  │ CONFIDENCE      │  │  🔴 2 Critical           │
│ ┌──────────────────┐ │  │ ████████░░ 72%  │  │  🟠 5 Warnings           │
│ │ ✅ notify_sent   │ │  │                 │  │  🔵 23 Info              │
│ │ 95ms ago         │ │  │ APPROVAL        │  │                          │
│ └──────────────────┘ │  │ Required: YES   │  │  [VIEW LOGS]             │
│ ┌──────────────────┐ │  │ Approved: YES   │  │                          │
│ │ ✅ process_pay   │ │  │ By: admin@co.   │  │                          │
│ │ 234ms ago        │ │  │ At: 14:33:02    │  │                          │
│ └──────────────────┘ │  │                 │  │                          │
│ ┌──────────────────┐ │  │ [COPY ID]       │  │                          │
│ │ ⚠️  partial_fail │ │  │ [VIEW AUDIT]    │  │                          │
│ │ 120ms ago        │ │  │ [FULL CHAIN]    │  │                          │
│ └──────────────────┘ │  └─────────────────┘  │                          │
│                      │                       │                          │
│ [Sort: Newest ▼] [🔄]│                       │ Last updated: 14:35:42   │
└──────────────────────┴───────────────────────┴──────────────────────────┘
```

---

## Decisions Page (Full Table View)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT INTELLIGENCE SYSTEM                              │
│  [Home] [Decisions*] [Audit] [Reports] [Settings]         🔍 Search  [👤]     │
└────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────┐
│  [KPI Cards - Same as above]                                                   │
└────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│  DECISION BROWSER                                                              │
│                                                                                │
│  Filters:                                                                      │
│  Status: [All ▼]  Confidence: [0.0 ←───────→ 1.0]  Date: [Last 24h ▼] × Clear│
│  Search: [________________________________]  [🔍 Search]                       │
│                                                                                │
│ ┌─┬──────────────┬────────────┬──────────┬─────────────┬─────────────────────┐│
│ │#│ Type         │ Confidence │ Status   │ Risk        │ Time                ││
│ ├─┼──────────────┼────────────┼──────────┼─────────────┼─────────────────────┤│
│ │1│ notify       │ ████░░ 72% │ Approved │ 🟡 Medium   │ 2 min ago          ││
│ │2│ freeze       │ ████░░ 45% │ Pending  │ 🔴 High     │ 5 min ago          ││
│ │3│ refund       │ █████░ 88% │ Executed │ 🟢 Low      │ 12 min ago         ││
│ │4│ charge       │ █████░ 91% │ Executed │ 🟢 Low      │ 18 min ago         ││
│ │5│ verify       │ ████░░ 67% │ Approved │ 🟡 Medium   │ 24 min ago         ││
│ │6│ block        │ ████░░ 55% │ Rejected │ 🔴 High     │ 31 min ago         ││
│ │7│ notify       │ █████░ 82% │ Executed │ 🟢 Low      │ 45 min ago         ││
│ │8│ process      │ █████░ 94% │ Executed │ 🟢 Low      │ 1 hour ago         ││
│ └─┴──────────────┴────────────┴──────────┴─────────────┴─────────────────────┘│
│                                                                                │
│  Showing 1-8 of 142 decisions          [← Previous]  [Page 1 of 18]  [Next →]│
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Audit Trail Page

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT INTELLIGENCE SYSTEM                              │
│  [Home] [Decisions] [Audit*] [Reports] [Settings]         🔍 Search  [👤]     │
└────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│  AUDIT LOG VIEWER                                                              │
│                                                                                │
│  Filters:  Level: [All ▼]  Module: [All ▼]  Search: [______________] [🔍]     │
│                                                                [Export CSV]    │
│                                                                                │
│ ┌────────────┬──────────┬────────────┬────────────────────────────────────────┐│
│ │ Time       │ Level    │ Module     │ Event                                  ││
│ ├────────────┼──────────┼────────────┼────────────────────────────────────────┤│
│ │ 14:32:15   │ ⚠️  WARN │ executor   │ Decision flagged for approval:         ││
│ │            │          │            │ confidence below threshold             ││
│ │            │          │            │ Data: {confidence: 0.72, threshold:..} ││
│ ├────────────┼──────────┼────────────┼────────────────────────────────────────┤│
│ │ 14:33:02   │ ℹ️  INFO │ executor   │ Decision approved by human             ││
│ │            │          │            │ User: admin@company.com                ││
│ │            │          │            │ Related: uuid-123                      ││
│ ├────────────┼──────────┼────────────┼────────────────────────────────────────┤│
│ │ 14:33:05   │ ✅ INFO  │ executor   │ Action execution completed             ││
│ │            │          │            │ Duration: 245ms, Status: success       ││
│ │            │          │            │ Related: uuid-123                      ││
│ ├────────────┼──────────┼────────────┼────────────────────────────────────────┤│
│ │ 14:34:12   │ 🚨 CRIT  │ guardrails │ High-risk action blocked               ││
│ │            │          │            │ Reason: Confidence too low             ││
│ │            │          │            │ Related: uuid-456                      ││
│ └────────────┴──────────┴────────────┴────────────────────────────────────────┘│
│                                                                                │
│  Showing 1-20 of 87 logs                                    [More] [Less]     │
│                                              [Generate Compliance Report]     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Reports Page

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT INTELLIGENCE SYSTEM                              │
│  [Home] [Decisions] [Audit] [Reports*] [Settings]         🔍 Search  [👤]     │
└────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│  COMPLIANCE REPORTS                                                            │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  GENERATE NEW REPORT                                                     │ │
│  │                                                                          │ │
│  │  Date Range:  From: [2025-02-01 📅]  To: [2025-02-02 📅]                │ │
│  │                                                                          │ │
│  │  [📄 GENERATE PDF]  [📊 GENERATE CSV]  [👁️  PREVIEW]                    │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  RECENT REPORTS                                                          │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 📄 Daily Report - February 01, 2025                      (1.2 MB)  │ │ │
│  │  │ Generated: Feb 01, 2025 23:59:59                                   │ │ │
│  │  │ Coverage: 142 decisions, 87 audit events                           │ │ │
│  │  │                                           [⬇️  Download] [👁️  View] │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 📄 Weekly Report - Jan 26 - Feb 01, 2025                (3.4 MB)  │ │ │
│  │  │ Generated: Feb 01, 2025 23:59:59                                   │ │ │
│  │  │ Coverage: 847 decisions, 534 audit events                          │ │ │
│  │  │                                           [⬇️  Download] [👁️  View] │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 📄 Monthly Report - January 2025                        (12 MB)   │ │ │
│  │  │ Generated: Feb 01, 2025 00:00:01                                   │ │ │
│  │  │ Coverage: 3,421 decisions, 2,156 audit events                      │ │ │
│  │  │                                           [⬇️  Download] [👁️  View] │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Detail Modal/Panel (Expanded View)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        DECISION DETAIL                                    [✕]  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ID: uuid-a8f9-4d2c-b7e3-1234567890ab                            [📋 Copy ID] │
│  Type: send_notification                                     Timestamp: ⏰     │
│  Created: 2025-02-01 14:32:15 UTC                                             │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════════╗ │
│  ║  REASONING                                                               ║ │
│  ╠══════════════════════════════════════════════════════════════════════════╣ │
│  ║  Patterns Detected (2):                                                  ║ │
│  ║  • weekend_transaction (confidence: 95%)                                 ║ │
│  ║  • high_amount (anomaly score: 0.65)                                     ║ │
│  ║                                                                          ║ │
│  ║  Hypothesis:                                                             ║ │
│  ║  "Unusual payment pattern detected during weekend hours with amount     ║ │
│  ║   significantly higher than user's typical transaction profile.         ║ │
│  ║   Recommend review before processing to prevent potential fraud."       ║ │
│  ╚══════════════════════════════════════════════════════════════════════════╝ │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════════╗ │
│  ║  CONFIDENCE & RISK                                                       ║ │
│  ╠══════════════════════════════════════════════════════════════════════════╣ │
│  ║  Overall Confidence:  ████████░░░░░░░░░░  72%                           ║ │
│  ║  Risk Level:          🟡 MEDIUM                                          ║ │
│  ╚══════════════════════════════════════════════════════════════════════════╝ │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════════╗ │
│  ║  APPROVAL WORKFLOW                                                       ║ │
│  ╠══════════════════════════════════════════════════════════════════════════╣ │
│  ║  Requires Approval:    ✓ YES (confidence < 80% threshold)               ║ │
│  ║  Human Approved:       ✓ YES                                            ║ │
│  ║  Approved By:          admin@company.com                                ║ │
│  ║  Approved At:          2025-02-01 14:33:02 UTC                          ║ │
│  ╚══════════════════════════════════════════════════════════════════════════╝ │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════════╗ │
│  ║  EXECUTION HISTORY (1)                                                   ║ │
│  ╠══════════════════════════════════════════════════════════════════════════╣ │
│  ║  ✅ Execution #1 - Success                                               ║ │
│  ║     Executed: 2025-02-01 14:33:05 UTC                                   ║ │
│  ║     Duration: 245ms                                                      ║ │
│  ║     Outcome: Notification sent to customer                              ║ │
│  ║     Metrics: {email_delivered: true, sms_sent: true}                    ║ │
│  ╚══════════════════════════════════════════════════════════════════════════╝ │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════════╗ │
│  ║  LEARNING OUTCOMES (1)                                                   ║ │
│  ╠══════════════════════════════════════════════════════════════════════════╣ │
│  ║  Feedback: ✅ Correct (Accuracy: 92%)                                    ║ │
│  ║  Predicted: Transaction would be blocked                                ║ │
│  ║  Actual:    Transaction was blocked after customer review              ║ │
│  ║  Learning:  Pattern recognition improved for weekend transactions       ║ │
│  ╚══════════════════════════════════════════════════════════════════════════╝ │
│                                                                                │
│  [View Audit Logs]  [View Full Chain]  [Export Details]              [Close] │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile View (Responsive Layout)

```
┌─────────────────────────┐
│  PAYMENT INTELLIGENCE   │
│  ☰                      │
└─────────────────────────┘
┌─────────────────────────┐
│ [KPI Cards - Stacked]   │
│ ┌─────────────────────┐ │
│ │ Total Decisions     │ │
│ │      142            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Executed            │ │
│ │      128            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Success Rate        │ │
│ │     94.7%           │ │
│ └─────────────────────┘ │
└─────────────────────────┘

┌─────────────────────────┐
│ PENDING (3)      [▼]    │
│ ┌─────────────────────┐ │
│ │ 2m  send_notify     │ │
│ │ 72% 🟡             │ │
│ │ [✓] [✗] [...]      │ │
│ └─────────────────────┘ │
└─────────────────────────┘

┌─────────────────────────┐
│ RECENT         [▼]      │
│ ✅ notify  2m  95ms     │
│ ✅ process 5m  234ms    │
│ ⚠️  partial 8m  120ms   │
└─────────────────────────┘

[Tap for details]
```

---

## Color Legend

```
Status Colors:
🟢 Green   - Success, Executed, Low Risk
🟡 Amber   - Warning, Medium Risk, Approval Needed
🔴 Red     - Error, Failed, High Risk, Rejected
🔵 Blue    - Info, Approved
🟣 Purple  - Critical Events

UI Elements:
[Button]   - Clickable button
[Item ▼]   - Dropdown menu
█████      - Progress bar / filled
░░░░░      - Progress bar / empty
┌────┐     - Container border
│text│     - Content area
```

---

## Icon Guide

```
Navigation:
🏠 Home
📊 Decisions
🔍 Audit
📄 Reports
⚙️  Settings

Actions:
✅ Approve / Success
❌ Reject / Error
⚠️  Warning
🔄 Refresh
📋 Copy
⬇️  Download
👁️  View
📅 Calendar
🔍 Search

Status:
⏰ Timestamp
🟢 Low Risk
🟡 Medium Risk
🔴 High Risk
✓ Completed
⏳ Pending
```

---

This visual guide helps you understand the layout structure before running the actual dashboard. The real implementation includes smooth animations, hover effects, and interactive elements that make the experience even better!
