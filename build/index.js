"use strict";

const React = require("react");
const ReactDOM = require("react-dom");
const d3 = require("d3");
const autoIncrement = require("autoincrement");
const toPx = require("css-length-to-px");
const EventEmitter = require("events").EventEmitter;
const _ = require("underscore");

/**
 * A note for selection.on usage in D3:
 *   If an event listener was already registered for the same type on the selected element,
 *   the existing listener is removed before the new listener is added.
 *   We are calling selection.on multiple times (at componentDidUpdate)
 *   and it does not cause the callback to be called multiple times (that"s what we want there).
 */
const GroupedBarChartSvg = React.createClass({
    propTypes: {
        title: React.PropTypes.string.isRequired,
        svgMargin: React.PropTypes.shape({
            left: React.PropTypes.number.isRequired,
            right: React.PropTypes.number.isRequired,
            top: React.PropTypes.number.isRequired,
            bottom: React.PropTypes.number.isRequired
        }).isRequired,
        svgWidth: React.PropTypes.number.isRequired,
        divWidth: React.PropTypes.number.isRequired,
        data: React.PropTypes.arrayOf(React.PropTypes.shape({
            category: React.PropTypes.string.isRequired,
            categoryTitle: React.PropTypes.string,
            value: React.PropTypes.number.isRequired,
            groupId: React.PropTypes.string.isRequired
        }).isRequired).isRequired,
        categoriesSize: React.PropTypes.number.isRequired,
        groups: React.PropTypes.arrayOf(React.PropTypes.shape({
            groupId: React.PropTypes.string.isRequired,
            groupColor: React.PropTypes.string.isRequired
        }).isRequired).isRequired,
        logaxis: React.PropTypes.bool.isRequired,
        selection: React.PropTypes.arrayOf(React.PropTypes.string.isRequired).isRequired
    },

    statics: {
        barHeightScale: d3.scaleLinear().domain([1, 11]).range(["2.5ch", "0.5ch"]).clamp(true)
    },

    svgHeight: function () {
        const { categoriesSize, groups } = this.props,
              groupSize = groups.length,
              barHeight = toPx(GroupedBarChartSvg.barHeightScale(groupSize));

        return categoriesSize * barHeight * groupSize;
    },

    divHeight: function () {
        const { svgMargin } = this.props,
              svgHeight = this.svgHeight();

        return svgMargin.top + svgHeight + svgMargin.bottom;
    },

    barColorIfSelected: function (datum /*: object */) {
        const { groups } = this.props;
        return _.find(groups, g => g.groupId === datum.groupId).groupColor;
    },

    barColor: function (datum /*: object */) {
        const { selection } = this.props;
        return _.contains(selection, datum.category) ? this.barColorIfSelected(datum) : "gray";
    },

    categoryTitleColor: function (datum /*: object */) {
        const { selection } = this.props;
        return _.contains(selection, datum.category) ? "white" : "gray";
    },

    xDomain: function () {
        const { data, logaxis } = this.props;
        return [!logaxis ? 0 : 1, d3.max(data, d => d.value)];
    },

    xRange: function () {
        const { svgWidth } = this.props;
        return [0, svgWidth];
    },

    xScale: function () {
        const { logaxis } = this.props,
              xDomain = this.xDomain(),
              xRange = this.xRange();

        if (!logaxis) {
            return d3.scaleLinear().domain(xDomain).range(xRange);
        } else {
            return d3.scaleLog().domain(xDomain).range(xRange);
        }
    },

    xAxis: function () {
        const xScale = this.xScale();
        return d3.axisBottom(xScale).ticks(3, ",.0s");
    },

    y0Domain: function () {
        const { data } = this.props;
        return _.map(data, d => d.category);
    },

    y0Scale: function () {
        const y0Domain = this.y0Domain(),
              yRange = this.yRange();

        return d3.scaleBand().domain(y0Domain).rangeRound(yRange).padding(0.05);
    },

    y1Domain: function () {
        const { data } = this.props;
        return _.uniq(_.map(data, d => this.barColorIfSelected(d)));
    },

    y1Scale: function () {
        const y1Domain = this.y1Domain(),
              y0Scale = this.y0Scale();

        return d3.scaleBand().domain(y1Domain).rangeRound([0, y0Scale.bandwidth()]);
    },

    yRange: function () {
        const svgHeight = this.svgHeight();
        return [0, svgHeight];
    },

    yAxis: function () {
        const y0Scale = this.y0Scale();
        return d3.axisLeft(y0Scale);
    },

    render: function () {
        const { svgMargin, divWidth, title, data } = this.props,
              divHeight = this.divHeight(),
              svgHeight = this.svgHeight(),
              xScale = this.xScale(),
              y0Scale = this.y0Scale(),
              y1Scale = this.y1Scale();

        return (
            /* Margin convention in D3: https://gist.github.com/mbostock/3019563 */
            React.createElement(
                "svg",
                { width: divWidth, height: divHeight },
                React.createElement(
                    "g",
                    { className: "margin axis", transform: "translate(" + svgMargin.left + "," + svgMargin.top + ")" },
                    React.createElement("g", { className: "x axis", transform: "translate(0," + svgHeight + ")" }),
                    React.createElement(
                        "g",
                        { className: "y axis", transform: "translate(0,0)" },
                        _.map(data, d => {
                            return React.createElement(
                                "rect",
                                { key: autoIncrement,
                                    className: "bar",
                                    x: "0",
                                    y: y0Scale(d.category) + y1Scale(this.barColorIfSelected(d)),
                                    width: xScale(d.value),
                                    height: y1Scale.bandwidth(),
                                    style: { fill: this.barColor(d) },
                                    onClick: e => this.onBarClicked(Object.assign({ category: d.category }, e)) },
                                React.createElement(
                                    "title",
                                    null,
                                    d.value
                                )
                            );
                        })
                    ),
                    React.createElement(
                        "text",
                        { y: "-5", onClick: this.onTitleClicked },
                        React.createElement(
                            "tspan",
                            { className: "category-chart-title" },
                            title
                        ),
                        React.createElement(
                            "title",
                            null,
                            "Click title to toggle between alphabetical and numerical sorting."
                        )
                    )
                )
            )
        );
    },

    componentDidMount: function () {
        this.componentDidMountOrUpdate();
    },

    componentDidUpdate: function () {
        this.componentDidMountOrUpdate();
    },

    componentDidMountOrUpdate: function () {
        const { data } = this.props,
              xAxis = this.xAxis(),
              yAxis = this.yAxis();

        const marginAxisNode = d3.select(ReactDOM.findDOMNode(this)).select("g.margin.axis"),
              xAxisNode = marginAxisNode.select("g.x.axis"),
              yAxisNode = marginAxisNode.select("g.y.axis");

        //update axes
        xAxisNode.call(xAxis);
        yAxisNode.call(yAxis);

        //make the y axis labels clickable
        yAxisNode.selectAll(".tick").on("click", category => this.onBarClicked(Object.assign({ category: d.category }, d3.event)));

        //adjust the y axis label colors (Caution: avoid nested selections in d3, as it expects the data to be nested as well)
        yAxisNode.selectAll(".tick text").data(data).style("fill", d => this.categoryTitleColor(d)).html(d => d.categoryTitle || d.category);
    },

    onBarClicked: function (e /*: object */) {
        const { shiftKey /*: boolean */, category /*: string */ } = e,
              { selection } = this.props;

        const newSelection = shiftKey ? _.without(selection, category) : _.union(selection, [category]);

        this.emit("bar-click", { newSelection: newSelection });
    },

    onTitleClicked: function () {
        this.emit("title-click");
    }
}); //end of GroupedBarChartSvg def

Object.assign(GroupedBarChartSvg.prototype, EventEmitter.prototype);

module.exports = GroupedBarChartSvg;
