import {Ray, Point} from './types';
import Type from 'union-type';


const toElem = id => document.querySelector('#' + id);

const decoratePt = s => pt => toElem(pt.src).className += s;
const hitPt = decoratePt(' hit');
const refPt = decoratePt(' reflection');
const exitPt = decoratePt(' selected');


const E = Type({
  Result: {
    type: String, 
    text: String, 
    points: Array
  }
});

// edgeResult :: Ray -> Result
export const edgeResult = Ray.case({
  Hit       : pt         => E.Result('hit', '', [pt]),
  Reflection: pt         => E.Result('reflection', '', [pt]),
  Exit      : (from, to) => E.Result('selected', from.id, [from, to])
});

// update.edge :: Result -> unit
export const edge = result => {
  // Effect: update view
  result.points.forEach(pt => {
    const elem = toElem(pt.src);
    elem.className = result.type;
    elem.textContent = result.text;
  });
};

export const grid = pt => {
  
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
  None    : []
});

const guesses = {};

const takeGuess = pt => {
  const guess = guesses[pt.src];
  if (!guess) {
    guesses[pt.src] = Possible(pt);
  } else {
    guesses[pt.src] = Guess.case({
      None    : _ => Possible(pt),
      Possible: _ => Guess.Certain(pt),
      Certain : _ => None
    }, guess);
  }
  return guesses[pt.src];
};

export const check = pt => {

};
