class Vector {
   constructor(x, y) {
      this.x = x;
      this.y = y;
   }
   dotProduct(other) {
      return this.x * other.x + this.y * other.y;
   }
}

const randomPositionInCell = cellIndex => {
   const cellX = cellIndex % Game.boardSize.width;
   const cellY = Math.floor(cellIndex / Game.boardSize.height);

   const x = randFloat(0, Game.cellSize);
   const y = randFloat(0, Game.cellSize);

   return new Vector(cellX * Game.cellSize + x, cellY * Game.cellSize + y);
}
const generateRandomPosition = size => {
   const minX = size/2;
   const maxX = Game.boardSize.width * Game.cellSize - size/2;
   const x = randInt(minX, maxX);
   const minY = size/2;
   const maxY = Game.boardSize.height * Game.cellSize - size/2;
   const y = randInt(minY, maxY);

   return new Vector(x, y);
}
const generateRandomVelocity = speed => {
   const angle = randFloat(-Math.PI, Math.PI);

   const vVector = polarToCartesian({
      magnitude: speed,
      direction: angle
   });

   return vVector;
}
const calculateLifespan = (size, speed, vision) => {
   // Number of seconds that a creature will live, before modifiers are applied
   const BASE_LIFESPAN = 3;

   let lifespan = BASE_LIFESPAN * Game.tps;

   // Larger size increases lifespan
   lifespan *= size / thingAttributes.creature.minSize;

   // Higher speed decreases lifespan
   lifespan *= thingAttributes.creature.minSpeed / speed;

   // High vision decreases lifespan, low vision increases lifespan
   lifespan *= ((thingAttributes.creature.minVision + thingAttributes.creature.maxVision) / 2) / vision;

   return lifespan;
}

class Thing {
   velocity = new Vector(0, 0);

   constructor(size) {
      this.age = 0;
      this.position = generateRandomPosition(size);
      this.size = size;

      this.element = this.createElement();

      this.calculateContainingCell();
      this.updatePosition();
   }
   createElement() {
      const element = document.createElement("div");
      getElem("cell-container").appendChild(element);

      const size = `${this.size}px`;
      element.style.width = size;
      element.style.height = size;

      return element;
   }
   tick() {
      this.age++;
      if (this.age >= this.lifespan) {
         this.die();
      }

      const collision = this.isCollidingWithWall();
      if (collision === 1) {
         this.velocity.y = Math.abs(this.velocity.y);
      } else if (collision === 2) {
         this.velocity.x = -Math.abs(this.velocity.x);
      } else if (collision === 3) {
         this.velocity.y = -Math.abs(this.velocity.y);
      } else if (collision === 4) {
         this.velocity.x = Math.abs(this.velocity.x);
      }

      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;

      this.calculateContainingCell();

      this.updatePosition();
   }
   updatePosition() {
      this.element.style.left = `${this.position.x}px`;
      this.element.style.top = `${this.position.y}px`;
   }
   die() {
      this.element.remove();

      // Remove all instances of this from cellData
      for (const cell of Object.values(cellData)) {
         if (cell.includes(this)) {
            const cellIndex = cell.indexOf(this);
            cell.splice(cellIndex, 1);
         }
      }
   }
   isCollidingWithWall() {
      // 0: No collision
      // 1: Collision with top wall
      // 2: Collision with right wall
      // 3: Collision with bottom wall
      // 4: Collision with left wall

      const boardWidth = Game.cellSize * Game.boardSize.width;
      const boardHeight = Game.cellSize * Game.boardSize.height;

      // Check for collisions with top wall
      if (this.position.y - this.size/2 <= 0) return 1;

      // Check for collisions with right wall
      if (this.position.x + this.size/2 >= boardWidth) return 2;

      // Check for collisions with bottom wall
      if (this.position.y + this.size/2 >= boardHeight) return 3;

      // Check for collisions with left wall
      if (this.position.x - this.size/2 <= 0) return 4;

      // If no collisions, return false
      return false;
   }
   calculateContainingCell() {
      const cellX = Math.floor(this.position.x / Game.cellSize);
      const cellY = Math.floor(this.position.y / Game.cellSize);

      const minCellNumber = 0;
      const maxCellNumber = Game.boardSize.width * Game.boardSize.height - 1;
      const cellNumber = Math.min(Math.max(cellY * Game.boardSize.height + cellX, minCellNumber), maxCellNumber);
      this.cellNumber = cellNumber;

      // Append it to the cell data
      for (const cell of Object.values(cellData)) {
         if (cell.includes(this)) {
            const index = cell.indexOf(this);
            cell.splice(index, 1);
         }
      }

      cellData[cellNumber].push(this);
   }
   checkForCollision() {
      const cell = cellData[this.cellNumber]
      for (const thing of cell) {
         if (thing === this) continue;

         if (this.isCollidingWith(thing)) {
            return thing;
         }
      }

      // If no collisions are found, return false
      return false;
   }
   isCollidingWith(thing) {
      // Calculate the distance between this and the other thing.
      const distanceBetweenCenters = distanceBetweenPoints(this.position, thing.position);
      const distance = distanceBetweenCenters - this.size/2 - thing.size/2;

      if (distance <= 0) {
         return thing;
      }
      // If the things are not colliding, return false
      return false;
   }
   getSurroundingThings() {
      const rowOffset = Game.boardSize.width;
      const checks = [-rowOffset - 1, -rowOffset, -rowOffset + 1, -1, 0, 1, rowOffset - 1, rowOffset, rowOffset + 1];

      const cellNums = checks.map(offset => offset + this.cellNumber);

      const availableCells = cellNums.filter(cellNum => {
         const horizontalDistanceToCurrentCell = Math.abs((this.cellNumber % Game.boardSize.width) - (cellNum % Game.boardSize.width));
         if (horizontalDistanceToCurrentCell > 1) return false;

         if (cellNum < 0 || cellNum >= Game.boardSize.width * Game.boardSize.height) return false;
         return true;
      });

      const surroundingThings = availableCells.reduce((previousArray, cellNum) => {
         let cell = cellData[cellNum].slice();
         if (cell.includes(this)) {
            cell.splice(cell.indexOf(this), 1);
         }
         return previousArray.concat(cell);
      }, []);
      return surroundingThings;
   }
}

class Fruit extends Thing {
   constructor({ size }) {
      super(size);

      this.lifespan = 10 * Game.tps;

      this.createFruit();
   }
   createFruit() {
      this.element.className = "fruit";
   }
}

class Creature extends Thing {
   isMoving = false;
   constructor({ size, speed, vision }) {
      super(size);

      this.speed = speed;
      this.vision = vision;
      this.lifespan = calculateLifespan(size, speed, vision);

      this.createCreature();

      creatures.push(this);
      updateCreatureCount();
   }
   createCreature() {
      this.element.className = "creature";

      this.element.innerHTML = `
      <div class="life">
         <div class="life-bar"></div>
      </div>`;
   }
   tick() {
      this.updateLifebar();

      // Vision range in pixels
      const VISION = 60;
      // Check for fruit in vision range
      const surroundingThings = super.getSurroundingThings();
      let minFruitDistance = Number.MAX_SAFE_INTEGER;
      let closestFruit = false;
      for (const thing of surroundingThings) {
         if (thing instanceof Fruit) {
            const distanceToFruit = distanceBetweenPoints(this.position, thing.position) + thing.size/2;
            if (distanceToFruit <= VISION && distanceToFruit < minFruitDistance) {
               closestFruit = thing;
               minFruitDistance = distanceToFruit;
            }
         }
      }
      if (closestFruit && !this.isMoving) {
         this.targetPosition = closestFruit.position;
         this.moveToTargetPosition();
      }

      // Only move if the creature isn't searching for fruit.
      if (!closestFruit) {
         // Chance for the creature to move each second
         const MOVE_CHANCE = 0.5;
         if (!this.isMoving && Math.random() <= MOVE_CHANCE / Game.tps) {
            this.generateRandomSurroundingPosition();
            this.moveToTargetPosition();
            // this.generateTargetPosition();
         }
      }

      if (this.targetPosition && this.hasReachedTargetPosition()) {
         this.reachTargetPosition();
      }

      super.tick();

      const collidingThing = this.checkForCollision();
      if (collidingThing !== false) {
         if (collidingThing instanceof Fruit) {
            this.eatFruit(collidingThing);
         }
      }
   }
   eatFruit(fruit) {
      fruit.die();

      // The number of seconds of life that the fruit will provide.
      const FRUIT_FEED_AMOUNT = 50;

      const feedAmount = FRUIT_FEED_AMOUNT * Game.tps;
      this.age -= Math.min(feedAmount, this.age);
   }
   updateLifebar() {
      const lifebar = this.element.querySelector(".life-bar");

      const lifebarWidth = 100 - this.age / this.lifespan * 100;
      lifebar.style.width = `${lifebarWidth}%`;
      lifebar.style.backgroundColor = `rgb(${lifebarWidth * 2.55}, 0, 0)`;
   }
   die() {
      super.die();

      const creatureIndex = creatures.indexOf(this);
      creatures.splice(creatureIndex, 1);
      updateCreatureCount();
   }
   generateRandomSurroundingPosition() {
      // Pick a random cell around the one the creature is in.
      const offset = Game.boardSize.width;
      const possibleCells = [-offset - 1, -offset, -offset + 1, -1, 1, offset - 1, offset, offset + 1];
      const possibleCellIndexes = possibleCells.map(cellNum => cellNum + this.cellNumber).filter(num => {
         const cellSpot = this.cellNumber % Game.boardSize.width;
         const targetCellSpot = num % Game.boardSize.width;
         if (Math.abs(cellSpot - targetCellSpot) > 1) {
            return false;
         }

         return num >= 0 && num < Game.boardSize.width * Game.boardSize.height;
      });

      const targetCellIndex = randItem(possibleCellIndexes);
      this.targetPosition = randomPositionInCell(targetCellIndex);
   }
   moveToTargetPosition() {
      this.isMoving = true;

      // Do the calculations to actually move
      // Convert from cartesian to polar coordinates
      const polarCoords = cartesianToPolar(this.position, this.targetPosition);

      const distance = distanceBetweenPoints(this.position, this.targetPosition);

      const nextPolarPosition = {
         magnitude: polarCoords.magnitude / distance * this.speed,
         direction: polarCoords.direction
      }

      const cartesianCoords = polarToCartesian(nextPolarPosition);
      this.velocity = cartesianCoords;
   }
   generateTargetPosition() {

      // Pick a random cell around the one the creature is in.
      const offset = Game.boardSize.width;
      const possibleCells = [-offset - 1, -offset, -offset + 1, -1, 1, offset - 1, offset, offset + 1];
      const possibleCellIndexes = possibleCells.map(cellNum => cellNum + this.cellNumber).filter(num => {
         const cellSpot = this.cellNumber % Game.boardSize.width;
         const targetCellSpot = num % Game.boardSize.width;
         if (Math.abs(cellSpot - targetCellSpot) > 1) {
            return false;
         }

         return num >= 0 && num < Game.boardSize.width * Game.boardSize.height;
      });

      const targetCellIndex = randItem(possibleCellIndexes);
      this.targetPosition = randomPositionInCell(targetCellIndex);

      // Do the calculations to actually move
      // Convert from cartesian to polar coordinates
      const polarCoords = cartesianToPolar(this.position, this.targetPosition);

      const distance = distanceBetweenPoints(this.position, this.targetPosition);

      const nextPolarPosition = {
         magnitude: polarCoords.magnitude / distance * this.speed,
         direction: polarCoords.direction
      }

      const cartesianCoords = polarToCartesian(nextPolarPosition);
      this.velocity = cartesianCoords;
   }
   hasReachedTargetPosition() {
      const relativeTargetPos = {
         x: this.position.x - this.targetPosition.x,
         y: this.position.y - this.targetPosition.y
      };

      const dotProduct = this.velocity.dotProduct(relativeTargetPos);
      return dotProduct > 0;
   }
   reachTargetPosition() {
      this.isMoving = false;

      this.velocity = new Vector(0, 0);

      this.targetPosition = false;
   }
}