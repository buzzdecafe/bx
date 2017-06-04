import flyd from 'flyd';
import {queryOver} from './init';
import matrix from './matrix';
import {clicks, edge, grid} from './events';
import {points} from './points';
import o from 'ramda/src/o';
import {Ray, Point} from './types';


const getElem = (board, attrs, pt) => {
  const tr = board.querySelector('tr:nth-child(' + (pt.y + 1) + ')');
  const td = tr.querySelector('td:nth-child(' + (pt.x + 1) + ')');
  td.className += attrs.className;
  if (attrs.textContent) td.textContent = attrs.textContent;
  return td;
};

const toDom = board => (ray, point) => {
  return Ray.case({
    Hit:        ()  => getElem(board, {className: ' hit'}, point),
    Reflection: ()  => getElem(board, {className: ' reflect'}, point),
    Exit:       (p) => getElem(board, {className: ' selected', textContent: p.id}, point)
  }, ray);
};

const show = (board, dom) => ray => dom(ray, {x: ray[0].x, y: ray[0].y});

const guess = x => x;

const onReady = () => {
  const board = document.getElementById('board');
  board.appendChild(matrix(10, 10));
  board.addEventListener('click', clicks);

  const result = o(show(board, toDom(board)), queryOver(points));

  flyd.map(result, edge);
  flyd.map(guess, grid);
};

document.addEventListener('DOMContentLoaded', onReady);

