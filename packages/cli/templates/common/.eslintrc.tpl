{
  "plugins": [<% if (language == "ts") { %>"@typescript-eslint", <% } %>"prettier"],
  "extends": ["@tencent/eslint-config-imweb", "plugin:prettier/recommended"],
<% if (language == "ts") { %>  "parser":  "@typescript-eslint/parser",<% } %>
  "globals": {
    "wx": false,
    "App": false,
    "Page": false,
    "getApp": false,
    "Component": false,
    "Behavior": false,
    "requirePlugin": false,
    "getCurrentPages": false,
    "__wxConfig": false
  },
  "rules": {
    "prettier/prettier": 0,
    "import/prefer-default-export": 0,
    "new-cap": 0,
    "camelcase": 0,
    "operator-linebreak": 0,
    "prefer-promise-reject-errors": 0,
    "no-use-before-define": 0,<% if (language == "ts") { %>
    "no-undef": 0,
<% } %>    "no-unused-vars": 1,
    "no-console": 0,
    "no-trailing-spaces": 2,
    "quotes": [2, "single"]
  }
}
