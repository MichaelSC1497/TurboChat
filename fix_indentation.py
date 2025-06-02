import re

# Chemin du fichier
file_path = 'backend/app.py'
backup_path = 'backend/app.py.bak'

# Lire le contenu du fichier
with open(file_path, 'r') as file:
    content = file.read()

# Faire une copie de sauvegarde
with open(backup_path, 'w') as backup:
    backup.write(content)

# Trouver et corriger le bloc de code avec une erreur d'indentation
pattern = r'(\s+if os\.path\.exists\(MODEL_PATH\):)\s+(start_time = datetime\.now\(\))'
fixed_content = re.sub(pattern, r'\1\n            \2', content)

# Écrire le contenu corrigé dans le fichier
with open(file_path, 'w') as file:
    file.write(fixed_content)

print("Indentation corrigée avec succès dans le fichier app.py") 