"""
Copyscape Plagiarism Detection Service
Integrates with Copyscape API for plagiarism checking
"""
import os
import logging
import httpx
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class CopyscapeService:
    """
    Service for checking plagiarism using Copyscape API
    """
    def __init__(self):
        # Load credentials from environment and strip whitespace
        self.api_username = os.getenv("COPYSCAPE_USERNAME", "").strip()
        self.api_key = os.getenv("COPYSCAPE_API_KEY", "").strip()
        # Copyscape API base URL (allow override via env, with safe default)
        # Keep trailing slash to prevent redirects that can drop request body.
        configured_url = os.getenv("COPYSCAPE_API_URL", "https://www.copyscape.com/api/").strip()
        if configured_url and not configured_url.endswith("/"):
            configured_url = f"{configured_url}/"
        self.base_url = configured_url or "https://www.copyscape.com/api/"
        
    def is_configured(self) -> bool:
        """Check if Copyscape API credentials are configured"""
        return bool(self.api_username and self.api_key)
    
    async def validate_credentials(self) -> Dict[str, Any]:
        """
        Validate Copyscape API credentials by making a simple test request
        Returns dict with 'valid' boolean and optional 'message'
        """
        if not self.is_configured():
            return {
                "valid": False,
                "message": "Copyscape API credentials not configured"
            }
        
        try:
            # Make a minimal test request with a short text
            test_text = "This is a test to validate API credentials."
            params = {
                "u": self.api_username,
                "k": self.api_key,
                "o": "csearch",
                "t": test_text,
                "f": "xml"
            }
            
            timeout = httpx.Timeout(15.0, connect=5.0)  # Shorter timeout for validation
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.get(f"{self.base_url}", params=params)
                
                # If we get a response (even an error), credentials are likely valid
                # Invalid credentials often cause timeouts or 401 errors
                if response.status_code == 200:
                    return {"valid": True, "message": "Credentials validated successfully"}
                elif response.status_code == 401:
                    return {"valid": False, "message": "Invalid API credentials (401 Unauthorized)"}
                else:
                    # Other status codes might still mean credentials are valid
                    return {"valid": True, "message": f"API responded with status {response.status_code}"}
                    
        except httpx.TimeoutException:
            return {
                "valid": False,
                "message": "API timeout - credentials may be invalid or API is unreachable"
            }
        except Exception as e:
            logger.error(f"Error validating Copyscape credentials: {e}")
            return {
                "valid": False,
                "message": f"Error validating credentials: {str(e)}"
            }
    
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
            # Trim and validate text
            original_length = len(text.strip())
            
            # Copyscape API supports up to 5000 characters
            # We use POST to send the full text in the body, avoiding URL length limits
            text_to_check = text.strip()[:5000]  # Copyscape's actual limit
            
            if not text_to_check or len(text_to_check) < 10:
                return {
                    "error": "Invalid text",
                    "message": "Text must be at least 10 characters long"
                }
            
            # Log if text was truncated (shouldn't happen often with 5000 char limit)
            if original_length > 5000:
                logger.warning(f"Text truncated from {original_length} to 5000 characters (Copyscape API limit)")
            
            logger.info(f"Checking text ({len(text_to_check)} chars) - using POST method")
            
            # Validate credentials are loaded
            if not self.api_username or not self.api_key:
                logger.error(f"Credentials not loaded: username={bool(self.api_username)}, key={bool(self.api_key)}")
                return {
                    "error": "Credentials not configured",
                    "message": "Copyscape API credentials are not loaded. Please check COPYSCAPE_USERNAME and COPYSCAPE_API_KEY environment variables."
                }
            
            # Auth in URL parameters
            params = {
                "u": self.api_username,
                "k": self.api_key,
                "o": "csearch",  # Text search operation
                "f": "xml"  # Response format
            }
            
            # Text in POST body
            data = {
                "t": text_to_check  # Text to check (CRITICAL: 't' for text, not 'q')
            }
            
            # Validate that text parameter is present and not empty
            if not data.get("t") or len(str(data["t"]).strip()) < 10:
                logger.error(f"Invalid text parameter: t={data.get('t')}, length={len(str(data.get('t', '')))}")
                return {
                    "error": "Invalid text parameter",
                    "message": "Text parameter 't' must be at least 10 characters long"
                }
            
            # Verify credentials are not empty
            if not params.get("u") or not params.get("k"):
                logger.error(f"Empty credentials: u length={len(str(params.get('u', '')))}, k length={len(str(params.get('k', '')))}")
                return {
                    "error": "Empty credentials",
                    "message": "Copyscape API username or key is empty. Please check your environment variables."
                }
            
            # Log the request (without sensitive data, but show param keys and verify 't' is present)
            text_length = len(text_to_check)
            logger.info(f"Calling Copyscape API: POST {self.base_url}")
            logger.info(f"URL params: u=[username, len={len(self.api_username)}], k=[key, len={len(self.api_key)}], o={params['o']}, f={params['f']}")
            logger.info(f"POST body: t=[text, length={text_length}]")
            logger.info(f"Text preview (first 100 chars): {text_to_check[:100]}...")
            logger.info(f"VERIFY: 't' parameter present: {'t' in data}, value length: {text_length}")
            
            # Increase timeout for Copyscape API (can be slow for large texts)
            # Longer texts need more time - adjust timeout based on text length
            text_length = len(text_to_check)
            if text_length > 3000:
                total_timeout = 120.0  # 2 minutes for very long texts
            elif text_length > 1000:
                total_timeout = 90.0   # 90 seconds for medium texts
            else:
                total_timeout = 60.0   # 60 seconds for short texts
            
            timeout = httpx.Timeout(total_timeout, connect=10.0)
            logger.info(f"Using timeout: {total_timeout}s total, 10s connect (text length: {text_length} chars)")
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                try:
                    # Use POST request with hybrid approach:
                    # - Credentials in URL params (prevent 301 redirect from dropping body)
                    # - Text in POST body (avoids URL length limits)
                    logger.info(f"Using POST method - auth in URL params, text ({text_length} chars) in request body")
                    
                    # Verify 't' parameter is in data before sending
                    if "t" not in data or not data["t"]:
                        logger.error(f"CRITICAL: 't' parameter missing from data!")
                        return {
                            "error": "Text parameter missing",
                            "message": "The text parameter 't' is missing from the POST body."
                        }
                    
                    # Verify credentials are in params
                    if "u" not in params or "k" not in params:
                        logger.error(f"CRITICAL: Credentials missing from params!")
                        logger.error(f"Params keys: {list(params.keys())}")
                        return {
                            "error": "Credentials missing",
                            "message": "Username or API key is missing from URL parameters."
                        }
                    
                    logger.info(f"Making POST request to Copyscape API...")
                    logger.info(f"URL params: u, k, o, f")
                    logger.info(f"POST body: t (length={text_length})")
                    
                    response = await client.post(
                        self.base_url,
                        params=params,  # Auth params in URL
                        data=data,  # Text in POST body
                        headers={"Content-Type": "application/x-www-form-urlencoded"}
                    )
                    
                    # Log response immediately
                    logger.info(f"Response received: status={response.status_code}, length={len(response.text)}")
                    if response.status_code != 200:
                        logger.error(f"Error response: {response.text[:500]}")
                    
                except httpx.ConnectTimeout as e:
                    logger.error(f"Connection timeout to Copyscape API: {e}")
                    return {
                        "error": "Connection timeout",
                        "message": f"Could not connect to Copyscape API within 10 seconds. Check:\n"
                                  f"1. Internet connectivity\n"
                                  f"2. Firewall/proxy settings\n"
                                  f"3. API endpoint: {self.base_url}"
                    }
                except httpx.ReadTimeout as e:
                    logger.error(f"Read timeout from Copyscape API: {e}")
                    return {
                        "error": "Read timeout",
                        "message": f"Copyscape API did not respond within {total_timeout} seconds. This often indicates:\n"
                                  f"1. API service is slow or overloaded\n"
                                  f"2. Your account may not have credits\n"
                                  f"3. The text being checked is very long"
                    }
                
                # Check response status
                if response.status_code != 200:
                    logger.error(f"Copyscape API error: Status {response.status_code}, Response: {response.text[:1000]}")
                
                response.raise_for_status()
                
                # Log response status and first 500 chars of response for debugging
                logger.debug(f"Copyscape API response status: {response.status_code}")
                logger.debug(f"Copyscape API response preview: {response.text[:500]}")
                
                # Check response before raising for status
                if response.status_code != 200:
                    logger.error(f"Copyscape API error: Status {response.status_code}, Response: {response.text[:1000]}")
                
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
                
                # Check for errors in XML response
                error = root.find("error")
                if error is not None:
                    error_text = error.text if error.text else "Unknown error from Copyscape API"
                    logger.error(f"Copyscape API returned error: {error_text}")
                    logger.error(f"Full XML response: {response.text}")
                    return {
                        "error": "Copyscape API error",
                        "message": error_text
                    }
                
                # Also check for error messages in other formats
                error_msg = root.find("message")
                if error_msg is not None and error_msg.text:
                    error_text = error_msg.text
                    logger.error(f"Copyscape API message (error): {error_text}")
                    if "error" in error_text.lower() or "required" in error_text.lower():
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
            logger.error(f"Copyscape API HTTP error: {e.response.status_code} - {e.response.text}")
            error_message = f"Copyscape API returned status {e.response.status_code}"
            if e.response.status_code == 301:
                error_message += ". The API endpoint may have changed. Please check Copyscape API documentation."
            elif e.response.status_code == 401:
                error_message += ". Invalid API credentials. Please check COPYSCAPE_USERNAME and COPYSCAPE_API_KEY."
            elif e.response.status_code == 403:
                error_message += ". Access forbidden. Please check your Copyscape account status and API permissions."
            return {
                "error": "HTTP error",
                "message": error_message
            }
        except httpx.TimeoutException as e:
            logger.error(f"Copyscape API timeout: {e}")
            return {
                "error": "Timeout",
                "message": "Request to Copyscape API timed out. This could indicate:\n"
                          "- The API is slow or overloaded\n"
                          "- Invalid API credentials (API may hang instead of returning error)\n"
                          "- Network connectivity issues\n"
                          "Please verify your COPYSCAPE_USERNAME and COPYSCAPE_API_KEY are correct."
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
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
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

    async def check_ai_detection(self, text: str) -> Dict[str, Any]:
        """
        Check if text is AI-generated using Copyscape AI detection endpoint.
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
            text_to_check = text.strip()[:5000]
            params = {
                "u": self.api_username,
                "k": self.api_key,
                "o": "aicheck",
                "f": "xml",
            }
            data = {
                "t": text_to_check,
            }

            timeout = httpx.Timeout(60.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.post(
                    self.base_url,
                    params=params,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()

                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.text)

                error = root.find("error")
                if error is not None:
                    return {
                        "error": "Copyscape AI API error",
                        "message": error.text or "Unknown error from Copyscape AI detection"
                    }

                # Flatten first-level XML tags so we can handle schema changes gracefully.
                details: Dict[str, Any] = {}
                for child in list(root):
                    if child.tag and child.text is not None:
                        details[child.tag.lower()] = child.text.strip()

                def _to_float(value: Any) -> Optional[float]:
                    try:
                        if value is None:
                            return None
                        return float(str(value).strip())
                    except (ValueError, TypeError):
                        return None

                ai_score = (
                    _to_float(details.get("ai_score"))
                    or _to_float(details.get("score"))
                    or _to_float(details.get("probability"))
                    or _to_float(details.get("ai_probability"))
                    or 0.0
                )

                confidence = (
                    _to_float(details.get("confidence"))
                    or _to_float(details.get("confidence_score"))
                )

                verdict = details.get("verdict") or details.get("classification") or ""
                verdict_lower = verdict.lower()
                is_ai_generated = ("ai" in verdict_lower and "human" not in verdict_lower) or ai_score >= 50.0

                return {
                    "checked": True,
                    "is_ai_generated": is_ai_generated,
                    "ai_score": ai_score,
                    "confidence": confidence,
                    "verdict": verdict or ("AI-generated" if is_ai_generated else "Human-written"),
                    "provider": "copyscape",
                    "details": details,
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"Copyscape AI API HTTP error: {e.response.status_code} - {e.response.text}")
            return {
                "error": "HTTP error",
                "message": f"Copyscape AI API returned status {e.response.status_code}"
            }
        except Exception as e:
            logger.error(f"Copyscape AI detection error: {e}", exc_info=True)
            return {
                "error": "API error",
                "message": str(e)
            }

# Singleton instance
copyscape_service = CopyscapeService()

