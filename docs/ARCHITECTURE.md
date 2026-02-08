# Architecture & Data Model

This document uses [Mermaid](https://mermaid.js.org/) diagrams to describe system architecture, API flow, and the PostgreSQL data structure. Render it in GitHub, GitLab, or any Markdown viewer that supports Mermaid.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
  subgraph Client["Client"]
    Browser["Browser / Next.js App"]
  end

  subgraph NextJS["Next.js Server"]
    API["API Routes"]
    Auth["Clerk Auth Middleware"]
    API --> Auth
  end

  subgraph Data["Data Layer"]
    Prisma["Prisma ORM"]
    PG[(PostgreSQL)]
    Prisma --> PG
  end

  subgraph Cache["Caches (PostgreSQL)"]
    PropCache["PropertyCache\n(30 days TTL)"]
    ZipCache["ZipCodeCache\n(90 days TTL)"]
  end

  subgraph ThirdParty["Third-Party Services"]
    Clerk["Clerk\n(Auth)"]
    OpenAI["OpenAI\n(Tasks, Photo AI)"]
    Resend["Resend\n(Email)"]
    OneSignal["OneSignal\n(Push)"]
    RentCast["RentCast\n(Property)"]
    Census["Census API\n(Demographics)"]
    Geocode["Nominatim / Google\n(Geocoding)"]
    OpenWeather["OpenWeather\n(Climate)"]
    Blob["Vercel Blob / Cloudinary\n(Uploads)"]
  end

  Browser --> API
  API --> Clerk
  API --> Prisma
  API --> PropCache
  API --> ZipCache
  Prisma --> PropCache
  Prisma --> ZipCache
  API --> OpenAI
  API --> Resend
  API --> OneSignal
  API --> RentCast
  API --> Census
  API --> Geocode
  API --> OpenWeather
  API --> Blob
```

---

## 2. Typical API Request Flow (Authenticated)

Most API routes follow this pattern: resolve Clerk identity, get-or-create user in DB, then perform the operation.

```mermaid
sequenceDiagram
  participant Client
  participant API as API Route
  participant Clerk
  participant Prisma
  participant DB as PostgreSQL

  Client->>API: Request (cookie/header)
  API->>Clerk: auth() / currentUser()
  Clerk-->>API: userId, email

  alt Not authenticated
    API-->>Client: 401 Unauthorized
  else Authenticated
    API->>Prisma: user.findUnique(clerkId)
    alt User not found
      API->>Prisma: user.create({ clerkId, email })
    end
    Prisma-->>API: user
    API->>Prisma: Business query (homes, tasks, etc.)
    Prisma->>DB: SQL
    DB-->>Prisma: Result
    Prisma-->>API: Data
    API-->>Client: 200 JSON
  end
```

---

## 3. Property Lookup Flow (with caching)

Shows how property lookup uses cache and multiple external sources.

```mermaid
flowchart LR
  A[POST /api/property/lookup] --> B{PropertyCache?}
  B -->|Hit, not expired| C[Return cached data]
  B -->|Miss or expired| D[enrichPropertyData]
  D --> E{RentCast API}
  E -->|OK| F[Map + return]
  E -->|Fail| G{Census / USPS / Geocode}
  G -->|OK| F
  G -->|Fail| H{RapidAPI / Scraping?}
  H -->|Configured| I[lookupProperty]
  I --> J[setCachedPropertyData]
  J --> F
  H -->|Not configured| K[Return found: false]
  F --> J
```

---

## 4. Climate Lookup Flow (with ZIP cache)

```mermaid
flowchart LR
  A[POST /api/climate/lookup] --> B{ZipCodeCache?}
  B -->|Hit| C[Return cached climate]
  B -->|Miss| D[fetchClimateData]
  D --> E{OpenWeather?}
  E -->|OK| F[getClimateRecommendations]
  E -->|Estimate| F
  F --> G[setCachedZipCodeData]
  G --> H[Return data + recommendations]
```

---

## 5. API Route Overview (by domain)

```mermaid
flowchart TB
  subgraph Auth["Auth"]
    A1[Clerk - no API route]
  end

  subgraph Core["Core Domain"]
    H["/api/homes"]
    T["/api/tasks"]
    D["/api/dashboard"]
    I["/api/inventory"]
    M["/api/maintenance/history"]
  end

  subgraph Lookup["Lookup & Enrichment"]
    P["/api/property/lookup"]
    C["/api/climate/lookup"]
    L["/api/compliance/lookup"]
  end

  subgraph Tasks["Task Generation"]
    TG["/api/tasks/generate"]
    TAI["/api/tasks/generate-ai"]
    TC["/api/tasks/generate-compliance"]
    TT["/api/tasks/templates"]
  end

  subgraph Budget["Budget"]
    B["/api/budget"]
    BP["/api/budget/plans"]
    BA["/api/budget/alerts"]
  end

  subgraph DIY["DIY Projects"]
    DP["/api/diy-projects"]
    DPT["/api/diy-projects/templates"]
    DPG["/api/diy-projects/generate-plan"]
  end

  subgraph Notify["Notifications"]
    NS["/api/notifications/send-reminders"]
    NP["/api/notifications/push/*"]
  end

  subgraph Media["Media"]
    U["/api/upload"]
    SA["/api/systems/analyze-photo"]
    TA["/api/tools/analyze-photo"]
  end

  subgraph Warranty["Warranties"]
    W["/api/warranties/check-expiring"]
  end
```

---

## 6. PostgreSQL Data Model (ER Diagram)

Core entities and relationships. All IDs are `cuid`; `*` = required, `?` = optional.

### 6.1 Core: User, Home, Tasks

```mermaid
erDiagram
  User ||--o{ Home : "has"
  User ||--o{ MaintenanceTask : "owns via Home"
  User ||--o{ CompletedTask : "completes"
  User ||--o{ BudgetPlan : "has"
  User ||--o{ BudgetAlert : "receives"
  User ||--o{ DiyProject : "has"
  User ||--o{ ToolInventory : "has"
  User ||--o{ PushSubscription : "has"
  User ||--o{ LeadRequest : "creates"

  Home ||--o{ HomeSystem : "has"
  Home ||--o{ Appliance : "has"
  Home ||--o{ ExteriorFeature : "has"
  Home ||--o{ InteriorFeature : "has"
  Home ||--o{ MaintenanceTask : "has"
  Home ||--o{ MaintenanceHistory : "has"
  Home ||--o{ DiyProject : "has"
  Home ||--o{ LeadRequest : "for"

  TaskTemplate ||--o{ MaintenanceTask : "instantiates"
  MaintenanceTask ||--o{ CompletedTask : "has"
  MaintenanceTask ||--o{ LeadRequest : "can link"

  User {
    string id PK
    string clerkId UK
    string email UK
    enum subscriptionTier
    string stripeCustomerId
    string stripeSubscriptionId
  }

  Home {
    string id PK
    string userId FK
    string address
    string city
    string state
    string zipCode
    int yearBuilt
    int squareFootage
    float lotSize
    string homeType
    string climateZone
    float averageRainfall
    float averageSnowfall
    string stormFrequency
  }

  HomeSystem {
    string id PK
    string homeId FK
    enum systemType
    string brand
    string model
    date installDate
    int expectedLifespan
    string capacity
    string condition
  }

  TaskTemplate {
    string id PK
    string name
    string description
    enum category
    enum baseFrequency
    json frequencyRules
    json climateRules
    boolean isActive
    string userId FK
  }

  MaintenanceTask {
    string id PK
    string homeId FK
    string templateId FK
    string name
    string description
    enum category
    enum frequency
    date nextDueDate
    boolean completed
    date completedDate
    float costEstimate
    date snoozedUntil
    json customRecurrence
    string dependsOnTaskId FK
  }

  CompletedTask {
    string id PK
    string taskId FK
    string userId FK
    date completedDate
    float actualCost
    string[] photos
    string contractorUsed
  }
```

### 6.2 Inventory & Maintenance History

```mermaid
erDiagram
  Home ||--o{ Appliance : "has"
  Home ||--o{ ExteriorFeature : "has"
  Home ||--o{ InteriorFeature : "has"
  Home ||--o{ MaintenanceHistory : "has"

  Appliance ||--o{ MaintenanceHistory : "linked"
  ExteriorFeature ||--o{ MaintenanceHistory : "linked"
  InteriorFeature ||--o{ MaintenanceHistory : "linked"
  HomeSystem ||--o{ MaintenanceHistory : "linked"

  Appliance {
    string id PK
    string homeId FK
    enum applianceType
    string brand
    string model
    string serialNumber
    date installDate
    date warrantyExpiry
    int expectedLifespan
    enum usageFrequency
  }

  ExteriorFeature {
    string id PK
    string homeId FK
    enum featureType
    string material
    string brand
    date installDate
    date warrantyExpiry
    float squareFootage
  }

  InteriorFeature {
    string id PK
    string homeId FK
    enum featureType
    string material
    string room
    float squareFootage
  }

  MaintenanceHistory {
    string id PK
    string homeId FK
    string applianceId FK
    string exteriorFeatureId FK
    string interiorFeatureId FK
    string systemId FK
    date serviceDate
    string serviceType
    string description
    float cost
    string[] photos
    string[] receipts
    date nextServiceDue
  }
```

### 6.3 Budget, DIY, Contractor, Caches

```mermaid
erDiagram
  User ||--o{ BudgetPlan : "has"
  User ||--o{ BudgetAlert : "receives"
  BudgetPlan ||--o{ BudgetAlert : "triggers"

  User ||--o{ DiyProject : "has"
  Home ||--o{ DiyProject : "has"
  ProjectTemplate ||--o{ DiyProject : "templates"
  DiyProject ||--o{ ProjectStep : "has"
  DiyProject ||--o{ ProjectMaterial : "has"
  DiyProject ||--o{ ProjectTool : "has"
  DiyProject ||--o{ ProjectPhoto : "has"

  Contractor ||--o{ LeadRequest : "claims"
  User ||--o{ LeadRequest : "creates"
  Home ||--o{ LeadRequest : "for"
  MaintenanceTask ||--o{ LeadRequest : "optional link"
  Contractor ||--o{ ContractorReview : "has"

  BudgetPlan {
    string id PK
    string userId FK
    string name
    enum period
    float amount
    date startDate
    date endDate
    string category
    string homeId
    boolean isActive
  }

  BudgetAlert {
    string id PK
    string userId FK
    string budgetPlanId FK
    string projectId FK
    enum alertType
    enum status
    float thresholdPercent
    string message
    date sentAt
  }

  DiyProject {
    string id PK
    string userId FK
    string homeId FK
    string name
    enum category
    enum status
    enum difficulty
    float estimatedCost
    float actualCost
    string templateId FK
  }

  ProjectStep {
    string id PK
    string projectId FK
    int stepNumber
    string name
    string description
    string instructions
    string status
    string dependsOnStepId FK
  }

  ProjectMaterial {
    string id PK
    string projectId FK
    string name
    float quantity
    string unit
    float unitPrice
    boolean purchased
  }

  ProjectTool {
    string id PK
    string projectId FK
    string name
    boolean owned
    float rentalCost
    int rentalDays
  }

  ProjectTemplate {
    string id PK
    string name
    string description
    enum category
    enum difficulty
    json steps
    json defaultMaterials
    json defaultTools
    boolean isActive
  }

  Contractor {
    string id PK
    string clerkId UK
    string email UK
    string businessName
    string[] services
    string[] coverageZips
    enum tier
    float rating
  }

  LeadRequest {
    string id PK
    string userId FK
    string homeId FK
    string taskId FK
    string serviceType
    string description
    enum status
    string claimedBy FK
  }

  PropertyCache {
    string id PK
    string cacheKey UK
    json propertyData
    string source
    date expiresAt
  }

  ZipCodeCache {
    string id PK
    string zipCode UK
    json weatherData
    json climateData
    string source
    date expiresAt
  }

  PushSubscription {
    string id PK
    string userId FK
    string playerId UK
    boolean isActive
  }
```

---

## 7. Enums Reference (PostgreSQL / Prisma)

| Enum | Values |
|------|--------|
| **SubscriptionTier** | FREE, PREMIUM |
| **SystemType** | HVAC, ROOF, WATER_HEATER, PLUMBING, ELECTRICAL, APPLIANCE, EXTERIOR, LANDSCAPING, POOL, DECK, FENCE, OTHER |
| **TaskCategory** | HVAC, PLUMBING, EXTERIOR, STRUCTURAL, LANDSCAPING, APPLIANCE, SAFETY, ELECTRICAL, OTHER |
| **TaskFrequency** | WEEKLY, MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, SEASONAL, AS_NEEDED |
| **ProjectStatus** | NOT_STARTED, PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| **ProjectDifficulty** | EASY, MEDIUM, HARD, EXPERT |
| **ProjectCategory** | HVAC, PLUMBING, ELECTRICAL, EXTERIOR, INTERIOR, LANDSCAPING, APPLIANCE, STRUCTURAL, OTHER |
| **BudgetPeriod** | MONTHLY, QUARTERLY, ANNUAL |
| **BudgetAlertType** | APPROACHING_LIMIT, EXCEEDED_LIMIT, PROJECT_OVER_BUDGET |
| **BudgetAlertStatus** | PENDING, SENT, DISMISSED |
| **LeadStatus** | PENDING, CLAIMED, COMPLETED, EXPIRED, CANCELLED |
| **ContractorTier** | BASIC, FEATURED, PREMIUM |
| **ApplianceType** | REFRIGERATOR, DISHWASHER, WASHER, DRYER, OVEN, RANGE, MICROWAVE, GARBAGE_DISPOSAL, GARBAGE_COMPACTOR, ICE_MAKER, WINE_COOLER, OTHER |
| **ExteriorFeatureType** | DECK, FENCE, POOL, SPRINKLER_SYSTEM, DRIVEWAY, PATIO, SIDING, GUTTERS, WINDOWS, DOORS, GARAGE_DOOR, FOUNDATION, OTHER |
| **InteriorFeatureType** | CARPET, HARDWOOD_FLOOR, TILE_FLOOR, LAMINATE_FLOOR, VINYL_FLOOR, WINDOWS, DOORS, CABINETS, COUNTERTOPS, PAINT, WALLPAPER, OTHER |

---

## Viewing the diagrams

- **GitHub / GitLab:** Open `docs/ARCHITECTURE.md` in the repo; Mermaid is rendered automatically.
- **VS Code:** Use a Markdown preview extension that supports Mermaid (e.g. "Markdown Preview Mermaid Support").
- **Online:** Paste the Mermaid code blocks into [mermaid.live](https://mermaid.live).
