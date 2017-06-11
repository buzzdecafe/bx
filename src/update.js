import {Ray, Point} from './types';
import Type from 'union-type';


const toElem = id => document.querySelector('#' + id);

const decoratePt = s => pt => toElem(pt.src).className += s;
const hitPt = decoratePt(' hit');
const refPt = decoratePt(' reflection');
const exitPt = decoratePt(' selected');

// update :: Ray -> unit
export const edge = ray => {
  Ray.case({
    Hit       : hitPt,
    Reflection: refPt,
    Exit      : (from, to) => {
      from.textContent = to.textContent = from.id;
      decoratePt(from);
      decoratePt(to);
    }
  });
};

export const grid = pt => {
  
};


//-------------------------------
// Count queries display
//-------------------------------

const queries = t => n => t.textContent = n;


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
      None    : () => Possible(pt),
      Possible: _  => Guess.Certain(pt),
      Certain : _  => None
    }, guess);
  }
  return guesses[pt.src];
};

export const check = pt => {

};
