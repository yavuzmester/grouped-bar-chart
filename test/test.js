"use strict";

const React = require("react");
const GroupedBarChartSvg = require("..");
const ReactTestUtils = require("react-addons-test-utils");
const assert = require("assert");

describe("<GroupedBarChartSvg/>", function() {
    it("shouldnt render", function() {
        const renderer = ReactTestUtils.createRenderer();
        const result = renderer.getRenderOutput(React.createElement(GroupedBarChartSvg));

        assert.strictEqual(result, null);
    });
});
