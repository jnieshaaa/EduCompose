# Flowchart Guide for EduCompose

This guide explains how to create flowcharts for the EduCompose project and provides sample flowcharts for key processes.

## Table of Contents

1. [Flowchart Tools](#flowchart-tools)
2. [System Architecture Flow](#system-architecture-flow)
3. [Essay Analysis Flow](#essay-analysis-flow)
4. [User Authentication Flow](#user-authentication-flow)
5. [Teacher Workflow Flow](#teacher-workflow-flow)
6. [Database Flow](#database-flow)

---

## Flowchart Tools

### Recommended Tools

1. **Mermaid** (Recommended for Markdown)

   - Built into GitHub, GitLab, and many documentation platforms
   - Syntax is simple and version-controllable
   - Use in `.md` files with ` ```mermaid ` code blocks

2. **Draw.io / diagrams.net**

   - Free, web-based tool
   - Export to PNG, SVG, PDF
   - Good for complex diagrams

3. **Lucidchart**

   - Professional tool with templates
   - Collaboration features
   - Free tier available

4. **PlantUML**
   - Text-based diagramming
   - Good for technical documentation
   - Integrates with many tools

### Quick Start with Mermaid

Create a file with `.md` extension and use:

````markdown
```mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
```
````

---

## System Architecture Flow

### High-Level System Overview

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React/TypeScript)"]
        UI[Teacher Dashboard]
        Pages[Pages: Dashboard, Essays, Classes, Students]
    end

    subgraph Backend["Backend (FastAPI)"]
        API[API Endpoints]
        Controllers[Controllers]
        Services[Services Layer]
        NLP[NLP Modules]
    end

    subgraph Database["Database (PostgreSQL/SQLite)"]
        Tables[(Users, Classes, Students, Essays, Analysis Reports)]
    end

    UI -->|HTTP Requests| API
    Pages -->|API Calls| API
    API --> Controllers
    Controllers --> Services
    Services --> NLP
    Services --> Database
    NLP -->|Analysis Results| Services
    Database -->|Data| Services
    Services -->|Response| Controllers
    Controllers -->|JSON Response| API
    API -->|JSON| Frontend
```

---

## Essay Analysis Flow

### Complete Essay Analysis Pipeline

```mermaid
flowchart TD
    Start([Teacher Submits Essay]) --> Validate{Validate Essay}
    Validate -->|Too Short < 150 words| Error1[Return Error: Essay too short]
    Validate -->|Valid| SaveEssay[Save Essay to Database]

    SaveEssay --> InitAnalysis[Initialize Analysis Service]
    InitAnalysis --> CheckType{Analysis Type?}

    CheckType -->|Grammar| GrammarOnly[Grammar Analysis Only]
    CheckType -->|Readability| ReadabilityOnly[Readability Analysis Only]
    CheckType -->|Coherence| CoherenceOnly[Coherence Analysis Only]
    CheckType -->|Argument| ArgumentOnly[Argument Mining Only]
    CheckType -->|Comprehensive| Comprehensive[All Analyses + Knowledge Graph]

    GrammarOnly --> GrammarAnalyzer[Grammar Analyzer]
    ReadabilityOnly --> ReadabilityAnalyzer[Readability Analyzer]
    CoherenceOnly --> CoherenceAnalyzer[Coherence Analyzer]
    ArgumentOnly --> ArgumentMiner[Argument Miner]

    Comprehensive --> GrammarAnalyzer
    Comprehensive --> ReadabilityAnalyzer
    Comprehensive --> CoherenceAnalyzer
    Comprehensive --> ArgumentMiner
    Comprehensive --> KnowledgeGraph[Knowledge Graph Builder]

    GrammarAnalyzer --> GrammarResults[Grammar Results:<br/>- Score<br/>- Errors<br/>- Syntax Patterns]
    ReadabilityAnalyzer --> ReadabilityResults[Readability Results:<br/>- Flesch Reading Ease<br/>- Grade Level<br/>- Lexical Diversity]
    CoherenceAnalyzer --> CoherenceResults[Coherence Results:<br/>- Entity Grid Score<br/>- Semantic Similarity<br/>- Transition Score]
    ArgumentMiner --> ArgumentResults[Argument Results:<br/>- Thesis Statement<br/>- Claims<br/>- Evidence<br/>- Warrants<br/>- Rebuttals]
    KnowledgeGraph --> GraphResults[Knowledge Graph:<br/>- Concepts<br/>- Relationships<br/>- Graph Structure]

    GrammarResults --> Aggregate[Aggregate Results]
    ReadabilityResults --> Aggregate
    CoherenceResults --> Aggregate
    ArgumentResults --> Aggregate
    GraphResults --> Aggregate

    Aggregate --> BuildGraph[Build Argument Graph]
    BuildGraph --> CalculateMetrics[Calculate Argument Metrics]
    CalculateMetrics --> WeightedScore[Calculate Weighted Overall Score]

    WeightedScore --> GenerateRecs[Generate Diagnostic Recommendations]
    GenerateRecs --> DiagnosticSummary[Create Diagnostic Summary]

    DiagnosticSummary --> SaveResults[Save Analysis to Database]
    SaveResults --> UpdateEssay[Update Essay Status: 'analyzed']
    UpdateEssay --> ReturnResults[Return Analysis Report to Teacher]

    ReturnResults --> End([Teacher Reviews Report])

    Error1 --> End

    style Start fill:#e1f5ff
    style End fill:#d4edda
    style Error1 fill:#f8d7da
    style Comprehensive fill:#fff3cd
    style ReturnResults fill:#d1ecf1
```

---

## User Authentication Flow

### Login and Registration Process

```mermaid
flowchart TD
    Start([User Accesses App]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| ShowLogin[Show Login Modal]
    CheckAuth -->|Yes| Dashboard[Show Dashboard]

    ShowLogin --> UserChoice{User Action?}
    UserChoice -->|Login| LoginForm[Enter Credentials]
    UserChoice -->|Register| RegisterForm[Enter Registration Info]

    LoginForm --> ValidateLogin{Validate Credentials}
    ValidateLogin -->|Invalid| LoginError[Show Error Message]
    ValidateLogin -->|Valid| GenerateToken[Generate JWT Token]

    RegisterForm --> ValidateRegister{Validate Registration}
    ValidateRegister -->|Invalid| RegisterError[Show Validation Errors]
    ValidateRegister -->|Valid| CreateUser[Create User in Database]
    CreateUser --> HashPassword[Hash Password]
    HashPassword --> GenerateToken

    GenerateToken --> StoreToken[Store Token in Local Storage]
    StoreToken --> SetAuth[Set Authenticated State]
    SetAuth --> Dashboard

    LoginError --> ShowLogin
    RegisterError --> ShowLogin

    Dashboard --> ProtectedRoute{Access Protected Route?}
    ProtectedRoute -->|Yes| CheckToken{Token Valid?}
    ProtectedRoute -->|No| AllowAccess[Allow Access]

    CheckToken -->|Expired/Invalid| RedirectLogin[Redirect to Login]
    CheckToken -->|Valid| AllowAccess

    RedirectLogin --> ShowLogin

    style Start fill:#e1f5ff
    style Dashboard fill:#d4edda
    style LoginError fill:#f8d7da
    style RegisterError fill:#f8d7da
    style GenerateToken fill:#fff3cd
```

---

## Teacher Workflow Flow

### Complete Teacher Workflow

```mermaid
flowchart TD
    Start([Teacher Logs In]) --> Dashboard[View Dashboard]

    Dashboard --> TeacherAction{Teacher Action?}

    TeacherAction -->|Manage Classes| ClassMgmt[Class Management]
    TeacherAction -->|Manage Students| StudentMgmt[Student Management]
    TeacherAction -->|View Essays| EssayList[Essay List View]
    TeacherAction -->|View Analytics| Analytics[Analytics Dashboard]

    ClassMgmt --> CreateClass[Create New Class]
    ClassMgmt --> ViewClasses[View Existing Classes]
    CreateClass --> SaveClass[Save Class to Database]
    ViewClasses --> SelectClass[Select Class]

    StudentMgmt --> AddStudent[Add Student to Class]
    StudentMgmt --> ViewStudents[View Students]
    AddStudent --> SaveStudent[Save Student to Database]

    EssayList --> EssayAction{Essay Action?}
    EssayAction -->|Upload Essay| UploadEssay[Upload/Enter Essay]
    EssayAction -->|Analyze Essay| AnalyzeEssay[Run Analysis]
    EssayAction -->|View Report| ViewReport[View Analysis Report]
    EssayAction -->|Batch Analyze| BatchAnalyze[Batch Analysis]

    UploadEssay --> EnterContent[Enter Essay Content]
    EnterContent --> SaveEssay[Save Essay: Status='submitted']

    AnalyzeEssay --> SelectEssay[Select Essay]
    SelectEssay --> RunAnalysis[Run NLP Analysis Pipeline]
    RunAnalysis --> AnalysisComplete[Analysis Complete]
    AnalysisComplete --> SaveReport[Save Report to Database]
    SaveReport --> UpdateStatus[Update Essay: Status='analyzed']

    BatchAnalyze --> SelectMultiple[Select Multiple Essays]
    SelectMultiple --> BatchProcess[Process Each Essay]
    BatchProcess --> BatchComplete[All Analyses Complete]

    ViewReport --> DisplayReport[Display:<br/>- Scores<br/>- Detailed Analysis<br/>- Recommendations<br/>- Knowledge Graph]
    DisplayReport --> TeacherReview[Teacher Reviews Report]
    TeacherReview --> ProvideFeedback[Teacher Provides Feedback]
    ProvideFeedback --> UpdateStatus2[Update Essay: Status='reviewed']

    Analytics --> ViewStats[View Statistics:<br/>- Class Performance<br/>- Common Issues<br/>- Trends]

    SaveClass --> Dashboard
    SaveStudent --> Dashboard
    SaveEssay --> EssayList
    UpdateStatus --> EssayList
    UpdateStatus2 --> EssayList
    BatchComplete --> EssayList
    ViewStats --> Dashboard

    style Start fill:#e1f5ff
    style Dashboard fill:#d4edda
    style RunAnalysis fill:#fff3cd
    style DisplayReport fill:#d1ecf1
    style ProvideFeedback fill:#cfe2ff
```

---

## Database Flow

### Data Flow Through Database

```mermaid
flowchart LR
    subgraph Application["Application Layer"]
        API[API Endpoints]
        Controllers[Controllers]
        Services[Services]
    end

    subgraph ORM["SQLAlchemy ORM"]
        Models[Models:<br/>User, Class, Student, Essay, AnalysisReport]
        Sessions[Database Sessions]
    end

    subgraph Database["PostgreSQL/SQLite"]
        Users[(users table)]
        Classes[(classes table)]
        Students[(students table)]
        Essays[(essays table)]
        Reports[(analysis_reports table)]
    end

    API --> Controllers
    Controllers --> Services
    Services --> Models
    Models --> Sessions
    Sessions -->|CRUD Operations| Database

    Database -->|Query Results| Sessions
    Sessions -->|ORM Objects| Models
    Models -->|Data| Services
    Services -->|Business Logic| Controllers
    Controllers -->|JSON Response| API

    style Application fill:#e1f5ff
    style ORM fill:#fff3cd
    style Database fill:#d4edda
```

---

## NLP Analysis Module Flow

### Detailed NLP Processing Flow

```mermaid
flowchart TD
    Input[Essay Text Input] --> Preprocess[Preprocess Text:<br/>- Tokenization<br/>- Sentence Splitting]

    Preprocess --> ParallelAnalysis{Parallel Analysis}

    ParallelAnalysis --> Grammar[Grammar Analyzer]
    ParallelAnalysis --> Readability[Readability Analyzer]
    ParallelAnalysis --> Coherence[Coherence Analyzer]
    ParallelAnalysis --> Argument[Argument Miner]

    Grammar --> GrammarOutput[Grammar Output:<br/>- Error Detection<br/>- Syntax Analysis<br/>- Score]

    Readability --> ReadabilityOutput[Readability Output:<br/>- Flesch-Kincaid<br/>- SMOG Index<br/>- Lexical Diversity<br/>- Score]

    Coherence --> CoherenceOutput[Coherence Output:<br/>- Entity Grid<br/>- Semantic Similarity<br/>- Transition Analysis<br/>- Score]

    Argument --> ArgumentOutput[Argument Output:<br/>- Thesis Extraction<br/>- Claim Detection<br/>- Evidence Identification<br/>- Warrant Analysis<br/>- Rebuttal Detection<br/>- Score]

    GrammarOutput --> Aggregate1[Aggregate Results]
    ReadabilityOutput --> Aggregate1
    CoherenceOutput --> Aggregate1
    ArgumentOutput --> Aggregate1

    Aggregate1 --> KnowledgeGraph[Knowledge Graph Builder]
    KnowledgeGraph --> GraphOutput[Graph Output:<br/>- Concept Extraction<br/>- Relationship Mapping<br/>- Graph Structure<br/>- Score]

    GraphOutput --> FinalAggregate[Final Aggregation]
    Aggregate1 --> FinalAggregate

    FinalAggregate --> CalculateScores[Calculate Dimension Scores]
    CalculateScores --> WeightedAverage[Calculate Weighted Overall Score]

    WeightedAverage --> GenerateRecommendations[Generate Teacher Recommendations]
    GenerateRecommendations --> DiagnosticSummary[Create Diagnostic Summary]

    DiagnosticSummary --> Output[Complete Analysis Report]

    style Input fill:#e1f5ff
    style Output fill:#d4edda
    style ParallelAnalysis fill:#fff3cd
    style KnowledgeGraph fill:#cfe2ff
```

---

## How to Use These Flowcharts

### 1. In Markdown Files

Copy any of the Mermaid flowchart code blocks above into your `.md` files. They will render automatically on:

- GitHub
- GitLab
- Many documentation platforms
- VS Code with Mermaid extensions

### 2. Export to Images

Use online tools:

- [Mermaid Live Editor](https://mermaid.live/) - Paste code, export as PNG/SVG
- [Draw.io](https://app.diagrams.net/) - Import Mermaid or recreate manually

### 3. Customize Flowcharts

Modify the Mermaid syntax:

- Change shapes: `[Rectangle]`, `{Diamond}`, `([Rounded])`
- Add colors: `style NodeName fill:#color`
- Add subgraphs: `subgraph Name["Label"] ... end`
- Change direction: `flowchart TD` (top-down), `LR` (left-right), `TB` (top-bottom)

### 4. Add to Documentation

Include flowcharts in:

- `README.md` - System overview
- `backend/DOCUMENTATION.md` - Technical details
- `docs/` - Detailed process documentation

---

## Flowchart Best Practices

1. **Start Simple**: Begin with high-level flows, then add detail
2. **Use Consistent Shapes**:
   - Rectangles for processes
   - Diamonds for decisions
   - Rounded rectangles for start/end
3. **Label Clearly**: Use descriptive labels
4. **Color Code**: Use colors to distinguish different types of operations
5. **Keep It Readable**: Don't overcrowd - split complex flows into multiple diagrams
6. **Version Control**: Keep flowchart code in version control (Mermaid is text-based)

---

## Additional Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [Flowchart Symbols Guide](https://www.lucidchart.com/pages/flowchart-symbols-meaning)

---

## Next Steps

1. Choose a flowchart tool that works for your workflow
2. Start with the System Architecture Flow to understand the big picture
3. Use the Essay Analysis Flow for detailed technical documentation
4. Customize flowcharts for your specific documentation needs
5. Keep flowcharts updated as the system evolves
