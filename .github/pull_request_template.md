# 📝 Pull Request Template

## Description
<!-- Provide a clear, concise summary of the changes, the problem being solved, and how this fits into our system. -->

---

## 🚀 Type of Change
- [ ] 🐛 Bug Fix
- [ ] ✨ New Feature
- [ ] 🔒 Security / Vulnerability Patch
- [ ] 💄 Redesign / Polish / Brand Alignment
- [ ] 🧹 Chore / Environment Scaffold

---

## 🛡️ CREOVA Quality Assurance Checklist
*Before requesting a review or merging, you must verify that all applicable checks are completed. Remember: **Branch, PR, and merge every single time, even for solo fixes [1].***

### 1. Integrity & Real-World Truth (Anti-Fabrication Standards)
*We enforce a strict policy against misleading mock states, fake labels, or unpersisted UI changes.*
- [ ] **No "Live" claims on static maps:** Maps and twins (such as Digital Farm Twin views) do not claim to be "Live" unless actively streaming real-time metrics [31].
- [ ] **Real backend persistence:** User modifications (e.g., Edit Profile data) actively persist to the database rather than existing only as local state [31].
- [ ] **Actual pipelines (No fakes):** Live tools like Voice Assistants use real AI backend pipelines rather than simulated frontends [31].
- [ ] **Transparent Demo/Demo-mode Labels:** If a feature operates in demo mode (e.g., crop scans, specialized headers), it is honestly labeled as "sample data" or "demo mode" (no misleading "Neural Link Active" or similar status claims) [31].
- [ ] **Authorized admin access:** Sensitive consoles and developer views have RBAC (Role-Based Access Control) gates and are removed from general user navigation [31].

### 2. Security & Database Integrity
- [ ] **Supabase JWT & Edge Functions:** Edge-function authorization configurations have been validated (e.g., `verify_jwt = true` enforced unless explicitly audited for public use) [30].
- [ ] **Row-Level Security (RLS):** All Supabase database tables have active RLS policies to close privacy leaks (especially regarding financial or personal data) [31].
- [ ] **Clean Upgrade Paths:** Payment screens and upgrade options are fully validated; paid tiers cannot be granted for free [31].

### 3. Performance, Layout & Localization
- [ ] **Robust Offline Handling:** Features preserve offline-created or offline-completed tasks and do not silently discard them [31].
- [ ] **Copy & Truncation Quality:** UI strings are checked for Swahili localization accuracy, and summary/pill labels do not truncate awkwardly on small displays [31].
- [ ] **Visual Constraints:** SVGs, charts, and layout components handle negative or zero-width constraints without causing rendering crashes [31].

---

## 🎯 Target Branch
- [ ] **`dev`** (Active Development: where all features live together [1])
- [ ] **`staging`** (Dress Rehearsal: looks exactly like production to patch weird behavior before launch [1])
- [ ] **`main`** (Sacred Production Branch: protected user-facing live environment [1])

---

## 🧪 Testing & Verification
<!-- Describe the tests run to verify these changes. Provide steps to reproduce the verification. -->

---

## 📸 Screenshots / Recordings
<!-- If modifying UI, layout alignment, or Swahili text layouts, please attach visual proof here. -->
