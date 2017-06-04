import flyd from 'flyd';
import {queryOver} from './init';
import matrix from './matrix';
import {clicks, edge, grid} from './streams';
import {points} from './points';
import o from 'ramda/src/o';
import {Ray} from './types';


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

const guess = pt => {
  const _ = inc(pt.src);
  return pt;
};

const onReady = () => {
  const board = document.getElementById('board');
  board.appendChild(matrix(10, 10));
  board.addEventListener('click', clicks);

  const result = o(show(board), queryOver(points(10, 5)));

  flyd.map(result, edge);
  flyd.map(guess, grid);
};

document.addEventListener('DOMContentLoaded', onReady);

