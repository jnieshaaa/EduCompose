"""
Copyscape Plagiarism Detection Service
Integrates with Copyscape API for plagiarism checking
"""
import os
import logging
import httpx
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class CopyscapeService:
    """
    Service for checking plagiarism using Copyscape API
    """
    def __init__(self):
        self.api_username = os.getenv("COPYSCAPE_USERNAME", "")
        self.api_key = os.getenv("COPYSCAPE_API_KEY", "")
        self.base_url = "https://www.copyscape.com/api"
        
    def is_configured(self) -> bool:
        """Check if Copyscape API credentials are configured"""
        return bool(self.api_username and self.api_key)
    
    async def check_plagiarism(self, text: str) -> Dict[str, Any]:
        """
        Check text for plagiarism using Copyscape API
        
        Args:
            text: Text content to check for plagiarism
            
        Returns:
            Dictionary containing plagiarism check results
        """
        if not self.is_configured():
            return {
                "error": "Copyscape API not configured",
                "message": "Please configure COPYSCAPE_USERNAME and COPYSCAPE_API_KEY in environment variables"
            }
        
        if not text or len(text.strip()) < 10:
            return {
                "error": "Invalid text",
                "message": "Text must be at least 10 characters long"
            }
        
        try:
            # Copyscape API endpoint for text search
            params = {
                "u": self.api_username,
                "k": self.api_key,
                "o": "csearch",  # Text search operation
                "t": text[:5000],  # Limit to 5000 characters (Copyscape limit)
                "f": "xml"  # Response format
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}", params=params)
                response.raise_for_status()
                
                # Parse XML response
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                except ET.ParseError as e:
                    logger.error(f"Failed to parse Copyscape XML response: {e}")
                    return {
                        "error": "Parse error",
                        "message": "Failed to parse response from Copyscape API"
                    }
                
                # Check for errors
                error = root.find("error")
                if error is not None:
                    error_text = error.text if error.text else "Unknown error from Copyscape API"
                    return {
                        "error": "Copyscape API error",
                        "message": error_text
                    }
                
                # Parse results
                results = []
                count = root.find("count")
                result_count = 0
                if count is not None and count.text:
                    try:
                        result_count = int(count.text)
                    except ValueError:
                        logger.warning(f"Invalid count value: {count.text}")
                
                if result_count > 0:
                    # Get result items
                    for item in root.findall("result"):
                        try:
                            url_elem = item.find("url")
                            title_elem = item.find("title")
                            minwords_elem = item.find("minwords")
                            maxwords_elem = item.find("maxwords")
                            words_elem = item.find("words")
                            percent_elem = item.find("percent")
                            
                            result_data = {
                                "url": url_elem.text if url_elem is not None and url_elem.text else "",
                                "title": title_elem.text if title_elem is not None and title_elem.text else "",
                                "minwords": int(minwords_elem.text) if minwords_elem is not None and minwords_elem.text else 0,
                                "maxwords": int(maxwords_elem.text) if maxwords_elem is not None and maxwords_elem.text else 0,
                                "words": int(words_elem.text) if words_elem is not None and words_elem.text else 0,
                                "percent": float(percent_elem.text) if percent_elem is not None and percent_elem.text else 0.0,
                            }
                            results.append(result_data)
                        except (ValueError, AttributeError) as e:
                            logger.warning(f"Error parsing result item: {e}")
                            continue
                
                # Calculate overall plagiarism score
                max_percent = max([r["percent"] for r in results], default=0.0) if results else 0.0
                is_plagiarized = max_percent > 0.0
                
                return {
                    "is_plagiarized": is_plagiarized,
                    "plagiarism_percentage": max_percent,
                    "match_count": result_count,
                    "matches": results,
                    "text_length": len(text),
                    "checked": True
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Copyscape API HTTP error: {e}")
            return {
                "error": "HTTP error",
                "message": f"Copyscape API returned status {e.response.status_code}"
            }
        except httpx.TimeoutException:
            logger.error("Copyscape API timeout")
            return {
                "error": "Timeout",
                "message": "Request to Copyscape API timed out"
            }
        except Exception as e:
            logger.error(f"Copyscape API error: {e}", exc_info=True)
            return {
                "error": "API error",
                "message": str(e)
            }
    
    async def check_url_plagiarism(self, url: str) -> Dict[str, Any]:
        """
        Check URL for plagiarism using Copyscape API
        
        Args:
            url: URL to check for plagiarism
            
        Returns:
            Dictionary containing plagiarism check results
        """
        if not self.is_configured():
            return {
                "error": "Copyscape API not configured",
                "message": "Please configure COPYSCAPE_USERNAME and COPYSCAPE_API_KEY in environment variables"
            }
        
        try:
            params = {
                "u": self.api_username,
                "k": self.api_key,
                "o": "csearch",  # URL search operation
                "q": url,
                "f": "xml"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}", params=params)
                response.raise_for_status()
                
                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.text)
                
                error = root.find("error")
                if error is not None:
                    return {
                        "error": "Copyscape API error",
                        "message": error.text or "Unknown error from Copyscape API"
                    }
                
                count = root.find("count")
                result_count = int(count.text) if count is not None and count.text else 0
                
                results = []
                if result_count > 0:
                    for item in root.findall("result"):
                        result_data = {
                            "url": item.find("url").text if item.find("url") is not None else "",
                            "title": item.find("title").text if item.find("title") is not None else "",
                            "percent": float(item.find("percent").text) if item.find("percent") is not None else 0.0,
                        }
                        results.append(result_data)
                
                max_percent = max([r["percent"] for r in results], default=0.0)
                
                return {
                    "is_plagiarized": max_percent > 0.0,
                    "plagiarism_percentage": max_percent,
                    "match_count": result_count,
                    "matches": results,
                    "checked": True
                }
                
        except Exception as e:
            logger.error(f"Copyscape URL check error: {e}", exc_info=True)
            return {
                "error": "API error",
                "message": str(e)
            }

# Singleton instance
copyscape_service = CopyscapeService()

