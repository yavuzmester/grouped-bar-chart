"use strict";

const GroupedBarChartHorizontal = require("@ttlabs/grouped-bar-chart-horizontal");
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
        "color": "red",
        "value": 1000,
        "percentageValue": 50
    }, {
        "category": "peanut",
        "color": "red",
        "value": 1000,
        "percentageValue": 50
    },{
        "category": "hazelnut",
        "color": "green",
        "value": 1000,
        "percentageValue": 33.33
    }, {
        "category": "peanut",
        "color": "green",
        "value": 2000,
        "percentageValue": 66.67
    }],
    "datumPropForBar": "value",
    "logScale": false
};

setTimeout(() => {
    const gbc = ReactDOM.render(React.createElement(GroupedBarChartHorizontal, props), document.getElementById("root"));
    gbc.on("title-click", () => console.log("title-click"));
}, 100);
