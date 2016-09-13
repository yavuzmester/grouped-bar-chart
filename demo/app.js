"use strict";

const GroupedBarChart = require("@yavuzmester/grouped-bar-chart");
const React = require("react");
const ReactDOM = require("react-dom");

const props = {
    "title": "kilo",
    "svgMargin": {"left":110,"right":50,"top":20,"bottom":30},
    "svgWidth": 200,
    "data": [{
        "category": "bulgur",
        "value": 3500,
        "percentageValue": 35,
        "groupId": "62"
    }, {
        "category": "pirinç",
        "value": 6500,
        "percentageValue": 65,
        "groupId": "62"
    }],
    "categoriesSize": 2,
    "groups": [{
        "id": "62",
        "color": "#E41A1C"
    }],
    "showPercentageValue": false,
    "logScale": false,
    "selection": ["bulgur", "pirinç"]
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChart, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
