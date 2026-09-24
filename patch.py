import re

file_path = 'c:/Proyectos/Gesicom/gesicomm-frontend/src/components/depositos/FulfillmentCard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

target = r'''<button\s*type="button"\s*disabled=\{deshabilitada\}\s*onClick=\{\(\) => setModalidad\(valor\)\}\s*className=\{\`flex-1 rounded-lg border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 \$\{\s*activa \? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'\s*\}\`\}\s*>'''

replacement = '''<button
        type="button"
        onClick={() => {
          if (deshabilitada) {
            toast.error(motivo || 'Opción no disponible');
            return;
          }
          setModalidad(valor);
        }}
        className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
          deshabilitada ? 'cursor-not-allowed opacity-60' : ''
        } ${
          activa ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
        }`}
      >'''

new_c = re.sub(target, replacement, c)
if new_c == c:
    print("No changes made!")
else:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_c)
    print("Successfully replaced!")
