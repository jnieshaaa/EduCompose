from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import re
import nltk
from textstat import flesch_reading_ease, flesch_kincaid_grade
from typing import Dict, List, Any, Optional
import json

from . import models
from .database import get_db
from .data_loader import get_sample_essays, get_sample_classes, get_sample_students

# Security setup
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Authentication service
class AuthService:
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def authenticate_user(self, credentials, db: Session):
        user = db.query(models.User).filter(models.User.email == credentials.email).first()
        if not user or not self.verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    async def create_user(self, user_data, db: Session):
        # Check if user already exists
        if db.query(models.User).filter(models.User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        hashed_password = self.get_password_hash(user_data.password)
        db_user = models.User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            role=user_data.role,
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception
        return user

auth_service = AuthService()

# Essay Analysis Service
class EssayAnalysisService:
    def __init__(self):
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger')
        except LookupError:
            nltk.download('averaged_perceptron_tagger')
    
    async def analyze_essay(self, essay: models.Essay, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        content = essay.content
        
        if analysis_type in ["grammar", "comprehensive"]:
            grammar_analysis = self._analyze_grammar(content)
        else:
            grammar_analysis = {"score": 0, "errors": []}
        
        if analysis_type in ["style", "comprehensive"]:
            style_analysis = self._analyze_style(content)
        else:
            style_analysis = {"score": 0, "issues": []}
        
        if analysis_type in ["argument", "comprehensive"]:
            argument_analysis = self._analyze_argument_structure(content)
        else:
            argument_analysis = {"score": 0, "analysis": {}}
        
        # Calculate overall score
        scores = {
            "grammar": grammar_analysis["score"],
            "readability": style_analysis["score"],
            "coherence": argument_analysis["score"],
            "argument_strength": argument_analysis["score"],
            "overall": (grammar_analysis["score"] + style_analysis["score"] + argument_analysis["score"]) / 3
        }
        
        # Generate recommendations
        recommendations = self._generate_recommendations(grammar_analysis, style_analysis, argument_analysis)
        
        return {
            "scores": scores,
            "detailed_analysis": {
                "grammar_errors": grammar_analysis["errors"],
                "style_issues": style_analysis["issues"],
                "argument_analysis": argument_analysis["analysis"]
            },
            "recommendations": recommendations
        }
    
    def _analyze_grammar(self, content: str) -> Dict[str, Any]:
        # Basic grammar checking (simplified for demo)
        errors = []
        score = 100
        
        # Check for common grammar issues
        sentences = content.split('.')
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check for capitalization
            if sentence and not sentence[0].isupper():
                errors.append({
                    "type": "capitalization",
                    "sentence": i + 1,
                    "message": "Sentence should start with a capital letter",
                    "suggestion": sentence[0].upper() + sentence[1:]
                })
                score -= 5
            
            # Check for basic punctuation
            if sentence and not sentence.endswith(('.', '!', '?')):
                errors.append({
                    "type": "punctuation",
                    "sentence": i + 1,
                    "message": "Sentence should end with proper punctuation",
                    "suggestion": sentence + "."
                })
                score -= 3
        
        # Check for common word errors
        common_errors = {
            "there": "their",
            "your": "you're",
            "its": "it's",
            "to": "too",
            "then": "than"
        }
        
        for wrong, correct in common_errors.items():
            if wrong in content.lower():
                errors.append({
                    "type": "word_choice",
                    "message": f"Consider using '{correct}' instead of '{wrong}'",
                    "suggestion": content.replace(wrong, correct)
                })
                score -= 2
        
        return {"score": max(0, score), "errors": errors}
    
    def _analyze_style(self, content: str) -> Dict[str, Any]:
        issues = []
        score = 100
        
        # Readability analysis
        try:
            readability_score = flesch_reading_ease(content)
            grade_level = flesch_kincaid_grade(content)
            
            if readability_score < 30:
                issues.append({
                    "type": "readability",
                    "message": "Text is very difficult to read",
                    "suggestion": "Consider using simpler words and shorter sentences"
                })
                score -= 20
            elif readability_score < 50:
                issues.append({
                    "type": "readability",
                    "message": "Text is difficult to read",
                    "suggestion": "Consider simplifying some complex sentences"
                })
                score -= 10
        except:
            pass
        
        # Check for wordiness
        words = content.split()
        avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
        
        if avg_word_length > 6:
            issues.append({
                "type": "wordiness",
                "message": "Average word length is quite long",
                "suggestion": "Consider using shorter, more direct words"
            })
            score -= 10
        
        # Check for sentence length
        sentences = [s.strip() for s in content.split('.') if s.strip()]
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        
        if avg_sentence_length > 25:
            issues.append({
                "type": "sentence_length",
                "message": "Some sentences are very long",
                "suggestion": "Consider breaking long sentences into shorter ones"
            })
            score -= 15
        
        return {"score": max(0, score), "issues": issues}
    
    def _analyze_argument_structure(self, content: str) -> Dict[str, Any]:
        analysis = {}
        score = 100
        
        # Look for thesis statement (first paragraph)
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        if paragraphs:
            first_paragraph = paragraphs[0]
            # Simple thesis detection
            thesis_indicators = ["i believe", "i think", "in my opinion", "the main point", "thesis"]
            has_thesis = any(indicator in first_paragraph.lower() for indicator in thesis_indicators)
            
            if not has_thesis:
                analysis["thesis_issue"] = "No clear thesis statement found in the introduction"
                score -= 20
            else:
                analysis["thesis_found"] = True
        
        # Look for supporting evidence
        evidence_indicators = ["for example", "for instance", "according to", "research shows", "studies indicate"]
        has_evidence = any(indicator in content.lower() for indicator in evidence_indicators)
        
        if not has_evidence:
            analysis["evidence_issue"] = "Limited supporting evidence provided"
            score -= 15
        else:
            analysis["evidence_found"] = True
        
        # Look for conclusion
        conclusion_indicators = ["in conclusion", "to summarize", "in summary", "overall", "therefore"]
        has_conclusion = any(indicator in content.lower() for indicator in conclusion_indicators)
        
        if not has_conclusion:
            analysis["conclusion_issue"] = "No clear conclusion found"
            score -= 10
        else:
            analysis["conclusion_found"] = True
        
        return {"score": max(0, score), "analysis": analysis}
    
    def _generate_recommendations(self, grammar_analysis: Dict, style_analysis: Dict, argument_analysis: Dict) -> List[str]:
        recommendations = []
        
        # Grammar recommendations
        if grammar_analysis["score"] < 80:
            recommendations.append("Focus on improving grammar and punctuation")
        
        # Style recommendations
        if style_analysis["score"] < 80:
            recommendations.append("Work on improving readability and sentence structure")
        
        # Argument recommendations
        if argument_analysis["score"] < 80:
            recommendations.append("Strengthen argument structure and provide more evidence")
        
        # General recommendations
        if not recommendations:
            recommendations.append("Overall writing quality is good, continue practicing")
        
        return recommendations

essay_analysis_service = EssayAnalysisService()
