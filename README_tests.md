
execute
==

tests live in files ending in `_test.js`. to run tests specify directory or
single file:

```
npm test src/
npm test src/util/
npm test src/util/array_test.js
```


tools
==

test framework: mocha
--

run by `mocha-webpack` to allow es6.


assertion library: chai
--

allows chainable language to construct assertions. also provides meaningful
failure messages.

f.e. `expect('x').not.to.be.a('string')` yields `AssertionError: expected 'x'
not to be a string`.


sinon
--

provides spies, stubs and mocks. brings its own assertions.


### chai-sinon (sic!)

don't mistake w/ "sinon-chai", which is a different package.

integrates sinon assertions into expect-style chai assertions, f.e.:

```
expect(spyFunction).to.have.callCount(5)
```


### sinon-chai-in-order

check for function calls in spefic order, f.e.:

```
expect(spyFunction).inOrder
    .to.have.been.calledWithExactly(firstArg)
    .subsequently.calledWithExactly(secondArg)
    .subsequently.calledWithExactly(thirdArg)
```
