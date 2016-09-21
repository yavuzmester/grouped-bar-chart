"use strict";

const {EventEmitterMixin} = require("event-emitter-mixin");
const React = require("react"),
    Component = EventEmitterMixin(React.Component),
    PropTypes = React.PropTypes;
const ReactDOM = require("react-dom");
const d3 = require("d3");
const autoIncrement = require("autoincrement");
const toPx = require("@yavuzmester/css-length-to-px");
const _ = require("underscore");
const calculatePercentage = (value, total) => Number((100 * value / total).toFixed(2));

const propTypes = {
    title: PropTypes.string,
    divWidth: PropTypes.number.isRequired,
    svgMargin: PropTypes.shape({
        left: PropTypes.number.isRequired,
        right: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        bottom: PropTypes.number.isRequired
    }).isRequired,
    data: PropTypes.arrayOf(
        PropTypes.shape({
            category: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            groupId: PropTypes.string.isRequired
        }).isRequired
    ).isRequired,
    categoryTitles: PropTypes.shape({
        category: PropTypes.string,
        categoryTitle: PropTypes.string
    }),
    groups: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            color: PropTypes.string.isRequired
        }).isRequired
    ).isRequired,
    groupIdsToSum: PropTypes.arrayOf(
        PropTypes.string.isRequired
    ),
    groupSumColor: PropTypes.string,
    showPercentageValue: PropTypes.bool,
    logScale: PropTypes.bool,
    alphaOrder: PropTypes.bool,
    selection: PropTypes.arrayOf(
        PropTypes.string.isRequired
    ).isRequired
};

const defaultProps = {
    title: "",
    categoryTitles: {},
    groupIdsToSum: [],
    showPercentageValue: false,
    logScale: false,
    alphaOrder: false
};

/**
 * A note for selection.on usage in D3:
 *   If an event listener was already registered for the same type on the selected element,
 *   the existing listener is removed before the new listener is added.
 *   We are calling selection.on multiple times (at componentDidUpdate)
 *   and it does not cause the callback to be called multiple times (that"s what we want there).
 */
class GroupedBarChartHorizontal extends Component {
    constructor(props) {
        super(props);
        this.onBarClicked = this.onBarClicked.bind(this);
        this.onTitleClicked = this.onTitleClicked.bind(this);
    }

    groups() /*: array<object> */ {
        const {groups, groupSumColor} = this.props;

        return groups.concat(
            groupSumColor ?
                [
                    {
                        id: "group-sum",
                        color: groupSumColor
                    }
                ] :
                []
        );
    }

    groupTotals() /*: object */ {
        const {data} = this.props;

        const groupedData /*: object */ = _.groupBy(data, d => d.groupId);

        return Object.keys(groupedData).reduce((memo, groupId) => {
            const groupData /*: array<object> */ = groupedData[groupId];
            memo[groupId] = groupData.reduce((memo, gd) => memo + gd.value, 0);
            return memo;
        }, {});
    }

    groupSumData(groupIdsToSum /*: array<string> */) /*: array<object> */ {
        if (groupIdsToSum.length == 0) {
            return [];
        }
        else {
            const {data} = this.props;

            const groupedData /*: object */ = _.groupBy(data, d => d.category);

            return _.map(groupedData, (groupData, category) => {
                return {
                    category: category,
                    value: groupData.filter(d => groupIdsToSum.indexOf(d.groupId) >= 0).
                        reduce((memo, gd) => memo + gd.value, 0),
                    groupId: "group-sum"
                };
            });
        }
    }

    data() /*: array<object> */ {
        const {data, groupIdsToSum, showPercentageValue, alphaOrder} = this.props;

        const groupSumData = this.groupSumData(groupIdsToSum);

        if (!showPercentageValue) {
            return this._sortData(
                data.concat(groupSumData),
                alphaOrder
            );
        }
        else {
            const groupTotals = this.groupTotals();

            return this._sortData(
                data.map(d => {
                    const total = groupTotals[d.groupId];

                    return Object.assign({percentageValue: calculatePercentage(d.value, total)}, d);
                }).concat(
                    groupSumData.map(d => {
                        return Object.assign({percentageValue: 100}, d);
                    })
                ),
                alphaOrder
            );
        }
    }

    _sortData(data /*: array<object> */, alphaOrder /*: boolean> */) /*: array<object> */ {
        if (alphaOrder) {
            return _.sortBy(data, d => this.categoryTitle(d.category));
        }
        else {
            return _.sortBy(data, d => -1 * (d.groupId === "group-sum" ? -Infinity : d.value));
        }
    }

    svgWidth() /*: number */ {
        const {divWidth, svgMargin} = this.props;
        return divWidth - svgMargin.left - svgMargin.right;
    }

    categories() /*: array<string> */ {
        const data = this.data();
        return _.uniq(data.map(d => d.category));
    }

    categoriesSize() /*: number */ {
        return this.categories().length;
    }

    svgHeight() /*: number */ {
        const groups = this.groups(),
            categoriesSize = this.categoriesSize(),
            groupSize = groups.length,
            barHeight = toPx(GroupedBarChartHorizontal.barHeightScale(groupSize));

        return categoriesSize * barHeight * groupSize;
    }

    divHeight() /*: number */ {
        const {svgMargin} = this.props,
            svgHeight = this.svgHeight();

        return svgMargin.top + svgHeight + svgMargin.bottom;
    }

    barColorIfSelected(datum /*: object */) /*: string */ {
        const groups = this.groups();
        return groups.find(g => g.id === datum.groupId).color;
    }

    barColor(datum /*: object */) /*: string */ {
        const {selection} = this.props;
        return selection.includes(datum.category) ? this.barColorIfSelected(datum) : "gray";
    }

    categoryTitle(category /*: string */) /*: string */ {
        const {categoryTitles} = this.props;
        return categoryTitles[category] || category;
    }

    categoryTitleColor(category /*: string */) /*: string */ {
        const {selection} = this.props;
        return selection.includes(category) ? "white" : "gray";
    }

    xDomain() /*: array<number> */ {
        const data = this.data(),
            {showPercentageValue, logScale} = this.props;

        return [!logScale ? 0 : 1, d3.max(data, d => showPercentageValue ? d.percentageValue : d.value)];
    }

    xRange() /*: array<number> */ {
        const svgWidth = this.svgWidth();
        return [0, svgWidth];
    }

    xScale() /*: function */ {
        const {logScale} = this.props,
            xDomain = this.xDomain(),
            xRange = this.xRange();

        if (!logScale) {
            return d3.scaleLinear().domain(xDomain).range(xRange);
        }
        else {
            return d3.scaleLog().domain(xDomain).range(xRange);
        }
    }

    xAxis() /*: function */ {
        const {showPercentageValue} = this.props,
            xScale = this.xScale();

        return !showPercentageValue ?
            d3.axisBottom(xScale).ticks(3, ",.0s") :
            d3.axisBottom(xScale).ticks(3).tickFormat(t => t + "%");
    }

    y0Domain() /*: array<string> */ {
        const data = this.data();
        return data.map(d => d.category);
    }

    y0Scale() /*: function */ {
        const y0Domain = this.y0Domain(),
            yRange = this.yRange();

        return d3.scaleBand().domain(y0Domain).rangeRound(yRange).padding(0.05);
    }

    y1Domain() /*: array<string> */ {
        const data = this.data();
        return _.uniq(data.map(d => this.barColorIfSelected(d)));
    }

    y1Scale() /*: function */ {
        const y1Domain = this.y1Domain(),
            y0Scale = this.y0Scale();

        return d3.scaleBand().domain(y1Domain).rangeRound([0, y0Scale.bandwidth()]);
    }

    yRange() /*: array<number> */ {
        const svgHeight = this.svgHeight();
        return [0, svgHeight];
    }

    yAxis() /*: function */ {
        const y0Scale = this.y0Scale();
        return d3.axisLeft(y0Scale);
    }

    render() {
        const data = this.data(),
            {title, divWidth, svgMargin, showPercentageValue} = this.props,
            divHeight = this.divHeight(),
            svgHeight = this.svgHeight(),
            xScale = this.xScale(),
            y0Scale = this.y0Scale(),
            y1Scale = this.y1Scale();

        return (
            /* Margin convention in D3: https://gist.github.com/mbostock/3019563 */
            <div className="category-chart">
                <svg width={divWidth} height={divHeight}>
                    <g className="margin axis" transform={"translate(" + svgMargin.left + "," + svgMargin.top + ")"}>
                        <g className="x axis" transform={"translate(0," + svgHeight + ")"}/>

                        <g className="y axis" transform={"translate(0,0)"}>
                            {
                                data.map(d => {
                                    return (
                                        <rect key={autoIncrement}
                                            className="bar"
                                            x="0"
                                            y={y0Scale(d.category) + y1Scale(this.barColorIfSelected(d))}
                                            width={xScale(showPercentageValue ? d.percentageValue : d.value)}
                                            height={y1Scale.bandwidth()}
                                            style={{fill: this.barColor(d)}}
                                            onClick={e => this.onBarClicked(Object.assign({category: d.category}, e))}>

                                            <title>{d.value + "\n%" + d.percentageValue}</title>
                                        </rect>
                                    );
                                })
                            }
                        </g>

                        <text y="-5" onClick={this.onTitleClicked}>
                            <tspan className="category-chart-title">{title}</tspan>
                            <title>Click title to toggle between alphabetical and numerical sorting.</title>
                        </text>
                    </g>
                </svg>
            </div>
        );
    }

    componentDidMount() {
        this.componentDidMountOrUpdate();
    }

    componentDidUpdate() {
        this.componentDidMountOrUpdate();
    }

    componentDidMountOrUpdate() {
        const data = this.data(),
            xAxis = this.xAxis(),
            yAxis = this.yAxis();

        const marginAxisNode = d3.select(ReactDOM.findDOMNode(this)).select("g.margin.axis"),
            xAxisNode = marginAxisNode.select("g.x.axis"),
            yAxisNode = marginAxisNode.select("g.y.axis");

        //update axes
        xAxisNode.call(xAxis);
        yAxisNode.call(yAxis);

        //make the y axis labels clickable
        yAxisNode.selectAll(".tick").on("click", category => this.onBarClicked(Object.assign({category: category}, d3.event)));

        //adjust the y axis label colors (Caution: avoid nested selections in d3, as it expects the data to be nested as well)
        yAxisNode.selectAll(".tick text").data(this.categories()).
            style("fill", category => this.categoryTitleColor(category)).html(category => this.categoryTitle(category) );
    }

    onBarClicked(e /*: object */) {
        const {shiftKey /*: boolean */, category /*: string */} = e,
            {selection} = this.props;

        const newSelection = shiftKey ? _.without(selection, category) : selection.concat([category]);

        this.emit("bar-click", {newSelection: newSelection});
    }

    onTitleClicked() {
        this.emit("title-click");
    }
} //end of GroupedBarChartHorizontal component def

GroupedBarChartHorizontal.propTypes = propTypes;
GroupedBarChartHorizontal.defaultProps = defaultProps;

GroupedBarChartHorizontal.barHeightScale = d3.scaleLinear().domain([1, 11]).range(["2.5ch", "0.5ch"]).clamp(true);

module.exports = GroupedBarChartHorizontal;
