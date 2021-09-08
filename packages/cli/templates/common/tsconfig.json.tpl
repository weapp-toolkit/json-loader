{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": false,
    "module": "ES6",
    "target": "es5",
    "allowJs": true,
    "experimentalDecorators": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "alwaysStrict": true,
    "inlineSourceMap": true,
    "inlineSources": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,
    "removeComments": true,
    "pretty": true,
    "strictPropertyInitialization": true,
    "typeRoots": ["<%=srcRoot%>/typings", "node_modules/miniprogram-api-typings", "node_modules/@types"],
    "lib": ["es2018"],
    "baseUrl": "<%=baseDir%>",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["<%=srcRoot%>/**/*.ts"],
  "exclude": ["node_modules", "miniprogram_npm", "**/*.spec.ts", "**/*.test.ts"]
}
