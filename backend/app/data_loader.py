"""
Data loader utility for loading dummy data from JSON files
"""
import json
import os
from typing import Dict, Any

def load_dummy_data() -> Dict[str, Any]:
    """
    Load dummy data from JSON file
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(current_dir, '..', 'data', 'dummy_data.json')
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: Dummy data file not found at {data_file}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing dummy data JSON: {e}")
        return {}

def get_sample_essays() -> list:
    """Get sample essays from dummy data"""
    data = load_dummy_data()
    return data.get('essays', [])

def get_sample_classes() -> list:
    """Get sample classes from dummy data"""
    data = load_dummy_data()
    return data.get('classes', [])

def get_sample_students() -> list:
    """Get sample students from dummy data"""
    data = load_dummy_data()
    return data.get('students', [])

def get_sample_users() -> list:
    """Get sample users from dummy data"""
    data = load_dummy_data()
    return data.get('users', [])
