const React = require("react");
const expect = require("chai");
const {shallow, mount, render} = require("enzyme");
const GroupedBarChartSvg = require("../index.jsx");


describe('<GroupedBarChartSvg/>', () => {
    it('shouldnt render', () => {
        const w = shallow(<GroupedBarChartSvg title = "bearercode" />);
        expect(w.contains(svg)).to.equal(true);
    });
});