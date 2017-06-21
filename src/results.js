import {div, button, p} from 'rdom';

const vis = (id, dir) => {
  var s = document.getElementById(id);
  s.style.display = (dir === 'show') ? 'block' : '';
};

const clean = id => {
  var node = document.getElementById(id);
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
  return node;
};

const mkElem = s => div({className: 'solutionMessage'}, [
  p({className: 'msg'}, [s]),
  button({id: 'ok'}, ['OK'])
]);

export const hide = _ => {
  vis('screen', 'hide');
  vis('msgWrap', 'hide');
};

export const show = s => {
  clean('msgWrap').appendChild(mkElem(s)); 
  vis('screen', 'show');
  vis('msgWrap', 'show');
};
