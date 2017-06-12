import chain from 'ramda/src/chain';
import times from 'ramda/src/times';
import {div} from 'rdom';

const pid = (x, y) => 'pt-' + x + '-' + y;
const inc = n => n + 1;

const cell = (cls, x, y) => div({id: pid(x, y), className: 'cell ' + cls}, []);

const toRow = (edgeClass, innerClass) => (width, rowIdx) => 
  [cell(edgeClass, 0, rowIdx)]
    .concat(times(inc, width-2).map(x => cell(innerClass, x, rowIdx)))
    .concat([cell(edgeClass, width-1, rowIdx)]);

const edgeRow = toRow('corner', 'edgeCell');
const row = toRow('edgeCell', 'gridCell');

export default function matrix(width, height) { 
  return div({className: 'board'}, 
    edgeRow(width, 0)
      .concat(chain(_y => row(width, _y), times(inc, height-2)))
      .concat(edgeRow(width, height-1))
    );
}
