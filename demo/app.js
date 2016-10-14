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
    "categories": [
        {
            category: "hazelnut",
            title: "adana"
        },
        {
            category: "peanut",
            title: "ankara"
        }
    ],
    "selection": [
        "hazelnut",
        "peanut"
    ],
    "data": [{
        "category": "hazelnut",
        "value": 1000,
        "color": "red"
    }, {
        "category": "peanut",
        "value": 1000,
        "color": "red"
    },{
        "category": "hazelnut",
        "value": 1000,
        "color": "green"
    }, {
        "category": "peanut",
        "value": 2000,
        "color": "green"
    }],
    "showPercentageValue": true,
    "logScale": false
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartHorizontal, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
