import flyd from 'flyd';
import {queryOver} from './init';
import matrix from './matrix';
import {clicks, edge, grid, check} from './streams';
import {points} from './points';
import o from 'ramda/src/o';
import all from 'ramda/src/all';
import equals from 'ramda/src/equals';
import find from 'ramda/src/find';
import reject from 'ramda/src/reject';
import tap from 'ramda/src/tap';
import whereEq from 'ramda/src/whereEq';
import {Ray, Solution} from './types';


const getElem = (board, attrs, pt) => {
  const tr = board.querySelector('tr:nth-child(' + (pt.y + 1) + ')');
  const td = tr.querySelector('td:nth-child(' + (pt.x + 1) + ')');
  td.className += attrs.className;
  pt.src.className += attrs.className;
  if (attrs.textContent) {
    td.textContent = attrs.textContent;
    pt.src.textContent = attrs.textContent;
  }
  return td;
};

const show = board => ray => Ray.case({
    Hit:        (from)  => getElem(board, {className: ' hit'}, from),
    Reflection: (from)  => getElem(board, {className: ' reflection'}, from),
    Exit:       (from, to) => getElem(board, {className: ' selected', textContent: from.id}, to)
  }, ray);



const wm = new WeakMap();

const inc = elem => {
  const cn = elem.className;
  const state = (Number(wm.get(elem)) + 1) % 3;
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
    validate(points, gstream())      ? Solution.Valid      : 
                                       Solution.Invalid('Incorrect solution');

const notify = s => Solution.case({
  Valid:      () => alert('You found the solution!'),
  Invalid:   (m) => alert(m),
  Impossible: () => console.log('nothing to see here')
}, s);

const onReady = () => {
  const board = document.getElementById('board');
  board.appendChild(matrix(10, 10));
  board.addEventListener('click', clicks);

  const m = 5;
  const pts = points(10, m);
  const result = o(show(board), queryOver(pts));

  const _ = flyd.map(result, edge);
  const guesses = flyd.map(guess([]), grid);


  const attempt = document.getElementById('attempt');
  flyd.map(tap(gs => attempt.disabled = gs.length !== m), guesses);
  attempt.addEventListener('click', check);
  flyd.map(notify, flyd.map(trySolve(pts, guesses), check));
};

document.addEventListener('DOMContentLoaded', onReady);

