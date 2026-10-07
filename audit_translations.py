import json
import os

locales_dir = "frontend/src/i18n/locales"
languages = ["en", "hi", "bn", "ta", "te", "mr", "gu", "pa", "ur"]

data = {}
for lang in languages:
    filepath = os.path.join(locales_dir, f"{lang}.json")
    with open(filepath, "r", encoding="utf-8") as f:
        data[lang] = json.load(f)

def get_keys(d, prefix=""):
    keys = {}
    for k, v in d.items():
        full_k = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_keys(v, full_k))
        else:
            keys[full_k] = v
    return keys

all_keys = set()
for lang, content in data.items():
    all_keys.update(get_keys(content).keys())

print(f"Total unique translation keys across all files: {len(all_keys)}")

missing = {lang: [] for lang in languages}
for k in sorted(all_keys):
    for lang in languages:
        lang_keys = get_keys(data[lang])
        if k not in lang_keys:
            missing[lang].append(k)

for lang in languages:
    print(f"Language '{lang}' missing {len(missing[lang])} keys: {missing[lang][:5]}")
