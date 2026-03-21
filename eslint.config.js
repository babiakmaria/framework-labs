export default [
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022, 
        sourceType: "module",
      },
      globals: {
        NodeJS: "readonly",
      },
    },
    plugins: {},
    rules: {
      "no-console": "off",       
      "no-process-env": "error"  
    },
    ignores: ["node_modules", "dist", "build"],
  },
];