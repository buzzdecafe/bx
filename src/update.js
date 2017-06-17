import {Ray, Point} from './ray';
import Type from 'union-type';
import filter from 'ramda/src/filter';
import values from 'ramda/src/values';
import pipe from 'ramda/src/pipe';
import all from 'ramda/src/all';
import head from 'ramda/src/head';
import map from 'ramda/src/map';
import find from 'ramda/src/find';
import whereEq from 'ramda/src/whereEq';

// toElem :: String -> DOMElement
const toElem = id => document.querySelector('#' + id);

// of :: Object -> Point
const of = Point.PointOf;

//-------------------------------
// Query (edge) events
//-------------------------------

const E = Type({
  Result: {
    type: String, 
    text: String, 
    points: Array
  }
});

// nextId :: unit -> Number
const nextId = (function() {
  var counter = 64;
  return () => {
    counter += 1;
    return String.fromCharCode(counter);
  };
}());

// edgeResult :: Ray -> Result
export const edgeResult = Ray.case({
  Hit       : pt         => E.Result('hit', '', [pt]),
  Reflection: pt         => E.Result('reflection', '', [pt]),
  Exit      : (from, to) => E.Result('selected', nextId(), [from, to])
});

// update.edge :: Result -> unit
export const edge = result => {
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
export const queries = t => n => t.textContent = n;


//-------------------------------
// check solution button
//-------------------------------

const Guess = Type({
  Certain : [Point], 
  Possible: [Point],
  None    : [Point]
});


//-------------------------------
// Grid events
//-------------------------------

const guesses = {};

// certains :: Guess -> [Certain] 
export const certains = _ => pipe(
  filter(g => g._name === 'Certain'),
  values
)(guesses);

// takeGuess :: Point -> Guess
export const takeGuess = pt => {
  const guess = guesses[pt.src];
  if (guess) {
    guesses[pt.src] = Guess.case({
      None    : _ => Guess.Possible(of(pt)),
      Possible: _ => Guess.Certain(of(pt)),
      Certain : _ => Guess.None(of(pt))
    }, guess);
  } else {
    guesses[pt.src] = Guess.Possible(of(pt));
  } 
  return guesses[pt.src];
};

// renderGuess :: String -> Point -> unit
const renderGuess = cls => pt => {
  const elem = toElem(pt.src);
  elem.className = elem.className.replace(/\bguess\d\b/g, '') + ' ' + cls;
};

// grid :: Guess -> unit
export const grid = Guess.case({
  None: renderGuess(''),
  Possible: renderGuess('guess1'),
  Certain: renderGuess('guess2')
});


//-------------------------------
// Attempted solution response
//-------------------------------

const Solution = Type({
  Impossible: [],
  Valid     : [String],
  Invalid   : [String]
});

// validate :: [Point] -> [Guess] -> Boolean
const validate = (pts, gs) => { debugger; return gs.length === pts.length &&  
                              all(pt => find(whereEq(pt), map(head, gs)), pts); }

// trySolve :: ([Point], [Guess] Stream) -> Any -> Solution                              
export const trySolve = (points, cs) => _ => 
  cs().length !== points.length ? Solution.Impossible :
  validate(points, cs())        ? Solution.Valid('You found the solution!') : 
                                  Solution.Invalid('Incorrect solution');

// notify :: Solution -> unit                                  
export const notify = Solution.case({
  Valid:     alert,
  Invalid:   alert,
  Impossible: () => {}
});
 
