import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Only affects hot reload during development; shadcn-style files export variants next to components.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // V1 code written for the old PHP API. Each file is rewritten against the V2 API in a later phase
    // (see docs/V2_PLAN.md); delete its entry here when that happens. Do not add new files.
    files: [
      'src/page/**/*.tsx',
      'src/services/**/*.ts',
      'src/components/Authentication/**/*.tsx',
      'src/components/BookDetailModal.tsx',
      'src/layouts/AdminLayout.tsx',
      'src/types/auth.types.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
