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
    Reflection: (from)  => getElem(board, {className: ' reflect'}, from),
    Exit:       (from, to) => getElem(board, {className: ' selected', textContent: from.id}, to)
  }, ray);

const guess = x => x;

const onReady = () => {
  const board = document.getElementById('board');
  board.appendChild(matrix(10, 10));
  board.addEventListener('click', clicks);

  const result = o(show(board), queryOver(points));

  flyd.map(result, edge);
  flyd.map(guess, grid);
};

document.addEventListener('DOMContentLoaded', onReady);

