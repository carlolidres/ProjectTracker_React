{
  "root": true,
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "extends": [
    "eslint:recommended"
  ],
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "graphify-out/",
    "workflow-app/",
    "sampleApp/",
    "sampleUI/",
    "reference/"
  ],
  "rules": {
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-empty": ["warn", { "allowEmptyCatch": true }]
  }
}
