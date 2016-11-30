"use strict";

const {EventEmitterMixin} = require("event-emitter-mixin");
const React = require("react"),
    Component = EventEmitterMixin(React.Component),
    PropTypes = React.PropTypes;
const ReactDOM = require("react-dom");
const d3 = require("d3");
const format = require("format-number")();
const toPx = require("@yavuzmester/css-length-to-px");
const autoIncrement = require("autoincrement");
const _ = require("underscore");
const shallowEqual = require("shallowequal");

const propTypes = {
    title: PropTypes.string,
    divWidth: PropTypes.number.isRequired,
    svgMargin: PropTypes.shape({
        left: PropTypes.number.isRequired,
        right: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        bottom: PropTypes.number.isRequired
    }).isRequired,
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            category: PropTypes.string.isRequired,
            title: PropTypes.string
        }).isRequired
    ).isRequired,
    selection: PropTypes.arrayOf(
        PropTypes.string.isRequired
    ).isRequired,
    data: PropTypes.arrayOf(
        PropTypes.shape({
            category: PropTypes.string.isRequired,
            color: PropTypes.string.isRequired,
            value: PropTypes.number,
            percentageValue: PropTypes.number,
            count: PropTypes.number //can be provided for bar popup for now.
        }).isRequired
    ).isRequired,
    datumPropForBar: PropTypes.oneOf([
        "value",
        "percentageValue"
    ]),
    logScale: PropTypes.bool
};

const defaultProps = {
    title: "",
    datumPropForBar: "value",
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

    colorsToDisplay() /*: array<string> */ {
        const {data} = this.props;
        return _.uniq(data.map(d => d.color));
    }

    numOfGroups() /*: number */ {
        return this.colorsToDisplay().length;
    }

    categoriesToDisplay() /*: array<string> */ {
        const {data} = this.props;
        return _.uniq(data.map(d => d.category));
    }

    numOfCategoriesToDisplay() /*: number */ {
        return this.categoriesToDisplay().length;
    }

    svgWidth() /*: number */ {
        const {divWidth, svgMargin} = this.props;
        return divWidth - svgMargin.left - svgMargin.right;
    }

    svgHeight() /*: number */ {
        const numOfCategoriesToDisplay = this.numOfCategoriesToDisplay(),
            numOfGroups = this.numOfGroups(),
            barHeight = toPx(GroupedBarChartHorizontal.barHeightScale(numOfGroups));

        return Math.round(numOfCategoriesToDisplay * numOfGroups * barHeight);
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

    titleForCategory(category /*: string */) /*: string */ {
        const {categories} = this.props;
        return categories.find(c => c.category === category).title || category;
    }

    colorForCategoryTitle(category /*: string */) /*: string */ {
        const {selection} = this.props;
        return selection.includes(category) ? "white" : "gray";
    }

    xDomain() /*: array<number> */ {
        const {data, datumPropForBar, logScale} = this.props;
        return [!logScale ? 0 : 1, d3.max(data, d => d[datumPropForBar])];
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
        const {datumPropForBar} = this.props,
            xScale = this.xScale();

        return datumPropForBar !== "percentageValue" ?
            d3.axisBottom(xScale).ticks(3, ",.1s") :
            d3.axisBottom(xScale).ticks(3).tickFormat(t => t + "%");
    }

    y0Domain() /*: array<string> */ {
        const {data} = this.props;
        return data.map(d => d.category);
    }

    y0Scale() /*: function */ {
        const y0Domain = this.y0Domain(),
            yRange = this.yRange();

        return d3.scaleBand().domain(y0Domain).rangeRound(yRange).padding(0.05);
    }

    y1Domain() /*: array<string> */ {
        const {data} = this.props;
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

    barPopupText(datum /*: object */) /*: string */ {
        const popupTextLines = [];

        if (datum.value) {
            popupTextLines.push(format(datum.value));
        }

        if (datum.percentageValue) {
            popupTextLines.push("%" + datum.percentageValue);
        }

        if (datum.count) {
            popupTextLines.push("count: " + format(datum.count));
        }

        return popupTextLines.join("\n");
    }

    labelPopupText(data /*: object */, category /*: string */) {
        const dataForCategory = data.filter(d => d.category === category);

        const divider = "\n-----------\n";

        const popupTextLines = dataForCategory.map(d => this.barPopupText(d));

        return popupTextLines.join(divider);
    }

    render() {
        const {title, divWidth, svgMargin, data, datumPropForBar} = this.props,
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
                                            width={xScale(d[datumPropForBar])}
                                            height={y1Scale.bandwidth()}
                                            style={{fill: this.barColor(d)}}
                                            onClick={e => this.onBarClicked(Object.assign({category: d.category}, e))}>

                                            <title>{this.barPopupText(d)}</title>
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
        const {data} = this.props,
            xAxis = this.xAxis(),
            yAxis = this.yAxis();

        const marginAxisNode = d3.select(ReactDOM.findDOMNode(this)).select("g.margin.axis"),
            xAxisNode = marginAxisNode.select("g.x.axis"),
            yAxisNode = marginAxisNode.select("g.y.axis");

        //update axes
        xAxisNode.call(xAxis);
        yAxisNode.call(yAxis);

        //adjust the y axis label colors (Caution: avoid nested selections in d3, as it expects the data to be nested as well)
        yAxisNode.selectAll(".tick text").
            data(this.categoriesToDisplay()).
            style("fill", category => this.colorForCategoryTitle(category)).
            html(category => this.titleForCategory(category));

        //make the y axis labels clickable
        yAxisNode.selectAll(".tick text").on("click", category => {
            const e = {
                category: category,
                shiftKey: d3.event.shiftKey
            };

            this.onBarClicked(e);
        });

        //adjust tooltip for the y axis labels
        yAxisNode.selectAll(".tick text").append("title").text(category => {
            return this.labelPopupText(data, category);
        });
    }

    onBarClicked(e /*: object */) {
        const {selection} = this.props,
            newSelection = this._createNewSelection(e),
            selectionChanged = newSelection.length != selection.length;

        if (selectionChanged) {
            this.emit("bar-click", {newSelection: newSelection});
        }
    }

    _createNewSelection(e /*: object */) /*: array<string */ {
        const {category /*: string */, shiftKey /*: boolean */} = e,
            {selection, categories} = this.props;

        if (!shiftKey && !selection.includes(category)) {
            return selection.concat([category]);
        }
        else if (!shiftKey && selection.includes(category)) {
            return selection.length === categories.length ? [category] : selection;
        }
        else if (shiftKey && selection.includes(category)) {
            return selection.length === 1 ? categories.map(c => c.category) : _.without(selection, category);
        }
        else if (shiftKey && !selection.includes(category)) {
            return selection;
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

GroupedBarChartHorizontal.propTypes = propTypes;
GroupedBarChartHorizontal.defaultProps = defaultProps;

GroupedBarChartHorizontal.barHeightScale = d3.scaleLinear().domain([1, 11]).range(["2.5ch", "0.5ch"]).clamp(true);

module.exports = GroupedBarChartHorizontal;
