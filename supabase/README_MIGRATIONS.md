# Supabase Migrations Guide

## Required Migrations for Essay Grading Feature

To enable the full essay grading functionality, you need to run these SQL migrations in your Supabase SQL Editor:

### 1. Create Essay Analysis Results Table

Run: `supabase/create_essay_analysis_results_table.sql`

This table stores complete analysis results including:
- All scores (grammar, readability, coherence, etc.)
- Complete detailed analysis (grammar errors with offsets, readability metrics, argument structure, knowledge graph)
- Recommendations and diagnostic summary
- Original essay text for display with highlights

**Why this table?**
- Dedicated storage for complete analysis results
- Better performance for querying analysis data
- Preserves all interactive data needed for the AnalysisResults view
- Allows teachers to view the exact same results as when grading

### 2. Create Notifications Table

Run: `supabase/create_notifications_table.sql`

This table stores notifications for teachers when essays are graded.

**Note:** If you get 406 (Not Acceptable) or 400 (Bad Request) errors, it means these tables don't exist yet. The code will fall back to using the `essays` table, but you should run the migrations to enable full functionality.

## How to Run Migrations

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of each migration file
4. Run the SQL
5. Verify the tables were created in the Table Editor

## Fallback Behavior

If the `essay_analysis_results` table doesn't exist:
- Analysis results will still be saved to the `essays` table (`analysis_payload` field)
- The grading feature will still work
- However, you won't get the optimized storage and querying benefits

