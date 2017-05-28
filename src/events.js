import o from 'ramda/src/o';
import flyd from 'flyd';
import filter from 'flyd/module/filter';
import matrix from './matrix';

const clicks = flyd.stream();

const toCoords = e => ({
  x: e.target.cellIndex,
  y: e.target.parentElement.rowIndex
});

const isGrid = n => pt => 
  pt.x > 0    &&
  pt.y > 0    && 
  pt.x < n-1  && 
  pt.y < n-1;

const isCorner = n => pt => 
  (pt.x === 0   && pt.y === 0)   ||
  (pt.x === 0   && pt.y === n-1) ||
  (pt.x === n-1 && pt.y === 0)   ||
  (pt.x === n-1 && pt.y === n-1); 

const isEdge = n => pt => !isGrid(n)(pt) &&! isCorner(n)(pt);

const log = msg => point => { 
  console.log(msg); 
  console.log(point); 
  return point; 
};

const coords = flyd.map(toCoords, clicks);

const edge = flyd.map(log('edge'), filter(isEdge(10), coords));

const grid = flyd.map(log('grid'), filter(isGrid(10), coords)); 



export default function onReady() {
  const board = document.getElementById('board');
  board.appendChild(matrix(10, 10));
  board.addEventListener('click', clicks);
}
