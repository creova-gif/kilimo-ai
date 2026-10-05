# Kilimo AI — Diagram sources (Mermaid)

Rendered copies live on the Miro board: https://miro.com/app/board/uXjVHz3Qfg4=/
These Mermaid sources are the version-controlled originals (GitHub renders them).

## 1 · System Architecture
```mermaid
flowchart TB
    classDef client fill:#c6dcff,stroke:#305bab
    classDef edge fill:#adf0c7,stroke:#087429
    classDef pub fill:#dbfaad,stroke:#608520
    classDef data fill:#fff6b6,stroke:#af7e02
    classDef ext fill:#ffd8f4,stroke:#af3fb9
    classDef ops fill:#e7e7e7,stroke:#595959
    subgraph CLIENT["Mobile App - Expo / React Native"]
      LB["lib: ai, supabase, sentry, sms, credit, agro, diseaseDetector"]:::client
    end
    subgraph SB["Supabase"]
      AUTH["Auth - OTP + JWT"]:::edge
      DB[("Postgres + RLS")]:::data
      OP["openai-proxy (JWT)"]:::edge
      VER["verify-agro-id (PUBLIC)"]:::pub
      PN["process-notifications (cron-secret)"]:::pub
    end
    CRON["pg_cron"]:::ops
    QRV["Bank/Buyer scans QR"]:::ops
    OPENAI["OpenAI"]:::ext
    LB --> AUTH
    LB --> DB
    LB --> OP
    OP --> OPENAI
    CRON -->|POST + x-cron-secret| PN
    QRV -->|GET ?token= public| VER
    VER --> DB
    PN --> DB
```
> Full node set is on the Miro board (diagram 1). This is the condensed source.

## 6 · Contract lifecycle (state machine)
```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> sent
    draft --> cancelled
    sent --> under_review
    under_review --> signed
    under_review --> disputed
    signed --> active
    active --> milestone_due
    active --> completed
    active --> disputed
    milestone_due --> active
    milestone_due --> completed
    disputed --> active
    disputed --> cancelled
    completed --> [*]
    cancelled --> [*]
```

## 7 · Onboarding flow
```mermaid
flowchart TD
    S([Launch]) --> L[0 Language SW/EN] --> P[1 Phone/email] --> O[2 OTP]
    O --> V{Existing profile?}
    V -->|Yes| DASH([Dashboard])
    V -->|No| R[3 Role] --> F[4 Farm profile] --> ID[5 ID verify]
    ID --> SUBV[submit-verification -> pending] --> MINT[mint-agro-id] --> D[6 Karibu] --> DASH
```

_The remaining diagrams (Data Model ER, Auth sequence, Agro-ID verify, Crop scan, Account deletion, Client class diagram, Notifications cron, Offline sync) are on the Miro board with full detail; regenerate here from the board if a local copy is needed._
