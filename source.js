const urlParams = new URLSearchParams(window.location.search);
let sample = parseInt(urlParams.get("sample"));
if (isNaN(sample) || sample < 1 || sample > 500)
    sample = 50;
const SAMPLE_SIZE = sample;

const lightTheme = {
    "--background-color": "#eff1f5",
    "--panel-color": "#e6e9ef",
    "--text-color": "#4c4f69",
    "--subtext-color": "#6c6f85",
    "--data-color": "#7287fd"
};

const darkTheme = {
    "--background-color": "#1e1e2e",
    "--panel-color": "#181825",
    "--text-color": "#cdd6f4",
    "--subtext-color": "#a6adc8",
    "--data-color": "#cba6f7"
};

let dark = true;

document.getElementById("theme-toggle").addEventListener("click", () => {
    const theme = dark ? lightTheme : darkTheme;
    for (const key in theme)
        document.documentElement.style.setProperty(key, theme[key]);
    document.getElementById("theme-toggle").textContent = dark ? "🌙" : "☀️";
    dark = !dark;
});

async function api(url) {
	const response = await fetch(`https://api.modrinth.com/v2/${url}`);
	if (!response.ok)
		throw new Error(`API call failed: ${response.statusText}`);
	return await response.json();
}

async function main() {
	const statusText = document.getElementById("status");
	
	try {
		statusText.textContent = `Analyzing the ${SAMPLE_SIZE} newest mods...`;

		const projects = await downloadProjects();
		statusText.innerHTML = `Average review time: <strong>${formatDuration(getAverageDelay(projects))}</strong>.`;
		
		populateModList(projects);
	} catch (error) {
		console.error("An error occurred:", error);
		statusText.textContent = "Failed to load data. Please try again later.";
	}
}

async function downloadProjects() {
	const search = await api(`search?index=newest&limit=${SAMPLE_SIZE}&facets=%5B%5B%22project_type%3Amod%22%5D%5D`);
	
	const ids = search.hits.map(p => p.project_id);
	const iconMap = new Map(search.hits.map(p => [p.project_id, p.icon_url]));

	const projects = await api(`projects?ids=${JSON.stringify(ids)}`);
	projects.sort((a, b) => new Date(b.approved) - new Date(a.approved));

	const results = [];
	for (const p of projects) {
		const approved = new Date(p.approved);
		const queued = new Date(p.queued);
		results.push({
			id: p.id,
			title: p.title,
			icon_url: iconMap.get(p.id) || "https://placehold.co/64x64/d1d5db/374151?text=Mod",
			approved,
			queued,
			delay: approved - queued,
		});
	}
	return results;
}

function populateModList(projects) {
	const modsContainer = document.getElementById("mod-list");
	modsContainer.innerHTML = "";

	projects.forEach(mod => {
		const card = document.createElement("div");
		card.className = "card";

		const icon = document.createElement("img");
		icon.src = mod.icon_url;
		icon.className = "card-icon";
		
		const text = document.createElement("div");
		text.className = "card-text";
		
		const title = document.createElement("a");
		title.href = `https://modrinth.com/project/${mod.id}`;
		title.target = "_blank";
		title.textContent = mod.title;
		title.className = "card-title";
		
		const approvalTime = document.createElement("p");
		approvalTime.textContent = `Approved in: ${formatDuration(mod.delay)}`;
		approvalTime.className = "card-time";

		text.appendChild(title);
		text.appendChild(approvalTime);
		card.appendChild(icon);
		card.appendChild(text);
		modsContainer.appendChild(card);
	});
}

function getAverageDelay(projects) {
	if (projects.length === 0) return 0;
	const totalDelay = projects.reduce((sum, p) => sum + p.delay, 0);
	return totalDelay / projects.length;
}

function formatDuration(milliseconds) {
	const seconds = Math.floor(milliseconds / 1000);
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const parts = [];
	if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
	if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
	if (minutes > 0 && parts.length < 2) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
	return parts.slice(0, 2).join(" and ") || "less than a minute";
}

window.onload = main;