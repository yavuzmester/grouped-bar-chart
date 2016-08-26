"use strict";

const GroupedBarChartSvg = require("grouped-bar-chart-svg");
const React = require("react");
const ReactDOM = require("react-dom");

const props = {
    "title": "bearercode",
    "svgMargin": {"left":110,"right":50,"top":20,"bottom":30},
    "svgWidth": 200,
    "divWidth": 360,
    "data": [{
        "category": "2G",
        "value": 1690,
        "groupId": "62"
    }, {
        "category": "3G",
        "value": 2607,
        "groupId": "62"
    }],
    "categoriesSize": 2,
    "groups": [{
        "groupId": "62",
        "groupColor": "#E41A1C"
    }],
    "logaxis": false,
    "selection": ["2G", "3G"]
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartSvg, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
