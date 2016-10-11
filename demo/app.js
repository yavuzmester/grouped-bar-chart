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
    "categoryTitles": [
        {
            category: "hazelnut",
            categoryTitle: "adana"
        },
        {
            category: "peanut",
            categoryTitle: "ankara"
        }
    ],
    "showPercentageValue": true,
    "logScale": false,
    "selection": ["hazelnut", "peanut"]
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartHorizontal, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
