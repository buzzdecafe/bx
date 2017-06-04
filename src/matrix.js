import range from 'ramda/src/range';
import {table, tr, td} from 'rdom';

const cell = (cls) => () => td({className: 'cell ' + cls}, []);

const toRow = (edgeClass, innerClass) => x => tr({className: 'boardRow'}, 
  [cell(edgeClass)()]
    .concat(range(0, x-2).map(cell(innerClass)))
    .concat([cell(edgeClass)()])
  );

const edgeRow = toRow('corner', 'edgeCell');
const row = toRow('edgeCell', 'gridCell');

export default function matrix(x, y) { 
  return table({className: 'board'}, 
    [edgeRow(x)]
      .concat(range(0, y-2).map((_) => row(x)))
      .concat([edgeRow(x)])
    );
}
