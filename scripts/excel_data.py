"""
Excel Data Loading and Transformation Module
Loads and transforms data from Excel files to match the expected API structure
"""

import pandas as pd
import os
from typing import List, Dict, Any, Optional

# Location to coordinates mapping
LOCATION_COORDINATES = {
    'Istanbul': {'lat': 41.0082, 'lng': 28.9784},
    'Turin': {'lat': 45.0703, 'lng': 7.6869},
    'Paris': {'lat': 48.8566, 'lng': 2.3522},
    'London': {'lat': 51.5074, 'lng': -0.1278},
    'Vienna': {'lat': 48.2082, 'lng': 16.3738},
    'Rome': {'lat': 41.9028, 'lng': 12.4964},
    'Berlin': {'lat': 52.5200, 'lng': 13.4050},
    'Moscow': {'lat': 55.7558, 'lng': 37.6173},
    'Athens': {'lat': 37.9838, 'lng': 23.7275},
    'Cairo': {'lat': 30.0444, 'lng': 31.2357},
    'Genoa': {'lat': 44.4056, 'lng': 8.9463},
    'Naples': {'lat': 40.8518, 'lng': 14.2681},
    'Venice': {'lat': 45.4408, 'lng': 12.3155},
    'Syros': {'lat': 37.4500, 'lng': 24.9167},
    'Bologna': {'lat': 44.4949, 'lng': 11.3426},
    'Alexandria': {'lat': 31.2001, 'lng': 29.9187},
    'Brescia': {'lat': 45.5416, 'lng': 10.2118},
    'Corfou': {'lat': 39.6243, 'lng': 19.9217},
    'Corfu': {'lat': 39.6243, 'lng': 19.9217},
    'Crimea': {'lat': 45.3383, 'lng': 34.2000},
    'Livorno': {'lat': 43.5500, 'lng': 10.3167},
    'Malta': {'lat': 35.9375, 'lng': 14.3754},
    'Mecklenburg': {'lat': 53.6288, 'lng': 12.2925},
    'Messina': {'lat': 38.1938, 'lng': 15.5540},
    'Moncalvo': {'lat': 45.0533, 'lng': 8.2667},
    'Sardinia': {'lat': 40.1209, 'lng': 9.0129},
    'Sassari': {'lat': 40.7259, 'lng': 8.5557},
    'Scutari': {'lat': 41.0082, 'lng': 29.0082},
    'Üsküdar': {'lat': 41.0082, 'lng': 29.0082},
    'Sweden': {'lat': 59.3293, 'lng': 18.0686},  # Stockholm
    'Trieste': {'lat': 45.6495, 'lng': 13.7768},
    'Wurtemberg': {'lat': 48.7758, 'lng': 9.1829},  # Stuttgart
    'Würtemberg': {'lat': 48.7758, 'lng': 9.1829},
    'Milan': {'lat': 45.4642, 'lng': 9.1900},
    'Ithaca Island': {'lat': 38.3650, 'lng': 20.7183},
    'Schwerin': {'lat': 53.6355, 'lng': 11.4012},
    'Historical Peninsula': {'lat': 41.0082, 'lng': 28.9784},  # Istanbul
}

# Normalize location names (handle variations)
def normalize_location(location: str) -> str:
    """Normalize location names to match coordinate map"""
    if pd.isna(location) or not location or str(location).strip() == '':
        return None
    
    location = str(location).strip()
    
    # Handle variations
    if 'Istanbul' in location:
        return 'Istanbul'
    if 'Turin' in location:
        return 'Turin'
    if 'Bologna' in location:
        return 'Bologna'
    if 'Venice' in location:
        return 'Venice'
    if 'Rome' in location:
        return 'Rome'
    if 'Crimea' in location:
        return 'Crimea'
    if 'Sardinia' in location or 'Sardine' in location:
        return 'Sardinia'
    if 'Scutari' in location or 'Üsküdar' in location:
        return 'Scutari'
    if 'Wurtemberg' in location or 'Würtemberg' in location:
        return 'Wurtemberg'
    if 'Corfou' in location or 'Corfu' in location:
        return 'Corfu'
    
    return location

def get_location_coordinates(location: str) -> Optional[Dict[str, float]]:
    """Get coordinates for a location name"""
    if not location:
        return None
    
    normalized = normalize_location(location)
    if normalized and normalized in LOCATION_COORDINATES:
        return LOCATION_COORDINATES[normalized]
    
    # Default to Istanbul if not found
    return LOCATION_COORDINATES.get('Istanbul')

def parse_date(date_value: Any) -> Optional[Dict[str, Any]]:
    """Parse date from various formats"""
    if pd.isna(date_value):
        return None
    
    # If it's already a dict with year/month/day
    if isinstance(date_value, dict):
        return date_value
    
    if isinstance(date_value, str):
        try:
            parts = date_value.split('.')
            if len(parts) == 3:
                day, month, year = parts
                return {
                    'year': int(year),
                    'month': int(month),
                    'day': int(day)
                }
            if len(parts) == 2:
                month, year = parts
                return {
                    'year': int(year),
                    'month': int(month),
                    'day': None
                }
        except (ValueError, TypeError):
            pass
    
    # If it's a numeric year (float or int)
    if isinstance(date_value, (int, float)):
        try:
            year = int(date_value)
            if 1700 <= year <= 1950:  # Broad historical range
                return {'year': year, 'month': None, 'day': None}
        except (ValueError, OverflowError):
            pass
    
    return None


def _cell_str(value: Any, default: str = 'Unknown') -> str:
    """Convert a cell value to string; treat NaN/empty/'nan' as missing and return default."""
    if pd.isna(value):
        return default
    s = str(value).strip()
    if not s or s.lower() == 'nan':
        return default
    return s


# Cache for loaded data
_criminals_cache = None
_events_cache = None
_diplomats_cache = None
_communications_cache = None

def load_criminals_data() -> List[Dict[str, Any]]:
    """Load and transform criminal data from Excel"""
    global _criminals_cache
    
    if _criminals_cache is not None:
        return _criminals_cache
    
    file_path = os.path.join(os.path.dirname(__file__), 'Data - PURE.xlsx')
    df = pd.read_excel(file_path)
    
    criminals = []
    
    for idx, row in df.iterrows():
        # Handle birthdate
        birthdate = row.get('Birth Date')
        birthdate_str = None
        if pd.notna(birthdate):
            if isinstance(birthdate, (int, float)):
                birthdate_str = str(int(birthdate))
            else:
                birthdate_str = str(birthdate)
        
        criminal = {
            'id': f'criminal_{idx}',
            'name': _cell_str(row.get('Name of the criminal'), 'Unknown'),
            'alias': _cell_str(row.get('Alias'), '') or None,
            'birthdate': birthdate_str,
            'birthplace': _cell_str(row.get('Birth Place'), 'Unknown'),
            'prof': _cell_str(row.get('Profession'), 'Unknown'),
            'nation': _cell_str(row.get('Nationality'), 'Unknown'),
            'placeofprof': _cell_str(row.get('Place of Professional Work'), '') or None,
            'placeOfArrest': _cell_str(row.get('Place of Arrest'), 'Unknown')
        }
        
        criminals.append(criminal)
    
    _criminals_cache = criminals
    return criminals

def load_events_data() -> List[Dict[str, Any]]:
    """Load and transform event data from Excel"""
    global _events_cache
    
    if _events_cache is not None:
        return _events_cache
    
    file_path = os.path.join(os.path.dirname(__file__), 'Data - PURE.xlsx')
    df = pd.read_excel(file_path)
    
    events = []
    
    for idx, row in df.iterrows():
        criminal_id = f'criminal_{idx}'
        criminal_name = _cell_str(row.get('Name of the criminal'), 'Unknown')
        
        # Process forgery events (Place of Forgery 1-3)
        for i in range(1, 4):
            forgery_col = f'Place of Forgery {i}' if i == 1 else f'Place of Forgery {i}'
            if i == 1:
                forgery_col = 'Place of Forgery ı'  # Special character in column name
            
            place = row.get(forgery_col)
            if pd.notna(place) and str(place).strip():
                location_name = normalize_location(str(place).strip())
                coords = get_location_coordinates(location_name)
                
                if coords:
                    forgery_year_col = f'Forgery Year {i}'
                    forgery_month_col = f'Forgery Month {i}'
                    year_val = row.get(forgery_year_col)
                    month_val = row.get(forgery_month_col)
                    date_obj = None
                    if pd.notna(year_val) and str(year_val).strip() and str(year_val).strip().lower() != 'nan':
                        date_obj = parse_date(year_val)
                    if date_obj and pd.notna(month_val) and str(month_val).strip() and str(month_val).strip().lower() != 'nan':
                        try:
                            date_obj = {**date_obj, 'month': int(float(month_val))}
                        except (ValueError, TypeError):
                            pass
                    if not date_obj:
                        date_obj = {'year': None, 'month': None, 'day': None}
                    event = {
                        'id': f'event_{len(events)}',
                        'criminalId': criminal_id,
                        'type': 'forgery',
                        'date': date_obj,
                        'location': {'latitude': coords['lat'], 'longitude': coords['lng']},
                        'locationName': location_name,
                        'description': f'Forgery committed in {location_name}' + (f' ({date_obj["year"]}' + (f'-{date_obj["month"]}' if date_obj.get('month') else '') + ')' if date_obj.get('year') else '')
                    }
                    events.append(event)
        
        # Process escape events (Place of Escape 1-3 with years)
        for i in range(1, 4):
            escape_col = f'Place of Escape {i}'
            year_cols = [f'The year {i}', f'Year {i}', f'The Year {i}', f'the year {i}']
            year = None
            for yc in year_cols:
                val = row.get(yc)
                if pd.notna(val) and str(val).strip() and str(val).strip().lower() != 'nan':
                    year = val
                    break
            
            place = row.get(escape_col)
            
            if pd.notna(place) and str(place).strip():
                location_name = normalize_location(str(place).strip())
                coords = get_location_coordinates(location_name)
                
                if coords:
                    date_obj = parse_date(year) if pd.notna(year) else None
                    if not date_obj:
                        date_obj = {'year': None, 'month': None, 'day': None}
                    
                    event = {
                        'id': f'event_{len(events)}',
                        'criminalId': criminal_id,
                        'type': 'escape',
                        'date': date_obj,
                        'location': {'latitude': coords['lat'], 'longitude': coords['lng']},
                        'locationName': location_name,
                        'description': f'Escape to {location_name}' + (f' in {date_obj["year"]}' if date_obj.get('year') else '')
                    }
                    events.append(event)
        
        # Process arrest event
        arrest_place = row.get('Place of Arrest')
        if pd.notna(arrest_place) and str(arrest_place).strip():
            location_name = normalize_location(str(arrest_place).strip())
            coords = get_location_coordinates(location_name)
            
            if coords:
                arrest_year = row.get('Arrest Year')
                arrest_month = row.get('Arrest Month')
                date_obj = None
                if pd.notna(arrest_year) and str(arrest_year).strip() and str(arrest_year).strip().lower() != 'nan':
                    date_obj = parse_date(arrest_year)
                if date_obj and pd.notna(arrest_month) and str(arrest_month).strip() and str(arrest_month).strip().lower() != 'nan':
                    try:
                        date_obj = {**date_obj, 'month': int(float(arrest_month))}
                    except (ValueError, TypeError):
                        pass
                if not date_obj:
                    date_obj = {'year': None, 'month': None, 'day': None}
                desc = f'Arrested in {location_name}'
                if date_obj.get('year'):
                    desc += f' ({date_obj["year"]}' + (f'-{date_obj["month"]}' if date_obj.get('month') else '') + ')'
                event = {
                    'id': f'event_{len(events)}',
                    'criminalId': criminal_id,
                    'type': 'arrest',
                    'date': date_obj,
                    'location': {'latitude': coords['lat'], 'longitude': coords['lng']},
                    'locationName': location_name,
                    'description': desc
                }
                events.append(event)
    
    _events_cache = events
    return events

def load_diplomats_data() -> List[Dict[str, Any]]:
    """Extract unique diplomats from communications Excel"""
    global _diplomats_cache
    
    if _diplomats_cache is not None:
        return _diplomats_cache
    
    file_path = os.path.join(os.path.dirname(__file__), 'Pace of Communication - PURE.xlsx')
    df = pd.read_excel(file_path)
    
    diplomats_dict = {}
    
    # Extract from "From whom" and "To who" columns
    for _, row in df.iterrows():
        sender = row.get('From whom ')
        receiver = row.get('To who ')
        
        # Process sender
        if pd.notna(sender) and str(sender).strip():
            name = str(sender).strip()
            # Generate ID from name (lowercase, replace spaces with underscores)
            diplomat_id = name.lower().replace(' ', '_').replace('.', '').replace(',', '')
            
            if diplomat_id not in diplomats_dict:
                # Try to extract title and location from name
                title = ''
                if 'Consul' in name:
                    title = 'Consul'
                elif 'Minister' in name:
                    title = 'Minister'
                elif 'Cardinal' in name:
                    title = 'Cardinal'
                elif 'Count' in name:
                    title = 'Count'
                
                diplomats_dict[diplomat_id] = {
                    'id': diplomat_id,
                    'name': name,
                    'title': title,
                    'country': '',  # Could be extracted if needed
                    'location': ''  # Could be extracted if needed
                }
        
        # Process receiver
        if pd.notna(receiver) and str(receiver).strip():
            name = str(receiver).strip()
            diplomat_id = name.lower().replace(' ', '_').replace('.', '').replace(',', '')
            
            if diplomat_id not in diplomats_dict:
                title = ''
                if 'Consul' in name:
                    title = 'Consul'
                elif 'Minister' in name:
                    title = 'Minister'
                elif 'Cardinal' in name:
                    title = 'Cardinal'
                elif 'Count' in name:
                    title = 'Count'
                
                diplomats_dict[diplomat_id] = {
                    'id': diplomat_id,
                    'name': name,
                    'title': title,
                    'country': '',
                    'location': ''
                }
    
    diplomats = list(diplomats_dict.values())
    diplomats.sort(key=lambda x: x['name'])
    
    _diplomats_cache = diplomats
    return diplomats

def load_communications_data() -> List[Dict[str, Any]]:
    """Load and transform communication data from Excel"""
    global _communications_cache
    
    if _communications_cache is not None:
        return _communications_cache
    
    file_path = os.path.join(os.path.dirname(__file__), 'Pace of Communication - PURE.xlsx')
    df = pd.read_excel(file_path)
    
    communications = []
    
    for idx, row in df.iterrows():
        date = row.get('Date')
        sender = row.get('From whom ')
        sender_location = row.get('Official letter sent from')
        receiver = row.get('To who ')
        receiver_location = row.get('Official letter sent to')
        
        if pd.notna(date):
            if hasattr(date, 'strftime'):
                date_str = date.strftime('%Y-%m-%d')
            else:
                raw = str(date).strip()
                # Parse DD.MM.YYYY format from Excel
                if raw and '.' in raw:
                    parts = raw.split('.')
                    if len(parts) == 3:
                        try:
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                            date_str = f'{year:04d}-{month:02d}-{day:02d}'
                        except (ValueError, IndexError):
                            date_str = raw
                    else:
                        date_str = raw
                else:
                    date_str = raw
        else:
            date_str = ''

        comm = {
            'id': f'comm_{idx}',
            'date': date_str,
            'sender': str(sender).strip() if pd.notna(sender) else '',
            'receiver': str(receiver).strip() if pd.notna(receiver) else '',
            'sender_location': str(sender_location).strip() if pd.notna(sender_location) else '',
            'receiver_location': str(receiver_location).strip() if pd.notna(receiver_location) else '',
            'type': 'letter'
        }
        
        communications.append(comm)
    
    _communications_cache = communications
    return communications

def get_events_for_criminal(criminal_id: str) -> List[Dict[str, Any]]:
    """Get all events for a specific criminal"""
    events = load_events_data()
    return [e for e in events if e['criminalId'] == criminal_id]
