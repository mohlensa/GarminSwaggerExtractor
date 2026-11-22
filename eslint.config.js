export default [
  {
    files: ["src/**/*.js", "test/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { console: "readonly", document: "readonly", process: "readonly", globalThis: "readonly", URL: "readonly", Blob: "readonly", structuredClone: "readonly" } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-constant-condition": "error"
    }
  }
];
