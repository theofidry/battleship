#
# General Makefile config
#---------------------------------------------------------------------------

# See https://tech.davis-hansson.com/p/make/
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

OS := $(shell uname)
ERROR_COLOR := "\033[41m"
NO_COLOR := "\033[0m"
TOUCH = bash .makefile/touch.sh

.DEFAULT_GOAL := default


#
# App variables config
#---------------------------------------------------------------------------

SRC_DEPS=node_modules src tsconfig.base.json tsconfig.src.json
TEST_DEPS=node_modules src tests tsconfig.base.json tsconfig.tests.json


#
# Commands
#---------------------------------------------------------------------------

.PHONY: default
default: cs test compile

.PHONY: help
help:		## Displays the documented commands
help:
	@echo "\033[33mUsage:\033[0m\n  make TARGET\n\n\033[32m#\n# Commands\n#---------------------------------------------------------------------------\033[0m\n"
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//' | awk 'BEGIN {FS = ":"}; {printf "\033[33m%s:\033[0m%s\n", $$1, $$2}'


.PHONY: clean
clean:		## Cleans up all the artefacts
clean:
	rm -rf dist/* || true
	rm -rf node_modules || true


.PHONY: cs
cs:	## Runs ESLint
cs:
	npx eslint . --ext .js,.ts --fix


.PHONY: compile
compile:	## Builds the JavaScript app artefacts
compile:
	$(MAKE) dist/src


.PHONY: fast_run
fast_run:	## Runs the application (does not dump the artefacts)
fast_run: $(SRC_DEPS)
	npx ts-node --project=tsconfig.src.json --require=tsconfig-paths/register src/main.ts


.PHONY: run
run:		## Runs the (compiled) application
run: dist/src
	TS_NODE_PROJECT=tsconfig.src.json node --require=ts-node/register --require=tsconfig-paths/register dist/src/main.js


.PHONY: test
test:		## Runs the tests
test: $(TEST_DEPS)
	TS_NODE_PROJECT=tsconfig.tests.json npx mocha --require=ts-node/register --require=tsconfig-paths/register --check-leaks tests/**/*.spec.ts



#
# Basic rules
#---------------------------------------------------------------------------

node_modules: package-lock.json
	npm install
	$(TOUCH) "$@"

package-lock.json: package.json
	@echo $(ERROR_COLOR)$(@) is not up to date.$(NO_COLOR)
	$(TOUCH) "$@"

dist/src: $(SRC_DEPS)
	npx tsc --project tsconfig.src.json
	$(TOUCH) "$@"
