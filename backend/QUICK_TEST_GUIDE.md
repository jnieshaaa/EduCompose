# Quick Guide: Testing NLP Through Frontend

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Backend
```bash
cd backend
python start.py
```
✅ Server should be running on `http://localhost:8000`

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
```
✅ Frontend should be running on `http://localhost:5173`

### Step 3: Set Up Test Data

**Option A: Quick Setup (Register via Frontend)**
1. Go to `http://localhost:5173`
2. Click "Register" or "Sign Up"
3. Create an account:
   - Email: `teacher@test.com`
   - Password: `password123`
   - Name: `Test Teacher`
4. After registration, you'll be logged in

**Option B: Use Backend Script**
```bash
cd backend
python init_data.py
```
Then login with:
- Email: `teacher@edukompose.com`
- Password: (You'll need to set this via API - see below)

### Step 4: Create Test Data (If using Option A)

After logging in, you can create test data via the frontend:

1. **Create a Class**:
   - Navigate to Classes page (if available)
   - Click "New Class"
   - Name: "English 101"
   - Description: "Test Class"

2. **Create a Student**:
   - Navigate to Students page (if available)
   - Click "New Student"
   - Name: "John Doe"
   - Student ID: "STU001"
   - Assign to your class

3. **Create an Essay**:
   - Go to Essay Management page
   - Click "New Essay" button
   - Fill in:
     - Title: "Test Essay"
     - Class: Select your class
     - Student: Select your student
     - Content: (Use sample below)

### Step 5: Test Essay Content

Use this sample essay (150+ words) to test NLP:

```
The Impact of Technology on Education

Technology has fundamentally transformed the way we learn and teach in the modern world. The integration of digital tools and online platforms has revolutionized educational methods, making learning more accessible and interactive than ever before. 

Online learning platforms allow students to access educational resources from anywhere in the world. This democratization of education breaks down geographical barriers and provides opportunities for lifelong learning. For example, students in remote areas can now access the same quality of education as those in urban centers.

Moreover, interactive learning tools such as virtual reality and artificial intelligence enhance student engagement. These technologies create immersive learning experiences that help students better understand complex concepts. Research shows that students learn more effectively when they are actively engaged in the learning process.

However, some critics argue that technology can be distracting and may reduce face-to-face interaction. While this concern is valid, the benefits of technology in education far outweigh the potential drawbacks. With proper implementation and supervision, technology serves as a powerful tool for enhancing education.

In conclusion, technology has become an indispensable part of modern education. It provides new opportunities for learning, improves accessibility, and enhances student engagement. Educators must embrace these technological advances while ensuring that they complement traditional teaching methods rather than replace them entirely.
```

### Step 6: Run Analysis

1. **Click on the Essay Card** you just created
2. You'll see the essay details modal
3. Click **"Run Analysis"** button (or "View Analysis" if already analyzed)
4. **Wait 10-30 seconds** for analysis to complete
   - First analysis takes longer (loading models)
   - Progress indicator will show
5. **Analysis results will appear** in the Enhanced Essay Analysis Modal

### Step 7: View Results

The analysis modal has **3 tabs**:

#### 📊 Overview Tab
- Overall score
- Strengths and weaknesses
- Dimension scores at a glance
- Critical issues

#### 📈 Detailed Analysis Tab
- **Grammar**: Errors, syntax patterns, sentence types
- **Readability**: Flesch Reading Ease, Grade Level, Lexical Diversity
- **Coherence**: Entity grid, semantic similarity, transitions
- **Argument Structure**: Claims, Evidence, Warrants, Rebuttals
- **Knowledge Graph**: Concepts, relationships, connectivity

#### 💡 Recommendations Tab
- Prioritized recommendations (High/Medium/Low)
- Action items for each recommendation
- Dimension-specific suggestions

## 🔍 What to Look For

### ✅ Successful Analysis Shows:
- Overall score (0-100)
- Grammar score with error count
- Readability metrics
- Coherence score
- Argument structure breakdown
- Knowledge graph with concepts
- Prioritized recommendations

### ⚠️ If Analysis Fails:
1. **Check Backend Logs**: Look for error messages
2. **Check Browser Console**: Open DevTools (F12) → Console tab
3. **Check Network Tab**: See if API calls are successful
4. **Verify Authentication**: Make sure you're logged in
5. **Check Essay Length**: Must be at least 150 words

## 🧪 Testing Different Scenarios

### Test 1: Good Quality Essay
- Use the sample essay above
- Expected: High scores (>70) on most dimensions
- Should show minimal grammar errors
- Clear argument structure

### Test 2: Poor Quality Essay
```
climate change is bad. ice melting. animals die. we need fix. but some say no problem. i think wrong. must act now before too late.
```
- Expected: Lower scores (<60)
- Should show grammar errors
- Poor coherence
- Weak argument structure

### Test 3: Grammar-Heavy Analysis
- Create essay with many grammar errors
- Expected: Detailed error list
- Specific error types identified
- Suggestions for correction

### Test 4: Argument Analysis
- Create essay with clear claims and evidence
- Expected: 
  - Multiple claims identified
  - Evidence linked to claims
  - Warrants (reasoning) detected
  - Possible rebuttals

## 📱 Frontend Flow

```
1. Login/Register
   ↓
2. Navigate to Essay Management
   ↓
3. Create or Select Essay
   ↓
4. Click "Run Analysis"
   ↓
5. Wait for Analysis (10-30 seconds)
   ↓
6. View Results in Modal
   ↓
7. Explore Tabs (Overview/Detailed/Recommendations)
```

## 🐛 Troubleshooting

### "Failed to analyze essay"
- ✅ Backend running? (`http://localhost:8000/api/health`)
- ✅ Logged in? (Check auth token in localStorage)
- ✅ Essay has 150+ words?
- ✅ Check browser console for errors

### "Analysis takes forever"
- ✅ First analysis is slow (loading models)
- ✅ Check backend logs
- ✅ Try with shorter essay first

### "No results displayed"
- ✅ Check browser console
- ✅ Verify API response in Network tab
- ✅ Check if essay belongs to logged-in user

### "spaCy errors"
- ✅ This should be fixed with lazy loading
- ✅ If persists, check backend logs
- ✅ Verify spaCy model: `python -m spacy download en_core_web_sm`

## 🎯 Success Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] User logged in
- [ ] At least one essay created
- [ ] Essay has 150+ words
- [ ] Analysis can be triggered
- [ ] Results display correctly
- [ ] All tabs show data
- [ ] Recommendations appear

## 💡 Tips

1. **First Analysis is Slow**: Be patient - models load on first use
2. **Use Real Essays**: Test with actual student essays for best results
3. **Check All Tabs**: Each tab shows different aspects of analysis
4. **Try Batch Analysis**: Select multiple essays and analyze together
5. **Compare Results**: Test with different quality essays to see score differences

## 🚀 Next Steps

After basic testing works:
1. Test with real student essays
2. Try batch analysis with multiple essays
3. Test different essay types (argumentative, expository)
4. Verify recommendations are actionable
5. Check that scores are reasonable

## 📞 Need Help?

- Check `TESTING_NLP.md` for detailed guide
- Check backend logs: Look in terminal where `python start.py` is running
- Check frontend console: F12 → Console tab
- Verify API: Visit `http://localhost:8000/api/docs` for API documentation

