function scrollToSearch() {
    document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth' });
}

function suggestFunds(query) {
    if (query.length === 0) {
        document.getElementById('suggestions').innerHTML = "";
        return;
    }
    
    fetch(`https://api.mfapi.in/mf`)
        .then(response => response.json())
        .then(data => {
            let suggestions = data.filter(fund => 
                fund.schemeName.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);

            let suggestionsHTML = suggestions.map(fund =>
                `<div class="suggestion" onclick="selectFund('${fund.schemeCode}', '${fund.schemeName}')">${fund.schemeName}</div>`
            ).join('');

            document.getElementById('suggestions').innerHTML = suggestionsHTML || "<p>No suggestions found</p>";
        })
        .catch(error => console.error("Error fetching fund data:", error));
}

function selectFund(schemeCode, schemeName) {
    document.getElementById('searchBar').value = schemeName;
    document.getElementById('suggestions').innerHTML = "";
}

function fetchFundDetails() {
    let query = document.getElementById('searchBar').value.trim();
    if (!query) {
        alert("Please enter a mutual fund name.");
        return;
    }

    fetch(`https://api.mfapi.in/mf`)
        .then(response => response.json())
        .then(data => {
            let fund = data.find(f => f.schemeName.toLowerCase() === query.toLowerCase());
            if (fund) {
                window.location.href = `fund-details.html?schemeCode=${fund.schemeCode}`;
            } else {
                alert("Mutual fund not found.");
            }
        })
        .catch(error => console.error("Error fetching fund details:", error));
}
