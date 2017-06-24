
resources
---------

babel transpiling

https://github.com/babel/babel/tree/master/packages/babel-preset-es2015

cheap event-delegation
----------------------
if neither `matches` nor `querySelectorAll` is present use a live-node-list
by `getElementsByTagName` and assign an html attribute to each element to filter
it and finally `Array.prototype.find` the element that corresponds to the event target.

testing
-------

http://randycoulman.com/blog/2016/04/05/more-on-testing-with-mocha-and-webpack/

https://leanpub.com/survivejs-webpack

https://github.com/zyml/es6-karma-jasmine-webpack-boilerplate

possible names for this project are
===

- *declact*
- *onob*
- *treescious*
- *domr*
- *dobstract*
- *domstract*
- *domtract*
- *domract*
- *dabstract*

please, think of something friendlier - a real surname maybe.

todo
----
- 28/07/2016: offline reflow/repaint sections by setting `display:none` or `visiblity:hidden` before applying any changes

continue with
-------------
- __removed__: observable-host#set method
- then map and accumulating functions
- observable-functions
- how to dispose/stopListening/recover etc up and down the dep-tree?

- then finally start over computed properties
- hasOwnProperty vs. propertyIsEnumerable: which shall it be for object traversal?
- tree structure is not an option for mutators/type system

jquery extract to domify: https://github.com/component/domify/blob/master/index.js

template content extraction: http://stackoverflow.com/a/33138997

samples
-------
https://www.w3.org/2000/07/8378/schemas/xhtml1-sample.xml

exclude typeof-symbol
---------------------
babel transform `node_modules/babel-preset-es2015-rollup/index.js`
```js
var relative = require( 'require-relative' );

var baseLocation = require.resolve( 'babel-preset-es2015' );
var plugins = require( baseLocation ).plugins.slice();

var commonjsPlugin = relative( 'babel-plugin-transform-es2015-modules-commonjs', baseLocation );
plugins.splice( plugins.indexOf( commonjsPlugin ), 1 );

// custom exclusion
var symbolPlugin = relative( 'babel-plugin-transform-es2015-typeof-symbol', baseLocation );
plugins.splice( plugins.indexOf( symbolPlugin ), 1 );

plugins.push( require( 'babel-plugin-external-helpers' ) );

module.exports = { plugins: plugins };
```

competitors
-----------
does not seem to care much about seperation of concerns
https://github.com/notacatjs/dommit/

uses html strings
http://markojs.com/

uses html strings and wraps control flow in braces
https://github.com/jeremyruppel/walrus

leverages html id, class and attributes contents for data-binding
https://github.com/flatiron/plates

leverages html id, class and attributes contents for data-binding
https://github.com/leonidas/transparency/

leverages html id, class and attributes contents for data-binding
and weirdly works the over to fill in other attributes via "@". "directives" extend logic of existing elements for render purposes
https://beebole.com/pure/

viable option
https://github.com/soundstep/soma-template

licence
-------
released under the [MIT][1] licence.

[1]: http://mariusrunge.com/mit-licence.html
[2]: https://github.com/jrburke/almond
[3]: http://karma-runner.github.io/0.12/plus/requirejs.html
[4]: https://github.com/jrburke/requirejs/wiki/Test-frameworks
[5]: http://javascript.info/tutorial/memory-leaks

performance
-----------

- why we use `new`, `prototype` and `this`. this lookups are 2-3% faster than
  closure access. code is better organized. [read up][6]
  - ever since [david walsh's][7] article we use `Object.create` and it
    does proove to be much easier to grasp especially when building more complex
    structures. managing constructors and prototypes soon becomes very intimidating.
  
[6]: http://marijnhaverbeke.nl/blog/closure-vs-object-performance.html
[7]: http://davidwalsh.name/javascript-objects-deconstruction
  

justification
-------------
When writing apps with one of the virtual-dom libraries (react, virtual-dom, mithril) we no longer care about how the current DOM needs to change but only what the next one needs to look like. The former, at times most complicated task, is done by the dom-diffing algorithm. With state-change-management out of the way, the complexity thereof is reduced to a one-way road, never looking back. With human interactions the road bends to a traffic circle: user events feed the vdom-factory, diff-patching the real DOM, presented to the user so he might go into the next round. Of course, we can integrate all kinds of sinks and sources into this cycle. Event-stream libraries let us hook into it to transform our data, cache results or do both to `reduce` the past(s) and the present to the future. Sounds awesome.

but the vdom-deal trades the simplicity in design for the redundant task of creating and diffing the entire document. Although this comes at a surprisingly low cost in speed (though not in cpu-cycles/battery-life) it still is a bruteforce approach. With a component architecture in place one can sure limit the scope of the task to individual sections of the document and implementing hooks like `shouldComponentUpdate` may short circuit the process but the question remains:

Is it not the template that should, by definition, already know which changes it responds to? And further down the road: shouldn't our dom-/data-diffing algorithms benefit from that knowledge i.e. compare only what's been subscribed to?

a word on seperation of concerns
--------------------------------
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
    tr({ class: index % 2 ? "odd" : "even" }, [td(), ...])
  })
)
```
Now, which feels right: the ternary expression in the template or the class names in the vdom-factory?

immutability
------------
by default Vew will compare values and update the DOM if they differ. in some situations however, the task is conceptually unnecessary. a clock for example will never produce the same value in succession to its previous one. for these and other scenarios e.g. animations you can make parts of Vew scopes immutable. example:
```js
var clock = Vew.Component({
  template: `
    <span>${time.hours}</span>
    <span>${time.minutes}</span>
    <span>${time.seconds}</span>
  `
}).create().set({ time: { hours: 15, minutes: 30, seconds: 42 } })
```


HTML5 compliance
----------------
https://github.com/html5lib/html5lib-tests

scenarios
---------
- say you are developing a markdown editor. Sure you don't want to rerender
  the markdown on every keystroke especially when the document grows larger.
  throttle or debounce it with some sensible maxWait value. Then say you have a words/strokes per minute or counter which sure mustn't miss out on a single keystroke counting spaces. Now you can simply move the throttling/debouncing from the keystroke-event-dispatchers `output` to the markdown render-function's `input` method. The words per minute counter never misses a single keystroke.

roadmap
-------

- offer option to defer update of computed's with multiple dependencies
- offer option to propagate thrown errors

- __done__: subscriptions mustn't evaluate initially, offer both
  - requirejs' define syntax and
  - computed's syntax with an initial=true/false value
  the latter would then also support dependency tracking

- at some point, when providing view-models to rendering engines the latest,
  we'll have to name things. Take the function name, yes or no?

- __done__: why the hell do i still update when getting a value? - no more

- as soon as we found how to cross bind observables and events
  find a way to implement `once` behaviour and the dispose

- what about this bidirectional relations, couldn't any computed/subscription
  simply mark itself as to-be-garbage-collected and be dereferenced once
  any of the dependencies tries to update it? yes, this would probably be
  bad lazy garbage collection but still, there would be no need to maintain
  an array of dependencies any longer. Dependants only.

- mark computed properties as bidirectional to indicate whether or not
  its state is recoverable from the DOM

- read [about memory leaks][5] and implement `dispose` and/or `teardown`

- tell the difference between `initial` and `!dependencies.length`

- __done__: inherit/proto-chain or mixin? - delegate!

guides
------

- to shutoff a whole branch on your tree simply call `dispose`
  on the __branch's__ root node. Call `compute` again to bring it back to life!

- recursion example: get > compute > invoke > prop/listener > get

- throttle or debounce outgoing updates by throttling or debouncing
  an observable's or computed's `notifyDependants` method.
  ```
  observable.notifyDependants = _.throttle(observable.notifyDependants);
  observable.notifyDependants = _.debounce(observable.notifyDependants);
  computed.notifyDependants = _.throttle(observable.notifyDependants);
  computed.notifyDependants = _.debounce(observable.notifyDependants);
  ```
  throttle or debounce incoming updates by throttling or debouncing
  a computed's or subscription's `compute` method.
  ```
  computed.compute = _.throttle(observable.compute);
  computed.compute = _.debounce(observable.compute);
  subscription.compute = _.throttle(subscription.compute);
  subscription.compute = _.debounce(subscription.compute);
  ```
- there are three main classes
  - `Observable` who only have dependants
  - `Computed` properties who have both dependants and dependencies
  - `Subscription` who have only dependencies
- static values/settings or other house-holding data is best kept
  on a computed's/subscription's context/thisArg
- if you are looking for ease of use: usually you use
  ```
  <namespace>.compute
  <namespace>.observe
  <namespace>.subscribe
  <namespace>.define
  ```
  or their shorthands
  ```
  <namespace>.com
  <namespace>.obs
  <namespace>.sub
  <namespace>.def
  ```

  examples
  --------

  - session timeout visualization or a general clock
