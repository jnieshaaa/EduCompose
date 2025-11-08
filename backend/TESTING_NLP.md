# Testing NLP Functionality Through the Frontend

This guide will walk you through testing the NLP analysis features of EduCompose through the frontend interface.

## Prerequisites

1. **Backend Server Running**

   ```bash
   cd backend
   python start.py
   ```

   The server should be running on `http://localhost:8000`

2. **Frontend Server Running**

   ```bash
   cd frontend
   npm run dev
   ```

   The frontend should be running on `http://localhost:5173` (or `http://localhost:3000`)

3. **spaCy Model Downloaded**
   ```bash
   python -m spacy download en_core_web_sm
   ```

## Step 1: Initialize Test Data

### Option A: Using the Backend Script (Recommended)

```bash
cd backend
python init_data.py
```

This creates:

- A test teacher user (email: `teacher@edukompose.com`)
- Sample classes
- Sample students
- Sample essays

**Note**: The default password hash is "dummy_hash", so you'll need to register a new user or update the password.

### Option B: Create Test Data via API

1. **Register a User** (if not using init_data.py):

   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teacher@test.com",
       "username": "testteacher",
       "full_name": "Test Teacher",
       "password": "password123",
       "role": "teacher"
     }'
   ```

2. **Login to Get Token**:

   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teacher@test.com",
       "password": "password123"
     }'
   ```

   Save the `access_token` from the response.

3. **Create a Class**:

   ```bash
   curl -X POST http://localhost:8000/api/classes \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "name": "English 101",
       "description": "Introduction to English Composition"
     }'
   ```

4. **Create a Student**:

   ```bash
   curl -X POST http://localhost:8000/api/students \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "student_id": "STU001",
       "full_name": "John Doe",
       "email": "john.doe@student.com",
       "class_id": 1
     }'
   ```

5. **Create an Essay**:
   ```bash
   curl -X POST http://localhost:8000/api/essays \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "title": "The Importance of Education",
       "content": "Education is one of the most important aspects of human development. It provides individuals with knowledge, skills, and values necessary for personal growth and societal contribution. Through education, people learn to think critically, solve problems, and communicate effectively. Moreover, education opens doors to better opportunities and improves quality of life. However, access to quality education remains a challenge in many parts of the world. Governments and organizations must work together to ensure that every individual has the right to education. In conclusion, education is not just a privilege but a fundamental human right that should be accessible to all.",
       "student_id": 1,
       "class_id": 1
     }'
   ```

## Step 2: Access the Frontend

1. Open your browser and go to `http://localhost:5173` (or the port your frontend is running on)

2. **Login**:
   - Use the credentials you created (or from init_data.py)
   - Email: `teacher@test.com` (or the email you registered)
   - Password: `password123` (or the password you set)

## Step 3: Navigate to Essay Management

1. After logging in, navigate to the **Essay Management** page
2. You should see a list of essays (either from dummy data or from your API)

## Step 4: Test NLP Analysis

### Method 1: Analyze a Single Essay

1. **Click on an Essay Card** to view details
2. In the essay details modal, you'll see:
   - Essay title and content
   - **"Run Analysis"** or **"View Analysis"** button
3. **Click "Run Analysis"** to trigger NLP analysis
4. The analysis will run in the background (this may take a few seconds)
5. Once complete, the **Enhanced Essay Analysis Modal** will open showing:
   - **Overview Tab**: Overall score, strengths, weaknesses, dimension scores
   - **Detailed Analysis Tab**:
     - Grammar analysis (errors, syntax patterns)
     - Readability metrics (Flesch Reading Ease, Grade Level, etc.)
     - Coherence analysis (entity grid, semantic similarity)
     - Argument structure (Claims, Evidence, Warrants, Rebuttals)
     - Knowledge graph (concepts, relationships, connectivity)
   - **Recommendations Tab**: Prioritized recommendations with action items

### Method 2: Batch Analysis

1. **Select Multiple Essays** (if checkbox selection is implemented)
2. Click the **"Batch Analyze"** button
3. A modal will show progress for all selected essays
4. View results for each essay in the batch

### Method 3: Create a New Essay and Analyze

1. Click **"New Essay"** button
2. Fill in the form:
   - **Title**: "Test Essay"
   - **Class**: Select a class
   - **Student**: Select a student
   - **Content**: Enter at least 150 words of essay content
3. Click **"Create Essay"**
4. The new essay will appear in the list
5. Click on it and select **"Run Analysis"**

## Step 5: Verify NLP Results

### Check Each Analysis Dimension

1. **Grammar Analysis**:

   - Should show grammar score (0-100)
   - Error count
   - List of specific grammar errors
   - Syntax patterns (sentence types, complexity)

2. **Readability Analysis**:

   - Flesch Reading Ease score
   - Grade level
   - Lexical diversity
   - SMOG Index

3. **Coherence Analysis**:

   - Coherence score
   - Entity grid analysis
   - Semantic similarity between sentences
   - Transitional elements

4. **Argument Analysis**:

   - Claims identified
   - Evidence/Grounds
   - Warrants (reasoning)
   - Rebuttals (counterarguments)
   - Thesis statement

5. **Knowledge Graph**:
   - Key concepts extracted
   - Relationships between concepts
   - Connectivity score
   - Conceptual gaps

### Sample Essay for Testing

Here's a sample essay you can use to test different aspects:

**Good Essay (High Scores Expected)**:

```
The Impact of Climate Change on Global Ecosystems

Climate change represents one of the most pressing challenges of our time. Scientific evidence demonstrates that rising global temperatures are causing significant changes to ecosystems worldwide. For example, polar ice caps are melting at unprecedented rates, which leads to rising sea levels and habitat loss for Arctic species. Moreover, increased carbon dioxide levels in the atmosphere are causing ocean acidification, which threatens marine biodiversity.

However, some critics argue that climate change is a natural phenomenon that has occurred throughout Earth's history. While this is partially true, the current rate of change far exceeds natural variations. Research indicates that human activities, particularly the burning of fossil fuels, have accelerated climate change significantly.

In conclusion, climate change poses serious threats to global ecosystems. It is therefore essential that governments, industries, and individuals take immediate action to reduce greenhouse gas emissions and mitigate the impacts of climate change.
```

**Essay with Issues (Lower Scores Expected)**:

```
climate change bad. it make hot. ice melt. animals die. we need fix it. but some people say no problem. i think they wrong. we must act now.
```

## Step 6: Test Different Analysis Types

You can test specific analysis dimensions:

1. **Grammar Only**:

   - In the analysis modal, look for options to select analysis type
   - Or modify the API call to use `"grammar"` instead of `"comprehensive"`

2. **Readability Only**:

   - Use `"readability"` analysis type

3. **Coherence Only**:

   - Use `"coherence"` analysis type

4. **Argument Only**:

   - Use `"argument"` analysis type

5. **Comprehensive** (Default):
   - Analyzes all dimensions plus knowledge graph
   - Use `"comprehensive"` analysis type

## Troubleshooting

### Issue: "Failed to analyze essay"

- **Check**: Is the backend server running?
- **Check**: Is spaCy model downloaded? (`python -m spacy download en_core_web_sm`)
- **Check**: Is the essay at least 150 words?
- **Check**: Backend logs for errors

### Issue: Analysis takes too long

- **Normal**: First analysis may take 10-30 seconds (loading models)
- **Subsequent analyses**: Should be faster (5-10 seconds)
- **Large essays**: Essays over 1000 words take longer

### Issue: No analysis results shown

- **Check**: Browser console for errors
- **Check**: Network tab in browser dev tools
- **Check**: Authentication token is valid
- **Check**: Essay belongs to the logged-in teacher

### Issue: spaCy import errors

- **This is normal**: The lazy loading fix should prevent startup errors
- **First analysis**: May take longer as spaCy loads
- **If persistent**: Check backend logs for specific errors

## Expected Behavior

### Analysis Flow

1. User clicks "Run Analysis" button
2. Frontend sends POST request to `/api/analysis/analyze`
3. Backend processes the essay:
   - Loads spaCy model (first time only, lazy loading)
   - Runs grammar analysis
   - Runs readability analysis
   - Runs coherence analysis
   - Runs argument mining
   - Builds knowledge graph
   - Generates recommendations
4. Backend returns analysis results
5. Frontend displays results in Enhanced Essay Analysis Modal

### Response Time

- **First analysis**: 15-30 seconds (loading models)
- **Subsequent analyses**: 5-15 seconds
- **Batch analysis**: Depends on number of essays

## Next Steps

After testing basic functionality:

1. **Test with different essay types**:

   - Argumentative essays
   - Expository essays
   - Essays with varying quality

2. **Test edge cases**:

   - Very short essays (< 150 words)
   - Very long essays (> 1000 words)
   - Essays with many grammar errors
   - Essays with poor coherence

3. **Test batch processing**:

   - Select multiple essays
   - Run batch analysis
   - Verify all analyses complete successfully

4. **Verify recommendations**:
   - Check that recommendations are relevant
   - Verify priority levels (high/medium/low)
   - Check action items are actionable

## API Testing (Alternative)

You can also test directly via the API:

```bash
# Analyze an essay
curl -X POST http://localhost:8000/api/analysis/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "essay_id": 1,
    "analysis_type": "comprehensive"
  }'
```

This will return the full analysis JSON that the frontend displays.

## Success Criteria

✅ Backend starts without errors  
✅ Frontend can connect to backend  
✅ User can login  
✅ Essays are displayed  
✅ Analysis can be triggered  
✅ Results are displayed correctly  
✅ All analysis dimensions show data  
✅ Recommendations are generated  
✅ No console errors

If all criteria are met, the NLP functionality is working correctly!
