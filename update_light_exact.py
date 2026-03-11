import sys

with open(r'c:\Users\andre\Desktop\navaja-barber\apps\web\app\globals.css', 'r', encoding='utf-8') as f:
    css = f.read()

replacements = [
    (
        '''  --brass: 234 176 72;''',
        '''  --brass: 124 58 237;'''
    ),
    (
        '''  --focus-dark: 234 176 72;''',
        '''  --focus-dark: 124 58 237;'''
    ),
    (
        '''  --brand-panel-aura-soft:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.12), transparent 30%),
    radial-gradient(circle at 0% 100%, rgba(244, 63, 94, 0.08), transparent 26%);
  --brand-panel-aura-strong:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.18), transparent 34%),
    radial-gradient(circle at 0% 100%, rgba(244, 63, 94, 0.12), transparent 30%);''',
        '''  --brand-panel-aura-soft:
    radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.15), transparent 30%),
    radial-gradient(circle at 0% 100%, rgba(6, 182, 212, 0.12), transparent 26%);
  --brand-panel-aura-strong:
    radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.22), transparent 34%),
    radial-gradient(circle at 0% 100%, rgba(6, 182, 212, 0.16), transparent 30%);'''
    ),
    (
        '''*::selection {
  background: rgba(234, 176, 72, 0.3);
}''',
        '''*::selection {
  background: rgba(124, 58, 237, 0.25);
}'''
    ),
    (
        '''body {
  @apply antialiased;
  position: relative;
  isolation: isolate;
  background-color: #f6f8ff;
  background-image:
    radial-gradient(circle at 12% 12%, rgba(15, 23, 42, 0.035), transparent 28%),
    radial-gradient(circle at 88% 4%, rgba(14, 165, 233, 0.09), transparent 24%),
    radial-gradient(circle at 72% 78%, rgba(244, 63, 94, 0.08), transparent 24%);''',
        '''body {
  @apply antialiased;
  position: relative;
  isolation: isolate;
  background-color: #f6f8ff;
  background-image:
    radial-gradient(circle at 12% 12%, rgba(79, 70, 229, 0.04), transparent 28%),
    radial-gradient(circle at 88% 4%, rgba(124, 58, 237, 0.10), transparent 24%),
    radial-gradient(circle at 72% 78%, rgba(6, 182, 212, 0.08), transparent 24%);'''
    ),
    (
        '''body::before {
  content: '';
  position: fixed;
  inset: -8rem -6rem auto;
  height: 28rem;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.82), transparent 26%),
    radial-gradient(circle at 78% 24%, rgba(14, 165, 233, 0.18), transparent 22%),
    radial-gradient(circle at 64% 56%, rgba(244, 63, 94, 0.14), transparent 20%);''',
        '''body::before {
  content: '';
  position: fixed;
  inset: -8rem -6rem auto;
  height: 28rem;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.88), transparent 26%),
    radial-gradient(circle at 78% 24%, rgba(124, 58, 237, 0.20), transparent 22%),
    radial-gradient(circle at 64% 56%, rgba(6, 182, 212, 0.16), transparent 20%);'''
    ),
    (
        '''  a:hover {
    color: rgb(var(--brass));
  }''',
        '''  a:hover {
    color: rgb(124, 58, 237);
  }'''
    ),
    (
        '''input:not([data-slot='input']):not([type='hidden']):not([type='checkbox']):not([type='radio']):not(
    [type='file']
  ):focus,
input:not([data-slot='input']):not([type='hidden']):not([type='checkbox']):not([type='radio']):not(
    [type='file']
  ):focus-visible,
select:not([data-slot]):focus,
select:not([data-slot]):focus-visible,
textarea:not([data-slot='input']):focus,
textarea:not([data-slot='input']):focus-visible {
  border-color: rgb(var(--brass) / 0.42) !important;
  outline: 0 !important;
  box-shadow: 0 0 0 1px rgb(var(--brass) / 0.42) !important;
}''',
        '''input:not([data-slot='input']):not([type='hidden']):not([type='checkbox']):not([type='radio']):not(
    [type='file']
  ):focus,
input:not([data-slot='input']):not([type='hidden']):not([type='checkbox']):not([type='radio']):not(
    [type='file']
  ):focus-visible,
select:not([data-slot]):focus,
select:not([data-slot]):focus-visible,
textarea:not([data-slot='input']):focus,
textarea:not([data-slot='input']):focus-visible {
  border-color: rgba(124, 58, 237, 0.5) !important;
  outline: 0 !important;
  box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.5) !important;
}'''
    ),
    (
        '''.group[data-focus='true'] [data-slot='input-wrapper'],
.group[data-focus-visible='true'] [data-slot='input-wrapper'],
[data-slot='input-wrapper']:focus-within,
[data-slot='input-wrapper'][data-focus='true'],
[data-slot='input-wrapper'][data-focus-visible='true'] {
  border-color: rgb(var(--brass) / 0.42) !important;
  outline: 0 !important;
  box-shadow: inset 0 0 0 1px rgb(var(--brass) / 0.42) !important;
}''',
        '''.group[data-focus='true'] [data-slot='input-wrapper'],
.group[data-focus-visible='true'] [data-slot='input-wrapper'],
[data-slot='input-wrapper']:focus-within,
[data-slot='input-wrapper'][data-focus='true'],
[data-slot='input-wrapper'][data-focus-visible='true'] {
  border-color: rgba(124, 58, 237, 0.5) !important;
  outline: 0 !important;
  box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.5) !important;
}'''
    ),
    (
        '''.pill-toggle[data-active='true'] {
  transform: translateY(-1px);
  border-color: rgb(56 189 248 / 0.26);
  background: linear-gradient(135deg, rgb(14 165 233 / 0.14), rgb(244 63 94 / 0.1));
  box-shadow: 0 14px 24px -22px rgb(14 165 233 / 0.4);
  color: rgb(12 74 110);
}''',
        '''.pill-toggle[data-active='true'] {
  transform: translateY(-1px);
  border-color: rgba(124, 58, 237, 0.3);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.1));
  box-shadow: 0 14px 24px -22px rgba(124, 58, 237, 0.5);
  color: rgb(79, 70, 229);
}'''
    ),
    (
        '''.nav-link-pill[data-active='true'] {
  transform: translateY(-1px);
  border-color: transparent;
  background: linear-gradient(135deg, rgb(14 165 233 / 0.14), rgb(244 63 94 / 0.1));
  color: rgb(var(--ink));
  box-shadow: 0 14px 24px -22px rgb(125 211 252 / 0.32);
}''',
        '''.nav-link-pill[data-active='true'] {
  transform: translateY(-1px);
  border-color: rgba(124, 58, 237, 0.2);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.08));
  color: rgb(var(--ink));
  box-shadow: 0 14px 24px -22px rgba(124, 58, 237, 0.4);
}'''
    ),
    (
        '''.action-primary {
  border: 1px solid rgb(15 23 42 / 0.08) !important;
  background: linear-gradient(135deg, rgb(15 23 42), rgb(30 41 59)) !important;
  color: white !important;
  box-shadow:
    0 18px 32px -22px rgb(15 23 42 / 0.4),
    0 10px 16px -14px rgb(14 165 233 / 0.3);
}

.action-primary[data-hover='true'] {
  background: linear-gradient(135deg, rgb(30 41 59), rgb(15 23 42)) !important;
}''',
        '''.action-primary {
  border: 1px solid rgba(79, 70, 229, 0.15) !important;
  background: linear-gradient(135deg, rgb(79, 70, 229), rgb(124, 58, 237)) !important;
  color: white !important;
  box-shadow:
    0 18px 32px -22px rgba(124, 58, 237, 0.6),
    0 10px 16px -14px rgba(79, 70, 229, 0.4);
}

.action-primary[data-hover='true'] {
  background: linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246)) !important;
}'''
    ),
    (
        '''.marketplace-pin[data-active='true'] {
  transform: translateY(-2px) scale(1.04);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(30 41 59));
  color: white;
  box-shadow:
    0 18px 30px -18px rgb(15 23 42 / 0.46),
    0 0 0 1px rgb(15 23 42 / 0.24) inset;
}''',
        '''.marketplace-pin[data-active='true'] {
  transform: translateY(-2px) scale(1.04);
  background: linear-gradient(135deg, rgb(79, 70, 229), rgb(124, 58, 237));
  color: white;
  box-shadow:
    0 18px 30px -18px rgba(124, 58, 237, 0.5),
    0 0 0 1px rgba(124, 58, 237, 0.3) inset;
}'''
    )
]

modified_css = css
for i, (old, new) in enumerate(replacements):
    if old in modified_css:
        modified_css = modified_css.replace(old, new)
        print(f"Replacement {i} SUCCESS")
    else:
        print(f"Replacement {i} FAILED")

with open(r'c:\Users\andre\Desktop\navaja-barber\apps\web\app\globals.css', 'w', encoding='utf-8') as f:
    f.write(modified_css)

print("Done writing globals.css")
