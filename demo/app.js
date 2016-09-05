"use strict";

const GroupedBarChartSvg = require("grouped-bar-chart-svg");
const React = require("react");
const ReactDOM = require("react-dom");

const props = {
    "title": "kilo",
    "svgMargin": {"left":110,"right":50,"top":20,"bottom":30},
    "svgWidth": 200,
    "data": [{
        "category": "bulgur",
        "value": 1690,
        "groupId": "62"
    }, {
        "category": "pirinç",
        "value": 2607,
        "groupId": "62"
    }],
    "categoriesSize": 2,
    "groups": [{
        "id": "62",
        "color": "#E41A1C"
    }],
    "logaxis": false,
    "selection": ["bulgur", "pirinç"]
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartSvg, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
