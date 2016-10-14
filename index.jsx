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
const shallowEqual = require("shallowequal");
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
            count: PropTypes.number,   //in case value is not the count, can be provided to show up in the bar popup
            color: PropTypes.string.isRequired
        }).isRequired
    ).isRequired,
    allCategories: PropTypes.arrayOf(
        PropTypes.shape({
            category: PropTypes.string.isRequired,
            categoryTitle: PropTypes.string
        }).isRequired
    ).isRequired,
    showPercentageValue: PropTypes.bool,
    logScale: PropTypes.bool,
    selection: PropTypes.arrayOf(
        PropTypes.string.isRequired
    ).isRequired
};

const defaultProps = {
    title: "",
    colors: [],
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
class GroupedBarChartHorizontal extends Component {
    constructor(props) {
        super(props);
        this.onBarClicked = this.onBarClicked.bind(this);
        this.onTitleClicked = this.onTitleClicked.bind(this);
    }

    colors() {
        const {data} = this.props;
        return _.uniq(data.map(d => d.color));
    }

    numOfGroups() {
        return this.colors().length;
    }

    groupTotals() /*: object */ {
        const {data} = this.props;

        const groupedData /*: object */ = _.groupBy(data, d => d.color);

        return Object.keys(groupedData).reduce((memo, color) => {
            const groupData /*: array<object> */ = groupedData[color];
            memo[color] = groupData.reduce((memo, gd) => memo + gd.value, 0);
            return memo;
        }, {});
    }

    data() /*: array<object> */ {
        const {data} = this.props;

        const groupTotals = this.groupTotals();

        return data.map(d => {
            const total = groupTotals[d.color];
            return Object.assign({percentageValue: calculatePercentage(d.value, total)}, d);
        });
    }

    svgWidth() /*: number */ {
        const {divWidth, svgMargin} = this.props;
        return divWidth - svgMargin.left - svgMargin.right;
    }

    categoriesToDisplay() /*: array<string> */ {
        const data = this.data();
        return _.uniq(data.map(d => d.category));
    }

    svgHeight() /*: number */ {
        const {colors} = this.props,
            numOfCategoriesToDisplay = this.categoriesToDisplay().length,
            numOfGroups = this.numOfGroups(),
            barHeight = toPx(GroupedBarChartHorizontal.barHeightScale(numOfGroups));

        return numOfCategoriesToDisplay * barHeight * numOfGroups;
    }

    divHeight() /*: number */ {
        const {svgMargin} = this.props,
            svgHeight = this.svgHeight();

        return svgMargin.top + svgHeight + svgMargin.bottom;
    }

    barColor(datum /*: object */) /*: string */ {
        const {selection} = this.props;
        return selection.includes(datum.category) ? datum.color : "gray";
    }

    categoryTitle(category /*: string */) /*: string */ {
        const {allCategories} = this.props,
            categoryObj = allCategories.find(ct => ct.category === category);

        return categoryObj ? categoryObj.categoryTitle : category;
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
        return _.uniq(data.map(d => d.color));
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
                                            y={y0Scale(d.category) + y1Scale(d.color)}
                                            width={xScale(showPercentageValue ? d.percentageValue : d.value)}
                                            height={y1Scale.bandwidth()}
                                            style={{fill: this.barColor(d)}}
                                            onClick={e => this.onBarClicked(Object.assign({category: d.category}, e))}>

                                            <title>{
                                                d.value +
                                                "\n%" + d.percentageValue +
                                                (d.count ?
                                                    "\ncount: " + d.count :
                                                    "")
                                            }</title>
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

        //adjust the y axis label colors (Caution: avoid nested selections in d3, as it expects the data to be nested as well)
        yAxisNode.selectAll(".tick text").data(this.categoriesToDisplay()).
            style("fill", category => this.categoryTitleColor(category)).html(category => this.categoryTitle(category) );

        //make the y axis labels clickable
        yAxisNode.selectAll(".tick text").on("click", category => {
            this.onBarClicked(Object.assign({category: category, shiftKey: d3.event.shiftKey}))
        });
    }

    onBarClicked(e /*: object */) {
        const {category /*: string */, shiftKey /*: boolean */} = e,
            {selection, allCategories} = this.props;

        const newSelection = createNewSelection(selection, category, shiftKey, allCategories),
            selectionChanged = newSelection.length != selection.length;

        if (selectionChanged) {
            this.emit("bar-click", {newSelection: newSelection});
        }
    }

    onTitleClicked() {
        this.emit("title-click");
    }

    shouldComponentUpdate(nextProps /*: object */) /*: boolean */ {
        return !shallowEqual(
            _.pick(this.props, Object.keys(propTypes)),
            _.pick(nextProps, Object.keys(propTypes))
        );
    }
} //end of GroupedBarChartHorizontal component def

function createNewSelection(
    selection /*: array<string */,
    category /*: string */,
    shiftKey /*: boolean */,
    allCategories /*: array<object> */) /*: array<string */ {

    if (!shiftKey && !selection.includes(category)) {
        return selection.concat([category]);
    }
    else if (!shiftKey && selection.includes(category)) {
        return selection.length === allCategories.length ? [category] : selection;
    }
    else if (shiftKey && selection.includes(category)) {
        return selection.length === 1 ? allCategories.map(c => c.category) : _.without(selection, category);
    }
    else if (shiftKey && !selection.includes(category)) {
        return selection;
    }
}

GroupedBarChartHorizontal.propTypes = propTypes;
GroupedBarChartHorizontal.defaultProps = defaultProps;

GroupedBarChartHorizontal.barHeightScale = d3.scaleLinear().domain([1, 11]).range(["2.5ch", "0.5ch"]).clamp(true);

module.exports = GroupedBarChartHorizontal;
