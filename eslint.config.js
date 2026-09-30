import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "coverage/"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Código que corre en el navegador (behaviors del DS y clientes de la feature)
    files: ["src/design-system/behaviors/**/*.js", "src/features/*/client/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Módulos isomórficos: sin APIs exclusivas de Node ni del navegador
    files: ["src/design-system/{components,primitives,layouts,icons,utils}/**/*.js", "src/features/*/{domain,components}/**/*.js"],
    languageOptions: { globals: { ...globals["shared-node-browser"] } },
  },
];
