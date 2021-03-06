
Vew
-------------------------
Vew provides a view layer for javascript applications. It is currently in development and in no shape for production use. It is neither feature-complete nor is it clear which features are going to be included or not. For now think of it as an exercise, one that should read well though.

Motivation
-------------------------
When writing apps with one of the virtual-dom libraries (react, virtual-dom, mithril) we no longer care about how the current DOM needs to change but only what the next one needs to look like. The former, at times most complicated task, is done by the dom-diffing algorithm. With state-change-management out of the way, the complexity thereof is reduced to a one-way road, never looking back. With human interactions the road bends to a traffic circle: user events feed the vdom-factory, diff-patching the real DOM, presented to the user so he might go into the next round. Of course, we can integrate all kinds of sinks and sources into this cycle. Event-stream libraries let us hook into it to transform our data, cache results or do both to `reduce` the past(s) and the present to the future. Sounds awesome.

but the vdom-deal trades the simplicity in design for the redundant task of creating and diffing the entire document. Although this comes at a surprisingly low cost in speed (though not in cpu-cycles/battery-life) it still is a bruteforce approach. With a component architecture in place one can sure limit the scope of the task to individual sections of the document and implementing hooks like `shouldComponentUpdate` may short circuit the process but the question remains:

Is it not the template that should, by definition, already know which changes it responds to? And further down the road: shouldn't our dom-/data-diffing algorithms benefit from that knowledge i.e. compare only what's been subscribed to?

On seperation of concerns
-------------------------
We have learned the hard way, that it's bad practice to embed application logic in our templates. But a completely logic-less template, is a static file. Rendering a template sure must not have any side-effects. Functional or this-less transforms are layed out to fullfill that promise. Since javascript supports multiple paradigms we invent domain specific languages or subsets of javascript itself to impose the *right* constraints. But what is or *feels* right?

Take CSS3's `nth-child` as an example of presentational logic. Without native support we would have to reside to put the logic somewhere else, be that the template language or the vdom-factory. A template that allows `e-`xpressions might look like this:

```html
<table e-for="animal of zoo">
  <tr e-class="$index % 2 ? 'odd' : 'even'">
    <td>...
</table>
```
compared to the a vdom-factory
```js
vdom = table(
  zoo.map((animal, index) => {
    tr({ 'class': index % 2 ? "odd" : "even" }, [td(), ...])
  })
)
```
Now, which feels right: the ternary expression in the template or the class names in the vdom-factory?

Roadmap
-------------------------
- [ ] dom events
- [ ] lifecycle hooks

Optimizations
-------------------------
- [ ] list items in templates are not tracked.
- [ ] annotate subtrees with attribute `--static` to avoid unecessary view model subscriptions
- [ ] annotate subtress with attribute `--volatile` to bypass data-diffing and blindly invalidate everything
- [ ] 28/07/2016: offline reflow/repaint sections by setting `display:none` or `visiblity:hidden` before applying any changes
- [ ] try and get babel to use our own `create` and `extend` object utils to implement es6 classes

Resources and insights [to be] gained from them
-------------------------
- terminology: observables are sources. subscriptions are sinks. computed properties sit inbetween
- to `class` or to `Object.create`: [javascript-objects-deconstruction](http://davidwalsh.name/javascript-objects-deconstruction)
- performance: [closure-vs-object-performance](http://marijnhaverbeke.nl/blog/closure-vs-object-performance.html)
- memory leaks: [memory-leaks][1]
- testing: [mocha and webpack](http://randycoulman.com/blog/2016/04/05/more-on-testing-with-mocha-and-webpack/)
- testing: [jasmine and webpack](https://github.com/zyml/es6-karma-jasmine-webpack-boilerplate)
- build: [survive webpack](https://leanpub.com/survivejs-webpack)

Testing
-------------------------

### playground
```
npm install
npm run start
# open http://localhost:8080
```

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