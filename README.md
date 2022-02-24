# Battleship

## Installation

### Install nodejs

- Install [nvm][nvm]
- Install the nodejs version:

```
$ nvm install v17
$ nvm alias default v17
$ nvm use v17

# Example of output:
$ node --version
v17.5.0
```

### Check npm

Ensure [npm][npm] is at the right version:

```
# Example of output
$ npm --version
8.4.1
```

If the version is not correct, update it:

```
# Example to install npm 8.5.x:
$ npm install --global npm@^8.5
$ npm --version
8.5.1
```

### Install dependencies

```
# For a fresh clean install (ci as clean install):
$ npm ci

# To take advantage of the already installed pakcages:
$ npm install
```


## Run the app

```
$ npx ts-node --require tsconfig-paths/register src/main.ts
```

To dump the compiled files and execute them:

```
$ npx tsc
$ node --require ts-node/register --require tsconfig-paths/register dist/main.js
```


[npm]: https://www.npmjs.com/
[nvm]: https://github.com/nvm-sh/nvm
