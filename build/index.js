"use strict";

const { EventEmitterMixin } = require("event-emitter-mixin");
const React = require("react"),
      Component = EventEmitterMixin(React.Component),
      PropTypes = React.PropTypes;
const ReactDOM = require("react-dom");
const d3 = require("d3");
const autoIncrement = require("autoincrement");
const toPx = require("@yavuzmester/css-length-to-px");
const _ = require("underscore");

const propTypes = {
    title: PropTypes.string,
    svgMargin: PropTypes.shape({
        left: PropTypes.number.isRequired,
        right: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        bottom: PropTypes.number.isRequired
    }).isRequired,
    svgWidth: PropTypes.number.isRequired,
    data: PropTypes.arrayOf(PropTypes.shape({
        category: PropTypes.string.isRequired,
        categoryTitle: PropTypes.string,
        value: PropTypes.number.isRequired,
        percentageValue: PropTypes.number.isRequired,
        groupId: PropTypes.string.isRequired
    }).isRequired).isRequired,
    categoriesSize: PropTypes.number,
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired
    }).isRequired).isRequired,
    showPercentageValue: PropTypes.bool,
    logScale: PropTypes.bool,
    selection: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
};

const defaultProps = {
    title: "",
    showPercentageValue: false,
    logScale: false
};

/**
 * A note for selection.on usage in D3:
 *   If an event listener was already registered for the same type on the selected element,
 *   the existing listener is removed before the new listener is added.
 *   We are calling selection.on multiple times (at componentDidUpdate)
 *   and it does not cause the callback to be called multiple times (that"s what we want there).
 */
class GroupedBarChart extends Component {
    constructor(props) {
        super(props);
        this.onBarClicked = this.onBarClicked.bind(this);
        this.onTitleClicked = this.onTitleClicked.bind(this);
    }

    _valueOfDatum(d /*: object */) {
        const { showPercentageValue } = this.props;
        return showPercentageValue ? d.percentageValue : d.value;
    }

    divWidth() {
        const { svgWidth, svgMargin } = this.props;
        return svgWidth + svgMargin.left + svgMargin.right;
    }

    categoriesSize() {
        const { data } = this.props;
        return _.uniq(data.map(d => d.category)).length;
    }

    svgHeight() {
        const { groups } = this.props,
              categoriesSize = this.categoriesSize(),
              groupSize = groups.length,
              barHeight = toPx(GroupedBarChart.barHeightScale(groupSize));

        return categoriesSize * barHeight * groupSize;
    }

    divHeight() {
        const { svgMargin } = this.props,
              svgHeight = this.svgHeight();

        return svgMargin.top + svgHeight + svgMargin.bottom;
    }

    barColorIfSelected(datum /*: object */) {
        const { groups } = this.props;
        return groups.find(g => g.id === datum.groupId).color;
    }

    barColor(datum /*: object */) {
        const { selection } = this.props;
        return selection.includes(datum.category) ? this.barColorIfSelected(datum) : "gray";
    }

    categoryTitleColor(datum /*: object */) {
        const { selection } = this.props;
        return selection.includes(datum.category) ? "white" : "gray";
    }

    xDomain() {
        const { data, logScale } = this.props;
        return [!logScale ? 0 : 1, d3.max(data, d => this._valueOfDatum(d))];
    }

    xRange() {
        const { svgWidth } = this.props;
        return [0, svgWidth];
    }

    xScale() {
        const { logScale } = this.props,
              xDomain = this.xDomain(),
              xRange = this.xRange();

        if (!logScale) {
            return d3.scaleLinear().domain(xDomain).range(xRange);
        } else {
            return d3.scaleLog().domain(xDomain).range(xRange);
        }
    }

    xAxis() {
        const { showPercentageValue } = this.props,
              xScale = this.xScale();

        return !showPercentageValue ? d3.axisBottom(xScale).ticks(3, ",.0s") : d3.axisBottom(xScale).ticks(3).tickFormat(t => t + "%");
    }

    y0Domain() {
        const { data } = this.props;
        return data.map(d => d.category);
    }

    y0Scale() {
        const y0Domain = this.y0Domain(),
              yRange = this.yRange();

        return d3.scaleBand().domain(y0Domain).rangeRound(yRange).padding(0.05);
    }

    y1Domain() {
        const { data } = this.props;
        return _.uniq(data.map(d => this.barColorIfSelected(d)));
    }

    y1Scale() {
        const y1Domain = this.y1Domain(),
              y0Scale = this.y0Scale();

        return d3.scaleBand().domain(y1Domain).rangeRound([0, y0Scale.bandwidth()]);
    }

    yRange() {
        const svgHeight = this.svgHeight();
        return [0, svgHeight];
    }

    yAxis() {
        const y0Scale = this.y0Scale();
        return d3.axisLeft(y0Scale);
    }

    render() {
        const { svgMargin, title, data } = this.props,
              divWidth = this.divWidth(),
              divHeight = this.divHeight(),
              svgHeight = this.svgHeight(),
              xScale = this.xScale(),
              y0Scale = this.y0Scale(),
              y1Scale = this.y1Scale();

        return (
            /* Margin convention in D3: https://gist.github.com/mbostock/3019563 */
            React.createElement(
                "div",
                { className: "category-chart" },
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
                            data.map(d => {
                                return React.createElement(
                                    "rect",
                                    { key: autoIncrement,
                                        className: "bar",
                                        x: "0",
                                        y: y0Scale(d.category) + y1Scale(this.barColorIfSelected(d)),
                                        width: xScale(this._valueOfDatum(d)),
                                        height: y1Scale.bandwidth(),
                                        style: { fill: this.barColor(d) },
                                        onClick: e => this.onBarClicked(Object.assign({ category: d.category }, e)) },
                                    React.createElement(
                                        "title",
                                        null,
                                        this._valueOfDatum(d)
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
            )
        );
    }

    componentDidMount() {
        this.componentDidMountOrUpdate();
    }

    componentDidUpdate() {
        this.componentDidMountOrUpdate();
    }

    componentDidMountOrUpdate() {
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
        yAxisNode.selectAll(".tick").on("click", category => this.onBarClicked(Object.assign({ category: category }, d3.event)));

        //adjust the y axis label colors (Caution: avoid nested selections in d3, as it expects the data to be nested as well)
        yAxisNode.selectAll(".tick text").data(data).style("fill", d => this.categoryTitleColor(d)).html(d => d.categoryTitle || d.category);
    }

    onBarClicked(e /*: object */) {
        const { shiftKey /*: boolean */, category /*: string */ } = e,
              { selection } = this.props;

        const newSelection = shiftKey ? _.without(selection, category) : selection.concat([category]);

        this.emit("bar-click", { newSelection: newSelection });
    }

    onTitleClicked() {
        this.emit("title-click");
    }
} //end of GroupedBarChart component def

GroupedBarChart.propTypes = propTypes;
GroupedBarChart.defaultProps = defaultProps;
GroupedBarChart.barHeightScale = d3.scaleLinear().domain([1, 11]).range(["2.5ch", "0.5ch"]).clamp(true);

module.exports = GroupedBarChart;
