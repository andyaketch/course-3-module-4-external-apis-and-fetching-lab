/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

// Helper to flush all pending microtasks and macrotasks
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Weather Alerts App", () => {
  let stateInput;
  let fetchButton;
  let alertsDisplay;
  let errorMessage;

  beforeEach(() => {
    const html = fs.readFileSync(path.resolve(__dirname, "./index.html"), "utf8");
    document.documentElement.innerHTML = html;

    jest.resetModules();
    require("./index.js");

    stateInput = document.getElementById("state-input");
    fetchButton = document.getElementById("fetch-alerts");
    alertsDisplay = document.getElementById("alerts-display");
    errorMessage = document.getElementById("error-message");

    global.fetch = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("makes a fetch request with the input state abbreviation", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Current watches, warnings, and advisories for Texas",
        features: []
      })
    });

    stateInput.value = "TX";
    fetchButton.click();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("https://api.weather.gov/alerts/active?area=TX");
  });

  test("displays the title and the number of alerts when a successful request is made", async () => {
    const mockApiResponse = {
      title: "Current watches, warnings, and advisories for New York",
      features: [
        { properties: { headline: "Flood Warning" } },
        { properties: { headline: "Winter Storm Watch" } },
        { properties: { headline: "High Wind Advisory" } },
        { properties: { headline: "Freeze Warning" } },
        { properties: { headline: "Special Weather Statement" } },
        { properties: { headline: "Dense Fog Advisory" } },
        { properties: { headline: "Gale Warning" } }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    });

    stateInput.value = "NY";
    fetchButton.click();

    await flushPromises();

    const expectedSummary = "Current watches, warnings, and advisories for New York: 7";
    expect(alertsDisplay.textContent).toContain(expectedSummary);
  });

  test("clears the input field when the 'Get Weather Alerts' button is clicked", () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Current watches, warnings, and advisories for Minnesota",
        features: []
      })
    });

    stateInput.value = "MN";
    fetchButton.click();

    expect(stateInput.value).toBe("");
  });

  test("displays the error message in #error-message when an unsuccessful request is made", async () => {
    const errorText = "API request failed with status: 404";
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    stateInput.value = "ZZ";
    fetchButton.click();

    await flushPromises();

    expect(errorMessage.textContent).toBe(errorText);
    expect(errorMessage.classList.contains("hidden")).toBe(false);
  });

  test("clears and hides error messages after a subsequent successful request", async () => {
    // Step A: Trigger failed request
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    stateInput.value = "FL";
    fetchButton.click();

    await flushPromises();

    expect(errorMessage.textContent).toContain("500");
    expect(errorMessage.classList.contains("hidden")).toBe(false);

    // Step B: Trigger successful request
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Current watches, warnings, and advisories for California",
        features: []
      })
    });

    stateInput.value = "CA";
    fetchButton.click();

    await flushPromises();

    expect(errorMessage.textContent).toBe("");
    expect(errorMessage.classList.contains("hidden")).toBe(true);
  });
});