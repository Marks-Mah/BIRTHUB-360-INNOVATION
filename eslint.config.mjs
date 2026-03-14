import js from "@eslint/js";
import tseslint from "typescript-eslint";

const sourceGlobs = ["**/*.{ts,tsx}"];
const ignored = [
  "**/.next/**",
  "**/dist/**",
  "**/coverage/**",
  "**/node_modules/**",
  "**/test-results/**",
  "**/*.cjs",
  "**/*.d.ts"
];

export default tseslint.config(
  {
    ignores: ignored
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: sourceGlobs,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false
        }
      ],
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/require-await": "off"
    }
  }
);
