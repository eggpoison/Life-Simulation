class Graph {
   constructor(size, dataPoints, stepSize, title) {
      this.size = size;
      this.title = title;
      this.dataPoints = dataPoints;
      this.stepSize = stepSize;

      this.maxPointXPercentage = 90;
      this.maxPointYPercentage = 90;

      this.element = this.createElement();

      this.plotDataPoints();
      this.createAxisLabels();
   }
   createElement() {
      const element = document.createElement("div");
      element.className = "graph";

      element.style.width = `${this.size.width}px`;
      element.style.height = `${this.size.height}px`;

      element.innerHTML = `
      <div class="title">${this.title}</div>
      `;

      return element;
   }
   plotDataPoints() {
      // Percentage of the width of the graph the last data point should reach.
      const localMaxX = (this.dataPoints.length - 1) * this.stepSize;
      const xMultiplier = this.size.width * this.maxPointXPercentage/100 /localMaxX;

      // Percentage of the height of the graph the largest data point should reach.
      const localMaxY = Math.max(...this.dataPoints);
      const yMultiplier = this.size.height * this.maxPointYPercentage/100 / localMaxY;

      for (let i = 0; i < this.dataPoints.length; i++) {
         const dataPoint = this.dataPoints[i];

         // Create a point
         const point = document.createElement("div");
         point.className = "data-point";
         this.element.appendChild(point);

         // Plot the point
         const pos = {
            x: i * this.stepSize * xMultiplier,
            y: dataPoint * yMultiplier
         };
         point.style.left = `${pos.x}px`;
         point.style.bottom = `${pos.y}px`;

         // Create a connecting line between this point and the previous one
         if (i > 0) {
            const connectingLine = document.createElement("div");
            connectingLine.className = "connecting-line";
            this.element.appendChild(connectingLine);

            const previousPos = {
               x: (i - 1) * this.stepSize * xMultiplier,
               y: this.dataPoints[i - 1] * yMultiplier
            }

            connectingLine.style.left = `${previousPos.x}px`;
            connectingLine.style.bottom = `${previousPos.y}px`;

            const dist = distanceBetweenPoints(pos, previousPos);
            connectingLine.style.width = `${dist}px`;

            const angle = angleBetweenVectors(previousPos, pos);
            connectingLine.style.transform = `rotate(${-angle}rad)`;
         }
      }
   }
   createAxisLabels() {
      // Y axis
      const localMaxY = Math.max(...this.dataPoints);
      const valueAt100 = localMaxY * 100 / this.maxPointYPercentage;

      // Create the y axis labels
      const Y_LABEL_COUNT = 7;
      for (let i = 0; i < Y_LABEL_COUNT; i++) {
         const yAxisLabel = document.createElement("div");
         yAxisLabel.className = "axis-label left-axis-label";
         yAxisLabel.style.bottom = `${(i + 1) / Y_LABEL_COUNT * 100}%`;
         this.element.appendChild(yAxisLabel);

         const labelVal = roundNum(valueAt100 / Y_LABEL_COUNT * (i + 1), 1);
         yAxisLabel.innerHTML = labelVal;
      }

      const X_LABEL_COUNT = 10;
      for (let i = 1; i <= X_LABEL_COUNT; i++) {
         const xAxisLabel = document.createElement("div");
         xAxisLabel.className = "axis-label bottom-axis-label";
         xAxisLabel.style.left = `${i / X_LABEL_COUNT * 100}%`;
         this.element.appendChild(xAxisLabel);

         const labelVal = i * this.stepSize;
         xAxisLabel.innerHTML = labelVal;
      }
   }
}