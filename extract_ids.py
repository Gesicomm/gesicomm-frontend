import re
html = open('full_old_html.txt', encoding='utf-8').read()
ids = re.findall(r'id="([^"]+)"', html)
print('\n'.join(sorted(set(ids))))
