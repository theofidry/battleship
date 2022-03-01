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

### Automatic node version switch

You may already be using nvm with different node versions on your computer. In
this cases finding out that you have been using the wrong node version and
having to switch manually is a tad irritating. You can get rid of this annoyance
by adding a deeper support of nvm within your shell to automatically do the
switch: [nvm shell integration][nvm-shell-integration].


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

## Development

The local development is relying on [Make][make] to help out. You can list
the available commands with:

```
$ make help
```

The make file aims at helping to run the right commands based on the missing
files or outdated files. For example, it will automatically install `node_modules`
if it is missing or run an `npm install` if the `package-lock.json` has been
updated.

However make still relies on the files & directories timestamp to detect changes
and it is not always working. For example sometimes a file changes (added/updated/deleted)
with `src` and yet the timestamp of the directory `src` is not updated although
it should. This is a limitation of the file system and OSes. In such an event,
if you want to force a command with make, you can always use the option `-B|--always-make`.


[make]: https://www.gnu.org/software/make/
[npm]: https://www.npmjs.com/
[nvm]: https://github.com/nvm-sh/nvm
[nvm-shell-integration]: https://github.com/nvm-sh/nvm#deeper-shell-integration
