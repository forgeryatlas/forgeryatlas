"""
One-time script to export Excel data to static JSON files for GitHub Pages hosting.
Run from the project root: python scripts/export_to_json.py
Outputs: data/criminals.json, data/events.json, data/diplomats.json, data/communications.json
"""
import json
import os

from excel_data import (
    load_criminals_data,
    load_events_data,
    load_diplomats_data,
    load_communications_data,
)

def main():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    os.makedirs(output_dir, exist_ok=True)

    datasets = [
        ('criminals', load_criminals_data),
        ('events', load_events_data),
        ('diplomats', load_diplomats_data),
        ('communications', load_communications_data),
    ]

    for name, loader in datasets:
        print(f'Exporting {name}...', end=' ', flush=True)
        data = loader()
        out_path = os.path.join(output_dir, f'{name}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'done ({len(data)} records -> {out_path})')

    print('\nAll JSON files exported successfully.')
    print('Commit the data/ folder to your repository.')

if __name__ == '__main__':
    main()
