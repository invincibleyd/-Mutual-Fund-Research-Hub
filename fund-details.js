const params = new URLSearchParams(window.location.search);
const schemeCode = params.get("schemeCode");
const fundDetailsDiv = document.getElementById("fundDetails");
const navTableBody = document.querySelector("#navTable tbody");
const chartContainer = document.getElementById("chartContainer");
const navTable = document.getElementById("navTable");
const tableContainer = document.querySelector(".table-container");
const timeframeSelect = document.getElementById("timeframe");
const dataPointsTable = document.createElement("table"); // New Table for Data Points
const container = document.querySelector(".container");
if (container) {
    container.appendChild(dataPointsTable);
} else {
    console.error("Container element not found.");
}

dataPointsTable.id = "dataPointsTable";
dataPointsTable.innerHTML = `<thead><tr><th>Date</th><th>NAV</th></tr></thead><tbody></tbody>`;
document.querySelector(".container").appendChild(dataPointsTable);

let chart; // Holds the Highcharts instance
let currentView = "chart"; // Default to chart view

// Show Chart
function showChart() {
    chartContainer.style.display = "block";
    navTable.style.display = "none";
    dataPointsTable.style.display = "none";
    timeframeSelect.style.display = "inline-block";
}

// Show Table
function showTable() {
    chartContainer.style.display = "none";
    navTable.style.display = "block";
    dataPointsTable.style.display = "none";
    timeframeSelect.style.display = "none";
}

// Show Data Points Table
function showDataPoints() {
    chartContainer.style.display = "none";
    navTable.style.display = "none";
    dataPointsTable.style.display = "block"; // Show YoY Growth Table
    timeframeSelect.style.display = "inline-block"; // Keep timeframe selector
}


// Update Data Points Table
// Update Data Points Table with YoY Growth for Yearly Data
// Update Data Points Table with Correct YoY Growth Calculation
function updateDataPointsTable(navData) {
    let timeframe = timeframeSelect.value;
    let filteredData = getFilteredData(navData, timeframe);

    let tableBody = dataPointsTable.querySelector("tbody");
    tableBody.innerHTML = ""; // Clear previous data

    if (timeframe === "yearly") {
        // Ensure the data is sorted from oldest to newest
        filteredData.sort((a, b) => new Date(a.date.split("-").reverse().join("-")) - new Date(b.date.split("-").reverse().join("-")));

        let previousNAV = null;

        filteredData.forEach((entry, index) => {
            let row = document.createElement("tr");
            let yoyGrowth = "N/A";

            let currentNAV = parseFloat(entry.nav);
            if (previousNAV !== null && previousNAV !== 0) {
                yoyGrowth = (((currentNAV - previousNAV) / previousNAV) * 100).toFixed(2) + "%";
            }

            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${currentNAV}</td>
                <td>${yoyGrowth}</td>
            `;

            tableBody.appendChild(row);
            previousNAV = currentNAV; // Update previous NAV for next calculation
        });

        // Update table headers to include "YoY Growth"
        dataPointsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>NAV</th>
                    <th>YoY Growth</th>
                </tr>
            </thead>
        `;
        dataPointsTable.appendChild(tableBody);
    } else {
        // Default display for other timeframes
        filteredData.forEach(entry => {
            let row = document.createElement("tr");
            row.innerHTML = `<td>${entry.date}</td><td>${entry.nav}</td>`;
            tableBody.appendChild(row);
        });

        // Reset table headers for non-yearly data
        dataPointsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>NAV</th>
                </tr>
            </thead>
        `;
        dataPointsTable.appendChild(tableBody);
    }

    dataPointsTable.style.display = "block"; // Ensure table is visible
}



// Update Fund Details with CAGR Values
async function fetchFundDetails() {
    if (!schemeCode) {
        fundDetailsDiv.innerHTML = "<p>Invalid Scheme Code. Please check the URL and try again.</p>";
        return;
    }

    try {
        const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        const data = await response.json();

        if (!data || !data.meta) {
            fundDetailsDiv.innerHTML = "<p>Data not available or invalid response format.</p>";
            return;
        }

        let absoluteReturn = calculateAbsoluteReturn(data.data);
        let returns = calculateReturns(data.data);
        let cagrValues = calculateCAGR(data.data); // Calculate CAGR

        fundDetailsDiv.innerHTML = `
            <p><strong>Fund House:</strong> ${data.meta.fund_house}</p>
            <p><strong>Scheme Name:</strong> ${data.meta.scheme_name}</p>
            <p><strong>Category:</strong> ${data.meta.scheme_category}</p>
            <p><strong>ISIN Growth:</strong> ${data.meta.isin_growth || "N/A"}</p>
            <p><strong>Absolute Return:</strong> ${absoluteReturn}</p>
            <p><strong>1-Year Return:</strong> ${returns["1Y"]}</p>
            <p><strong>3-Year Return:</strong> ${returns["3Y"]}</p>
            <p><strong>5-Year Return:</strong> ${returns["5Y"]}</p>
            <p><strong>1-Year CAGR:</strong> ${cagrValues["1Y"]}</p>
            <p><strong>3-Year CAGR:</strong> ${cagrValues["3Y"]}</p>
            <p><strong>5-Year CAGR:</strong> ${cagrValues["5Y"]}</p>
        `;

        updateTable(data.data);
        updateChart(data.data);
        updateDataPointsTable(data.data);

        if (currentView === "table") {
            showTable();
        } else {
            showChart();
        }

    } catch (error) {
        console.error("Error fetching fund details:", error);
        fundDetailsDiv.innerHTML = "<p>Error fetching details. Please try again later.</p>";
    }
}

// Calculate Absolute Return
function calculateAbsoluteReturn(navData) {
    if (!navData || navData.length === 0) return "N/A";
    let latestNAV = parseFloat(navData[0].nav);
    let oldestNAV = parseFloat(navData[navData.length - 1].nav);
    if (isNaN(latestNAV) || isNaN(oldestNAV) || oldestNAV === 0) return "N/A";
    return (((latestNAV - oldestNAV) / oldestNAV) * 100).toFixed(2) + "%";
}

// Update Table
function updateTable(navData) {
    navTableBody.innerHTML = ""; // Clear previous data
    navData.forEach(navEntry => {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${navEntry.date}</td><td>${navEntry.nav}</td>`;
        navTableBody.appendChild(row);
    });
    tableContainer.style.display = "block"; // Ensure table is visible
}

// Get filtered NAV Data based on timeframe
function getFilteredData(navData, timeframe) {
    let filteredData = [];
    let today = new Date();
    if (timeframe === "daily") {
        let threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        filteredData = navData.filter(entry => {
            let entryDate = new Date(entry.date.split("-").reverse().join("-"));
            return entryDate >= threeMonthsAgo;
        });
    } else if (timeframe === "weekly") {
        filteredData = getLastDateOfEachWeek(navData);
    } else if (timeframe === "monthly") {
        filteredData = getLastDateOfEachMonth(navData);
    } else if (timeframe === "yearly") {
        filteredData = getLastDateOfEachYear(navData);
    } else {
        filteredData = navData;
    }
    return filteredData;
}

// Update Chart
function updateChart(navData) {
    let timeframe = timeframeSelect.value;
    let filteredData = getFilteredData(navData, timeframe);

    let dates = filteredData.map(entry => entry.date).reverse();
    let navValues = filteredData.map(entry => parseFloat(entry.nav)).reverse();

    if (chart) {
        chart.destroy();
    }

    chart = Highcharts.chart("chartContainer", {
        chart: { type: "line", zoomType: "x" },
        title: { text: "Mutual Fund Performance" },
        xAxis: { categories: dates, labels: { rotation: -45 }, scrollbar: { enabled: true } },
        yAxis: { title: { text: "NAV Value" } },
        series: [{ name: "NAV", data: navValues, color: "#0071A7" }],
        tooltip: { shared: true, crosshairs: true, xDateFormat: "%d %b %Y" },
    });
}

// Get last NAV for each week
function getLastDateOfEachWeek(navData) {
    let weeks = {};
    navData.forEach(entry => {
        let date = new Date(entry.date.split("-").reverse().join("-"));
        let week = `${date.getFullYear()}-${Math.ceil(date.getDate() / 7)}`;
        weeks[week] = entry;
    });
    return Object.values(weeks);
}

// Get last NAV for each month
function getLastDateOfEachMonth(navData) {
    let months = {};
    navData.forEach(entry => {
        let date = new Date(entry.date.split("-").reverse().join("-"));
        let month = `${date.getFullYear()}-${date.getMonth()}`;
        months[month] = entry;
    });
    return Object.values(months);
}

// Get last NAV for each year
function getLastDateOfEachYear(navData) {
    let years = {};
    navData.forEach(entry => {
        let date = new Date(entry.date.split("-").reverse().join("-"));
        let year = date.getFullYear();
        if (!years[year] || new Date(years[year].date.split("-").reverse().join("-")) < date) {
            years[year] = entry;
        }
    });
    return Object.values(years).sort((a, b) => new Date(b.date.split("-").reverse().join("-")) - new Date(a.date.split("-").reverse().join("-")));
}
// Function to show the YoY Growth Table
function showDataPoints() {
    chartContainer.style.display = "none";
    navTable.style.display = "none";
    dataPointsTable.style.display = "block"; // Show YoY Growth Table
    timeframeSelect.style.display = "none"; // Hide timeframe selector for YoY Growth
}

// Update YoY Growth Table
function updateDataPointsTable(navData) {
    let filteredData = getLastDateOfEachYear(navData); // Get NAV for each year
    filteredData.reverse(); // Ensure we start from the earliest year

    let tableBody = dataPointsTable.querySelector("tbody");
    tableBody.innerHTML = ""; // Clear previous data

    let previousNAV = null;

    filteredData.forEach(entry => {
        let row = document.createElement("tr");
        let yoyGrowth = "N/A";

        let currentNAV = parseFloat(entry.nav);
        if (previousNAV !== null && previousNAV !== 0) {
            yoyGrowth = (((currentNAV - previousNAV) / previousNAV) * 100).toFixed(2) + "%";
        }

        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${currentNAV}</td>
            <td>${yoyGrowth}</td>
        `;

        tableBody.appendChild(row);
        previousNAV = currentNAV; // Store current NAV for next iteration
    });

    // Update table headers
    dataPointsTable.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>NAV</th>
                <th>YoY Growth</th>
            </tr>
        </thead>
    `;
    dataPointsTable.appendChild(tableBody);

    dataPointsTable.style.display = "block"; // Ensure table is visible
}
// Function to calculate returns for 1, 3, and 5 years
function calculateReturns(navData) {
    if (!navData || navData.length === 0) return { "1Y": "N/A", "3Y": "N/A", "5Y": "N/A" };

    let latestNAV = parseFloat(navData[0].nav);
    let today = new Date();

    let nav1Y = findClosestNAV(navData, today, 1);
    let nav3Y = findClosestNAV(navData, today, 3);
    let nav5Y = findClosestNAV(navData, today, 5);

    let returns = {
        "1Y": calculatePercentageChange(latestNAV, nav1Y),
        "3Y": calculatePercentageChange(latestNAV, nav3Y),
        "5Y": calculatePercentageChange(latestNAV, nav5Y)
    };

    return returns;
}

// Find the NAV closest to a given past year
function findClosestNAV(navData, today, yearsAgo) {
    let targetDate = new Date(today);
    targetDate.setFullYear(today.getFullYear() - yearsAgo);

    let closestEntry = navData.reduce((closest, entry) => {
        let entryDate = new Date(entry.date.split("-").reverse().join("-"));
        let diff = Math.abs(entryDate - targetDate);
        return diff < Math.abs(new Date(closest.date.split("-").reverse().join("-")) - targetDate) ? entry : closest;
    }, navData[0]); // Start with the first entry

    return parseFloat(closestEntry.nav);
}

function calculatePercentageChange(latest, past) {
    if (!past || past === 0 || isNaN(latest) || isNaN(past)) return "N/A";
    return (((latest - past) / past) * 100).toFixed(2) + "%";
}

function calculateCAGR(navData) {
    if (!navData || navData.length === 0) return { "1Y": "N/A", "3Y": "N/A", "5Y": "N/A" };

    let latestNAV = parseFloat(navData[0].nav);

    let nav1Y = findClosestNAV(navData, new Date(), 1);
    let nav3Y = findClosestNAV(navData, new Date(), 3);
    let nav5Y = findClosestNAV(navData, new Date(), 5);

    let cagrValues = {
        "1Y": computeCAGR(nav1Y, latestNAV, 1),
        "3Y": computeCAGR(nav3Y, latestNAV, 3),
        "5Y": computeCAGR(nav5Y, latestNAV, 5)
    };

    return cagrValues;
}
function computeCAGR(startNAV, endNAV, years) {
    if (!startNAV || startNAV === 0 || isNaN(startNAV) || isNaN(endNAV)) return "N/A";
    return (((Math.pow(endNAV / startNAV, 1 / years)) - 1) * 100).toFixed(2) + "%";
}

// Event Listener for Timeframe Change
timeframeSelect.addEventListener("change", fetchFundDetails);

// Fetch Data on Page Load
fetchFundDetails();

