
Vew
---
Vew provides a view layer for javascript applications. It is currently in development and in no shape for production use. It is neither feature-complete nor is it clear which features are going to be included or not. For now think of it as an exercise, one that should read well though.

challenging virtual dom
-----------------------
When writing apps with one of the virtual-dom libraries (react, virtual-dom, mithril) we no longer care about how the current DOM needs to change but only what the next one needs to look like. The former, at times most complicated task, is done by the dom-diffing algorithm. With state-change-management out of the way, the complexity thereof is reduced to a one-way road, never looking back. With human interactions the road bends to a traffic circle: user events feed the vdom-factory, diff-patching the real DOM, presented to the user so he might go into the next round. Of course, we can integrate all kinds of sinks and sources into this cycle. Event-stream libraries let us hook into it to transform our data, cache results or do both to `reduce` the past(s) and the present to the future. Sounds awesome.

But the vdom-deal trades the simplicity in design for the redundant task of creating and diffing the entire document. Although this comes at a surprisingly low cost in speed (though not in cpu-cycles/battery-life) it still is a bruteforce approach. With a component architecture in place one can sure limit the scope of the task to individual sections of the document and implementing hooks like `shouldComponentUpdate` may short circuit the process but the question remains:

Is it not the template that should, by definition, already know which changes it responds to? And further down the road: shouldn't our dom-/data-diffing algorithms benefit from that knowledge i.e. compare only what's been subscribed to?

getting started
---------------
```sh
npm install
npm run bundle
python -m SimpleHTTPServer
# python3 -m http.server
```
The above commands will serve the playground `index.html`. To execute an example simply modify the inline script's type attribute.

example
-------
```
var Cowsay = Vew({
  replace: false,
  template: '${name} says Moo!'
})

var cowsay = Cowsay.create().mount(document.body)

cowsay.set({ name: 'Bob' })
cowsay.set('name', 'Alice')
```

tests
-----

tests live in files ending in `_test.js`. to run tests specify directory or
single file:

```sh
npm test src/
npm test src/util/
npm test src/util/array_test.js
```

playground
----------
run from commandline
```
npm run start
```
then point your browser to http://localhost:8080 for live-testing the expression parser module.

tools
-----

### test runner: mocha-webpack
runs mocha tests in node js environemnt. and uses webpack for something.

### test framework: mocha
provides `describe` and `it`. also provides some nifty test handling.

### assertion library: chai
allows chainable language to construct assertions. also provides meaningful
failure messages.

f.e. `expect('x').not.to.be.a('string')` yields `AssertionError: expected 'x'
not to be a string`.

### sinon
provides spies, stubs and mocks. brings its own assertions.


### chai-sinon (sic!)
don't mistake w/ "sinon-chai", which is a different package.
integrates sinon assertions into expect-style chai assertions, f.e.:

```js
expect(spyFunction).to.have.callCount(5)
```

### sinon-chai-in-order
check for function calls in spefic order, f.e.:

```js
expect(spyFunction).inOrder
    .to.have.been.calledWithExactly(firstArg)
    .subsequently.calledWithExactly(secondArg)
    .subsequently.calledWithExactly(thirdArg)
```

roadmap
-------

1. make it work
2. make it right
2.1. introduce `super` constructor calls in the `util/base` module
2.2. expose text interpolation delimiters on a component basis
2.3. work around automatic tbody insertion
2.4. see if the html5shiv fixes clonging unknown elements
3. make it fast
3.1 game engine optimizations
3.1.1 create and implement a `stash` interface (pushState, popState, clearState)
      instead of creating a new instance of a *class* we would create singletons
      that can stash their state - very much like `git stash` does.
