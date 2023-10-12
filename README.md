# template-node

Template for Node projects using TypeScript, ESLint and Prettier.

This was created with the following commands:

```sh
# ESLint
npx @eslint/create-config

# Prettier
npm install --save-dev --save-exact prettier
npm install --save-dev eslint-config-prettier

# Typescript
npx tsc --init --rootDir src --outDir build --target ESNext --module NodeNext
npm install --save-dev @types/node
```
