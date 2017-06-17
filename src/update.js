import {Ray, Point} from './types';
import Type from 'union-type';
import filter from 'ramda/src/filter';
import keys from 'ramda/src/keys';
import length from 'ramda/src/length';
import pipe from 'ramda/src/pipe';


const toElem = id => document.querySelector('#' + id);

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

// certainCount :: Guess -> Number
export const certainCount = _ => pipe(
  filter(g => g._name === 'Certain'),
  keys,
  length
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


const renderGuess = cls => pt => {
  const elem = toElem(pt.src);
  elem.className = elem.className.replace(/\bguess\d\b/g, '') + ' ' + cls;
};

export const grid = Guess.case({
  None: renderGuess(''),
  Possible: renderGuess('guess1'),
  Certain: renderGuess('guess2')
});


