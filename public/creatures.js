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
   const cellY = Math.floor(cellIndex / Game.boardSize.width);

   const x = randFloat(0, Game.cellSize);
   const y = randFloat(0, Game.cellSize);

   return new Vector(cellX * Game.cellSize + x, cellY * Game.cellSize + y);
}
function generateRandomPosition(size) {
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
   const BASE_LIFESPAN = 10;

   let lifespan = BASE_LIFESPAN * Game.tps;

   // Larger size increases lifespan
   const SIZE_WEIGHT = 1;
   lifespan *= Math.pow(size / thingAttributes.creature.size.min, SIZE_WEIGHT);

   // Higher speed decreases lifespan
   const SPEED_WEIGHT = 1;
   lifespan *= Math.pow(thingAttributes.creature.speed.min / speed, SPEED_WEIGHT);

   // High vision decreases lifespan, low vision increases lifespan
   const VISION_WEIGHT = 1;
   lifespan *= Math.pow(((thingAttributes.creature.vision.min + thingAttributes.creature.vision.max) / 2) / vision, VISION_WEIGHT);

   return lifespan;
}
const getColour = (size, speed, mutability) => {
   const r = randInt(0, size / thingAttributes.creature.size.max * 256);
   const g = randInt(0, speed / thingAttributes.creature.speed.max * 256);
   const b = randInt(0, mutability / thingAttributes.creature.mutability.max * 256);

   return `rgb(${r}, ${g}, ${b})`;
}

const getRandomGenes = (creature1, creature2) => {
   const newGenes = {};

   const averageMutability = (creature1.mutability + creature2.mutability) / 2;

   const attributeNames = Object.keys(thingAttributes.creature);
   for (let i = 0; i < attributeNames.length; i++) {
      const attributeName = attributeNames[i];

      // Inherit the gene from a random parent.
      let geneValue;
      if (Math.random() < 0.5) {
         geneValue = creature1[attributeName];
      } else {
         geneValue = creature2[attributeName];
      }

      // Chance for the gene to mutate slightly
      // The chance of mutation, and the amount it mutates, is directly proportional to the parents' mutability.
      if (Math.random() <= averageMutability) {
         const geneInfo = thingAttributes.creature[attributeName];
         const target = randFloat(geneInfo.min, geneInfo.max);
         const mutatedGeneValue = lerp(geneValue, target, averageMutability);
         geneValue = mutatedGeneValue;
      }

      newGenes[attributeName] = geneValue;
   }

   return newGenes;
}

async function handleReproduction(creature1, creature2) {
   await startReproduction(creature1, creature2)
   .then(async () => await finishReproduction(creature1, creature2))
   .then(async () => await giveBirth(creature1, creature2));
}

async function startReproduction(creature1, creature2) {
   return new Promise(resolve => {
      creature1.isReproducing = true;
      creature2.isReproducing = true;
      creature1.element.classList.add("is-reproducing");
      creature2.element.classList.add("is-reproducing");

      resolve();
   });
}

function finishReproduction(creature1, creature2) {
   const REPRODUCTION_TIME = 2;
   return new Promise(resolve => {
      setTimeout(() => {
         creature1.isReproducing = false;
         creature2.isReproducing = false;
         creature1.reproductiveUrge = 0;
         creature2.reproductiveUrge = 0;
         creature1.partner = false;
         creature2.partner = false;
         creature1.element.classList.remove("is-reproducing");
         creature2.element.classList.remove("is-reproducing");

         resolve();
      }, REPRODUCTION_TIME * 1000);
   });
}

function giveBirth(creature1, creature2) {
   const INCUBATION_TIME = 5;
   return new Promise(() => {
      setTimeout(() => {
         const newPosition = Object.assign({}, creature1.position);
         const genes = getRandomGenes(creature1, creature2);
         const creature = createCreature(newPosition, genes);
      }, INCUBATION_TIME * 1000);
   });
}

function trackCreature(creature) {
   getElem("creature-tracker").classList.remove("hidden");
   Game.trackedCreature = creature;
}
function updateTrackedCreature() {
   const creature = Game.trackedCreature;
   getElem("creature-tracker").innerHTML = `
   <p>Name: ${creature.name}</p>
   <p>Wants to reproduce: ${creature.wantsToReproduce()}</p>
   <p>Current action: ${creature.currentAction}
   <h2>Genes</h2>
   <p>Size: ${creature.size}</p>
   <p>Speed: ${creature.speed}</p>
   <p>Vision: ${creature.vision}</p>`;
}
function hideCreatureTracker() {
   getElem("creature-tracker").classList.add("hidden");
}

class Thing {
   velocity = new Vector(0, 0);

   constructor(position, size) {
      this.age = 0;
      this.position = position;
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
         return;
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
            break;
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
      const cellNumber = Math.min(Math.max(cellY * Game.boardSize.width + cellX, minCellNumber), maxCellNumber);
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
   // checkForCollision() {
   //    const cell = cellData[this.cellNumber]
   //    for (const thing of cell) {
   //       if (thing === this) continue;

   //       if (this.isCollidingWith(thing)) {
   //          return thing;
   //       }
   //    }

   //    // If no collisions are found, return false
   //    return false;
   // }
   isCollidingWith(thing) {
      const dist = distanceBetweenPoints(this.position, thing.position);

      // Return true if the two things are colliding, and false otherwise
      return dist - this.size/2 - thing.size/2 <= 0;
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
      super(generateRandomPosition(size), size);

      this.lifespan = 10 * Game.tps;

      this.createFruit();
   }
   tick() {
      super.tick();

      const redness = 255 - this.age / this.lifespan * 255;
      this.element.style.backgroundColor = `rgb(${redness}, 0, 0)`;
   }
   createFruit() {
      this.element.className = "fruit";
   }
}

// Names of the creatures, one will be randomly chosen for each creature
const CREATURE_NAMES = ["Bleeeeergh", "Bloop", "Zug", "Gnark", "Bherk", "Tubak", "Uug", "Glurb", "Ghulk", "Zuubit"];
class Creature extends Thing {
   isMoving = false;
   constructor(position, { size, speed, vision, reproductiveRate, mutability }) {
      super(position, size);

      this.name = randItem(CREATURE_NAMES);
      this.speed = speed;
      this.vision = vision;
      this.lifespan = calculateLifespan(size, speed, vision);
      this.mutability = mutability;

      this.partner = false;
      this.canSeePartner = false;
      this.isReproducing = false;
      this.reproductiveUrge = 0;
      this.reproductiveRate = reproductiveRate;

      this.colour = getColour(size, speed, mutability);

      this.createCreature();

      updateCreatureCount();
   }
   updateReproductiveUrgeBar() {
      this.element.querySelector(".reproductive-urge-bar").style.width = `${this.reproductiveUrge}%`;
   }
   createCreature() {
      this.element.className = "creature";
      
      this.element.style.backgroundColor = this.colour;
      this.element.style.setProperty("--vision-size", `${this.vision}px`);

      this.element.innerHTML = `
      <div class="reproductive-urge">
         <div class="reproductive-urge-bar"></div>
      </div>
      <div class="life">
         <div class="life-bar"></div>
      </div>`;

      this.element.addEventListener("click", () => {
         trackCreature(this);
      });
   }
   tick() {
      if (!this.isReproducing) {
         const URGE_PER_SECOND = 2;
         const deltaUrge = URGE_PER_SECOND / Game.tps * this.reproductiveRate;
         this.reproductiveUrge += deltaUrge;
         this.reproductiveUrge = Math.min(this.reproductiveUrge, 100);
      }

      this.updateReproductiveUrgeBar();
      this.updateLifebar();

      const surroundingThings = super.getSurroundingThings();

      // If this creature wants to reproduce, search for any other creatures within its vision who also want to reproduce and move towards them.
      const wantsToReproduce = this.wantsToReproduce();
      if (wantsToReproduce) {
         const nearbyCreatures = surroundingThings.filter(thing => thing instanceof Creature);
         for (const creature of nearbyCreatures) {
            if (creature.wantsToReproduce()) {
               const distanceToCreature = distanceBetweenPoints(this.position, creature.position);

               if (distanceToCreature <= this.vision) {
                  this.canSeePartner = true;
                  this.partner = creature;
                  this.currentAction = "Moving to partner";
                  
                  this.targetPosition = creature.position;
                  this.moveToTargetPosition();
               }
            }
         }
      }
      
      // If possible, find the closest fruit within the creature's vision.
      let closestFruit = false;
      if (!this.canSeePartner) {
         // Check for fruit in vision range
         let minFruitDistance = Number.MAX_SAFE_INTEGER;

         const nearbyFruits = surroundingThings.filter(thing => thing instanceof Fruit);
         for (const fruit of nearbyFruits) {
            const distanceToFruit = distanceBetweenPoints(this.position, fruit.position);
            if (this.canSeeThing(fruit, distanceToFruit) && distanceToFruit < minFruitDistance) {
               closestFruit = fruit;
               minFruitDistance = distanceToFruit;
            }
         }
      }

      // If the creature can see a fruit and is not reproducing, move to it
      if (closestFruit) {
         this.targetPosition = closestFruit.position;
         this.moveToTargetPosition();
         this.currentAction = "Moving to fruit";
      }
      // Move to a random position if the creature can't see any fruit or a partner.
      else if (!this.canSeePartner) {
         this.currentAction = "Moving to random position";

         // Chance for the creature to move each second
         const MOVE_CHANCE = 0.99;
         if (!this.isMoving && Math.random() <= MOVE_CHANCE / Game.tps) {
            this.generateRandomSurroundingPosition();
            this.moveToTargetPosition();
         }
      }

      if (this.targetPosition && this.hasReachedTargetPosition()) {
         this.reachTargetPosition();
      }

      super.tick();

      // Check for collisions with other things
      for (const thing of surroundingThings) {
         if (super.isCollidingWith(thing)) {
            if (thing === this.partner && !this.isReproducing) {
               handleReproduction(this, this.partner);
            } else if (thing instanceof Fruit) {
               this.eatFruit(thing);
            }
         }
      }
   }
   canSeeThing(thing, distance) {
      const distanceBetweenThings = distance - thing.size/2;
      return distanceBetweenThings <= this.vision;
   }
   wantsToReproduce() {
      return this.reproductiveUrge >= this.life;
   }
   eatFruit(fruit) {
      fruit.die();

      // The number of seconds of life that the fruit will provide.
      const FRUIT_FEED_AMOUNT = 50;

      const feedAmount = FRUIT_FEED_AMOUNT * Game.tps;
      this.age -= Math.min(feedAmount, this.age);
   }
   get life() {
      return 100 - this.age / this.lifespan * 100;
   }
   updateLifebar() {
      const lifebar = this.element.querySelector(".life-bar");

      const lifebarWidth = this.life;
      lifebar.style.width = `${lifebarWidth}%`;
      lifebar.style.backgroundColor = `rgb(${lifebarWidth * 2.55}, 0, 0)`;
   }
   die() {
      super.die();

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