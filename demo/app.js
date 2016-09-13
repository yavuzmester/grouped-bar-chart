"use strict";

const GroupedBarChartHorizontal = require("@yavuzmester/grouped-bar-chart-horizontal");
const React = require("react");
const ReactDOM = require("react-dom");

const props = {
    "title": "kilo",
    "divWidth": 360,
    "svgMargin": {
        "left": 110,
        "right": 50,
        "top": 20,
        "bottom": 30
    },
    "data": [{
        "category": "hazelnut",
        "value": 3500,
        "percentageValue": 35,
        "groupId": "62"
    }, {
        "category": "peanut",
        "value": 6500,
        "percentageValue": 65,
        "groupId": "62"
    }],
    "categoriesSize": 2,
    "groups": [
        {
            "id": "62",
            "color": "#E41A1C"
        }
    ],
    "showPercentageValue": false,
    "logScale": false,
    "selection": ["hazelnut", "peanut"]
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartHorizontal, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
