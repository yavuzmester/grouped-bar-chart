const React = require("react");
const ReactDOM = require("react-dom");
const GroupedBarChartSvg = require("grouped-bar-chart-svg");

setTimeout(() => {
    ReactDOM.render(React.createElement(GroupedBarChartSvg), document.getElementById("root"));
}, 100);
