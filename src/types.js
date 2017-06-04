import Type from 'union-type';

const isCoord = n => n >= 0 && n <= 9;

export const Point = Type({
  Point: {
    x: isCoord, 
    y: isCoord, 
    id: String,
    src: Object
  }
});

export const Ray = Type({
  Hit: [Point],
  Reflection: [Point],
  Exit: [Point, Point]
});

export const id = (function() {
  var counter = 64;
  return () => {
    counter += 1;
    return String.fromCharCode(counter);
  };
}());

