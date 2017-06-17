import flyd from 'flyd';
import {queryOver} from './query';
import matrix from './matrix';
import {clicks, edge, edgeCounter, grid, gridCounter, check} from './streams';
import {points} from './points';
import o from 'ramda/src/o';
import * as update from './update';


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

  const attempt = document.getElementById('attempt');
  attempt.addEventListener('click', check);
  const certains = flyd.map(update.certains, guess)
  flyd.on(cs => attempt.disabled = cs.length !== m, certains);

  const solve = flyd.map(update.trySolve(pts, certains), check);
  flyd.on(update.notify, solve);
};

document.addEventListener('DOMContentLoaded', onReady);

