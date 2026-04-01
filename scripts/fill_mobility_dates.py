"""
One-off script: Add date columns to Data - PURE.xlsx and fill from narrative.
Run from project root: python scripts/fill_mobility_dates.py
"""
import pandas as pd
import os

def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, 'Data - PURE.xlsx')
    df = pd.read_excel(path)

    # Add new columns if not present
    for col in ['Forgery Year 1', 'Forgery Year 2', 'Forgery Year 3',
                'Forgery Month 1', 'Forgery Month 2', 'Forgery Month 3',
                'Arrest Year', 'Arrest Month']:
        if col not in df.columns:
            df[col] = None

    # Fill by row index (0-based). Narrative mapping from plan:
    # Network 1
    df.loc[0, ['Forgery Year 1', 'Forgery Month 1']] = [1857, 5]   # Alessandro Venanzi - Turin May 1857
    df.loc[0, ['Place of Escape 1', 'The year 1']] = ['Istanbul', 1857]
    df.loc[0, ['Place of Escape 2', 'The year 2']] = ['Turin', 1857]
    df.loc[0, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # Feb 1858 Turin

    df.loc[1, ['Forgery Year 1', 'Forgery Month 1']] = [1857, 5]   # Luigi Varallo Pandolfini
    df.loc[1, ['Place of Escape 1', 'The year 1']] = ['Istanbul', 1857]
    df.loc[1, ['Place of Escape 2', 'The year 2']] = ['Turin', 1857]
    df.loc[1, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # arrested Turin

    df.loc[2, ['Forgery Year 1', 'Forgery Month 1']] = [1857, 5]   # Antonietta Biancardi Pandolfini

    df.loc[5, ['Forgery Year 1', 'Forgery Month 1']] = [1857, 5]   # Dimitri Calvocoressi - Turin/Sassari
    df.loc[5, ['Place of Escape 1', 'The year 1']] = ['Istanbul', 1857]
    df.loc[5, ['Place of Escape 2', 'The year 2']] = ['Turin', 1857]
    df.loc[5, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # Feb 1858 Istanbul

    df.loc[6, ['Forgery Year 1', 'Forgery Month 1']] = [1857, 5]   # Marcello Bresciani
    df.loc[6, ['Place of Escape 1', 'The year 1']] = ['Turin', 1857]
    df.loc[6, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # Feb 1858 Istanbul

    # Network 2
    df.loc[7, ['Forgery Year 1', 'Forgery Month 1']] = [1858, 3]   # Ambrose Bondesio - Pera March 1858
    df.loc[7, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # arrested Turin (narrative)

    df.loc[8, ['Forgery Year 1']] = [1858]                          # Ulysses Baldini
    df.loc[8, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # arrested Bologna

    df.loc[21, ['Forgery Year 1']] = [1858]                         # Angelo Gennari - Istanbul
    df.loc[27, ['Forgery Year 1']] = [1858]                         # Giuseppe Borelli
    df.loc[27, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # arrested Istanbul (Network 6)

    # Network 3
    df.loc[28, ['Forgery Year 1', 'Forgery Month 1']] = [1859, 1]   # Giuseppe Civicov - Constantinople Jan 1859
    df.loc[29, ['Place of Escape 1', 'The year 1']] = ['Istanbul', 1859]  # Emilia Rennis - 1 Jan 1859
    df.loc[30, ['Forgery Year 1', 'Forgery Month 1']] = [1859, 1]   # Giuseppe Lopetz - Jan 1859 Constantinople
    df.loc[16, ['Forgery Year 1', 'Forgery Month 1']] = [1859, 1]   # Sebastiano Zanetti - also Jan 1859

    # Network 4
    df.loc[9, ['Forgery Year 1']] = [1855]                          # Raffele Randaboschi (Boschi) - Crimea
    df.loc[9, ['Arrest Year', 'Arrest Month']] = [1858, 2]          # arrested Bologna

    df.loc[10, ['Place of Escape 1', 'The year 1']] = ['Istanbul', 1856]   # Ludovico - returned 26 Dec 1856
    df.loc[10, ['Place of Escape 2', 'The year 2']] = ['Istanbul', 1858]   # Mar 1858 Bologna→Istanbul
    df.loc[10, ['Arrest Year', 'Arrest Month']] = [1858, 2]         # arrested Istanbul

    df.loc[11, ['Forgery Year 1']] = [1855]                          # Raffele Crudeli - Crimea
    df.loc[11, ['Arrest Year', 'Arrest Month']] = [1858, 2]         # Bologna

    df.loc[15, ['Forgery Year 1']] = [1857]                          # Tommasso Facchini - Istanbul 1857
    df.loc[15, ['Arrest Year', 'Arrest Month']] = [1858, 2]         # Bologna

    df.loc[16, ['Arrest Year', 'Arrest Month']] = [1858, 2]         # Sebastiano Zanetti - Bologna (overwrite if needed)
    df.loc[35, ['Arrest Year', 'Arrest Month']] = [1858, 2]         # Enrico Corti - Bologna
    df.loc[31, ['Arrest Year']] = [1858]                            # Francesco Pedroni Pedrozzi - Bologna

    # Network 5
    df.loc[18, ['Forgery Year 1']] = [1858]                         # Francisco Petris - Istanbul
    df.loc[18, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # Feb 1859
    df.loc[19, ['Forgery Year 1']] = [1858]                         # Margarita Petris
    df.loc[19, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # Feb 1859

    df.loc[13, ['Arrest Year']] = [1858]                            # Roberto Diamanti - Istanbul
    df.loc[14, ['Forgery Year 1']] = [1857]                         # Andonaki Draganikos
    df.loc[14, ['Arrest Year']] = [1858]
    df.loc[12, ['Arrest Year']] = [1858]                            # Gezri Venissi (Cesare Venzi)
    df.loc[23, ['Forgery Year 1']] = [1858]                         # Gaetano Manzo

    # Network 6 - arrested Istanbul
    df.loc[32, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # Pietro Nanetti
    df.loc[33, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # Raffaele Fabbri
    df.loc[34, ['Arrest Year', 'Arrest Month']] = [1859, 2]         # Raffaele Manini

    # Others with Place of Arrest / Forgery from Excel
    df.loc[3, ['The year 1']] = [1857]    # Alphonso Invert - Sweden
    df.loc[4, ['The year 1', 'The year 2']] = [1857, 1857]  # Spadafora - Genoa, Venice
    df.loc[20, ['Arrest Year']] = [1858]   # Guglielmo Thumb - Bologna
    df.loc[22, ['Arrest Year']] = [1858]   # Vincenzo Busi - Bologna
    df.loc[17, ['Arrest Year']] = [1858]   # Antonio Dareni Gaetano - Bologna

    df.to_excel(path, index=False)
    print('Updated', path)

if __name__ == '__main__':
    main()
