{
  "name": "<%=name%>",
  "version": "1.0.0",
  "scripts": {
    "dev": "imp dev",
<% if (componentLib) { %>
    "build": "node ./config/build.js",
    "comp": "imp comp --pathname components",
    "eslint": "npx eslint --fix --ext .js --ext .ts ./",
    "test": "jest --bail",
    "test-debug": "node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand --bail",
    "coverage": "jest ./test/* --coverage --bail",
    "pre-release": "imp i && npm run build",
    "release": "node ./config/publish.js",
<% } else { %>
    "build": "imp build",
    "pre-release": "imp i && imp build",
    "release": "imp publish",
<% } %>
    "eslint": "npx eslint --fix --ext .js --ext .ts ./src"
  },
  "husky": {
    "hooks": {
      "prepare-commit-msg": "exec < /dev/tty && git cz --hook || true",
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "src/**/*.{css,less,scss}": "npx stylelint --fix",
    "src/**/*.{js,ts}": "npx eslint --fix"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "keywords": [],
  "author": {
    "name": "<%=gitName%>",
    "email": "<%=gitEmail%>"
  },
  "license": "",
  "devDependencies": {
    "@commitlint/cli": "^8.3.5",
    "@commitlint/config-conventional": "^8.3.4",
    "@tencent/eslint-config-imweb": "^1.1.0",
    "commitizen": "^4.0.4",
    "conventional-changelog": "^3.1.18",
    "cz-conventional-changelog": "^3.1.0",
    "eslint": "^6.8.0",
    "eslint-config-prettier": "^6.11.0",
    "eslint-plugin-prettier": "^3.1.2",
    "husky": "^4.3.8",
    "lint-staged": "^10.1.3",
    "miniprogram-api-typings": "^3.2.0",
    "postcss-advanced-variables": "^3.0.0",
    "postcss-color-function": "^4.1.0",
    "postcss-css-variables": "^0.17.0",
    "postcss-custom-properties": "^8.0.10",
    "postcss-discard-comments": "^4.0.2",
    "postcss-font-base64": "^1.0.5",
    "postcss-nested": "^4.1.2",
    "postcss-partial-import": "^4.1.0",
    "postcss-url": "^8.0.0",
    "prettier": "2.0.4",
    "stylelint": "^10.0.1",
    "stylelint-config-imweb": "^1.0.0",
    "stylelint-config-prettier": "^6.0.0",
    "stylelint-config-standard": "^18.3.0",
    "stylelint-prettier": "^1.1.1"
  }
}
