(function () {
'use strict';

var _arity = function _arity(n, fn) {
  /* eslint-disable no-unused-vars */
  switch (n) {
    case 0: return function() { return fn.apply(this, arguments); };
    case 1: return function(a0) { return fn.apply(this, arguments); };
    case 2: return function(a0, a1) { return fn.apply(this, arguments); };
    case 3: return function(a0, a1, a2) { return fn.apply(this, arguments); };
    case 4: return function(a0, a1, a2, a3) { return fn.apply(this, arguments); };
    case 5: return function(a0, a1, a2, a3, a4) { return fn.apply(this, arguments); };
    case 6: return function(a0, a1, a2, a3, a4, a5) { return fn.apply(this, arguments); };
    case 7: return function(a0, a1, a2, a3, a4, a5, a6) { return fn.apply(this, arguments); };
    case 8: return function(a0, a1, a2, a3, a4, a5, a6, a7) { return fn.apply(this, arguments); };
    case 9: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) { return fn.apply(this, arguments); };
    case 10: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) { return fn.apply(this, arguments); };
    default: throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
  }
};

var _isPlaceholder = function _isPlaceholder(a) {
  return a != null &&
         typeof a === 'object' &&
         a['@@functional/placeholder'] === true;
};

var _curry1 = function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
};

var _curry2 = function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder(a) ? f2
             : _curry1(function(_b) { return fn(a, _b); });
      default:
        return _isPlaceholder(a) && _isPlaceholder(b) ? f2
             : _isPlaceholder(a) ? _curry1(function(_a) { return fn(_a, b); })
             : _isPlaceholder(b) ? _curry1(function(_b) { return fn(a, _b); })
             : fn(a, b);
    }
  };
};

var _curryN = function _curryN(length, received, fn) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left = length;
    var combinedIdx = 0;
    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;
      if (combinedIdx < received.length &&
          (!_isPlaceholder(received[combinedIdx]) ||
           argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }
      combined[combinedIdx] = result;
      if (!_isPlaceholder(result)) {
        left -= 1;
      }
      combinedIdx += 1;
    }
    return left <= 0 ? fn.apply(this, combined)
                     : _arity(left, _curryN(length, combined, fn));
  };
};

var curryN = _curry2(function curryN(length, fn) {
  if (length === 1) {
    return _curry1(fn);
  }
  return _arity(length, _curryN(length, [], fn));
});

function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}
function trueFn() { return true; }

// Globals
var toUpdate = [];
var inStream;
var order = [];
var orderNextIdx = -1;
var flushing = false;

/** @namespace */
var flyd = {};

// /////////////////////////// API ///////////////////////////////// //

/**
 * Creates a new stream
 *
 * __Signature__: `a -> Stream a`
 *
 * @name flyd.stream
 * @param {*} initialValue - (Optional) the initial value of the stream
 * @return {stream} the stream
 *
 * @example
 * var n = flyd.stream(1); // Stream with initial value `1`
 * var s = flyd.stream(); // Stream with no initial value
 */
flyd.stream = function(initialValue) {
  var endStream = createDependentStream([], trueFn);
  var s = createStream();
  s.end = endStream;
  s.fnArgs = [];
  endStream.listeners.push(s);
  s.toJSON = function() {
    return s();
  };
  if (arguments.length > 0) s(initialValue);
  return s;
};

/**
 * Create a new dependent stream
 *
 * __Signature__: `(...Stream * -> Stream b -> b) -> [Stream *] -> Stream b`
 *
 * @name flyd.combine
 * @param {Function} fn - the function used to combine the streams
 * @param {Array<stream>} dependencies - the streams that this one depends on
 * @return {stream} the dependent stream
 *
 * @example
 * var n1 = flyd.stream(0);
 * var n2 = flyd.stream(0);
 * var max = flyd.combine(function(n1, n2, self, changed) {
 *   return n1() > n2() ? n1() : n2();
 * }, [n1, n2]);
 */
flyd.combine = curryN(2, combine);
function combine(fn, streams) {
  var i, s, deps, depEndStreams;
  var endStream = createDependentStream([], trueFn);
  deps = []; depEndStreams = [];
  for (i = 0; i < streams.length; ++i) {
    if (streams[i] !== undefined) {
      deps.push(streams[i]);
      if (streams[i].end !== undefined) depEndStreams.push(streams[i].end);
    }
  }
  s = createDependentStream(deps, fn);
  s.depsChanged = [];
  s.fnArgs = s.deps.concat([s, s.depsChanged]);
  s.end = endStream;
  endStream.listeners.push(s);
  addListeners(depEndStreams, endStream);
  endStream.deps = depEndStreams;
  updateStream(s);
  return s;
}

/**
 * Returns `true` if the supplied argument is a Flyd stream and `false` otherwise.
 *
 * __Signature__: `* -> Boolean`
 *
 * @name flyd.isStream
 * @param {*} value - the value to test
 * @return {Boolean} `true` if is a Flyd streamn, `false` otherwise
 *
 * @example
 * var s = flyd.stream(1);
 * var n = 1;
 * flyd.isStream(s); //=> true
 * flyd.isStream(n); //=> false
 */
flyd.isStream = function(stream) {
  return isFunction(stream) && 'hasVal' in stream;
};

/**
 * Invokes the body (the function to calculate the value) of a dependent stream
 *
 * By default the body of a dependent stream is only called when all the streams
 * upon which it depends has a value. `immediate` can circumvent this behaviour.
 * It immediately invokes the body of a dependent stream.
 *
 * __Signature__: `Stream a -> Stream a`
 *
 * @name flyd.immediate
 * @param {stream} stream - the dependent stream
 * @return {stream} the same stream
 *
 * @example
 * var s = flyd.stream();
 * var hasItems = flyd.immediate(flyd.combine(function(s) {
 *   return s() !== undefined && s().length > 0;
 * }, [s]);
 * console.log(hasItems()); // logs `false`. Had `immediate` not been
 *                          // used `hasItems()` would've returned `undefined`
 * s([1]);
 * console.log(hasItems()); // logs `true`.
 * s([]);
 * console.log(hasItems()); // logs `false`.
 */
flyd.immediate = function(s) {
  if (s.depsMet === false) {
    s.depsMet = true;
    updateStream(s);
  }
  return s;
};

/**
 * Changes which `endsStream` should trigger the ending of `s`.
 *
 * __Signature__: `Stream a -> Stream b -> Stream b`
 *
 * @name flyd.endsOn
 * @param {stream} endStream - the stream to trigger the ending
 * @param {stream} stream - the stream to be ended by the endStream
 * @param {stream} the stream modified to be ended by endStream
 *
 * @example
 * var n = flyd.stream(1);
 * var killer = flyd.stream();
 * // `double` ends when `n` ends or when `killer` emits any value
 * var double = flyd.endsOn(flyd.merge(n.end, killer), flyd.combine(function(n) {
 *   return 2 * n();
 * }, [n]);
*/
flyd.endsOn = function(endS, s) {
  detachDeps(s.end);
  endS.listeners.push(s.end);
  s.end.deps.push(endS);
  return s;
};

/**
 * Map a stream
 *
 * Returns a new stream consisting of every value from `s` passed through
 * `fn`. I.e. `map` creates a new stream that listens to `s` and
 * applies `fn` to every new value.
 * __Signature__: `(a -> result) -> Stream a -> Stream result`
 *
 * @name flyd.map
 * @param {Function} fn - the function that produces the elements of the new stream
 * @param {stream} stream - the stream to map
 * @return {stream} a new stream with the mapped values
 *
 * @example
 * var numbers = flyd.stream(0);
 * var squaredNumbers = flyd.map(function(n) { return n*n; }, numbers);
 */
// Library functions use self callback to accept (null, undefined) update triggers.
flyd.map = curryN(2, function(f, s) {
  return combine(function(s, self) { self(f(s.val)); }, [s]);
});

/**
 * Listen to stream events
 *
 * Similar to `map` except that the returned stream is empty. Use `on` for doing
 * side effects in reaction to stream changes. Use the returned stream only if you
 * need to manually end it.
 *
 * __Signature__: `(a -> result) -> Stream a -> Stream undefined`
 *
 * @name flyd.on
 * @param {Function} cb - the callback
 * @param {stream} stream - the stream
 * @return {stream} an empty stream (can be ended)
 */
flyd.on = curryN(2, function(f, s) {
  return combine(function(s) { f(s.val); }, [s]);
});

/**
 * Creates a new stream with the results of calling the function on every incoming
 * stream with and accumulator and the incoming value.
 *
 * __Signature__: `(a -> b -> a) -> a -> Stream b -> Stream a`
 *
 * @name flyd.scan
 * @param {Function} fn - the function to call
 * @param {*} val - the initial value of the accumulator
 * @param {stream} stream - the stream source
 * @return {stream} the new stream
 *
 * @example
 * var numbers = flyd.stream();
 * var sum = flyd.scan(function(sum, n) { return sum+n; }, 0, numbers);
 * numbers(2)(3)(5);
 * sum(); // 10
 */
flyd.scan = curryN(3, function(f, acc, s) {
  var ns = combine(function(s, self) {
    self(acc = f(acc, s.val));
  }, [s]);
  if (!ns.hasVal) ns(acc);
  return ns;
});

/**
 * Creates a new stream down which all values from both `stream1` and `stream2`
 * will be sent.
 *
 * __Signature__: `Stream a -> Stream a -> Stream a`
 *
 * @name flyd.merge
 * @param {stream} source1 - one stream to be merged
 * @param {stream} source2 - the other stream to be merged
 * @return {stream} a stream with the values from both sources
 *
 * @example
 * var btn1Clicks = flyd.stream();
 * button1Elm.addEventListener(btn1Clicks);
 * var btn2Clicks = flyd.stream();
 * button2Elm.addEventListener(btn2Clicks);
 * var allClicks = flyd.merge(btn1Clicks, btn2Clicks);
 */
flyd.merge = curryN(2, function(s1, s2) {
  var s = flyd.immediate(combine(function(s1, s2, self, changed) {
    if (changed[0]) {
      self(changed[0]());
    } else if (s1.hasVal) {
      self(s1.val);
    } else if (s2.hasVal) {
      self(s2.val);
    }
  }, [s1, s2]));
  flyd.endsOn(combine(function() {
    return true;
  }, [s1.end, s2.end]), s);
  return s;
});

/**
 * Creates a new stream resulting from applying `transducer` to `stream`.
 *
 * __Signature__: `Transducer -> Stream a -> Stream b`
 *
 * @name flyd.transduce
 * @param {Transducer} xform - the transducer transformation
 * @param {stream} source - the stream source
 * @return {stream} the new stream
 *
 * @example
 * var t = require('transducers.js');
 *
 * var results = [];
 * var s1 = flyd.stream();
 * var tx = t.compose(t.map(function(x) { return x * 2; }), t.dedupe());
 * var s2 = flyd.transduce(tx, s1);
 * flyd.combine(function(s2) { results.push(s2()); }, [s2]);
 * s1(1)(1)(2)(3)(3)(3)(4);
 * results; // => [2, 4, 6, 8]
 */
flyd.transduce = curryN(2, function(xform, source) {
  xform = xform(new StreamTransformer());
  return combine(function(source, self) {
    var res = xform['@@transducer/step'](undefined, source.val);
    if (res && res['@@transducer/reduced'] === true) {
      self.end(true);
      return res['@@transducer/value'];
    } else {
      return res;
    }
  }, [source]);
});

/**
 * Returns `fn` curried to `n`. Use this function to curry functions exposed by
 * modules for Flyd.
 *
 * @name flyd.curryN
 * @function
 * @param {Integer} arity - the function arity
 * @param {Function} fn - the function to curry
 * @return {Function} the curried function
 *
 * @example
 * function add(x, y) { return x + y; };
 * var a = flyd.curryN(2, add);
 * a(2)(4) // => 6
 */
flyd.curryN = curryN;

/**
 * Returns a new stream identical to the original except every
 * value will be passed through `f`.
 *
 * _Note:_ This function is included in order to support the fantasy land
 * specification.
 *
 * __Signature__: Called bound to `Stream a`: `(a -> b) -> Stream b`
 *
 * @name stream.map
 * @param {Function} function - the function to apply
 * @return {stream} a new stream with the values mapped
 *
 * @example
 * var numbers = flyd.stream(0);
 * var squaredNumbers = numbers.map(function(n) { return n*n; });
 */
function boundMap(f) { return flyd.map(f, this); }

/**
 * Returns a new stream which is the result of applying the
 * functions from `this` stream to the values in `stream` parameter.
 *
 * `this` stream must be a stream of functions.
 *
 * _Note:_ This function is included in order to support the fantasy land
 * specification.
 *
 * __Signature__: Called bound to `Stream (a -> b)`: `a -> Stream b`
 *
 * @name stream.ap
 * @param {stream} stream - the values stream
 * @return {stream} a new stream with the functions applied to values
 *
 * @example
 * var add = flyd.curryN(2, function(x, y) { return x + y; });
 * var numbers1 = flyd.stream();
 * var numbers2 = flyd.stream();
 * var addToNumbers1 = flyd.map(add, numbers1);
 * var added = addToNumbers1.ap(numbers2);
 */
function ap(s2) {
  var s1 = this;
  return combine(function(s1, s2, self) { self(s1.val(s2.val)); }, [s1, s2]);
}

/**
 * Get a human readable view of a stream
 * @name stream.toString
 * @return {String} the stream string representation
 */
function streamToString() {
  return 'stream(' + this.val + ')';
}

/**
 * @name stream.end
 * @memberof stream
 * A stream that emits `true` when the stream ends. If `true` is pushed down the
 * stream the parent stream ends.
 */

/**
 * @name stream.of
 * @function
 * @memberof stream
 * Returns a new stream with `value` as its initial value. It is identical to
 * calling `flyd.stream` with one argument.
 *
 * __Signature__: Called bound to `Stream (a)`: `b -> Stream b`
 *
 * @param {*} value - the initial value
 * @return {stream} the new stream
 *
 * @example
 * var n = flyd.stream(1);
 * var m = n.of(1);
 */

// /////////////////////////// PRIVATE ///////////////////////////////// //
/**
 * @private
 * Create a stream with no dependencies and no value
 * @return {Function} a flyd stream
 */
function createStream() {
  function s(n) {
    if (arguments.length === 0) return s.val
    updateStreamValue(s, n);
    return s
  }
  s.hasVal = false;
  s.val = undefined;
  s.vals = [];
  s.listeners = [];
  s.queued = false;
  s.end = undefined;
  s.map = boundMap;
  s.ap = ap;
  s.of = flyd.stream;
  s.toString = streamToString;
  return s;
}

/**
 * @private
 * Create a dependent stream
 * @param {Array<stream>} dependencies - an array of the streams
 * @param {Function} fn - the function used to calculate the new stream value
 * from the dependencies
 * @return {stream} the created stream
 */
function createDependentStream(deps, fn) {
  var s = createStream();
  s.fn = fn;
  s.deps = deps;
  s.depsMet = false;
  s.depsChanged = deps.length > 0 ? [] : undefined;
  s.shouldUpdate = false;
  addListeners(deps, s);
  return s;
}

/**
 * @private
 * Check if all the dependencies have values
 * @param {stream} stream - the stream to check depencencies from
 * @return {Boolean} `true` if all dependencies have vales, `false` otherwise
 */
function initialDepsNotMet(stream) {
  stream.depsMet = stream.deps.every(function(s) {
    return s.hasVal;
  });
  return !stream.depsMet;
}

/**
 * @private
 * Update a dependent stream using its dependencies in an atomic way
 * @param {stream} stream - the stream to update
 */
function updateStream(s) {
  if ((s.depsMet !== true && initialDepsNotMet(s)) ||
      (s.end !== undefined && s.end.val === true)) return;
  if (inStream !== undefined) {
    toUpdate.push(s);
    return;
  }
  inStream = s;
  if (s.depsChanged) s.fnArgs[s.fnArgs.length - 1] = s.depsChanged;
  var returnVal = s.fn.apply(s.fn, s.fnArgs);
  if (returnVal !== undefined) {
    s(returnVal);
  }
  inStream = undefined;
  if (s.depsChanged !== undefined) s.depsChanged = [];
  s.shouldUpdate = false;
  if (flushing === false) flushUpdate();
}

/**
 * @private
 * Update the dependencies of a stream
 * @param {stream} stream
 */
function updateDeps(s) {
  var i, o, list;
  var listeners = s.listeners;
  for (i = 0; i < listeners.length; ++i) {
    list = listeners[i];
    if (list.end === s) {
      endStream(list);
    } else {
      if (list.depsChanged !== undefined) list.depsChanged.push(s);
      list.shouldUpdate = true;
      findDeps(list);
    }
  }
  for (; orderNextIdx >= 0; --orderNextIdx) {
    o = order[orderNextIdx];
    if (o.shouldUpdate === true) updateStream(o);
    o.queued = false;
  }
}

/**
 * @private
 * Add stream dependencies to the global `order` queue.
 * @param {stream} stream
 * @see updateDeps
 */
function findDeps(s) {
  var i;
  var listeners = s.listeners;
  if (s.queued === false) {
    s.queued = true;
    for (i = 0; i < listeners.length; ++i) {
      findDeps(listeners[i]);
    }
    order[++orderNextIdx] = s;
  }
}

/**
 * @private
 */
function flushUpdate() {
  flushing = true;
  while (toUpdate.length > 0) {
    var s = toUpdate.shift();
    if (s.vals.length > 0) s.val = s.vals.shift();
    updateDeps(s);
  }
  flushing = false;
}

/**
 * @private
 * Push down a value into a stream
 * @param {stream} stream
 * @param {*} value
 */
function updateStreamValue(s, n) {
  if (n !== undefined && n !== null && isFunction(n.then)) {
    n.then(s);
    return;
  }
  s.val = n;
  s.hasVal = true;
  if (inStream === undefined) {
    flushing = true;
    updateDeps(s);
    if (toUpdate.length > 0) flushUpdate(); else flushing = false;
  } else if (inStream === s) {
    markListeners(s, s.listeners);
  } else {
    s.vals.push(n);
    toUpdate.push(s);
  }
}

/**
 * @private
 */
function markListeners(s, lists) {
  var i, list;
  for (i = 0; i < lists.length; ++i) {
    list = lists[i];
    if (list.end !== s) {
      if (list.depsChanged !== undefined) {
        list.depsChanged.push(s);
      }
      list.shouldUpdate = true;
    } else {
      endStream(list);
    }
  }
}

/**
 * @private
 * Add dependencies to a stream
 * @param {Array<stream>} dependencies
 * @param {stream} stream
 */
function addListeners(deps, s) {
  for (var i = 0; i < deps.length; ++i) {
    deps[i].listeners.push(s);
  }
}

/**
 * @private
 * Removes an stream from a dependency array
 * @param {stream} stream
 * @param {Array<stream>} dependencies
 */
function removeListener(s, listeners) {
  var idx = listeners.indexOf(s);
  listeners[idx] = listeners[listeners.length - 1];
  listeners.length--;
}

/**
 * @private
 * Detach a stream from its dependencies
 * @param {stream} stream
 */
function detachDeps(s) {
  for (var i = 0; i < s.deps.length; ++i) {
    removeListener(s, s.deps[i].listeners);
  }
  s.deps.length = 0;
}

/**
 * @private
 * Ends a stream
 */
function endStream(s) {
  if (s.deps !== undefined) detachDeps(s);
  if (s.end !== undefined) detachDeps(s.end);
}

/**
 * @private
 * transducer stream transformer
 */
function StreamTransformer() { }
StreamTransformer.prototype['@@transducer/init'] = function() { };
StreamTransformer.prototype['@@transducer/result'] = function() { };
StreamTransformer.prototype['@@transducer/step'] = function(s, v) { return v; };

var index$1 = flyd;

var _arity$3 = function _arity(n, fn) {
  /* eslint-disable no-unused-vars */
  switch (n) {
    case 0: return function() { return fn.apply(this, arguments); };
    case 1: return function(a0) { return fn.apply(this, arguments); };
    case 2: return function(a0, a1) { return fn.apply(this, arguments); };
    case 3: return function(a0, a1, a2) { return fn.apply(this, arguments); };
    case 4: return function(a0, a1, a2, a3) { return fn.apply(this, arguments); };
    case 5: return function(a0, a1, a2, a3, a4) { return fn.apply(this, arguments); };
    case 6: return function(a0, a1, a2, a3, a4, a5) { return fn.apply(this, arguments); };
    case 7: return function(a0, a1, a2, a3, a4, a5, a6) { return fn.apply(this, arguments); };
    case 8: return function(a0, a1, a2, a3, a4, a5, a6, a7) { return fn.apply(this, arguments); };
    case 9: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) { return fn.apply(this, arguments); };
    case 10: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) { return fn.apply(this, arguments); };
    default: throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
  }
};

var _isPlaceholder$3 = function _isPlaceholder(a) {
  return a != null &&
         typeof a === 'object' &&
         a['@@functional/placeholder'] === true;
};

var _curry1$3 = function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder$3(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
};

var _curry2$3 = function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder$3(a) ? f2
             : _curry1$3(function(_b) { return fn(a, _b); });
      default:
        return _isPlaceholder$3(a) && _isPlaceholder$3(b) ? f2
             : _isPlaceholder$3(a) ? _curry1$3(function(_a) { return fn(_a, b); })
             : _isPlaceholder$3(b) ? _curry1$3(function(_b) { return fn(a, _b); })
             : fn(a, b);
    }
  };
};

var _curryN$3 = function _curryN(length, received, fn) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left = length;
    var combinedIdx = 0;
    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;
      if (combinedIdx < received.length &&
          (!_isPlaceholder$3(received[combinedIdx]) ||
           argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }
      combined[combinedIdx] = result;
      if (!_isPlaceholder$3(result)) {
        left -= 1;
      }
      combinedIdx += 1;
    }
    return left <= 0 ? fn.apply(this, combined)
                     : _arity$3(left, _curryN(length, combined, fn));
  };
};

var curryN$3 = _curry2$3(function curryN(length, fn) {
  if (length === 1) {
    return _curry1$3(fn);
  }
  return _arity$3(length, _curryN$3(length, [], fn));
});

var _pipe = function _pipe(f, g) {
  return function() {
    return g.call(this, f.apply(this, arguments));
  };
};

var _curry3 = function _curry3(fn) {
  return function f3(a, b, c) {
    switch (arguments.length) {
      case 0:
        return f3;
      case 1:
        return _isPlaceholder$3(a) ? f3
             : _curry2$3(function(_b, _c) { return fn(a, _b, _c); });
      case 2:
        return _isPlaceholder$3(a) && _isPlaceholder$3(b) ? f3
             : _isPlaceholder$3(a) ? _curry2$3(function(_a, _c) { return fn(_a, b, _c); })
             : _isPlaceholder$3(b) ? _curry2$3(function(_b, _c) { return fn(a, _b, _c); })
             : _curry1$3(function(_c) { return fn(a, b, _c); });
      default:
        return _isPlaceholder$3(a) && _isPlaceholder$3(b) && _isPlaceholder$3(c) ? f3
             : _isPlaceholder$3(a) && _isPlaceholder$3(b) ? _curry2$3(function(_a, _b) { return fn(_a, _b, c); })
             : _isPlaceholder$3(a) && _isPlaceholder$3(c) ? _curry2$3(function(_a, _c) { return fn(_a, b, _c); })
             : _isPlaceholder$3(b) && _isPlaceholder$3(c) ? _curry2$3(function(_b, _c) { return fn(a, _b, _c); })
             : _isPlaceholder$3(a) ? _curry1$3(function(_a) { return fn(_a, b, c); })
             : _isPlaceholder$3(b) ? _curry1$3(function(_b) { return fn(a, _b, c); })
             : _isPlaceholder$3(c) ? _curry1$3(function(_c) { return fn(a, b, _c); })
             : fn(a, b, c);
    }
  };
};

var _xwrap = (function() {
  function XWrap(fn) {
    this.f = fn;
  }
  XWrap.prototype['@@transducer/init'] = function() {
    throw new Error('init not implemented on XWrap');
  };
  XWrap.prototype['@@transducer/result'] = function(acc) { return acc; };
  XWrap.prototype['@@transducer/step'] = function(acc, x) {
    return this.f(acc, x);
  };

  return function _xwrap(fn) { return new XWrap(fn); };
}());

var bind = _curry2$3(function bind(fn, thisObj) {
  return _arity$3(fn.length, function() {
    return fn.apply(thisObj, arguments);
  });
});

/**
 * Tests whether or not an object is an array.
 *
 * @private
 * @param {*} val The object to test.
 * @return {Boolean} `true` if `val` is an array, `false` otherwise.
 * @example
 *
 *      _isArray([]); //=> true
 *      _isArray(null); //=> false
 *      _isArray({}); //=> false
 */
var _isArray = Array.isArray || function _isArray(val) {
  return (val != null &&
          val.length >= 0 &&
          Object.prototype.toString.call(val) === '[object Array]');
};

var _isString = function _isString(x) {
  return Object.prototype.toString.call(x) === '[object String]';
};

var isArrayLike = _curry1$3(function isArrayLike(x) {
  if (_isArray(x)) { return true; }
  if (!x) { return false; }
  if (typeof x !== 'object') { return false; }
  if (_isString(x)) { return false; }
  if (x.nodeType === 1) { return !!x.length; }
  if (x.length === 0) { return true; }
  if (x.length > 0) {
    return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
  }
  return false;
});

var _reduce = (function() {
  function _arrayReduce(xf, acc, list) {
    var idx = 0;
    var len = list.length;
    while (idx < len) {
      acc = xf['@@transducer/step'](acc, list[idx]);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      idx += 1;
    }
    return xf['@@transducer/result'](acc);
  }

  function _iterableReduce(xf, acc, iter) {
    var step = iter.next();
    while (!step.done) {
      acc = xf['@@transducer/step'](acc, step.value);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      step = iter.next();
    }
    return xf['@@transducer/result'](acc);
  }

  function _methodReduce(xf, acc, obj) {
    return xf['@@transducer/result'](obj.reduce(bind(xf['@@transducer/step'], xf), acc));
  }

  var symIterator = (typeof Symbol !== 'undefined') ? Symbol.iterator : '@@iterator';
  return function _reduce(fn, acc, list) {
    if (typeof fn === 'function') {
      fn = _xwrap(fn);
    }
    if (isArrayLike(list)) {
      return _arrayReduce(fn, acc, list);
    }
    if (typeof list.reduce === 'function') {
      return _methodReduce(fn, acc, list);
    }
    if (list[symIterator] != null) {
      return _iterableReduce(fn, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
      return _iterableReduce(fn, acc, list);
    }
    throw new TypeError('reduce: list must be array or iterable');
  };
}());

var reduce = _curry3(_reduce);

var _checkForMethod = function _checkForMethod(methodname, fn) {
  return function() {
    var length = arguments.length;
    if (length === 0) {
      return fn();
    }
    var obj = arguments[length - 1];
    return (_isArray(obj) || typeof obj[methodname] !== 'function') ?
      fn.apply(this, arguments) :
      obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
  };
};

var slice = _curry3(_checkForMethod('slice', function slice(fromIndex, toIndex, list) {
  return Array.prototype.slice.call(list, fromIndex, toIndex);
}));

var tail = _curry1$3(_checkForMethod('tail', slice(1, Infinity)));

var pipe = function pipe() {
  if (arguments.length === 0) {
    throw new Error('pipe requires at least one argument');
  }
  return _arity$3(arguments[0].length,
                reduce(_pipe, arguments[0], tail(arguments)));
};

var reverse = _curry1$3(function reverse(list) {
  return _isString(list) ? list.split('').reverse().join('') :
                           Array.prototype.slice.call(list, 0).reverse();
});

var compose = function compose() {
  if (arguments.length === 0) {
    throw new Error('compose requires at least one argument');
  }
  return pipe.apply(this, reverse(arguments));
};

var isString = function(s) { return typeof s === 'string'; };
var isNumber = function(n) { return typeof n === 'number'; };
var isBoolean = function(b) { return typeof b === 'boolean'; };
var isObject = function(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
};
var isFunction$1 = function(f) { return typeof f === 'function'; };
var isArray = Array.isArray || function(a) { return 'length' in a; };

var mapConstrToFn = function(group, constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Boolean   ? isBoolean
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : constr === Function  ? isFunction$1
       : constr === undefined ? group
                              : constr;
};

var numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

var validate = function(group, validators, name, args) {
  var validator, v, i;
  if (args.length > validators.length) {
    throw new TypeError('too many arguments supplied to constructor ' + name
      + ' (expected ' + validators.length + ' but got ' + args.length + ')');
  }
  for (i = 0; i < args.length; ++i) {
    v = args[i];
    validator = mapConstrToFn(group, validators[i]);
    if (Type.check === true &&
        (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v)) &&
        (typeof validator !== 'function' || !validator(v))) {
      var strVal = typeof v === 'string' ? "'" + v + "'" : v; // put the value in quotes if it's a string
      throw new TypeError('wrong value ' + strVal + ' passed as ' + numToStr[i] + ' argument to constructor ' + name);
    }
  }
};

function valueToArray(value) {
  var i, arr = [];
  for (i = 0; i < value._keys.length; ++i) {
    arr.push(value[value._keys[i]]);
  }
  return arr;
}

function extractValues(keys, obj) {
  var arr = [], i;
  for (i = 0; i < keys.length; ++i) arr[i] = obj[keys[i]];
  return arr;
}

function constructor(group, name, fields) {
  var validators, keys = Object.keys(fields), i;
  if (isArray(fields)) {
    validators = fields;
  } else {
    validators = extractValues(keys, fields);
  }
  function construct() {
    var val = Object.create(group.prototype), i;
    val._keys = keys;
    val._name = name;
    if (Type.check === true) {
      validate(group, validators, name, arguments);
    }
    for (i = 0; i < arguments.length; ++i) {
      val[keys[i]] = arguments[i];
    }
    return val;
  }
  group[name] = keys.length === 0 ? construct() : curryN$3(keys.length, construct);
  if (keys !== undefined) {
    group[name+'Of'] = function(obj) {
      return construct.apply(undefined, extractValues(keys, obj));
    };
  }
}

function rawCase(type, cases, value, arg) {
  var wildcard = false;
  var handler = cases[value._name];
  if (handler === undefined) {
    handler = cases['_'];
    wildcard = true;
  }
  if (Type.check === true) {
    if (!type.prototype.isPrototypeOf(value)) {
      throw new TypeError('wrong type passed to case');
    } else if (handler === undefined) {
      throw new Error('non-exhaustive patterns in a function');
    }
  }
  if (handler !== undefined) {
    var args = wildcard === true ? [arg]
             : arg !== undefined ? valueToArray(value).concat([arg])
             : valueToArray(value);
    return handler.apply(undefined, args);
  }
}

var typeCase = curryN$3(3, rawCase);
var caseOn = curryN$3(4, rawCase);

function createIterator() {
  return {
    idx: 0,
    val: this,
    next: function() {
      var keys = this.val._keys;
      return this.idx === keys.length
        ? {done: true}
        : {value: this.val[keys[this.idx++]]};
    }
  };
}

function Type(desc) {
  var key, res, obj = {};
  obj.case = typeCase(obj);
  obj.caseOn = caseOn(obj);

  obj.prototype = {};
  obj.prototype[Symbol ? Symbol.iterator : '@@iterator'] = createIterator;
  obj.prototype.case = function (cases) { return obj.case(cases, this); };
  obj.prototype.caseOn = function (cases) { return obj.caseOn(cases, this); };

  for (key in desc) {
    res = constructor(obj, key, desc[key]);
  }
  return obj;
}

Type.check = true;

Type.ListOf = function (T) {
  var List = Type({List:[Array]});
  var innerType = Type({T: [T]}).T;
  var validate = List.case({
    List: function (array) {
      try {
        for(var n = 0; n < array.length; n++) {
          innerType(array[n]);
        }
      } catch (e) {
        throw new TypeError('wrong value '+ array[n] + ' passed to location ' + numToStr[n] + ' in List');
      }
      return true;
    }
  });
  return compose(validate, List.List);
};

var unionType$1 = Type;

const isCoord = n => n >= 0 && n <= 9;

const Point = unionType$1({
  Point: {
    x: isCoord,
    y: isCoord,
    src: String
  }
});

const Ray = unionType$1({
  Hit: [Point],
  Reflection: [Point],
  Exit: [Point, Point]
});

var _has = function _has(prop, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

var _objectAssign = function _objectAssign(target) {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var output = Object(target);
  var idx = 1;
  var length = arguments.length;
  while (idx < length) {
    var source = arguments[idx];
    if (source != null) {
      for (var nextKey in source) {
        if (_has(nextKey, source)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
    idx += 1;
  }
  return output;
};

var _assign =
  typeof Object.assign === 'function' ? Object.assign : _objectAssign;

var _isPlaceholder$6 = function _isPlaceholder(a) {
  return a != null &&
         typeof a === 'object' &&
         a['@@functional/placeholder'] === true;
};

var _curry1$6 = function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder$6(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
};

var _curry2$6 = function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder$6(a) ? f2
             : _curry1$6(function(_b) { return fn(a, _b); });
      default:
        return _isPlaceholder$6(a) && _isPlaceholder$6(b) ? f2
             : _isPlaceholder$6(a) ? _curry1$6(function(_a) { return fn(_a, b); })
             : _isPlaceholder$6(b) ? _curry1$6(function(_b) { return fn(a, _b); })
             : fn(a, b);
    }
  };
};

var merge = _curry2$6(function merge(l, r) {
  return _assign({}, l, r);
});

/**
 * Tests whether or not an object is an array.
 *
 * @private
 * @param {*} val The object to test.
 * @return {Boolean} `true` if `val` is an array, `false` otherwise.
 * @example
 *
 *      _isArray([]); //=> true
 *      _isArray(null); //=> false
 *      _isArray({}); //=> false
 */
var _isArray$3 = Array.isArray || function _isArray(val) {
  return (val != null &&
          val.length >= 0 &&
          Object.prototype.toString.call(val) === '[object Array]');
};

var _isTransformer = function _isTransformer(obj) {
  return typeof obj['@@transducer/step'] === 'function';
};

var _dispatchable = function _dispatchable(methodNames, xf, fn) {
  return function() {
    if (arguments.length === 0) {
      return fn();
    }
    var args = Array.prototype.slice.call(arguments, 0);
    var obj = args.pop();
    if (!_isArray$3(obj)) {
      var idx = 0;
      while (idx < methodNames.length) {
        if (typeof obj[methodNames[idx]] === 'function') {
          return obj[methodNames[idx]].apply(obj, args);
        }
        idx += 1;
      }
      if (_isTransformer(obj)) {
        var transducer = xf.apply(null, args);
        return transducer(obj);
      }
    }
    return fn.apply(this, arguments);
  };
};

var _isString$3 = function _isString(x) {
  return Object.prototype.toString.call(x) === '[object String]';
};

var _isArrayLike = _curry1$6(function isArrayLike(x) {
  if (_isArray$3(x)) { return true; }
  if (!x) { return false; }
  if (typeof x !== 'object') { return false; }
  if (_isString$3(x)) { return false; }
  if (x.nodeType === 1) { return !!x.length; }
  if (x.length === 0) { return true; }
  if (x.length > 0) {
    return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
  }
  return false;
});

var _makeFlat = function _makeFlat(recursive) {
  return function flatt(list) {
    var value, jlen, j;
    var result = [];
    var idx = 0;
    var ilen = list.length;

    while (idx < ilen) {
      if (_isArrayLike(list[idx])) {
        value = recursive ? flatt(list[idx]) : list[idx];
        j = 0;
        jlen = value.length;
        while (j < jlen) {
          result[result.length] = value[j];
          j += 1;
        }
      } else {
        result[result.length] = list[idx];
      }
      idx += 1;
    }
    return result;
  };
};

var _forceReduced = function _forceReduced(x) {
  return {
    '@@transducer/value': x,
    '@@transducer/reduced': true
  };
};

var _xwrap$3 = (function() {
  function XWrap(fn) {
    this.f = fn;
  }
  XWrap.prototype['@@transducer/init'] = function() {
    throw new Error('init not implemented on XWrap');
  };
  XWrap.prototype['@@transducer/result'] = function(acc) { return acc; };
  XWrap.prototype['@@transducer/step'] = function(acc, x) {
    return this.f(acc, x);
  };

  return function _xwrap(fn) { return new XWrap(fn); };
}());

var _arity$6 = function _arity(n, fn) {
  /* eslint-disable no-unused-vars */
  switch (n) {
    case 0: return function() { return fn.apply(this, arguments); };
    case 1: return function(a0) { return fn.apply(this, arguments); };
    case 2: return function(a0, a1) { return fn.apply(this, arguments); };
    case 3: return function(a0, a1, a2) { return fn.apply(this, arguments); };
    case 4: return function(a0, a1, a2, a3) { return fn.apply(this, arguments); };
    case 5: return function(a0, a1, a2, a3, a4) { return fn.apply(this, arguments); };
    case 6: return function(a0, a1, a2, a3, a4, a5) { return fn.apply(this, arguments); };
    case 7: return function(a0, a1, a2, a3, a4, a5, a6) { return fn.apply(this, arguments); };
    case 8: return function(a0, a1, a2, a3, a4, a5, a6, a7) { return fn.apply(this, arguments); };
    case 9: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) { return fn.apply(this, arguments); };
    case 10: return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) { return fn.apply(this, arguments); };
    default: throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
  }
};

var bind$3 = _curry2$6(function bind(fn, thisObj) {
  return _arity$6(fn.length, function() {
    return fn.apply(thisObj, arguments);
  });
});

var _reduce$3 = (function() {
  function _arrayReduce(xf, acc, list) {
    var idx = 0;
    var len = list.length;
    while (idx < len) {
      acc = xf['@@transducer/step'](acc, list[idx]);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      idx += 1;
    }
    return xf['@@transducer/result'](acc);
  }

  function _iterableReduce(xf, acc, iter) {
    var step = iter.next();
    while (!step.done) {
      acc = xf['@@transducer/step'](acc, step.value);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      step = iter.next();
    }
    return xf['@@transducer/result'](acc);
  }

  function _methodReduce(xf, acc, obj, methodName) {
    return xf['@@transducer/result'](obj[methodName](bind$3(xf['@@transducer/step'], xf), acc));
  }

  var symIterator = (typeof Symbol !== 'undefined') ? Symbol.iterator : '@@iterator';
  return function _reduce(fn, acc, list) {
    if (typeof fn === 'function') {
      fn = _xwrap$3(fn);
    }
    if (_isArrayLike(list)) {
      return _arrayReduce(fn, acc, list);
    }
    if (typeof list['fantasy-land/reduce'] === 'function') {
      return _methodReduce(fn, acc, list, 'fantasy-land/reduce');
    }
    if (list[symIterator] != null) {
      return _iterableReduce(fn, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
      return _iterableReduce(fn, acc, list);
    }
    if (typeof list.reduce === 'function') {
      return _methodReduce(fn, acc, list, 'reduce');
    }

    throw new TypeError('reduce: list must be array or iterable');
  };
}());

var _xfBase = {
  init: function() {
    return this.xf['@@transducer/init']();
  },
  result: function(result) {
    return this.xf['@@transducer/result'](result);
  }
};

var _flatCat = (function() {
  var preservingReduced = function(xf) {
    return {
      '@@transducer/init': _xfBase.init,
      '@@transducer/result': function(result) {
        return xf['@@transducer/result'](result);
      },
      '@@transducer/step': function(result, input) {
        var ret = xf['@@transducer/step'](result, input);
        return ret['@@transducer/reduced'] ? _forceReduced(ret) : ret;
      }
    };
  };

  return function _xcat(xf) {
    var rxf = preservingReduced(xf);
    return {
      '@@transducer/init': _xfBase.init,
      '@@transducer/result': function(result) {
        return rxf['@@transducer/result'](result);
      },
      '@@transducer/step': function(result, input) {
        return !_isArrayLike(input) ? _reduce$3(rxf, result, [input]) : _reduce$3(rxf, result, input);
      }
    };
  };
}());

var _map = function _map(fn, functor) {
  var idx = 0;
  var len = functor.length;
  var result = Array(len);
  while (idx < len) {
    result[idx] = fn(functor[idx]);
    idx += 1;
  }
  return result;
};

var _xmap = (function() {
  function XMap(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XMap.prototype['@@transducer/init'] = _xfBase.init;
  XMap.prototype['@@transducer/result'] = _xfBase.result;
  XMap.prototype['@@transducer/step'] = function(result, input) {
    return this.xf['@@transducer/step'](result, this.f(input));
  };

  return _curry2$6(function _xmap(f, xf) { return new XMap(f, xf); });
}());

var _curryN$6 = function _curryN(length, received, fn) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left = length;
    var combinedIdx = 0;
    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;
      if (combinedIdx < received.length &&
          (!_isPlaceholder$6(received[combinedIdx]) ||
           argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }
      combined[combinedIdx] = result;
      if (!_isPlaceholder$6(result)) {
        left -= 1;
      }
      combinedIdx += 1;
    }
    return left <= 0 ? fn.apply(this, combined)
                     : _arity$6(left, _curryN(length, combined, fn));
  };
};

var curryN$6 = _curry2$6(function curryN(length, fn) {
  if (length === 1) {
    return _curry1$6(fn);
  }
  return _arity$6(length, _curryN$6(length, [], fn));
});

var _isArguments = (function() {
  var toString = Object.prototype.toString;
  return toString.call(arguments) === '[object Arguments]' ?
    function _isArguments(x) { return toString.call(x) === '[object Arguments]'; } :
    function _isArguments(x) { return _has('callee', x); };
}());

var keys = (function() {
  // cover IE < 9 keys issues
  var hasEnumBug = !({toString: null}).propertyIsEnumerable('toString');
  var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString',
                            'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
  // Safari bug
  var hasArgsEnumBug = (function() {
    'use strict';
    return arguments.propertyIsEnumerable('length');
  }());

  var contains = function contains(list, item) {
    var idx = 0;
    while (idx < list.length) {
      if (list[idx] === item) {
        return true;
      }
      idx += 1;
    }
    return false;
  };

  return typeof Object.keys === 'function' && !hasArgsEnumBug ?
    _curry1$6(function keys(obj) {
      return Object(obj) !== obj ? [] : Object.keys(obj);
    }) :
    _curry1$6(function keys(obj) {
      if (Object(obj) !== obj) {
        return [];
      }
      var prop, nIdx;
      var ks = [];
      var checkArgsLength = hasArgsEnumBug && _isArguments(obj);
      for (prop in obj) {
        if (_has(prop, obj) && (!checkArgsLength || prop !== 'length')) {
          ks[ks.length] = prop;
        }
      }
      if (hasEnumBug) {
        nIdx = nonEnumerableProps.length - 1;
        while (nIdx >= 0) {
          prop = nonEnumerableProps[nIdx];
          if (_has(prop, obj) && !contains(ks, prop)) {
            ks[ks.length] = prop;
          }
          nIdx -= 1;
        }
      }
      return ks;
    });
}());

var map = _curry2$6(_dispatchable(['fantasy-land/map', 'map'], _xmap, function map(fn, functor) {
  switch (Object.prototype.toString.call(functor)) {
    case '[object Function]':
      return curryN$6(functor.length, function() {
        return fn.call(this, functor.apply(this, arguments));
      });
    case '[object Object]':
      return _reduce$3(function(acc, key) {
        acc[key] = fn(functor[key]);
        return acc;
      }, {}, keys(functor));
    default:
      return _map(fn, functor);
  }
}));

var _xchain = _curry2$6(function _xchain(f, xf) {
  return map(f, _flatCat(xf));
});

var chain = _curry2$6(_dispatchable(['fantasy-land/chain', 'chain'], _xchain, function chain(fn, monad) {
  if (typeof monad === 'function') {
    return function(x) { return fn(monad(x))(x); };
  }
  return _makeFlat(false)(map(fn, monad));
}));

var times = _curry2$6(function times(fn, n) {
  var len = Number(n);
  var idx = 0;
  var list;

  if (len < 0 || isNaN(len)) {
    throw new RangeError('n must be a non-negative number');
  }
  list = new Array(len);
  while (idx < len) {
    list[idx] = fn(idx);
    idx += 1;
  }
  return list;
});

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}



function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var rdom = createCommonjsModule(function (module, exports) {
(function(f){{module.exports=f();}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof commonjsRequire=="function"&&commonjsRequire;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r);}return n[o].exports}var i=typeof commonjsRequire=="function"&&commonjsRequire;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = [
  'div', 
  'p', 
  'table', 
  'tr', 
  'td', 
  'th', 
  'tbody', 
  'thead', 
  'tfoot', 
  'span', 
  'ul', 
  'ol', 
  'li',
  'a', 
  'select', 
  'option', 
  'input', 
  'button', 
  'h1', 
  'h2', 
  'h3', 
  'h4', 
  'textarea', 
  'label'
];

},{}],"/src/rdom":[function(_dereq_,module,exports){
var tags = _dereq_('./tags');
var elProps = ['className', 'innerHTML', 'name', 'title'];

// helper functions
function isElProp(prop) {
  return elProps.indexOf(prop) > -1;
}

function cfgElem(elem, attrs) {
  var prop;
  for (prop in attrs) {
    if (attrs.hasOwnProperty(prop)) {
      if (isElProp(prop)) {
        elem[prop] = attrs[prop];
      } else {
        elem.setAttribute(prop, attrs[prop]);
      }
    }
  }
  return elem;
}

function mkChildren(elem, children) {
  return children.reduce(function(elm, child) {
    if (typeof child === 'string') {
      elm.appendChild(document.createTextNode(child));
    } else {
      elm.appendChild(child);
    }
    return elm;
  }, elem);
}

function rdom(tag, config, children) {
  switch (arguments.length) {
  case 0:
    return rdom;
  case 1:
    return function _el1(conf, kids) {
      switch (arguments.length) {
      case 0: return _el1;
      case 1: return function _el1_1(ks) {
        var elem = document.createElement(tag);
        return mkChildren(cfgElem(elem, conf), ks);
      };
      default: 
        var elem = document.createElement(tag);
        return mkChildren(cfgElem(elem, conf), kids);
      }
    };
  case 2:
    return function _el2(cs) {
      if (arguments.length === 0) { return _el2; }
      var elem = document.createElement(tag);
      return mkChildren(cfgElem(elem, config), cs);
    };
  default:
    var elem = document.createElement(tag);
    return mkChildren(cfgElem(elem, config), children);
  }
}

rdom.addTags = function _rdomAddTags(ts, dest) {
  return ts.reduce(function(acc, tagName) {
    acc[tagName] = rdom(tagName);
    return acc;
  }, dest);
};

rdom.addTags(tags, rdom);

module.exports = rdom;

},{"./tags":1}]},{},[])("/src/rdom")
});
});

var rdom_1 = rdom.div;

const pid = (x, y) => 'pt-' + x + '-' + y;
const inc = n => n + 1;

const cell = (cls, x, y) => rdom_1({ id: pid(x, y), className: 'cell ' + cls }, []);

const toRow = (edgeClass, innerClass) => (width, rowIdx) => [cell(edgeClass, 0, rowIdx)].concat(times(inc, width - 2).map(x => cell(innerClass, x, rowIdx))).concat([cell(edgeClass, width - 1, rowIdx)]);

const edgeRow = toRow('corner', 'edgeCell');
const row = toRow('edgeCell', 'gridCell');

function matrix(width, height) {
  return rdom_1({ className: 'board' }, edgeRow(width, 0).concat(chain(_y => row(width, _y), times(inc, height - 2))).concat(edgeRow(width, height - 1)));
}

const right = p => ({
  left: merge(p, { x: p.x + 1, y: p.y - 1 }),
  center: merge(p, { x: p.x + 1, y: p.y, src: pid(p.x + 1, p.y) }),
  right: merge(p, { x: p.x + 1, y: p.y + 1 })
});

const left = p => ({
  left: merge(p, { x: p.x - 1, y: p.y - 1 }),
  center: merge(p, { x: p.x - 1, y: p.y, src: pid(p.x - 1, p.y) }),
  right: merge(p, { x: p.x - 1, y: p.y + 1 })
});

const down = p => ({
  left: merge(p, { x: p.x - 1, y: p.y + 1 }),
  center: merge(p, { x: p.x, y: p.y + 1, src: pid(p.x, p.y + 1) }),
  right: merge(p, { x: p.x + 1, y: p.y + 1 })
});

const up = p => ({
  left: merge(p, { x: p.x - 1, y: p.y - 1 }),
  center: merge(p, { x: p.x, y: p.y - 1, src: pid(p.x, p.y - 1) }),
  right: merge(p, { x: p.x + 1, y: p.y - 1 })
});

right.R = up;
right.L = down;

left.R = up;
left.L = down;

up.R = left;
up.L = right;

down.R = left;
down.L = right;

const error = s => () => {
  throw s;
};

// firstStep :: Point -> Dir 
const firstStep = pt => pt.x === 0 ? right : pt.x === 9 ? left : pt.y === 0 ? down : pt.y === 9 ? up : error("Invalid step");

// exit :: (Dir, Point) -> Bool
const exit = (dir, pt) => {
  switch (dir) {
    case right:
      return pt.x === 9;
    case left:
      return pt.x === 0;
    case down:
      return pt.y === 9;
    case up:
      return pt.y === 0;
  }
};

// edge :: Point -> Bool
const edge = pt => pt.x === 0 || pt.x === 9 || pt.y === 0 || pt.y === 9;

const of = Point.PointOf;

// query :: [Point] -> Point -> Ray
const queryOver = points => entryPt => {

  const contains = pt => Boolean(points.find(p => p.x === pt.x && p.y === pt.y));

  const aux = (currentPt, step) => {
    const ns = step(currentPt);

    if (exit(step, ns.center)) {
      return Ray.Exit(of(entryPt), of(ns.center));
    }

    if (contains(ns.center)) {
      return Ray.Hit(of(entryPt));
    }

    if (contains(ns.left)) {
      return edge(currentPt) || contains(ns.right) ? Ray.Reflection(of(entryPt)) : aux(currentPt, step.L);
    }

    if (contains(ns.right)) {
      return edge(currentPt) ? Ray.Reflection(of(entryPt)) : aux(currentPt, step.R);
    }

    return aux(ns.center, step);
  };

  return aux(entryPt, firstStep(entryPt));
};

var index$2 = index$1.curryN(2, function(fn, s) {
  return index$1.combine(function(s, self) {
    if (fn(s())) self(s.val);
  }, [s]);
});

const getCoords = id => {
  let [_, x, y] = id.split('-');
  return { x: Number(x), y: Number(y) };
};

//--------------------------------
// Stream Transformers and Filters
//--------------------------------

const toCoords = e => {
  let coords = getCoords(e.target.id);
  return {
    x: coords.x,
    y: coords.y,
    src: e.target.id
  };
};

const cellRx = /\bcell\b/;
const isCell = e => cellRx.test(e.target.className);

const isGrid = n => pt => pt.x > 0 && pt.y > 0 && pt.x < n - 1 && pt.y < n - 1;

const isCorner = n => pt => pt.x === 0 && pt.y === 0 || pt.x === 0 && pt.y === n - 1 || pt.x === n - 1 && pt.y === 0 || pt.x === n - 1 && pt.y === n - 1;

const isEdge = n => pt => !isGrid(n)(pt) && !isCorner(n)(pt);

//--------------------------------
// Streams
//--------------------------------

const clicks = index$1.stream();

const es = index$1.stream(0);

const edge$1 = index$2(isEdge(10), index$1.map(toCoords, index$2(isCell, clicks)));

const edgeCounter = index$1.map(_ => es(es() + 1)(), edge$1);

const grid = index$2(isGrid(10), index$1.map(toCoords, index$2(isCell, clicks)));

const gs = index$1.stream(0);

const gridCounter = index$1.map(_ => gs(gs() + 1)(), grid);

const check = index$1.stream();

var chosen = {};

const k = (x, y) => x + ',' + y;

const exists = (x, y) => chosen[k(x, y)];

const gen = g => parseInt(Math.random() * g, 10) + 1;

const randPt = size => _ => {
  const gridSize = size - 2;
  const x = gen(gridSize);
  const y = gen(gridSize);
  if (exists(x, y)) {
    return randPt(size)();
  }
  chosen[k(x, y)] = true;
  console.log(k(x, y));
  return { x: x, y: y };
};

const points = (size, marbles) => times(randPt(size), marbles);

var _curry3$3 = function _curry3(fn) {
  return function f3(a, b, c) {
    switch (arguments.length) {
      case 0:
        return f3;
      case 1:
        return _isPlaceholder$6(a) ? f3
             : _curry2$6(function(_b, _c) { return fn(a, _b, _c); });
      case 2:
        return _isPlaceholder$6(a) && _isPlaceholder$6(b) ? f3
             : _isPlaceholder$6(a) ? _curry2$6(function(_a, _c) { return fn(_a, b, _c); })
             : _isPlaceholder$6(b) ? _curry2$6(function(_b, _c) { return fn(a, _b, _c); })
             : _curry1$6(function(_c) { return fn(a, b, _c); });
      default:
        return _isPlaceholder$6(a) && _isPlaceholder$6(b) && _isPlaceholder$6(c) ? f3
             : _isPlaceholder$6(a) && _isPlaceholder$6(b) ? _curry2$6(function(_a, _b) { return fn(_a, _b, c); })
             : _isPlaceholder$6(a) && _isPlaceholder$6(c) ? _curry2$6(function(_a, _c) { return fn(_a, b, _c); })
             : _isPlaceholder$6(b) && _isPlaceholder$6(c) ? _curry2$6(function(_b, _c) { return fn(a, _b, _c); })
             : _isPlaceholder$6(a) ? _curry1$6(function(_a) { return fn(_a, b, c); })
             : _isPlaceholder$6(b) ? _curry1$6(function(_b) { return fn(a, _b, c); })
             : _isPlaceholder$6(c) ? _curry1$6(function(_c) { return fn(a, b, _c); })
             : fn(a, b, c);
    }
  };
};

var o = _curry3$3(function o(f, g, x) {
  return f(g(x));
});

var _filter = function _filter(fn, list) {
  var idx = 0;
  var len = list.length;
  var result = [];

  while (idx < len) {
    if (fn(list[idx])) {
      result[result.length] = list[idx];
    }
    idx += 1;
  }
  return result;
};

var _isObject = function _isObject(x) {
  return Object.prototype.toString.call(x) === '[object Object]';
};

var _xfilter = (function() {
  function XFilter(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XFilter.prototype['@@transducer/init'] = _xfBase.init;
  XFilter.prototype['@@transducer/result'] = _xfBase.result;
  XFilter.prototype['@@transducer/step'] = function(result, input) {
    return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
  };

  return _curry2$6(function _xfilter(f, xf) { return new XFilter(f, xf); });
}());

var filter$1 = _curry2$6(_dispatchable(['filter'], _xfilter, function(pred, filterable) {
  return (
    _isObject(filterable) ?
      _reduce$3(function(acc, key) {
        if (pred(filterable[key])) {
          acc[key] = filterable[key];
        }
        return acc;
      }, {}, keys(filterable)) :
    // else
      _filter(pred, filterable)
  );
}));

var values = _curry1$6(function values(obj) {
  var props = keys(obj);
  var len = props.length;
  var vals = [];
  var idx = 0;
  while (idx < len) {
    vals[idx] = obj[props[idx]];
    idx += 1;
  }
  return vals;
});

var _pipe$3 = function _pipe(f, g) {
  return function() {
    return g.call(this, f.apply(this, arguments));
  };
};

var reduce$3 = _curry3$3(_reduce$3);

var _checkForMethod$3 = function _checkForMethod(methodname, fn) {
  return function() {
    var length = arguments.length;
    if (length === 0) {
      return fn();
    }
    var obj = arguments[length - 1];
    return (_isArray$3(obj) || typeof obj[methodname] !== 'function') ?
      fn.apply(this, arguments) :
      obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
  };
};

var slice$3 = _curry3$3(_checkForMethod$3('slice', function slice(fromIndex, toIndex, list) {
  return Array.prototype.slice.call(list, fromIndex, toIndex);
}));

var tail$3 = _curry1$6(_checkForMethod$3('tail', slice$3(1, Infinity)));

var pipe$3 = function pipe() {
  if (arguments.length === 0) {
    throw new Error('pipe requires at least one argument');
  }
  return _arity$6(arguments[0].length,
                reduce$3(_pipe$3, arguments[0], tail$3(arguments)));
};

var _reduced = function _reduced(x) {
  return x && x['@@transducer/reduced'] ? x :
    {
      '@@transducer/value': x,
      '@@transducer/reduced': true
    };
};

var _xall = (function() {
  function XAll(f, xf) {
    this.xf = xf;
    this.f = f;
    this.all = true;
  }
  XAll.prototype['@@transducer/init'] = _xfBase.init;
  XAll.prototype['@@transducer/result'] = function(result) {
    if (this.all) {
      result = this.xf['@@transducer/step'](result, true);
    }
    return this.xf['@@transducer/result'](result);
  };
  XAll.prototype['@@transducer/step'] = function(result, input) {
    if (!this.f(input)) {
      this.all = false;
      result = _reduced(this.xf['@@transducer/step'](result, false));
    }
    return result;
  };

  return _curry2$6(function _xall(f, xf) { return new XAll(f, xf); });
}());

var all = _curry2$6(_dispatchable(['all'], _xall, function all(fn, list) {
  var idx = 0;
  while (idx < list.length) {
    if (!fn(list[idx])) {
      return false;
    }
    idx += 1;
  }
  return true;
}));

var nth = _curry2$6(function nth(offset, list) {
  var idx = offset < 0 ? list.length + offset : offset;
  return _isString$3(list) ? list.charAt(idx) : list[idx];
});

var head = nth(0);

var _xfind = (function() {
  function XFind(f, xf) {
    this.xf = xf;
    this.f = f;
    this.found = false;
  }
  XFind.prototype['@@transducer/init'] = _xfBase.init;
  XFind.prototype['@@transducer/result'] = function(result) {
    if (!this.found) {
      result = this.xf['@@transducer/step'](result, void 0);
    }
    return this.xf['@@transducer/result'](result);
  };
  XFind.prototype['@@transducer/step'] = function(result, input) {
    if (this.f(input)) {
      this.found = true;
      result = _reduced(this.xf['@@transducer/step'](result, input));
    }
    return result;
  };

  return _curry2$6(function _xfind(f, xf) { return new XFind(f, xf); });
}());

var find = _curry2$6(_dispatchable(['find'], _xfind, function find(fn, list) {
  var idx = 0;
  var len = list.length;
  while (idx < len) {
    if (fn(list[idx])) {
      return list[idx];
    }
    idx += 1;
  }
}));

var _arrayFromIterator = function _arrayFromIterator(iter) {
  var list = [];
  var next;
  while (!(next = iter.next()).done) {
    list.push(next.value);
  }
  return list;
};

var _functionName = function _functionName(f) {
  // String(x => x) evaluates to "x => x", so the pattern may not match.
  var match = String(f).match(/^function (\w*)/);
  return match == null ? '' : match[1];
};

var identical = _curry2$6(function identical(a, b) {
  // SameValue algorithm
  if (a === b) { // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    return a !== 0 || 1 / a === 1 / b;
  } else {
    // Step 6.a: NaN == NaN
    return a !== a && b !== b;
  }
});

var type = _curry1$6(function type(val) {
  return val === null      ? 'Null'      :
         val === undefined ? 'Undefined' :
         Object.prototype.toString.call(val).slice(8, -1);
});

var _equals = function _equals(a, b, stackA, stackB) {
  if (identical(a, b)) {
    return true;
  }

  if (type(a) !== type(b)) {
    return false;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
    return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) &&
           typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
  }

  if (typeof a.equals === 'function' || typeof b.equals === 'function') {
    return typeof a.equals === 'function' && a.equals(b) &&
           typeof b.equals === 'function' && b.equals(a);
  }

  switch (type(a)) {
    case 'Arguments':
    case 'Array':
    case 'Object':
      if (typeof a.constructor === 'function' &&
          _functionName(a.constructor) === 'Promise') {
        return a === b;
      }
      break;
    case 'Boolean':
    case 'Number':
    case 'String':
      if (!(typeof a === typeof b && identical(a.valueOf(), b.valueOf()))) {
        return false;
      }
      break;
    case 'Date':
      if (!identical(a.valueOf(), b.valueOf())) {
        return false;
      }
      break;
    case 'Error':
      return a.name === b.name && a.message === b.message;
    case 'RegExp':
      if (!(a.source === b.source &&
            a.global === b.global &&
            a.ignoreCase === b.ignoreCase &&
            a.multiline === b.multiline &&
            a.sticky === b.sticky &&
            a.unicode === b.unicode)) {
        return false;
      }
      break;
    case 'Map':
    case 'Set':
      if (!_equals(_arrayFromIterator(a.entries()), _arrayFromIterator(b.entries()), stackA, stackB)) {
        return false;
      }
      break;
    case 'Int8Array':
    case 'Uint8Array':
    case 'Uint8ClampedArray':
    case 'Int16Array':
    case 'Uint16Array':
    case 'Int32Array':
    case 'Uint32Array':
    case 'Float32Array':
    case 'Float64Array':
      break;
    case 'ArrayBuffer':
      break;
    default:
      // Values of other types are only equal if identical.
      return false;
  }

  var keysA = keys(a);
  if (keysA.length !== keys(b).length) {
    return false;
  }

  var idx = stackA.length - 1;
  while (idx >= 0) {
    if (stackA[idx] === a) {
      return stackB[idx] === b;
    }
    idx -= 1;
  }

  stackA.push(a);
  stackB.push(b);
  idx = keysA.length - 1;
  while (idx >= 0) {
    var key = keysA[idx];
    if (!(_has(key, b) && _equals(b[key], a[key], stackA, stackB))) {
      return false;
    }
    idx -= 1;
  }
  stackA.pop();
  stackB.pop();
  return true;
};

var equals = _curry2$6(function equals(a, b) {
  return _equals(a, b, [], []);
});

var where = _curry2$6(function where(spec, testObj) {
  for (var prop in spec) {
    if (_has(prop, spec) && !spec[prop](testObj[prop])) {
      return false;
    }
  }
  return true;
});

var whereEq = _curry2$6(function whereEq(spec, testObj) {
  return where(map(equals, spec), testObj);
});

const toElem = id => document.getElementById(id);

// of :: Object -> Point
const of$1 = Point.PointOf;

//-------------------------------
// Query (edge) events
//-------------------------------

const E = unionType$1({
  Result: {
    type: String,
    text: String,
    points: Array
  }
});

// nextId :: unit -> Number
const nextId = function () {
  var counter = 64;
  return () => {
    counter += 1;
    return String.fromCharCode(counter);
  };
}();

// edgeResult :: Ray -> Result
const edgeResult = Ray.case({
  Hit: pt => E.Result('hit', '', [pt]),
  Reflection: pt => E.Result('reflection', '', [pt]),
  Exit: (from, to) => E.Result('selected', nextId(), [from, to])
});

// update.edge :: Result -> unit
const edge$2 = result => {
  // Effect: update view
  result.points.forEach(pt => {
    const elem = toElem(pt.src);
    elem.className += ' ' + result.type;
    elem.textContent = result.text;
  });
};

//-------------------------------
// Count queries display
//-------------------------------

// queries :: DOMElement -> Number -> unit
const queries = t => n => t.textContent = n;

//-------------------------------
// check solution button
//-------------------------------

const Guess = unionType$1({
  Certain: [Point],
  Possible: [Point],
  None: [Point]
});

//-------------------------------
// Grid events
//-------------------------------

const guesses = {};

// certains :: Guess -> [Certain] 
const certains = _ => pipe$3(filter$1(g => g._name === 'Certain'), values)(guesses);

// takeGuess :: Point -> Guess
const takeGuess = pt => {
  const guess = guesses[pt.src];
  if (guess) {
    guesses[pt.src] = Guess.case({
      None: _ => Guess.Possible(of$1(pt)),
      Possible: _ => Guess.Certain(of$1(pt)),
      Certain: _ => Guess.None(of$1(pt))
    }, guess);
  } else {
    guesses[pt.src] = Guess.Possible(of$1(pt));
  }
  return guesses[pt.src];
};

// renderGuess :: String -> Point -> unit
const renderGuess = cls => pt => {
  const elem = toElem(pt.src);
  elem.className = elem.className.replace(/\s*guess\d/g, '') + cls;
};

// grid :: Guess -> unit
const grid$1 = Guess.case({
  None: renderGuess(''),
  Possible: renderGuess(' guess1'),
  Certain: renderGuess(' guess2')
});

//-------------------------------
// Attempted solution response
//-------------------------------

const Solution = unionType$1({
  Impossible: [],
  Valid: [String],
  Invalid: [String]
});

// validate :: [Point] -> [Guess] -> Boolean
const validate$1 = (pts, gs) => {
  debugger;return gs.length === pts.length && all(pt => find(whereEq(pt), map(head, gs)), pts);
};

// trySolve :: ([Point], [Guess] Stream) -> Any -> Solution                              
const trySolve = (points, cs) => _ => cs().length !== points.length ? Solution.Impossible : validate$1(points, cs()) ? Solution.Valid('You found the solution!') : Solution.Invalid('Incorrect solution');

// notify :: Solution -> unit                                  
const notify = Solution.case({
  Valid: alert,
  Invalid: alert,
  Impossible: () => {}
});

const onReady = () => {
  const mWidth = 10;
  const mHeight = 10;
  const m = 5;
  const pts = points(mWidth, m);

  const board = document.getElementById('board');
  board.appendChild(matrix(mWidth, mHeight));
  board.addEventListener('click', clicks);

  const edgeResults = index$1.map(o(edgeResult, queryOver(pts)), edge$1);
  index$1.on(edge$2, edgeResults);

  const qs = document.getElementById('queries');
  index$1.on(queries(qs), edgeCounter);

  const guess = index$1.map(takeGuess, grid);
  index$1.on(grid$1, guess);

  const attempt = document.getElementById('attempt');
  attempt.addEventListener('click', check);
  const certains$$1 = index$1.map(certains, guess);
  index$1.on(cs => attempt.disabled = cs.length !== m, certains$$1);

  const solve = index$1.map(trySolve(pts, certains$$1), check);
  index$1.on(notify, solve);
};

document.addEventListener('DOMContentLoaded', onReady);

}());
