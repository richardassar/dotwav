clean:
	rm -rf test/bundle.js

test: test/test.js
	@browserify test/test.js -o test/bundle.js

.PHONY: test clean