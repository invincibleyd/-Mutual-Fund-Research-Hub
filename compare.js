let selectedFunds = [];
let allFunds = []; // Store all fetched mutual funds

// Fetch all mutual funds once to avoid duplicate API calls
function fetchAllFunds() {
    fetch("https://api.mfapi.in/mf")
        .then(response => response.json())
        .then(data => { 
            allFunds = data;
        })
        .catch(error => console.error("Error fetching fund data:", error));
}

// Call this function when the page loads
fetchAllFunds();

function suggestCompareFunds(query) {
    let suggestionsContainer = document.getElementById("compareSuggestions");
    if (query.length === 0) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none"; // Hide suggestions
        return;
    }

    let suggestions = allFunds.filter(fund =>
        fund.schemeName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = "<p>No suggestions found</p>";
        suggestionsContainer.style.display = "block";
        return;
    }

    let suggestionsHTML = suggestions.map(fund =>
        `<div class="suggestion" onclick="selectCompareFund('${fund.schemeCode}', '${fund.schemeName}')">${fund.schemeName}</div>`
    ).join('');

    suggestionsContainer.innerHTML = suggestionsHTML;
    suggestionsContainer.style.display = "block";
}

function selectCompareFund(schemeCode, schemeName) {
    document.getElementById("compareSearch").value = schemeName;
    document.getElementById("compareSuggestions").innerHTML = "";
    document.getElementById("compareSuggestions").style.display = "none"; // Hide after selection
}


function addFund() {
    let query = document.getElementById("compareSearch").value.trim();
    if (!query) {
        alert("Please enter a mutual fund name.");
        return;
    }

    let fund = allFunds.find(f => f.schemeName.toLowerCase() === query.toLowerCase());
    if (fund) {
        if (!selectedFunds.some(f => f.schemeCode === fund.schemeCode)) {
            selectedFunds.push({ schemeCode: fund.schemeCode, schemeName: fund.schemeName });
            updateFundList();
        } else {
            alert("This fund is already added.");
        }
    } else {
        alert("Mutual fund not found.");
    }

    // Clear input field after adding
    document.getElementById("compareSearch").value = "";
    document.getElementById("compareSuggestions").style.display = "none"; // Hide suggestions
}

function updateFundList() {
    let list = document.getElementById("fundList");
    list.innerHTML = selectedFunds.map((fund, index) =>
        `<li>${fund.schemeName} <button onclick="removeFund(${index})">Remove</button></li>`
    ).join('');
}

function removeFund(index) {
    selectedFunds.splice(index, 1);
    updateFundList();
}

function compareFunds() {
    if (selectedFunds.length < 2) {
        alert("Please select at least two mutual funds to compare.");
        return;
    }

    let fundDataPromises = selectedFunds.map(fund =>
        fetch(`https://api.mfapi.in/mf/${fund.schemeCode}`)
            .then(response => response.json())
            .then(data => {
                if (!data.data || data.data.length === 0) {
                    console.warn(`No NAV data found for ${fund.schemeName}`);
                    return null;
                }

                let processedData = data.data.map(entry => ({
                    date: entry.date.split(" ")[0], // Remove timestamp if present
                    navValue: parseFloat(entry.nav)
                })).filter(entry => !isNaN(entry.navValue));

                if (processedData.length === 0) return null;

                return { name: fund.schemeName, data: processedData };
            })
    );

    Promise.all(fundDataPromises).then(seriesData => {
        seriesData = seriesData.filter(series => series !== null);

        // Ensure data only contains mutual funds with common dates
        let filteredSeries = filterDataByTimeframe(seriesData);

        // Convert NAV prices to percentage change
        filteredSeries.forEach(fund => {
            let initialNAV = fund.data[fund.data.length - 1].navValue; // Use the oldest available NAV
            fund.data = fund.data.map(point => ({
                date: point.date,
                percentageChange: ((point.navValue - initialNAV) / initialNAV) * 100
            }));
        });

        console.log("Final Filtered Data (Percentage Change):", JSON.stringify(filteredSeries, null, 2));

        Highcharts.chart("chartContainer", {
            chart: { type: "line" },
            title: { text: "Mutual Fund Comparison (% Change from Initial NAV)" },
            xAxis: {
                type: "category",
                title: { text: "Date" },
                reversed: true // Oldest date first
            },
            yAxis: { 
                title: { text: "Percentage Change (%)" },
                labels: {
                    formatter: function () {
                        return this.value + '%'; // Append percentage sign
                    }
                }
            },
            series: filteredSeries.map(fund => ({
                name: fund.name,
                data: fund.data.map(point => [point.date, point.percentageChange])
            }))
        });
    });
}

// Ensure only common dates exist across all selected mutual funds
function filterDataByTimeframe(mfDatasets) {
    if (mfDatasets.length === 0) return [];

    // Step 1: Extract all available dates from each fund
    let dateSets = mfDatasets.map(fund => new Set(fund.data.map(entry => entry.date)));

    // Step 2: Find common dates (dates that exist in all funds)
    let commonDates = [...dateSets[0]].filter(date => dateSets.every(set => set.has(date)));

    // Step 3: Filter and keep only entries with common dates
    let filteredFunds = mfDatasets.map(fund => ({
        name: fund.name,
        data: fund.data.filter(entry => commonDates.includes(entry.date))
    }));

    return filteredFunds;
}
