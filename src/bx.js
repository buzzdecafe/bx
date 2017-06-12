import flyd from 'flyd';
import {queryOver} from './query';
import matrix from './matrix';
import {clicks, edge, edgeCounter, grid, gridCounter, check} from './streams';
import {points} from './points';
import o from 'ramda/src/o';
import all from 'ramda/src/all';
import equals from 'ramda/src/equals';
import find from 'ramda/src/find';
import reject from 'ramda/src/reject';
import tap from 'ramda/src/tap';
import whereEq from 'ramda/src/whereEq';
import {Solution} from './types';
import * as update from './update';



const inc = src => {
  const cn = elem.className;
  const state = (Number(gridNotes[elem]) + 1) % 3;
  if (isNaN(state)) {
    wm.set(elem, 1);
    elem.className += ' guess1';
  } else {
    elem.className = cn.replace(/(guess)(\d)/, 
        (_, base, n) =>  base + state);
    wm.set(elem, state);
  }
  return elem;
};

const guess = gs => pt => {
  const elem = inc(pt.src);
  if (elem.className.includes('guess2')) {
    gs.push(pt);
  } else {
    gs = reject(equals(pt), gs);
  }
  return gs;
};

const validate = (pts, gs) => gs.length === pts.length && 
                              all(pt => find(whereEq(pt), gs), pts);

const trySolve = (points, gstream) => e =>
  gstream().length !== points.length ? Solution.Impossible :
    validate(points, gstream())      ? Solution.Valid('You found the solution!') : 
                                       Solution.Invalid('Incorrect solution');

const notify = s => Solution.case({
  Valid:     alert,
  Invalid:   alert,
  Impossible: () => {}
}, s);


const onReady = () => {
  const mWidth = 10;
  const mHeight = 10;
  const m = 5;
  const pts = points(mWidth, m);

  const board = document.getElementById('board');
  board.appendChild(matrix(mWidth, mHeight));
  board.addEventListener('click', clicks);


  const edgeResults = flyd.map(o(update.edgeResult, queryOver(pts)), edge);
  flyd.on(update.edge, edgeResults);

  const qs = document.getElementById('queries');
  flyd.on(update.queries(qs), edgeCounter);

  const attempt = document.getElementById('attempt');
  attempt.addEventListener('click', check);

  const guesses = flyd.map(guess([]), grid);
  flyd.on(tap(gs => attempt.disabled = gs.length !== m), guesses);
  const solve = flyd.map(trySolve(pts, guesses), check);
  flyd.on(notify, solve);
};

document.addEventListener('DOMContentLoaded', onReady);

