# EduCompose

**Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation**

Empowering educators with AI-driven insights to provide deeper, more effective feedback on student writing — **without replacing the human touch.**

## The Challenge: An Unsustainable Workload

Essay evaluation is essential for student learning but creates a massive burden on teachers. Delivering **personalized, consistent, and high-quality feedback** for every student often becomes unrealistic.

### The Gap in Current Tools

- **Student-Facing Focus:** Tools like _Grammarly_ target students, encouraging AI dependency and sidelining teachers.
- **Surface-Level Feedback:** Existing systems handle grammar but fail to assess _argument strength, coherence, and clarity._
- **Lack of Insight for Teachers:** No analytics for identifying _class-wide weaknesses_ that could guide instruction.

> **Result:** Teachers spend most of their time error-checking — not mentoring.

EduCompose changes that.

## 💡 Our Solution: A Teacher-Centered Approach

**EduCompose** is not another grammar checker — it’s an **analytical partner for educators**, designed to **augment their expertise**, not automate it.

### 🎯 Augment, Not Automate

Generates structured analytical reports on essays.  
Teachers retain control over final feedback and interpretation.

### 🚀 Enhance Efficiency

Automates the **first-pass analysis** of grammar, readability, and logical flow — saving teachers hours per grading cycle.

### 🎓 Preserve Educational Value

Keeps **human feedback authentic.** The AI assists teachers, not replaces them, strengthening the teacher-student relationship.

## ⚙️ How It Works: Technology Stack

EduCompose integrates multiple AI layers for essay evaluation:

1. **NLP Analysis** – Grammar, readability, and style metrics.
2. **Knowledge Graph Mapping** – Identifies thesis, claims, evidence, and coherence.
3. **Insight Generation (LLMs)** – Synthesizes findings into meaningful teacher reports.
4. **Teacher Report Output** – Actionable insights highlighting key weaknesses and strengths.

> A full pipeline: _Essay → AI Analysis → Insightful Report → Teacher Decision._

## 🚀 Installation & Setup

### Prerequisites

- Python 3.11+ (with `pip`)
- Node.js 18+ (with `npm`)
- Python's built-in `venv` module (recommended) or another environment manager

### Backend (API + NLP services)

```bash
cd backend
python -m venv .venv

# Activate the virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows Command Prompt:
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_lg

# Configure environment variables
# Step 1: Generate a secure SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Copy the generated key - you'll need it in the next step

# Step 2: Create .env file from example
# Windows:
copy env.example .env
# macOS/Linux:
# cp env.example .env

# Step 3: Edit .env file and replace SECRET_KEY with your generated key
# Open backend/.env and change:
# SECRET_KEY=your-secret-key-here
# To:
# SECRET_KEY=<paste-your-generated-key-here>
#
# Note: ALGORITHM=HS256 and ACCESS_TOKEN_EXPIRE_MINUTES=30 are configuration
# values (not keys to generate) - you can leave them as-is or adjust if needed.

# Step 4: Start the server
python start.py
```

The API starts on `http://localhost:8000` by default.

### Frontend (Teacher dashboard)

```bash
cd frontend
npm install
npm run dev
```

The development server runs on `http://localhost:5173` (Vite default). Ensure the backend is running so the dashboard can reach the analysis endpoints.

## 🧩 Live Simulation: From Essay to Insight

EduCompose demonstrates its process through a sample essay analysis:

**Example Essay:** _“The Urgency of Renewable Energy Adoption”_

- Extracts **Thesis, Claims, Evidence, Counterclaims, and Rebuttals**
- Constructs a **Knowledge Graph** to visualize argument logic
- Generates **feedback-ready insights** for teacher review

Teachers can simulate and interpret AI analysis before applying it to real classrooms.

## 🧪 Research Plan

#### 🎯 General Objective

To develop and evaluate an **NLP-based essay evaluation system** that helps teachers identify and address student writing weaknesses.

#### 📋 Specific Objectives

- Collect & preprocess annotated essays
- Implement NLP & Knowledge Graph modules
- Generate automated evaluation reports
- Validate accuracy through teacher feedback

#### 📌 Scope

- **Audience:** Teachers only (not students)
- **Essay Type:** English expository essays
- **Focus Areas:** Grammar, clarity, coherence, argumentation

#### ⚠️ Limitations

- Highlights weaknesses, does **not assign grades**
- Finite Knowledge Graph coverage
- Serves as an **assistant**, not a replacement for teachers

### 🏫 Research Locale

Partner schools and universities where English teachers regularly evaluate essays.  
Teacher expertise and essay datasets are used for validation.

### 👩‍🏫 Target Respondents

- **Primary:** Senior high school & college English teachers
- **Secondary:** Students providing essay data samples

## 🌍 Impact

EduCompose bridges **AI innovation and classroom practicality.**

By giving teachers deeper, data-driven insights into student writing, it:

- Reduces repetitive work
- Improves feedback quality
- Strengthens teacher-student interaction
- Promotes scalable, personalized instruction

> **Mission:** Empower teachers with AI — not replace them.

## Contributors

- Antopina, Junie A.
- Catignas, Mishael
- Delos Reyes, Genesis
- Gabot, Angelo

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
