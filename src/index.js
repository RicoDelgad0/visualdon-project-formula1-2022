import { csv } from "d3-fetch";
import { select, selectAll } from "d3-selection";
import { mean, min, max, range, extent, ascending, histogram } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { scaleLinear, scaleOrdinal, scaleBand } from "d3-scale";
import { line, symbol, symbolStar, pie, arc } from "d3-shape";
import { schemeSet2 } from "d3-scale-chromatic";
import { transition } from "d3-transition";
import anime from "animejs/lib/anime.es.js";

// Récupération de toutes les données
async function getData() {
  const data = csv("../data/f1_drivers_points.csv");
  return data;
}

// Récupération des infos d'un pilote
async function getDriverInfo(driver) {
  const data = await getData();
  const driverInfo = data.find((d) => d.driver === driver);
  return driverInfo;
}

// Dropdown pilotes
const pilotesDropdown = document.getElementById("pilotesDropdown");

async function populateDropdown() {
  const drivers = await getData();
  drivers.forEach((driver) => {
    const option = document.createElement("option");
    option.value = driver.driver;
    option.text = driver.driver;
    pilotesDropdown.appendChild(option);
  });
}
populateDropdown();

// Card info by driver selected
const piloteCardImage = document.getElementById("piloteCardImage");
const piloteCardName = document.getElementById("piloteCardName");
const piloteCardNationality = document.getElementById("piloteCardNationality");
const piloteCardAge = document.getElementById("piloteCardAge");

async function piloteCardPopulate() {
  pilotesDropdown.addEventListener("change", async (e) => {
    const driver = await getDriverInfo(e.target.value);
    piloteCardImage.src = `../img/${driver.driver.replace(/\s/g, "")}.jpg`;
    piloteCardName.innerText = driver.driver;
    piloteCardNationality.innerText = driver.nationality;
    piloteCardAge.innerText = driver.age + " ans";
  });
}
piloteCardPopulate();

// histogramme des points par pilote
var margin = { top: 30, right: 30, bottom: 70, left: 60 },
  width = 560 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;

// Label points du pilote on hover
var Tooltip = select("#graphe2")
  .append("div")
  .style("opacity", 0)
  .attr("class", "tooltip")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px")
  .style("position", "absolute");

// append the svg object to the body of the page
var svg = select("#graphe2")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

async function buildHistogram() {
  const data = await getData();
  // X axis
  var x = scaleBand()
    .range([0, width])
    .domain(
      data.map(function (d) {
        return d.driver;
      })
    )
    .padding(0.2);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  // Add Y axis
  var y = scaleLinear().domain([0, 500]).range([height, 0]);
  svg.append("g").call(axisLeft(y));

  // Bars
  svg
    .selectAll("mybar")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(d.driver);
    })
    .attr("y", function (d) {
      return y(d.points);
    })
    .attr("width", x.bandwidth())
    .attr("height", function (d) {
      return height - y(d.points);
    })
    .attr("name", function (d) {
      return d.driver;
    })
    .attr("style", "fill: #69b3a2")
    .on("mouseover", function (event, d) {
      return Tooltip.style("opacity", 1);
    })
    .on("mousemove", function (event, d) {
      return Tooltip.html(`Nombre de points : ${d.points}`)
        .style("left", `${event.layerX + 10}px`)
        .style("top", `${event.layerY}px`);
    })
    .on("mouseleave", function (event, d) {
      return Tooltip.style("opacity", 0);
    });

  svg.select("rect[name='Max Verstappen']").style("fill", "red");
}
buildHistogram();

// colore la barre du pilote sélectionné en rouge
pilotesDropdown.addEventListener("change", async (e) => {
  // clear all bars color
  const bars = document.querySelectorAll("rect");
  bars.forEach((bar) => {
    bar.style.fill = "#69b3a2";
  });
  const driver = await getDriverInfo(e.target.value);
  const bar = document.querySelector(`rect[name="${driver.driver}"]`);
  bar.style.fill = "red";

  // update pie chart
  const dnf = await getDnfByDriver(driver.driver);
  const pieChart = document.querySelector("#graphique");
  pieChart.innerHTML = "";
  buildPieChart(dnf);

  //update pit stop
  getPitStopByDriver(driver.driver);
  clockPitStop.innerHTML = driver.pitstop / 1000 + "s";
});

// Récupère le nombre de dnf par pilote
async function getDnfByDriver(driver) {
  const data = await getData();
  const driverInfo = data.find((d) => d.driver === driver);
  return driverInfo.dnf;
}

// pie chart des dnf par pilote
async function buildPieChart(dnf) {
  // set the dimensions and margins of the graph
  const widthPieChart = 450,
    heightPieChart = 450,
    marginPieChart = 40;

  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  const radiusPieChart =
    Math.min(widthPieChart, heightPieChart) / 2 - marginPieChart;

  // append the svg object to the div called 'my_dataviz'
  const svgPieChart = select("#graphique")
    .append("svg")
    .attr("width", widthPieChart)
    .attr("height", heightPieChart)
    .append("g")
    .attr(
      "transform",
      `translate(${widthPieChart / 2}, ${heightPieChart / 2})`
    );

  // Create dummy data
  var DnfPilot = (dnf / 20) * 100;
  var FinishedPilot = ((20 - dnf) / 20) * 100;
  var cleanDataPieChart = { a: DnfPilot, b: FinishedPilot };

  // set the color scale
  const colorPieChart = scaleOrdinal().range(["#FF0000", "#69b3a2"]);

  // Compute the position of each group on the pie:
  const pieChart = pie().value(function (d) {
    return d[1];
  });
  const data_readyPieChart = pieChart(Object.entries(cleanDataPieChart));

  // Now I know that group A goes from 0 degrees to x degrees and so on.

  const arcGenerator = arc().innerRadius(0).outerRadius(radiusPieChart);

  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  svgPieChart
    .selectAll("mySlices")
    .data(data_readyPieChart)
    .join("path")
    .attr("d", arcGenerator)
    .attr("fill", function (d) {
      return colorPieChart(d.data[0]);
    });
  //.style("opacity", 0.7);

  // Now add the annotation. Use the centroid method to get the best coordinates
  svgPieChart
    .selectAll("mySlices")
    .data(data_readyPieChart)
    .join("text")
    .text(function (d) {
      return d.data[1] + "%";
    })
    .attr("transform", function (d) {
      return `translate(${arcGenerator.centroid(d)})`;
    })
    .style("text-anchor", "middle")
    .style("font-size", 25)
    .style("fill", "white")
    .style("font-weight", "bold");
}
buildPieChart(await getDnfByDriver("Max Verstappen"));

// get Pit-Stop time by driver
async function getPitStopByDriver(driver) {
  const data = await getData();
  const driverInfo = data.find((d) => d.driver === driver);
  return driverInfo.pitstop;
}

const pilotePitStop = document.getElementById("pilotePitStop");

// set width and height
const divsize = document.getElementById("graphe3");
const Wpitstop = divsize.offsetWidth - 135;
console.log(Wpitstop);

// Animation pit-stop
async function pitStopAnimation(driver) {
  var tl = anime.timeline({
    easing: "linear",
  });

  // Add children
  tl.add({
    targets: pilotePitStop,
    translateX: 0,
    duration: 100,
  })
    .add({
      targets: pilotePitStop,
      translateX: Wpitstop / 2,
      duration: 800,
      delay: 500,
    })
    .add({
      targets: pilotePitStop,
      background: "rgb(255,0,0)",
      duration: 1,
    })
    .add({
      targets: pilotePitStop,
      translateX: Wpitstop / 2,
      duration: driver.pitstop,
    })
    .add({
      targets: pilotePitStop,
      background: "rgb(132,204,22)",
      duration: 1,
    })
    .add({
      targets: pilotePitStop,
      translateX: Wpitstop,
      duration: 800,
    });
}
const buttonPitStop = document.getElementById("buttonPitStop");
const clockPitStop = document.getElementById("clockPitStop");

buttonPitStop.addEventListener("click", async (e) => {
  const driver = await getDriverInfo(pilotesDropdown.value);
  pitStopAnimation(driver);
});
