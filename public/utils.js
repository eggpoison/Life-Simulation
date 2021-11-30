function randInt(min, max) {
   return Math.floor(Math.random() * (max - min)) + min;
}
function randFloat(min, max) {
   return Math.random() * (max - min) + min;
}

function roundNum(num, dpp) {
   const power = Math.pow(10, dpp)
   return Math.round((num + Number.EPSILON) * power) / power;
}

function lerp(start, end, amount) {
   return (1 - amount) * start + amount * end;
}

function randItem(arr) {
   return arr[Math.floor(Math.random() * arr.length)];
}

function getElem(id) {
   return document.getElementById(id);
}

function distanceBetweenPoints(pos1, pos2) {
   const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
   return distance;
}

function angleBetweenVectors(pos1, pos2) {
   const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
   return angle;
}

function singularCartesianToPolar(pos) {
   return cartesianToPolar({ x: 0, y: 0}, pos);
}
function cartesianToPolar(pos1, pos2) {
   const distance = distanceBetweenPoints(pos1, pos2);
   const angle = angleBetweenVectors(pos1, pos2);
   return {
      magnitude: distance,
      direction: angle
   };
}
function polarToCartesian({ direction, magnitude }) {
   const x = Math.cos(direction) * magnitude;
   const y = Math.sin(direction) * magnitude;
   return new Vector(x, y);
}

function getDotProduct(vector1, vector2) {
   const vec1values = Object.values(vector1);
   const vec2values = Object.values(vector2);
   if (vec1values.length !== vec2values.length) {
      throw new Error("Vectors are not of equal lengths");
   }

   let dotProduct = 0;
   for (let i = 0; i < vec1values.length; i++) {
      dotProduct += vec1values[i] * vec2values[i];
   }
   return dotProduct;
}