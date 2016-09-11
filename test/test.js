"use strict";

const React = require("react");
const GroupedBarChart = require("..");
const ReactTestUtils = require("react-addons-test-utils");
const assert = require("assert");

describe("<GroupedBarChart/>", function() {
    it("shouldnt render", function() {
        const renderer = ReactTestUtils.createRenderer();
        const result = renderer.getRenderOutput(React.createElement(GroupedBarChart));

        assert.strictEqual(result, null);
    });
});
