"""One-off: split the single-file app into source parts. Kept for reference; the source of truth is now src/."""
import json, os, re, sys
src = open(sys.argv[1], encoding='utf-8').read()
L = src.split('\n')
def ln(pat, start=0):
    for i in range(start, len(L)):
        if L[i].startswith(pat): return i
    raise SystemExit('not found: ' + pat)
os.makedirs('src/app', exist_ok=True); os.makedirs('src/i18n', exist_ok=True)
i_style = ln('<style>'); i_style_end = ln('</style>'); i_s1 = ln('<script>'); i_s1_end = ln('</script>', i_s1)
i_s2 = ln('<script>', i_s1_end); i_s2_end = ln('</script>', i_s2 + 1)
i_dict = ln('  const I18N = {'); i_dict_end = ln('};', i_dict)
def put(path, lines): open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
put('src/head.html', L[:i_style])                    # up to <style>
put('src/styles.css', L[i_style + 1:i_style_end])
put('src/body.html', L[i_style_end + 1:i_s1])        # page markup between </style> and the first <script>
put('src/engine.js', L[i_s1 + 1:i_s1_end])
d = json.loads('{' + '\n'.join(L[i_dict + 1:i_dict_end]) + '}')
for lang, tr in d.items(): json.dump(tr, open(f'src/i18n/{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
app = L[i_s2 + 1:i_s2_end]; off = i_s2 + 1
# app script: split at the section comments
marks = [(0, '00-start')]
names = {'  // ---- one definition per system': '10-systems', '  // ---- microphone': '20-microphone-sound', '  // ---- controls': '30-controls',
  '  // ---- switching systems': '31-switch-system', '  // ---------- game:': '40-games', '  // ---------- class mode': '50-class-mode',
  '  // ---------- help:': '60-help-tour', '  // ---------- phones:': '61-phone-layout', '  // ---------- app modes': '62-app-modes',
  '  // ---------- goal preview': '41-preview-film', '  // ---------- help for first-time players': '42-coach-guide', '  // ---------- fact cards': '43-fact-cards',
  '  // ---------- challenges': '44-challenges', '  // ---------- class battle': '45-class-battle', '  // ---------- thermodynamics': '70-energy-scan',
  '  // ---- rendering': '80-rendering', '  // ---------- follow one molecule': '81-follow-molecule', '  // ---- main loop': '90-main-loop'}
for i, l in enumerate(app):
    for k, n in names.items():
        if l.startswith(k): marks.append((i, n))
marks.sort(); order = []
for j, (i, n) in enumerate(marks):
    end = marks[j + 1][0] if j + 1 < len(marks) else len(app)
    part = app[i:end]
    if n == '00-start':  # the dictionary itself lives in src/i18n/*.json; the build puts it back at this marker
        a, b = i_dict - off, i_dict_end - off
        part = part[:a] + ['/*@I18N@*/'] + part[b + 1:]
    fn = f'{len(order):02d}-{n.split("-", 1)[1]}.js'; put('src/app/' + fn, part); order.append(fn)
put('src/tail.html', L[i_s2_end + 1:] if L[-1] != '' else L[i_s2_end + 1:-1])
json.dump({'app': order, 'languages': list(d.keys())}, open('src/manifest.json', 'w'), indent=1)
print(order)
