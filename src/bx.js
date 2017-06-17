import flyd from 'flyd';
import {queryOver} from './query';
import matrix from './matrix';
import {clicks, edge, edgeCounter, grid, gridCounter, check} from './streams';
import {points} from './points';
import o from 'ramda/src/o';
import pipe from 'ramda/src/pipe';
import all from 'ramda/src/all';
import equals from 'ramda/src/equals';
import find from 'ramda/src/find';
import filter from 'ramda/src/filter';
import reject from 'ramda/src/reject';
import tap from 'ramda/src/tap';
import whereEq from 'ramda/src/whereEq';
import {Solution} from './types';
import * as update from './update';



const validate = (pts, gs) => gs.length === pts.length && 
                              all(pt => find(whereEq(pt), gs), pts);

const trySolve = (points, gct) => e =>
  gct() !== points.length       ? Solution.Impossible :
  validate(points, gstream())   ? Solution.Valid('You found the solution!') : 
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

  const guess = flyd.map(update.takeGuess, grid);
  flyd.on(update.grid, guess);
  const guessCount = flyd.map(update.certainCount, guess)

  const attempt = document.getElementById('attempt');
  attempt.addEventListener('click', check);
  flyd.on(n => attempt.disabled = n !== m, guessCount);

  const solve = flyd.map(trySolve(pts, guessCount), check);
  flyd.on(notify, solve);
};

document.addEventListener('DOMContentLoaded', onReady);

