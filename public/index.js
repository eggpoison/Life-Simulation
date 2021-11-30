const geneSamples = [];

const creatureCounts = [];

const cellData = {};

const thingAttributes = {
   creature: {
      size: {
         min: 10,
         max: 30
      },
      speed: {
         min: 5,
         max: 10
      },
      vision: {
         min: 25,
         max: 75
      },
      reproductiveRate: {
         min: 0.3,
         max: 3
      },
      mutability: {
         min: 0.01,
         max: 0.99
      }
   }
};

const Game = {
   tick: 0,
   tps: 20,
   boardSize: {
      width: 50,
      height: 35
   },
   cellSize: 60,
   creatureSpawnChance: 0.5,
   trackedCreature: null,
   scale: 0.33,
   canvasPosition: [],
   canvasZoom: 1,
   secondsBetweenSamples: 2,
   graphGeneName: null
};

const getRandomPosition = () => {
   const x = randInt(0, Game.boardSize.width * Game.cellSize);
   const y = randInt(0, Game.boardSize.height * Game.cellSize);
   return new Vector(x, y);
}

const updateAverageCreatureCount = () => {
   let average = 0;
   for (const count of creatureCounts) {
      average += count;
   }
   average /= creatureCounts.length;

   getElem("average-creature-count").innerHTML = `Average: ${roundNum(average, 2)}`;
}

const getRandomAttributes = () => {
   return {
      size: randFloat(thingAttributes.creature.size.min, thingAttributes.creature.size.max),
      speed: randFloat(thingAttributes.creature.speed.min, thingAttributes.creature.speed.max),
      vision: randFloat(thingAttributes.creature.vision.min, thingAttributes.creature.vision.max),
      reproductiveRate: randFloat(thingAttributes.creature.reproductiveRate.min, thingAttributes.creature.reproductiveRate.max),
      mutability: randFloat(thingAttributes.creature.mutability.min, thingAttributes.creature.mutability.max)
   };
}
function createCreature(position, attributes) {
   const creatureAttributes = attributes === "random" ? getRandomAttributes() : attributes;

   const creaturePosition = position === "random" ? generateRandomPosition(creatureAttributes.size) : position;

   // Make larger creatures slower
   // Make this higher to more harshly punish speed for having size
   const SPEED_REDUCTION_MULTIPLIER = 1.1;
   attributes.speed /= Math.pow(attributes.size / 10, SPEED_REDUCTION_MULTIPLIER);

   return new Creature(creaturePosition, creatureAttributes);
}

function createFruit() {
   const attributes = {
      size: 10
   };
   const fruit = new Fruit(attributes);
}

function takeGeneSample() {
   let genePool = Object.keys(thingAttributes.creature).reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue]:0 };
   }, {});

   // Find the sum of the values of all the genes
   let creatureCount = 0;
   for (const cell of Object.values(cellData)) {
      for (const creature of cell) {
         if (creature instanceof Creature) {
            creatureCount++;

            // Loop through each one of the creature's genes and add them to the pool
            const geneNames = Object.keys(genePool);
            for (const geneName of geneNames) {
               genePool[geneName] += creature[geneName];
            }
         }
      }
   }

   // If there are no creatures, return an empty gene pool
   if (creatureCount === 0) {
      genePool = Object.entries(genePool).reduce((previousValue, currentValue) => {
         return { ...previousValue, [currentValue[0]]: 0 };
      }, {});
      geneSamples.push(genePool);
      return;
   }

   // Convert the gene pool from sums to averages
   genePool = Object.entries(genePool).reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue[0]]: currentValue[1] / creatureCount };
   }, {});

   geneSamples.push(genePool);

   if (Game.graphGeneName !== null) {
      drawGraph(Game.graphGeneName);
   }
}

function tick() {
   Game.tick++;

   if ((Game.tick / Game.tps) % Game.secondsBetweenSamples === 0) {
      takeGeneSample();
   }

   for (const cell of Object.values(cellData)) {
      for (const thing of cell) {
         thing.tick();
      }
   }

   // The number of fruit that spawn (adjusted to the Game tps and scale)
   const FRUIT_SPAWN_RATE = 0.03;
   const adjustedSpawnRate = FRUIT_SPAWN_RATE * Game.boardSize.width * Game.boardSize.height / Game.tps;
   for (let i = 0; i < adjustedSpawnRate; i++) {
      createFruit();
   }

   if (Game.tick % Game.tps === 0) {
      creatureCounts.push(getCreatureCount());
      if (creatureCounts.length >= 5) {
         creatureCounts.splice(0, 1);
      }
      updateAverageCreatureCount();
   }

   if (Game.trackedCreature !== null) {
      updateTrackedCreature();
   }
}

window.addEventListener("click", e => {
   if (!e.target.classList.contains("creature")) {
      Game.trackedCreature = null;
      hideCreatureTracker();
   }
});

function getCreatureCount() {
   const creatureCount = Object.values(cellData).reduce((previousValue, cell) => {
      const creatures = cell.filter(thing => thing instanceof Creature);
      return previousValue + creatures.length;
   }, 0);
   return creatureCount;
}

function updateCreatureCount() {
   const creatureCount = getCreatureCount();

   const suffix = creatureCount !== 1 ? "s" : "";
   const displayText = `${creatureCount} creature${suffix}`;
   getElem("creature-count").innerHTML = displayText;
}

function setup() {
   document.body.style.setProperty("--cell-size", `${Game.cellSize}px`);

   const cellContainer = getElem("cell-container");
   cellContainer.style.width = Game.cellSize * Game.boardSize.width + "px";
   cellContainer.style.height = Game.cellSize * Game.boardSize.height + "px";
   cellContainer.style.transform = `scale(${Game.scale}, ${Game.scale}) translate(-${50 / Game.scale}%, -${50 / Game.scale}%)`;
   
   // Create the cells
   for (let i = 0; i < Game.boardSize.height; i++) {
      const cellRow = document.createElement("div");
      cellRow.className = "cell-row";
      cellContainer.appendChild(cellRow);

      for (let k = 0; k < Game.boardSize.width; k++) {
         const cell = document.createElement("div");
         cell.className = `cell cell-${(i + k) % 2 + 1}`;
         cellRow.appendChild(cell);

         // Add the cell to the cell dictionary
         const cellIndex = i * Game.boardSize.width + k;
         cellData[cellIndex] = [];
      }      
   }

   // Game loop
   setInterval(tick, 1000 / Game.tps);

   // Setup the create creature button
   getElem("create-creature-button").addEventListener("click", () => {
      createCreature("random", "random");
   });

   Game.canvasPosition = new Vector(0, 0);

   setupGraphs();
}

const updateCanvas = () => {
   const zoom = Game.scale * Game.canvasZoom;

   const xPos = 50 + Game.canvasPosition.x;
   const yPos = 50 + Game.canvasPosition.y;

   getElem("cell-container").style.transform = `translate(-${xPos}%, -${yPos}%) scale(${zoom}, ${zoom})`;
}

function moveCanvas(direction) {
   const scrollAmount = 1;

   switch (direction) {
      case "up":
         Game.canvasPosition.y -= scrollAmount;
         break;
      case "right":
         Game.canvasPosition.x += scrollAmount;
         break;
      case "down":
         Game.canvasPosition.y += scrollAmount;
         break;
      case "left":
         Game.canvasPosition.x -= scrollAmount;
         break;
   }

   updateCanvas();
}

function zoomCanvas(direction) {
   const zoomAmount = 0.1;
   switch (direction) {
      case "in":
         Game.canvasZoom *= 1 - zoomAmount;
         break;
      case "out":
         Game.canvasZoom /= 1 - zoomAmount;
         break;
   }

   updateCanvas();
}

function handleKeyPress() {
   const e = window.event;
   
   const key = e.key;
   let shouldPreventDefault = false;
   switch (key) {
      case "ArrowUp":
         moveCanvas("up");
         shouldPreventDefault = true;
         break;
      case "ArrowRight":
         moveCanvas("right");
         shouldPreventDefault = true;
         break;
      case "ArrowDown":
         moveCanvas("down");
         shouldPreventDefault = true;
         break;
      case "ArrowLeft":
         moveCanvas("left");
         shouldPreventDefault = true;
         break;
      case "=":
         zoomCanvas("out");
         shouldPreventDefault = true;
         break;
      case "-":
         zoomCanvas("in");
         shouldPreventDefault = true;
         break;
   }

   if (shouldPreventDefault) {
      e.preventDefault();
   }
}

window.onkeydown = handleKeyPress;

function drawGraph(geneName) {
   Game.graphGeneName = geneName;

   const graphContainer = getElem("graph-container");

   // Remove any previous graphs
   const previousGraph = graphContainer.querySelector(".graph");
   if (previousGraph) previousGraph.remove();

   const dataPoints = geneSamples.map(genePool => genePool[geneName]);

   const graphSize = {
      width: 300,
      height: 200
   };

   const graphName = `${geneName} over time`;
   const graph = new Graph(graphSize, dataPoints, Game.secondsBetweenSamples, graphName);
   graphContainer.appendChild(graph.element);
}

function setupGraphs() {
   const dropdown = getElem("graph-dropdown");

   for (const creatureAttribute of Object.entries(thingAttributes.creature)) {
      // Create the select option for the attribute
      const selectOption = document.createElement("option");
      dropdown.appendChild(selectOption);
      selectOption.text = creatureAttribute[0];
   }

   dropdown.addEventListener("change", () => {
      const currentGraphName = dropdown.value;
      drawGraph(currentGraphName);
   });
}