# --- Nuke-and-pave Tailwind for Angular 20 (stable v3 path) ---

set -e

# 0) sanity: we must be next to angular.json
test -f angular.json || { echo "Run this inside the Angular app folder (where angular.json lives)"; exit 1; }

# 1) Ensure Angular uses ROOT styles.css (not src/styles.css)
# (Angular 20 usually has two occurrences: build + test)
perl -0777 -pe 's/"src\/styles\.css"/"styles.css"/g' angular.json > angular.json.tmp && mv angular.json.tmp angular.json

# 2) Write ROOT styles.css with Tailwind classes (centered & proportional)
cat > styles.css <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Layout & typography */
html, body { height: 100%; }

body {
  @apply bg-gray-50 text-gray-900 font-sans antialiased flex items-center justify-center;
  font-size: clamp(15px, 1vw + 12px, 18px);
}

/* Centering wrapper */
.app-wrap { @apply w-full min-h-screen flex items-center justify-center; }
.app-container { @apply w-full max-w-[680px] sm:max-w-[820px] p-6; }

/* Card styling */
.card { @apply bg-white rounded-2xl shadow border border-gray-200 p-6; }

/* Buttons */
.btn { @apply inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 transition; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }

/* Muted */
.muted { @apply text-gray-500; }
CSS

# (Optional) keep/ignore src/styles.css — Angular won’t use it anymore.

# 3) Tailwind v3 + PostCSS 8 (stable with Angular 20)
npm remove @tailwindcss/postcss || true
npm i -D tailwindcss@3.4.13 postcss@8 autoprefixer@10

# 4) PostCSS config (v3 style)
cat > postcss.config.js <<'JS'
module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
JS

# 5) Tailwind config
cat > tailwind.config.js <<'JS'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./styles.css"],
  theme: { extend: {} },
  plugins: [],
};
JS

# 6) Clear caches and run
./node_modules/.bin/ng cache clean || true
rm -rf .angular
npm start

