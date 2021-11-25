const creatures = [];
const creatureCounts = [];

const cellData = {};

const thingAttributes = {
   creature: {
      minSize: 10,
      maxSize: 30,
      minSpeed: 5,
      maxSpeed: 10,
      minVision: 50,
      maxVision: 100
   }
};

const Game = {
   tick: 0,
   tps: 20,
   boardSize: {
      width: 10,
      height: 10
   },
   cellSize: 60,
   creatureSpawnChance: 0.5
};

const getRandomPosition = () => {
   const x = randInt(0, Game.boardSize.width * Game.cellSize);
   const y = randInt(0, Game.boardSize.height * Game.cellSize);
   return { x: x, y: y };
}

const updateAverageCreatureCount = () => {
   let average = 0;
   for (const count of creatureCounts) {
      average += count;
   }
   average /= creatureCounts.length;

   getElem("average-creature-count").innerHTML = `Average: ${roundNum(average, 2)}`;
}

function createCreature() {
   const attributes = {
      size: randFloat(thingAttributes.creature.minSize, thingAttributes.creature.maxSize),
      speed: randFloat(thingAttributes.creature.minSpeed, thingAttributes.creature.maxSpeed),
      vision: randFloat(thingAttributes.creature.minVision, thingAttributes.creature.maxVision)
   }

   // Make larger creatures slower
   // Make this higher to more harshly punish speed for having size
   const SPEED_REDUCTION_MULTIPLIER = 1.1;
   attributes.speed /= Math.pow(attributes.size / 10, SPEED_REDUCTION_MULTIPLIER);

   const creature = new Creature(attributes);
}

function createFruit() {
   const attributes = {
      size: 10
   };
   const fruit = new Fruit(attributes);
}

function tick() {
   Game.tick++;

   const spawnChance = Game.creatureSpawnChance / Game.tps;

   // for (const creature of creatures) {
   //    creature.tick();
   // }
   for (const cell of Object.values(cellData)) {
      for (const thing of cell) {
         thing.tick();
      }
   }

   if (Math.random() <= spawnChance) {
      createCreature();
   }

   const FRUIT_SPAWN_CHANCE = 2.5;
   if (Math.random() <= FRUIT_SPAWN_CHANCE / Game.tps) {
      createFruit();
   }

   if (Game.tick % Game.tps === 0) {
      creatureCounts.push(creatures.length);
      if (creatureCounts.length >= 5) {
         creatureCounts.splice(0, 1);
      }
      updateAverageCreatureCount();
   }
}

function updateCreatureCount() {
   const creatureCount = creatures.length;
   const suffix = creatureCount !== 1 ? "s" : "";
   const displayText = `${creatureCount} creature${suffix}`;
   getElem("creature-count").innerHTML = displayText;
}

function setup() {
   document.body.style.setProperty("--cell-size", `${Game.cellSize}px`);

   const cellContainer = getElem("cell-container");
   cellContainer.style.width = Game.cellSize * Game.boardSize.width + "px";
   cellContainer.style.height = Game.cellSize * Game.boardSize.height + "px";
   
   // Create the cells
   for (let i = 0; i < Game.boardSize.height; i++) {
      const cellRow = document.createElement("div");
      cellRow.className = "cell-row";
      cellContainer.appendChild(cellRow);

      for (let k = 0; k < Game.boardSize.width; k++) {
         const cell = document.createElement("div");
         cell.className = "cell";
         cellRow.appendChild(cell);
      }      
   }

   // Create cell dictionary
   for (let i = 0; i < Game.boardSize.height; i++) {
      for (let k = 0; k < Game.boardSize.width; k++) {
         const cellIndex = i * Game.boardSize.height + k;
         cellData[cellIndex] = [];
      }
   }

   // Game loop
   setInterval(tick, 1000 / Game.tps);

   // Setup the create creature button
   getElem("create-creature-button").addEventListener("click", () => {
      createCreature();
   });
}