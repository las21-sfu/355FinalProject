const DATA_PATH = "./PMD-en.csv";

/* ── Shared colour palette (mirrors CSS :root variables) ── */
const PALETTE = {
  bg: "#f7f7f4",
  surface: "#ffffff",
  border: "#e4e4e0",
  borderSubtle: "#efefec",
  grayMid: "#bcbcbc",
  text: "#18181a",
  textMuted: "#6b7080",
  textLight: "#9a9fad",
  accent: "#2563eb",
  accentSoft: "#eff6ff",
  danger: "#ef4444",
  success: "#22c55e",
  chartAccent: "#335693",
  emp: "#4363ee",
  pharmacy: "#6c63ff",
  childcare: "#f2b441",
  health: "#f4a5a5",
  grocery: "#7fd3a0",
  primary: "#2a9d8f",
  secondary: "#8e7dff",
  library: "#c77dff",
  park: "#f4d79f",
  transit: "#5b9fd4",
};

const SERVICE_TYPE_INFO = [
  { label: "Employment", field: "in_db_emp", color: PALETTE.emp },
  { label: "Pharmacy", field: "in_db_pharma", color: PALETTE.pharmacy },
  { label: "Childcare", field: "in_db_childcare", color: PALETTE.childcare },
  { label: "Health", field: "in_db_health", color: PALETTE.health },
  { label: "Grocery", field: "in_db_grocery", color: PALETTE.grocery },
  { label: "Primary School", field: "in_db_educpri", color: PALETTE.primary },
  {
    label: "Secondary School",
    field: "in_db_educsec",
    color: PALETTE.secondary,
  },
  { label: "Library", field: "in_db_lib", color: PALETTE.library },
  { label: "Park", field: "in_db_parks", color: PALETTE.park },
  { label: "Transit", field: "in_db_transit", color: PALETTE.transit },
];

const AMENITY_INFO = {
  Employment: {
    field: "employment",
    icon: "💼",
    mode: "driving",
    km: 10,
    label: "10 km driving threshold",
  },
  Pharmacy: {
    field: "pharmacy",
    icon: "💊",
    mode: "walking",
    km: 1,
    label: "1 km walking threshold",
  },
  Childcare: {
    field: "childcare",
    icon: "🧸",
    mode: "walking",
    km: 1.5,
    label: "1.5 km walking threshold",
  },
  Health: {
    field: "health",
    icon: "🏥",
    mode: "driving",
    km: 3,
    label: "3 km driving threshold",
  },
  Grocery: {
    field: "grocery",
    icon: "🛒",
    mode: "walking",
    km: 1,
    label: "1 km walking threshold",
  },
  "Primary School": {
    field: "primary_school",
    icon: "🏫",
    mode: "walking",
    km: 1.5,
    label: "1.5 km walking threshold",
  },
  "Secondary School": {
    field: "secondary_school",
    icon: "🎓",
    mode: "walking",
    km: 1.5,
    label: "1.5 km walking threshold",
  },
  Library: {
    field: "library",
    icon: "📚",
    mode: "walking",
    km: 1.5,
    label: "1.5 km walking threshold",
  },
  Park: {
    field: "park",
    icon: "🌳",
    mode: "walking",
    km: 1,
    label: "1 km walking threshold",
  },
  Transit: {
    field: "transit",
    icon: "🚌",
    mode: "walking",
    km: 1,
    label: "1 km walking threshold",
  },
};

function cleanProvinceName(name) {
  if (!name) return "Unknown Province";
  return String(name).split("/")[0].trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = +cleaned;
  return Number.isFinite(num) ? num : NaN;
}

function estimateWalkingMinutes(indexValue, kmThreshold) {
  if (!Number.isFinite(indexValue) || !Number.isFinite(kmThreshold)) {
    return null;
  }

  const estimatedDistanceKm = (1 - indexValue) * kmThreshold;
  const estimatedMinutes = estimatedDistanceKm * 12;

  return Math.max(1, Math.round(estimatedMinutes));
}

async function fetchData() {
  const raw = await d3.csv(DATA_PATH);

  return raw.map((d) => ({
    province: d.PRNAME,
    division: d.CSDNAME,
    blockId: d.DBUID,
    population: toNumber(d.CSDPOP),
    latitude: toNumber(d.lat),
    longitude: toNumber(d.lon),

    employment: toNumber(d.prox_idx_emp),
    pharmacy: toNumber(d.prox_idx_pharma),
    childcare: toNumber(d.prox_idx_childcare),
    health: toNumber(d.prox_idx_health),
    grocery: toNumber(d.prox_idx_grocery),
    primary_school: toNumber(d.prox_idx_educpri),
    secondary_school: toNumber(d.prox_idx_educsec),
    library: toNumber(d.prox_idx_lib),
    park: toNumber(d.prox_idx_parks),
    transit: toNumber(d.prox_idx_transit),

    in_db_emp: toNumber(d.in_db_emp),
    in_db_pharma: toNumber(d.in_db_pharma),
    in_db_childcare: toNumber(d.in_db_childcare),
    in_db_health: toNumber(d.in_db_health),
    in_db_grocery: toNumber(d.in_db_grocery),
    in_db_educpri: toNumber(d.in_db_educpri),
    in_db_educsec: toNumber(d.in_db_educsec),
    in_db_lib: toNumber(d.in_db_lib),
    in_db_parks: toNumber(d.in_db_parks),
    in_db_transit: toNumber(d.in_db_transit),
  }));
}

window.addEventListener("DOMContentLoaded", () => {
  fetchData()
    .then((data) => {
      const bcData = data.filter((d) => {
        const province = (d.province || "").trim().toLowerCase();
        return province.includes("british columbia");
      });

      initScatterDropdown(bcData);
      render(bcData);
      initUnderstandingAccessibility(bcData);
      initOverallAccessibilityScrolly(bcData);
      renderScatter(bcData);
      initTimeIndex(bcData);
    })
    .catch((error) => {
      console.error(error);
      showError(
        "Could not load the dataset. Check the file path and column names in index.js."
      );
    });
});

function initScatterDropdown(bcData) {
  const select = d3.select("#scatter-amenity-select");
  select
    .selectAll("option")
    .data(UA_AMENITIES)
    .join("option")
    .attr("value", (d) => d.field)
    .property("selected", (d) => d.field === "all")
    .text((d) => d.label);

  function resizeSelect() {
    const el = document.getElementById("scatter-amenity-select");
    const sizer = document.getElementById("scatter-select-sizer");
    if (!el || !sizer) return;
    sizer.textContent = el.options[el.selectedIndex]?.text ?? "";
    el.style.width = sizer.offsetWidth + 4 + "px";
  }

  select.on("change", () => {
    resizeSelect();
    renderScatter(bcData);
  });

  requestAnimationFrame(resizeSelect);
}

const UA_AMENITIES = [
  { label: "All", field: "all" },
  { label: "Grocery", field: "grocery" },
  { label: "Transit", field: "transit" },
  { label: "Employment", field: "employment" },
  { label: "Health", field: "health" },
  { label: "Pharmacy", field: "pharmacy" },
  { label: "Primary School", field: "primary_school" },
  { label: "Secondary School", field: "secondary_school" },
  { label: "Childcare", field: "childcare" },
  { label: "Library", field: "library" },
  { label: "Park", field: "park" },
];

function initUnderstandingAccessibility(data) {
  const select = d3.select("#ua-amenity-select");
  select
    .selectAll("option")
    .data(UA_AMENITIES)
    .join("option")
    .attr("value", (d) => d.field)
    .property("selected", (d) => d.field === "grocery")
    .text((d) => d.label);

  const vancouverData = data.filter((d) => d.division === "Vancouver");
  const rockiesData = data.filter((d) => d.division === "Mission");

  function update() {
    const field = select.property("value");
    const vanValues = vancouverData
      .map((d) => d[field])
      .filter(Number.isFinite);
    const vanAvg = d3.mean(vanValues);
    const vanMinutes = Number.isFinite(vanAvg) ? proxToMinutes(vanAvg) : null;

    const rockValues = rockiesData.map((d) => d[field]).filter(Number.isFinite);
    const rockAvg = d3.mean(rockValues);
    const rockMinutes = Number.isFinite(rockAvg)
      ? proxToMinutes(rockAvg)
      : null;

    document.getElementById("ua-van-avg").textContent = Number.isFinite(vanAvg)
      ? vanAvg.toFixed(2)
      : "N/A";
    document.getElementById("ua-van-min").textContent =
      vanMinutes !== null ? vanMinutes + " minute walk" : "N/A";

    document.getElementById("ua-rock-avg").textContent = Number.isFinite(
      rockAvg
    )
      ? rockAvg.toFixed(2)
      : "N/A";
    document.getElementById("ua-rock-min").textContent =
      rockMinutes !== null ? rockMinutes + " minute walk" : "N/A";

    drawProximityBar("#ua-vancouver-chart", vanMinutes);
    drawProximityBar("#ua-rockies-chart", rockMinutes);
  }

  function resizeSelect() {
    const el = document.getElementById("ua-amenity-select");
    const sizer = document.getElementById("ua-select-sizer");
    if (!el || !sizer) return;
    sizer.textContent = el.options[el.selectedIndex]?.text ?? "";
    el.style.width = sizer.offsetWidth + 4 + "px";
  }

  initProximityBar("#ua-vancouver-chart");
  initProximityBar("#ua-rockies-chart");

  select.on("change", () => {
    resizeSelect();
    update();
  });
  update();
  // Defer resize until fonts are rendered
  requestAnimationFrame(resizeSelect);
}

function barColor(clamped) {
  if (clamped > 35) return PALETTE.danger;
  if (clamped > 20) return PALETTE.childcare;
  if (clamped > 10) return PALETTE.grocery;
  return PALETTE.success;
}

function initProximityBar(selector) {
  const container = d3.select(selector);
  const W = 600;
  const barH = 34;
  const mt = 8;
  const mb = 28;
  const ml = 4;
  const mr = 4;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${W + ml + mr} ${barH + mt + mb}`)
    .style("width", "100%")
    .style("height", "auto");

  const g = svg.append("g").attr("transform", `translate(${ml}, ${mt})`);

  // Track
  g.append("rect")
    .attr("class", "ua-track")
    .attr("width", W)
    .attr("height", barH)
    .attr("rx", 6)
    .attr("fill", PALETTE.border);

  // Fill — starts at 0 so it animates in on first update
  g.append("rect")
    .attr("class", "ua-fill")
    .attr("width", 0)
    .attr("height", barH)
    .attr("rx", 6)
    .attr("fill", PALETTE.success);

  // Ticks and labels
  const xScale = d3.scaleLinear().domain([0, 60]).range([0, W]);
  [0, 15, 30, 45, 60].forEach((t) => {
    const x = xScale(t);
    g.append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", barH)
      .attr("y2", barH + 5)
      .attr("stroke", PALETTE.textMuted)
      .attr("stroke-width", 1.5);
    g.append("text")
      .attr("x", x)
      .attr("y", barH + 18)
      .attr("text-anchor", t === 0 ? "start" : t === 60 ? "end" : "middle")
      .attr("font-size", 12)
      .attr("fill", PALETTE.textMuted)
      .text(t === 0 ? "0 min" : t === 60 ? "60 min" : `${t}`);
  });
}

function drawProximityBar(selector, minutes) {
  const xScale = d3.scaleLinear().domain([0, 60]).range([0, 600]);
  const clamped = Math.min(minutes !== null ? minutes : 0, 60);

  d3.select(selector)
    .select(".ua-fill")
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut)
    .attr("width", xScale(clamped))
    .attr("fill", barColor(clamped));
}

function render(data) {
  d3.select("#chart1").html("");
  d3.select("#message").html("");

  const selectedAmenity = d3.select("#ua-amenity-select").property("value");
  const amenityInfo = AMENITY_INFO[selectedAmenity];
  const field = amenityInfo?.field;

  if (!field) {
    showError("No amenity field found for the selected dropdown value.");
    return;
  }

  const validRows = data.filter((d) => Number.isFinite(d[field]));

  if (!validRows.length) {
    showError(
      `No valid rows found for ${selectedAmenity} in British Columbia.`
    );
    return;
  }

  const divisionRows = d3
    .rollups(
      validRows,
      (group) => {
        const avgIndex = d3.mean(group, (d) => d[field]);

        const avgMinutes =
          amenityInfo.mode === "walking"
            ? estimateWalkingMinutes(avgIndex, amenityInfo.km)
            : null;

        return {
          division: group[0]?.division || "Unknown Division",
          province: group[0]?.province || "Unknown Province",
          indexValue: avgIndex,
          estimatedMinutes: avgMinutes,
          blockCount: group.length,
        };
      },
      (d) => d.division
    )
    .map(([, value]) => value)
    .filter((d) => Number.isFinite(d.indexValue));

  if (!divisionRows.length) {
    showError(
      `No division-level values could be calculated for ${selectedAmenity}.`
    );
    return;
  }

  const width = 1720;
  const height = amenityInfo.mode === "walking" ? 860 : 720;

  const svg = d3
    .select("#chart1")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

  const defs = svg.append("defs");

  const timeGradient = defs
    .append("linearGradient")
    .attr("id", "time-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  timeGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#0aa11a");
  timeGradient
    .append("stop")
    .attr("offset", "35%")
    .attr("stop-color", "#97bf00");
  timeGradient
    .append("stop")
    .attr("offset", "70%")
    .attr("stop-color", "#ff8c00");
  timeGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ff1028");

  // If amenity is not based on walking proximity, don't display vis
  if (amenityInfo.mode !== "walking") {
    showError("This visualization only supports walking-based services.");
    return;
  }

  const walkRows = divisionRows.filter((d) =>
    Number.isFinite(d.estimatedMinutes)
  );

  if (!walkRows.length) {
    showError(
      `No estimated walking times could be calculated for ${selectedAmenity}.`
    );
    return;
  }

  const newWestminsterRow = walkRows.find(
    (d) => d.division === "New Westminster"
  );
  const centralSaanichRow = walkRows.find(
    (d) => d.division === "Central Saanich"
  );

  if (!newWestminsterRow || !centralSaanichRow) {
    showError("Could not find data for New Westminster or Central Saanich.");
    return;
  }

  const maxMinutes = Math.max(
    12,
    d3.max(walkRows, (d) => d.estimatedMinutes) || 12
  );

  const xScale = d3.scaleLinear().domain([0, 20]).range([0, 620]);

  const timeColor = d3
    .scaleLinear()
    .domain([10, 13.333, 16.667, 20])
    .range(["#0aa11a", "#97bf00", "#ff8c00", "#ff1028"])
    .clamp(true);

  drawLegend(svg, {
    x: 54,
    y: 80,
    width: 430,
  });

  drawWalkingRow(svg, {
    y: 260,
    datum: newWestminsterRow,
    amenity: selectedAmenity,
    xScale,
    colorScale: timeColor,
    maxMinutes,
    icon: amenityInfo.icon,
    thresholdLabel: amenityInfo.label,
  });

  drawWalkingRow(svg, {
    y: 545,
    datum: centralSaanichRow,
    amenity: selectedAmenity,
    xScale,
    colorScale: timeColor,
    maxMinutes,
    icon: amenityInfo.icon,
    thresholdLabel: amenityInfo.label,
  });
}

function drawLegend(svg, { x, y, width }) {
  svg
    .append("text")
    .attr("x", x)
    .attr("y", y - 18)
    .attr("font-size", 18)
    .attr("font-weight", 700)
    .text("Estimated walking time color legend");

  svg
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", 22)
    .attr("rx", 11)
    .attr("ry", 11)
    .attr("fill", "url(#time-gradient)");

  const tickValues = [10, 13.333, 16.667, 20];
  const tickLabels = ["Short", "Moderate", "Long", "Very long"];

  const legendScale = d3.scaleLinear().domain([10, 20]).range([0, width]);

  tickValues.forEach((val, i) => {
    const xPos = x + legendScale(val);

    svg
      .append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", y + 28)
      .attr("y2", y + 40)
      .attr("stroke", PALETTE.textMuted)
      .attr("stroke-width", 1.5);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", y + 64)
      .attr("font-size", 13)
      .attr(
        "text-anchor",
        i === 0 ? "start" : i === tickValues.length - 1 ? "end" : "middle"
      )
      .attr("fill", PALETTE.textMuted)
      .text(`${Math.round(val)} min`);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", y + 84)
      .attr("font-size", 12)
      .attr(
        "text-anchor",
        i === 0 ? "start" : i === tickValues.length - 1 ? "end" : "middle"
      )
      .attr("fill", PALETTE.textMuted)
      .text(tickLabels[i]);
  });
}

function drawBarWithTrack(
  svg,
  { barX, barY, barHeight, trackWidth, visibleBarWidth, fill, icon }
) {
  svg
    .append("rect")
    .attr("x", barX)
    .attr("y", barY)
    .attr("width", trackWidth)
    .attr("height", barHeight)
    .attr("rx", 23)
    .attr("ry", 23)
    .attr("fill", PALETTE.border);

  const dynamicRadius = Math.min(23, visibleBarWidth / 2, barHeight / 2);

  svg
    .append("rect")
    .attr("x", barX)
    .attr("y", barY)
    .attr("width", visibleBarWidth)
    .attr("height", barHeight)
    .attr("rx", dynamicRadius)
    .attr("ry", dynamicRadius)
    .attr("fill", fill);

  const iconX = barX + trackWidth + 24;
  svg
    .append("text")
    .attr("x", iconX)
    .attr("y", barY + 36)
    .attr("font-size", 36)
    .text(icon);
}

function drawWalkingRow(svg, config) {
  const { y, datum, xScale, colorScale, maxMinutes, icon, thresholdLabel } =
    config;

  const leftX = 54;
  const barX = 940;
  const barY = y + 36;
  const barHeight = 46;
  const trackWidth = 620;
  const rawBarWidth = xScale(datum.estimatedMinutes);
  const visibleBarWidth = Math.max(barHeight, rawBarWidth);
  const barColor = colorScale(datum.estimatedMinutes);

  const division = datum.division || "Unknown Division";
  const province = cleanProvinceName(datum.province) || "Unknown Province";
  const minutesText = Number.isFinite(datum.estimatedMinutes)
    ? `~${datum.estimatedMinutes} min walk on average`
    : "N/A";
  const proximityText = Number.isFinite(datum.indexValue)
    ? d3.format(".3f")(datum.indexValue)
    : "N/A";

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 8)
    .attr("font-size", 34)
    .attr("font-weight", 900)
    .attr("letter-spacing", "-0.02em")
    .text(`If you lived in ${division}, ${province}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 66)
    .attr("font-size", 34)
    .attr("font-weight", 900)
    .attr("letter-spacing", "-0.02em")
    .text(`Estimated walking time: ${minutesText}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 150)
    .attr("font-size", 22)
    .attr("fill", PALETTE.textMuted)
    .text(`Average proximity index: ${proximityText}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 186)
    .attr("font-size", 17)
    .attr("fill", PALETTE.textMuted)
    .text(
      `Approximation based on the ${thresholdLabel}, averaged across blocks in this division.`
    );

  drawBarWithTrack(svg, {
    barX,
    barY,
    barHeight,
    trackWidth,
    visibleBarWidth,
    fill: barColor,
    icon,
  });

  const axisScale = d3.scaleLinear().domain([0, 20]).range([0, trackWidth]);

  const tickValues = d3.range(0, 21, 2); // ticks from 0 to 20, every 2 min

  tickValues.forEach((tick) => {
    const xPos = barX + axisScale(tick);

    svg
      .append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", barY + barHeight + 10)
      .attr("y2", barY + barHeight + 24)
      .attr("stroke", PALETTE.textMuted)
      .attr("stroke-width", 1.5);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", barY + barHeight + 48)
      .attr("font-size", 14)
      .attr("font-weight", 500)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.textMuted)
      .text(`${tick} min`);
  });
}

function drawDrivingRow(svg, config) {
  const { y, datum, value, xScale, fill, label, icon } = config;

  const leftX = 54;
  const barX = 940;
  const barY = y + 6;
  const barHeight = 46;
  const trackWidth = 620;
  const rawBarWidth = xScale(value);
  const visibleBarWidth = Math.max(barHeight, rawBarWidth);

  const division = datum.division || "Unknown Division";
  const province = cleanProvinceName(datum.province) || "Unknown Province";
  const proximityText = Number.isFinite(value)
    ? d3.format(".3f")(value)
    : "N/A";

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 8)
    .attr("font-size", 34)
    .attr("font-weight", 900)
    .attr("letter-spacing", "-0.02em")
    .text(`If you lived in ${division}, ${province}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 66)
    .attr("font-size", 34)
    .attr("font-weight", 900)
    .attr("letter-spacing", "-0.02em")
    .text(`Average proximity index: ${proximityText}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 150)
    .attr("font-size", 17)
    .attr("fill", PALETTE.textMuted)
    .text(
      `Measured using ${label}, averaged across blocks in this division. Walking-time estimate not shown.`
    );

  drawBarWithTrack(svg, {
    barX,
    barY,
    barHeight,
    trackWidth,
    visibleBarWidth,
    fill,
    icon,
  });
}

function showError(message) {
  d3.select("#message").append("div").attr("class", "error").text(message);
}

// Vis 2
const CITY_HIGHLIGHTS = {
  "maple ridge": new Set([
    "in_db_childcare",
    "in_db_educpri",
    "in_db_educsec",
    "in_db_emp",
  ]),
  whistler: new Set(["in_db_parks", "in_db_health"]),
};

const NARRATIVES = {
  most: "This is the percentage of blocks where a particular service is present, in Maple Ridge.",
  "most-annotated":
    "Let's focus on <strong>employment, childcare</strong> and <strong>schooling</strong>.",
  least: "Compared to Whistler, those services are less prioritized.",
  "least-annotated":
    "Instead, <strong>parks</strong> and <strong>health</strong> amenities are found more commonly inside Whistler's blocks.",
};

function formatPopulation(value) {
  if (!Number.isFinite(value)) return "N/A";
  return d3.format(",")(Math.round(value));
}

function computeServicePresencePercentage(rows, field) {
  if (!rows.length) return 0;
  const count = d3.sum(rows, (row) => {
    const v = row[field];
    return Number.isFinite(v) && v >= 1 ? 1 : 0;
  });
  return (count / rows.length) * 100;
}

function initOverallAccessibilityScrolly(data) {
  const grouped = d3
    .rollups(
      data,
      (rows) => {
        const servicePercentages = {};
        SERVICE_TYPE_INFO.forEach((s) => {
          servicePercentages[s.field] = computeServicePresencePercentage(
            rows,
            s.field
          );
        });
        return {
          division: rows[0]?.division || "Unknown Division",
          province: rows[0]?.province || "Unknown Province",
          blockCount: rows.length,
          population: d3.sum(rows, (r) =>
            Number.isFinite(r.population) ? r.population : 0
          ),
          ...servicePercentages,
        };
      },
      (d) => d.division
    )
    .map(([, v]) => v);

  const findCity = (name) =>
    grouped.find((d) => (d.division || "").trim().toLowerCase() === name) ||
    grouped.find((d) => (d.division || "").trim().toLowerCase().includes(name));

  const cities = { most: findCity("maple ridge"), least: findCity("whistler") };

  const container = d3.select("#overall-vis");
  container.html("");

  const cityLabel = container.append("h4").attr("class", "overall-city-label");

  const width = 800;
  const height = 480;
  const margin = { top: 20, right: 20, bottom: 60, left: 120 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = 400;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto")
    .style("font-family", "inherit");

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, chartWidth]);
  const yScale = d3
    .scaleBand()
    .domain(SERVICE_TYPE_INFO.map((d) => d.label))
    .range([0, chartHeight])
    .padding(0.28);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  chart
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat((d) => `${d}%`)
    )
    .call((g) =>
      g.selectAll("text").attr("font-size", 12).attr("fill", PALETTE.textMuted)
    )
    .call((g) =>
      g
        .selectAll("line")
        .attr("stroke", PALETTE.textMuted)
        .attr("stroke-width", 1.5)
    )
    .call((g) => g.select(".domain").attr("stroke", PALETTE.textMuted));

  chart
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 52)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", PALETTE.textMuted)
    .text("Percent of blocks in the division where the service is present");

  chart
    .append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickSize(0).tickPadding(10))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll("text")
        .attr("font-size", 12)
        .attr("fill", PALETTE.textMuted)
        .attr("font-weight", 600)
    );

  chart
    .append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(xScale).ticks(5).tickSize(chartHeight).tickFormat(""))
    .call((g) => g.attr("transform", `translate(0, 0)`))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("line").attr("stroke", PALETTE.border));

  const rows = chart
    .selectAll(".overall-bar-row")
    .data(SERVICE_TYPE_INFO)
    .join("g")
    .attr("class", "overall-bar-row")
    .attr("transform", (d) => `translate(0, ${yScale(d.label)})`);

  rows
    .append("rect")
    .attr("class", "overall-bar-bg")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", chartWidth)
    .attr("height", yScale.bandwidth())
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("fill", PALETTE.borderSubtle)
    .attr("opacity", 0.9);

  rows
    .append("rect")
    .attr("class", "overall-bar-fill")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", yScale.bandwidth())
    .attr("rx", 0)
    .attr("ry", 0)
    .attr("fill", (d) => d.color)
    .attr("opacity", 1)
    .attr("stroke", "none")
    .attr("stroke-width", 0);

  rows
    .append("text")
    .attr("class", "overall-bar-value")
    .attr("x", 8)
    .attr("y", yScale.bandwidth() / 2 + 5)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", PALETTE.textMuted)
    .text("0%");

  function updateState(stateName) {
    const isLeast = stateName === "least" || stateName === "least-annotated";
    const isAnnotated =
      stateName === "most-annotated" || stateName === "least-annotated";
    const current = isLeast ? cities.least : cities.most;
    const highlightedFields =
      CITY_HIGHLIGHTS[(current.division || "").trim().toLowerCase()] ||
      new Set();

    d3.select("#overall-narrative").html(NARRATIVES[stateName] || "");

    cityLabel.text(
      `${current.division}, ${cleanProvinceName(current.province)}  ·  ${
        current.blockCount
      } blocks  ·  Population: ${formatPopulation(current.population)}`
    );

    rows.each(function (service) {
      const currentValue = Math.max(0, +current[service.field] || 0);
      const currentBarWidth = xScale(currentValue);
      const dynamicRadius = Math.min(
        8,
        currentBarWidth / 2,
        yScale.bandwidth() / 2
      );
      const highlighted = isAnnotated && highlightedFields.has(service.field);

      d3.select(this)
        .select(".overall-bar-fill")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("width", currentBarWidth)
        .attr("rx", dynamicRadius)
        .attr("ry", dynamicRadius)
        .attr("opacity", isAnnotated ? (highlighted ? 1 : 0.22) : 1)
        .attr("stroke", highlighted ? PALETTE.text : "none")
        .attr("stroke-width", highlighted ? 2 : 0);

      d3.select(this)
        .select(".overall-bar-value")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("x", Math.min(currentBarWidth + 10, chartWidth + 10))
        .attr("font-weight", highlighted ? 800 : 700)
        .attr("fill", highlighted ? PALETTE.text : PALETTE.textMuted)
        .tween("text", function () {
          const that = d3.select(this);
          const start = parseFloat(that.text().replace("%", "")) || 0;
          const interp = d3.interpolateNumber(start, currentValue);
          return (t) => that.text(`${d3.format(".1f")(interp(t))}%`);
        });
    });
  }

  updateState("most");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateState(entry.target.dataset.state);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -25% 0px" }
  );

  document
    .querySelectorAll(".overall-step")
    .forEach((step) => observer.observe(step));
}

/* Vis 3 */
const SCATTER_POP_FILTERS = [
  { key: "all", label: "All", max: null },
  { key: "100kplus", label: "100K+", min: 100000, max: null },
  { key: "50k-100k", label: "50k–100k", min: 50000, max: 100000 },
  { key: "25k-50k", label: "25k–50k", min: 25000, max: 50000 },
  { key: "15k-25k", label: "15k-25k", min: 15000, max: 25000 },
  { key: "under15k", label: "Under 15k", min: 0, max: 15000 },
];

const scatterState = {
  activePopFilter: "all",
  bandMinRatio: 0.1,
  bandMaxRatio: 0.34,
};

function passesPopulationFilter(d, filterKey) {
  const filter = SCATTER_POP_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;

  if (filter.key === "all") return true;
  if (filter.min !== undefined && d.population < filter.min) return false;
  if (
    filter.max !== null &&
    filter.max !== undefined &&
    d.population >= filter.max
  )
    return false;
  return true;
}

function getScatterMaxPopulation(scatterData, filterKey) {
  const overallMax = d3.max(scatterData, (d) => d.population) || 1;
  const filter = SCATTER_POP_FILTERS.find((f) => f.key === filterKey);

  if (!filter || filter.key === "all") return overallMax;

  if (filter.key === "100kplus") {
    return overallMax;
  }

  return filter.max || overallMax;
}

function buildScatterPopulationButtons(data) {
  const wrap = d3.select("#scatter-pop-buttons");

  wrap
    .selectAll("button")
    .data(SCATTER_POP_FILTERS, (d) => d.key)
    .join("button")
    .attr("type", "button")
    .attr(
      "class",
      (d) =>
        `scatter-pop-btn ${
          d.key === scatterState.activePopFilter ? "active" : ""
        }`
    )
    .text((d) => d.label)
    .on("click", (_, d) => {
      scatterState.activePopFilter = d.key;
      buildScatterPopulationButtons(data);
      renderScatter(data);
    });
}

function renderScatter(data) {
  d3.select("#scatter-vis").html("");
  d3.select("#scatter-selection").html("");

  const scatterField = d3.select("#scatter-amenity-select").property("value");
  const scatterLabel =
    UA_AMENITIES.find((a) => a.field === scatterField)?.label || scatterField;

  const allServiceFields = [
    "grocery",
    "transit",
    "employment",
    "health",
    "pharmacy",
    "primary_school",
    "secondary_school",
    "childcare",
    "library",
    "park",
  ];

  const scatterData = d3
    .rollups(
      data.filter((d) => Number.isFinite(d.population)),
      (rows) => {
        let proximity;

        if (scatterField === "all") {
          const rowMeans = rows
            .map((row) => {
              const vals = allServiceFields
                .map((f) => row[f])
                .filter(Number.isFinite);
              return vals.length ? d3.mean(vals) : NaN;
            })
            .filter(Number.isFinite);

          proximity = rowMeans.length ? d3.mean(rowMeans) : NaN;
        } else {
          const vals = rows.map((d) => d[scatterField]).filter(Number.isFinite);
          proximity = vals.length ? d3.mean(vals) : NaN;
        }

        return {
          division: rows[0]?.division || "Unknown Division",
          province: rows[0]?.province || "Unknown Province",
          population: rows[0]?.population || 0,
          proximity,
          blockCount: rows.length,
        };
      },
      (d) => d.division
    )
    .map(([, value]) => value)
    .filter(
      (d) => Number.isFinite(d.population) && Number.isFinite(d.proximity)
    )
    .sort((a, b) => d3.descending(a.proximity, b.proximity));

  if (!scatterData.length) return;

  buildScatterPopulationButtons(data);

  const populationFilteredData = scatterData.filter((d) =>
    passesPopulationFilter(d, scatterState.activePopFilter)
  );

  const width = 900;
  const height = 520;
  const margin = { top: 24, right: 32, bottom: 72, left: 88 };

  const chartLeft = margin.left;
  const chartRight = width - margin.right;
  const chartTop = margin.top;
  const chartBottom = height - margin.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const xMax = getScatterMaxPopulation(
    scatterData,
    scatterState.activePopFilter
  );
  const x = d3
    .scaleLinear()
    .domain([0, xMax])
    .nice()
    .range([chartLeft, chartRight]);

  const yExtent = d3.extent(scatterData, (d) => d.proximity);
  const yPadding = ((yExtent[1] || 0) - (yExtent[0] || 0)) * 0.08 || 0.01;
  const y = d3
    .scaleLinear()
    .domain([
      Math.max(0, (yExtent[0] || 0) - yPadding),
      (yExtent[1] || 0) + yPadding,
    ])
    .nice()
    .range([chartBottom, chartTop]);

  const svg = d3
    .select("#scatter-vis")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

  svg
    .append("g")
    .attr("transform", `translate(0, ${chartBottom})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format(",")))
    .call((g) => g.selectAll("text").attr("font-size", 12))
    .call((g) => g.selectAll("line").attr("stroke", PALETTE.textMuted))
    .call((g) => g.select(".domain").attr("stroke", PALETTE.textMuted));

  svg
    .append("g")
    .attr("transform", `translate(${chartLeft}, 0)`)
    .call(d3.axisLeft(y).ticks(6))
    .call((g) => g.selectAll("text").attr("font-size", 12))
    .call((g) => g.selectAll("line").attr("stroke", PALETTE.textMuted))
    .call((g) => g.select(".domain").attr("stroke", PALETTE.textMuted));

  svg
    .append("text")
    .attr("class", "scatter-axis-label")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .text("Population");

  svg
    .append("text")
    .attr("class", "scatter-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .text(
      scatterField === "all"
        ? "Average proximity across all services"
        : `Average ${scatterLabel.toLowerCase()} proximity`
    );

  const tooltip = d3
    .select("body")
    .selectAll(".scatter-tooltip")
    .data([null])
    .join("div")
    .attr("class", "scatter-tooltip")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("background", "rgba(255,255,255,0.96)")
    .style("border", `1px solid ${PALETTE.grayMid}`)
    .style("border-radius", "10px")
    .style("padding", "0.65rem 0.8rem")
    .style("font-size", "0.9rem")
    .style("line-height", "1.35")
    .style("box-shadow", "0 6px 18px rgba(0,0,0,0.12)")
    .style("z-index", 9999);

  const bandLayer = svg.append("g");
  const pointsLayer = svg.append("g");
  const labelsLayer = svg.append("g");

  const bandWidthMin = chartWidth * 0.08;

  const clampBand = () => {
    scatterState.bandMinRatio = Math.max(
      0,
      Math.min(1, scatterState.bandMinRatio)
    );
    scatterState.bandMaxRatio = Math.max(
      0,
      Math.min(1, scatterState.bandMaxRatio)
    );

    if (scatterState.bandMaxRatio < scatterState.bandMinRatio) {
      const temp = scatterState.bandMinRatio;
      scatterState.bandMinRatio = scatterState.bandMaxRatio;
      scatterState.bandMaxRatio = temp;
    }

    if (
      scatterState.bandMaxRatio - scatterState.bandMinRatio <
      bandWidthMin / chartWidth
    ) {
      scatterState.bandMaxRatio = Math.min(
        1,
        scatterState.bandMinRatio + bandWidthMin / chartWidth
      );

      if (scatterState.bandMaxRatio >= 1) {
        scatterState.bandMaxRatio = 1;
        scatterState.bandMinRatio = Math.max(0, 1 - bandWidthMin / chartWidth);
      }
    }
  };

  clampBand();

  function getBandPixels() {
    const x1 = chartLeft + scatterState.bandMinRatio * chartWidth;
    const x2 = chartLeft + scatterState.bandMaxRatio * chartWidth;
    return { x1, x2, width: x2 - x1 };
  }

  function getBandPopulationRange() {
    const { x1, x2 } = getBandPixels();
    const popMin = x.invert(x1);
    const popMax = x.invert(x2);
    return [Math.min(popMin, popMax), Math.max(popMin, popMax)];
  }

  function getBandSelectedData() {
    const [bandPopMin, bandPopMax] = getBandPopulationRange();

    return populationFilteredData.filter(
      (d) => d.population >= bandPopMin && d.population <= bandPopMax
    );
  }

  function updateScatter() {
    const bandData = getBandSelectedData();
    const top10 = [...bandData]
      .sort((a, b) => d3.descending(a.proximity, b.proximity))
      .slice(0, 10);

    const top10Names = new Set(top10.map((d) => d.division));
    const bandSelectedNames = new Set(bandData.map((d) => d.division));
    const { x1, x2, width: bandWidth } = getBandPixels();

    bandLayer.selectAll("*").remove();

    bandLayer
      .append("rect")
      .attr("class", "scatter-band")
      .attr("x", x1)
      .attr("y", chartTop)
      .attr("width", bandWidth)
      .attr("height", chartHeight);

    bandLayer
      .append("rect")
      .attr("class", "scatter-band-handle")
      .attr("x", x1)
      .attr("y", chartTop)
      .attr("width", bandWidth)
      .attr("height", chartHeight)
      .call(
        d3.drag().on("drag", (event) => {
          const dxRatio = event.dx / chartWidth;
          const currentWidth =
            scatterState.bandMaxRatio - scatterState.bandMinRatio;

          scatterState.bandMinRatio += dxRatio;
          scatterState.bandMaxRatio += dxRatio;

          if (scatterState.bandMinRatio < 0) {
            scatterState.bandMinRatio = 0;
            scatterState.bandMaxRatio = currentWidth;
          }

          if (scatterState.bandMaxRatio > 1) {
            scatterState.bandMaxRatio = 1;
            scatterState.bandMinRatio = 1 - currentWidth;
          }

          clampBand();
          updateScatter();
        })
      );

    pointsLayer
      .selectAll("circle")
      .data(populationFilteredData, (d) => d.division)
      .join("circle")
      .attr("class", "scatter-dot")
      .attr("cx", (d) => x(d.population))
      .attr("cy", (d) => y(d.proximity))
      .attr("r", 5.5)
      .attr("fill", (d) =>
        bandSelectedNames.has(d.division)
          ? PALETTE.chartAccent
          : PALETTE.grayMid
      )
      .attr("opacity", 0.6)
      .on("mouseenter", function (event, d) {
        pointsLayer.selectAll("circle").classed("is-hovered", false);
        d3.select(this).classed("is-hovered", true);

        tooltip.style("opacity", 1).html(`
    <strong>${d.division}</strong><br>
    Population: ${d3.format(",")(d.population)}<br>
    Average proximity: ${d3.format(".3f")(d.proximity)}<br>
    Blocks: ${d.blockCount}
  `);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY + 12}px`);
      })
      .on("mouseleave", function () {
        pointsLayer.selectAll("circle").classed("is-hovered", false);
        tooltip.style("opacity", 0);
      });

    labelsLayer.selectAll("*").remove();

    labelsLayer
      .selectAll("text")
      .data(top10, (d) => d.division)
      .join("text")
      .attr("class", "scatter-label")
      .attr("x", (d) => x(d.population) + 8)
      .attr("y", (d) => y(d.proximity) - 8)
      .text((d) => d.division);

    renderScatterRanking(top10, scatterLabel, y);
  }

  updateScatter();
}

function renderScatterRanking(top10, amenityLabel, yScale) {
  const container = d3.select("#scatter-selection");
  container.html("");

  const tooltip = d3.select(".scatter-tooltip");

  container
    .append("div")
    .attr("class", "scatter-secondary-title")
    .text(
      `Top 10 cities in the filter band ranked by highest average ${amenityLabel.toLowerCase()} proximity`
    );

  if (!top10.length) {
    container
      .append("div")
      .attr("class", "scatter-empty-note")
      .text(
        "No cities fall inside the grey filter band for this population view."
      );
    return;
  }

  const width = 760;
  const fixedHeight = 400;
  const margin = { top: 12, right: 24, bottom: 48, left: 170 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = fixedHeight - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${fixedHeight}`)
    .style("width", "100%")
    .style("height", "auto");

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left - 50}, ${margin.top})`);

  const x = d3.scaleLinear().domain(yScale.domain()).range([0, innerWidth]);
  const rowHeight = 24;
  const rowGap = 10;
  const barStep = rowHeight + rowGap;

  const y = (division) =>
    top10.findIndex((d) => d.division === division) * barStep;
  chart
    .append("g")
    .attr("class", "rank-grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(innerHeight).tickFormat(""))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("line").attr("stroke", PALETTE.border));

  chart
    .selectAll(".rank-bar")
    .data(top10, (d) => d.division)
    .join("rect")
    .attr("class", "rank-bar")
    .attr("x", 0)
    .attr("y", (d) => y(d.division))
    .attr("width", (d) => x(d.proximity))
    .attr("height", rowHeight)
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", PALETTE.chartAccent)
    .attr("opacity", 0.95)
    .attr("stroke", (_, i) => (i === 0 ? PALETTE.text : "none"))
    .attr("stroke-width", (_, i) => (i === 0 ? 2 : 0))
    .on("mouseenter", function (event, d) {
      tooltip.style("opacity", 1).html(`
      <strong>${d.division}</strong><br>
      Population: ${d3.format(",")(d.population)}<br>
      Average proximity: ${d3.format(".3f")(d.proximity)}<br>
      Blocks: ${d.blockCount}
    `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY + 12}px`);
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
    });

  chart
    .selectAll(".rank-best-fit")
    .data(top10.slice(0, 1))
    .join("text")
    .attr("class", "rank-best-fit")
    .attr("x", (d) => Math.min(x(d.proximity) + 10, innerWidth + 10))
    .attr("y", (d) => y(d.division) + rowHeight / 2 + 5)
    .attr("font-size", 12)
    .attr("font-weight", 800)
    .attr("fill", PALETTE.text)
    .text("Highest match!");

  chart
    .append("g")
    .attr("class", "rank-y-axis")
    .selectAll("text")
    .data(top10, (d) => d.division)
    .join("text")
    .attr("class", "scatter-rank-label")
    .attr("x", -10)
    .attr("y", (d) => y(d.division) + rowHeight / 2 + 5)
    .attr("text-anchor", "end")
    .text((d) => d.division);

  chart
    .append("g")
    .attr("class", "rank-x-axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(
      d3.axisBottom(x).tickValues(yScale.ticks(6)).tickFormat(d3.format(".2f"))
    )
    .call((g) =>
      g.selectAll("text").attr("font-size", 12).attr("fill", PALETTE.textMuted)
    )
    .call((g) => g.selectAll("line").attr("stroke", PALETTE.textMuted))
    .call((g) => g.select(".domain").attr("stroke", PALETTE.textMuted));

  svg
    .append("text")
    .attr("class", "scatter-axis-label")
    .attr("x", width / 2)
    .attr("y", fixedHeight - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(`Average ${amenityLabel.toLowerCase()} proximity index`);
}
// ── BC TIME-TO-LIFE INDEX VISUALIZATION ──────────────────────────────

// ── LIFESTYLE ARCHETYPES ─────────────────────────────────────────────

const serviceColors = {
  grocery: PALETTE.grocery,
  transit: PALETTE.transit,
  health: PALETTE.health,
  parks: PALETTE.park,
};

let archetypesData = [];

async function loadData() {
  try {
    const response = await fetch("archetypes_data_real.json");
    archetypesData = await response.json();

    renderArchetypes();
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

const ARCHETYPE_STYLES = {
  "Urban convenience": {
    overlay: "rgba(147, 210, 253, 0.3)",
    image:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=80",
  },
  "Balanced access": {
    overlay: "rgba(250, 220, 80, 0.3)",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80",
  },
  "Car-dependent suburb": {
    overlay: "rgba(251, 146, 60, 0.3)",
    image: "/data/carSuburb.jpg",
  },
  "Island lifestyle": {
    overlay: "rgba(110, 220, 150, 0.3)",
    image:
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&q=80",
  },
};

function renderArchetypes(filter = "") {
  const grid = document.getElementById("archetypesGrid");
  grid.replaceChildren();

  const filtered = filter
    ? archetypesData.filter(
        (a) => a.name.toLowerCase().replace(/\s+/g, "_") === filter
      )
    : archetypesData;

  for (const arch of filtered) {
    const style = ARCHETYPE_STYLES[arch.name] || {
      overlay: "rgba(200,200,200,0.3)",
      image: "",
    };

    const card = document.createElement("div");
    card.className = "archetype-card";
    card.style.setProperty("--card-overlay", style.overlay);
    card.style.setProperty("--card-image", `url('${style.image}')`);

    // ── Header (sits on top of the photo) ──
    const archHeader = document.createElement("div");
    archHeader.className = "archetype-header";

    const iconDiv = document.createElement("div");
    iconDiv.className = "archetype-icon";
    iconDiv.textContent = arch.icon;
    archHeader.appendChild(iconDiv);

    const titleWrap = document.createElement("div");
    const titleDiv = document.createElement("div");
    titleDiv.className = "archetype-title";
    titleDiv.textContent = arch.name;
    titleWrap.appendChild(titleDiv);

    const descDiv = document.createElement("div");
    descDiv.className = "archetype-desc";
    descDiv.textContent = arch.desc;
    titleWrap.appendChild(descDiv);

    archHeader.appendChild(titleWrap);
    card.appendChild(archHeader);

    // ── Content panel (white bg so text stays readable) ──
    const contentPanel = document.createElement("div");
    contentPanel.className = "archetype-content-panel";

    for (const [service, value] of Object.entries(arch.avg_scores)) {
      const barDiv = document.createElement("div");
      barDiv.className = "service-bar";

      const labelDiv = document.createElement("div");
      labelDiv.className = "service-label";
      labelDiv.textContent = service;
      barDiv.appendChild(labelDiv);

      const barBg = document.createElement("div");
      barBg.className = "service-bar-bg";

      const barFill = document.createElement("div");
      barFill.className = "service-bar-fill";
      barFill.style.width = `${Math.min((value / 20) * 100, 100)}%`;
      barFill.style.background = serviceColors[service];
      barBg.appendChild(barFill);
      barDiv.appendChild(barBg);

      const valueDiv = document.createElement("div");
      valueDiv.className = "service-value";
      valueDiv.textContent = Math.round(value);
      barDiv.appendChild(valueDiv);

      contentPanel.appendChild(barDiv);
    }

    const citiesSection = document.createElement("div");
    citiesSection.className = "example-cities";

    const citiesLabel = document.createElement("strong");
    citiesLabel.textContent = "Example regions:";
    citiesSection.appendChild(citiesLabel);

    const cityList = document.createElement("div");
    cityList.className = "city-list";

    for (const city of arch.example_cities) {
      const tag = document.createElement("div");
      tag.className = "city-tag";
      tag.textContent = city;
      cityList.appendChild(tag);
    }
    citiesSection.appendChild(cityList);
    contentPanel.appendChild(citiesSection);
    card.appendChild(contentPanel);

    grid.appendChild(card);
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : "255, 255, 255";
}

loadData();

// ── BC TIME-TO-LIFE INDEX CHART ───────────────────────────────────────

// Service colors
const colors = {
  grocery: "#7fd3a0", // green
  transit: "#5b9fd4", // blue
  healthcare: "#f4a5a5", // pink/red
  parks: "#f4d79f", // yellow/beige
};

const services = ["grocery", "transit", "healthcare", "parks"];

// ── Legend ────────────────────────────────────────────────────────────
function renderLegend() {
  const legend = document.getElementById("legend");
  legend.replaceChildren();

  for (const svc of services) {
    const item = document.createElement("div");
    item.className = "legend-item";

    const swatch = document.createElement("div");
    swatch.className = "legend-swatch";
    swatch.style.background = colors[svc];
    item.appendChild(swatch);

    const label = document.createElement("span");
    label.textContent = svc;
    item.appendChild(label);

    legend.appendChild(item);
  }
}

// ── Tooltip element (shared, created once) ────────────────────────────
const chartTooltip = (() => {
  const el = document.createElement("div");
  el.id = "chart-tooltip";
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.15s ease;
    background: #ffffff;
    border: 1px solid #e4e4e0;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    min-width: 210px;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  document.body.appendChild(el);
  return el;
})();

function showChartTooltip(event, cityData, hoveredService) {
  const serviceLabels = {
    grocery: "Grocery",
    transit: "Transit",
    healthcare: "Healthcare",
    parks: "Parks",
  };
  const totalHours = (cityData.total / 60).toFixed(1);

  const rows = services
    .map((svc) => {
      const mins = cityData[svc];
      const isHovered = svc === hoveredService;
      const pct = Math.round((mins / cityData.total) * 100);
      return `
      <div style="
        display:flex; align-items:center; gap:10px;
        padding:5px 8px; border-radius:7px; margin-bottom:2px;
        background:${isHovered ? "rgba(0,0,0,0.04)" : "transparent"};
        font-weight:${isHovered ? "600" : "400"};
      ">
        <span style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${
          colors[svc]
        };
          ${isHovered ? "box-shadow:0 0 0 2px rgba(0,0,0,0.15);" : ""}"></span>
        <span style="flex:1;color:#6b7080;font-size:0.8125rem;">${
          serviceLabels[svc]
        }</span>
        <span style="color:#18181a;font-size:0.8125rem;font-weight:600;">${mins} min</span>
        <span style="color:#9a9fad;font-size:0.75rem;min-width:30px;text-align:right;">${pct}%</span>
      </div>`;
    })
    .join("");

  chartTooltip.innerHTML = `
    <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #efefec;">
      <div style="font-size:1rem;font-weight:700;color:#18181a;letter-spacing:-0.01em;">${
        cityData.city
      }</div>
      <div style="font-size:0.75rem;color:#9a9fad;margin-top:1px;">Weekly travel time to services</div>
    </div>
    ${rows}
    <div style="display:flex;justify-content:space-between;align-items:center;
      margin-top:10px;padding-top:10px;border-top:1px solid #efefec;">
      <span style="font-size:0.8125rem;font-weight:600;color:#18181a;">Total</span>
      <span style="font-size:0.8125rem;font-weight:700;color:#2563eb;">${Math.round(
        cityData.total
      )} min
        <span style="font-weight:400;color:#9a9fad;">&nbsp;(${totalHours} hrs/wk)</span>
      </span>
    </div>`;

  positionChartTooltip(event);
  chartTooltip.style.opacity = "1";
}

function positionChartTooltip(event) {
  const pad = 14;
  const tw = chartTooltip.offsetWidth || 220;
  const th = chartTooltip.offsetHeight || 180;
  let left = event.clientX + pad;
  let top = event.clientY - th / 2;
  if (left + tw > window.innerWidth - pad) left = event.clientX - tw - pad;
  if (top < pad) top = pad;
  if (top + th > window.innerHeight - pad) top = window.innerHeight - th - pad;
  chartTooltip.style.left = left + "px";
  chartTooltip.style.top = top + "px";
}

function hideChartTooltip() {
  chartTooltip.style.opacity = "0";
}

// ── Draw chart (receives data from fetch) ─────────────────────────────
function drawChart(data) {
  const svg = d3.select("#chart");
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const width =
    Math.min(900, window.innerWidth - 80) - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  svg.attr(
    "viewBox",
    `0 0 ${width + margin.left + margin.right} ${
      height + margin.top + margin.bottom
    }`
  );

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.city))
    .range([0, width])
    .padding(0.2);

  const maxTotal = d3.max(data, (d) => d.total) || 800;
  const y = d3
    .scaleLinear()
    .domain([0, maxTotal * 1.1])
    .nice()
    .range([height, 0]);

  const stack = d3.stack().keys(services);
  const stackedData = stack(data);

  // Grid lines (drawn first so bars appear on top)
  g.selectAll(".grid-line")
    .data(y.ticks(5))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "#eee")
    .attr("stroke-dasharray", "4 4")
    .attr("stroke-width", 1);

  // Stacked bars
  const groups = g
    .selectAll("g.service")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "service")
    .attr("fill", (d) => colors[d.key]);

  groups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.data.city))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .style("transition", "filter 0.15s, opacity 0.15s")
    .on("mousemove", function (event, d) {
      const hoveredService = d3.select(this.parentNode).datum().key;
      svg
        .selectAll("g.service rect")
        .style("opacity", (rd) => (rd.data.city === d.data.city ? 1 : 0.45))
        .style("filter", function (rd) {
          const pk = d3.select(this.parentNode).datum().key;
          return rd.data.city === d.data.city && pk === hoveredService
            ? "brightness(1.08)"
            : "none";
        });
      showChartTooltip(event, d.data, hoveredService);
    })
    .on("mouseleave", function () {
      svg
        .selectAll("g.service rect")
        .style("opacity", 1)
        .style("filter", "none");
      hideChartTooltip();
    });

  // Invisible full-height hit targets per city
  g.selectAll(".city-hit")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "city-hit")
    .attr("x", (d) => x(d.city))
    .attr("y", 0)
    .attr("height", height)
    .attr("width", x.bandwidth())
    .attr("fill", "transparent")
    .style("cursor", "pointer")
    .on("mousemove", function (event, d) {
      const [, my] = d3.pointer(event, g.node());
      const yVal = y.invert(my);
      let cumulative = 0;
      let hoveredService = services[services.length - 1];
      for (const svc of services) {
        cumulative += d[svc];
        if (yVal <= cumulative) {
          hoveredService = svc;
          break;
        }
      }
      svg
        .selectAll("g.service rect")
        .style("opacity", (rd) => (rd.data.city === d.city ? 1 : 0.45))
        .style("filter", function (rd) {
          const pk = d3.select(this.parentNode).datum().key;
          return rd.data.city === d.city && pk === hoveredService
            ? "brightness(1.08)"
            : "none";
        });
      showChartTooltip(event, d, hoveredService);
    })
    .on("mouseleave", function () {
      svg
        .selectAll("g.service rect")
        .style("opacity", 1)
        .style("filter", "none");
      hideChartTooltip();
    });

  // Total labels on top of bars
  g.selectAll(".total-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "total-label")
    .attr("x", (d) => x(d.city) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.total) - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text((d) => Math.round(d.total));

  // Y axis
  g.append("g")
    .call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((d) => d)
    )
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .style("fill", "#666")
    .text("minutes per week");

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#666");
}

// ── Init: aggregate from already-loaded bcData ────────────────────────
function initTimeIndex(bcData) {
  const TARGET_CITIES = [
    "Vancouver",
    "Victoria",
    "Burnaby",
    "Chilliwack",
    "Prince George",
    "Fort St. John",
  ];

  // Map chart service keys → parsed data field names
  const SERVICE_FIELDS = {
    grocery: "grocery",
    transit: "transit",
    healthcare: "health",
    parks: "park",
  };

  const WEEKLY_TRIPS = 10; // 5 trips × 2 (there + back)

  const cityGroups = d3.group(bcData, (d) => d.division);

  const data = TARGET_CITIES.map((city) => {
    const rows = cityGroups.get(city) || [];

    const serviceMinutes = {};
    for (const [chartKey, dataField] of Object.entries(SERVICE_FIELDS)) {
      const values = rows.map((r) => r[dataField]).filter(Number.isFinite);
      const avg = values.length ? d3.mean(values) : 0;
      serviceMinutes[chartKey] =
        avg > 0 ? Math.round(proxToMinutes(avg) * WEEKLY_TRIPS) : 0;
    }

    return {
      city,
      ...serviceMinutes,
      total: Object.values(serviceMinutes).reduce((a, b) => a + b, 0),
    };
  });

  renderLegend();
  drawChart(data);
}
//- MAP VISUALIZATION

const METRO_CMA = "Vancouver";

const ALL_SERVICES = [
  { key: "grocery", label: "Grocery Store", field: "prox_idx_grocery" },
  { key: "transit", label: "Transit", field: "prox_idx_transit" },
  { key: "emp", label: "Employment", field: "prox_idx_emp" },
  { key: "health", label: "Health Facility", field: "prox_idx_health" },
  { key: "pharma", label: "Pharmacy", field: "prox_idx_pharma" },
  { key: "educpri", label: "Primary School", field: "prox_idx_educpri" },
  { key: "educsec", label: "Secondary School", field: "prox_idx_educsec" },
  { key: "childcare", label: "Childcare", field: "prox_idx_childcare" },
  { key: "lib", label: "Library", field: "prox_idx_lib" },
  { key: "parks", label: "Parks", field: "prox_idx_parks" },
];

function proxToMinutes(p) {
  if (!p || p <= 0) return 60;
  return Math.min(60, Math.max(1, Math.round(-7 * Math.log(p))));
}
function minutesToProx(m) {
  return Math.exp(-m / 7);
}

let allData = [];
let csds = [];
let activeFilters = [
  {
    key: "childcare",
    label: "Childcare",
    field: "prox_idx_childcare",
    minutes: 15,
  },
  { key: "parks", label: "Parks", field: "prox_idx_parks", minutes: 15 },
];
let selectedCSD = "";
let pickerOpen = false;

// Leaflet stuff
let map,
  canvasRenderer,
  markersLayer = null;

function initMap() {
  map = L.map("map", { zoomControl: true, preferCanvas: true }).setView(
    [49.25, -122.9],
    10
  );

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }
  ).addTo(map);

  canvasRenderer = L.canvas({ padding: 0.5 });
  markersLayer = L.layerGroup().addTo(map);
}

window.addEventListener("DOMContentLoaded", () => {
  initMap();

  fetch(DATA_PATH)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.text();
    })
    .then((text) => {
      const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
      processData(data);
    })
    .catch((err) => {
      console.error("Failed to load CSV:", err);
    });
});

function processData(raw) {
  const fields = ALL_SERVICES.map((s) => s.field);

  allData = raw
    .filter((d) => d.CMANAME && d.CMANAME.trim() === METRO_CMA)
    .map((d) => {
      const prox = {};
      for (const f of fields) {
        const v = d[f];
        prox[f] = v === ".." || v === "" || v == null ? null : parseFloat(v);
      }
      return {
        DBUID: d.DBUID,
        CSDUID: d.CSDUID || d.CSUID || "",
        CSDNAME: (d.CSDNAME || "Unknown").trim(),
        DBPOP: parseFloat(d.DBPOP) || 0,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
        prox,
      };
    })
    .filter((d) => !isNaN(d.lat) && !isNaN(d.lon));

  const csdMap = {};
  for (const d of allData) {
    if (!csdMap[d.CSDUID]) csdMap[d.CSDUID] = d.CSDNAME;
  }
  csds = Object.entries(csdMap)
    .map(([uid, name]) => ({ uid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sel = document.getElementById("csd-select");
  for (const c of csds) {
    const opt = document.createElement("option");
    opt.value = c.uid;
    opt.textContent = c.name;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    selectedCSD = sel.value;
    updateMap();
  });

  document.getElementById("map-loading").style.display = "none";
  document.getElementById("block-count").style.display = "block";
  renderFilters();
  updateMap();
}

function updateMap() {
  markersLayer.clearLayers();

  let subset = selectedCSD
    ? allData.filter((d) => d.CSDUID === selectedCSD)
    : allData;

  const visible = subset.filter((d) => {
    for (const f of activeFilters) {
      const v = d.prox[f.field];
      if (v === null || v < minutesToProx(f.minutes)) return false;
    }
    return true;
  });

  document.getElementById("visible-count").textContent =
    visible.length.toLocaleString();

  if (visible.length === 0) {
    return;
  }

  const withAvg = visible.map((d) => {
    let avg;
    if (activeFilters.length === 0) {
      avg = 0;
    } else {
      const sum = activeFilters.reduce((s, f) => s + (d.prox[f.field] ?? 0), 0);
      avg = sum / activeFilters.length;
    }
    return { ...d, avg };
  });

  const avgs = withAvg.map((d) => d.avg);
  const minAvg = Math.min(...avgs);
  const maxAvg = Math.max(...avgs);
  const range = maxAvg - minAvg || 1;

  for (const d of withAvg) {
    const ratio = (d.avg - minAvg) / range;
    const color = proximityColor(ratio);

    L.circleMarker([d.lat, d.lon], {
      renderer: canvasRenderer,
      radius: 5,
      fillColor: color,
      fillOpacity: 0.85,
      color: "rgba(0,0,0,0.15)",
      weight: 0.5,
    })
      .bindTooltip(buildTooltip(d), {
        sticky: true,
        opacity: 1,
        className: "leaflet-tooltip",
        offset: [12, 0],
      })
      .addTo(markersLayer);
  }
}

function proximityColor(ratio) {
  const stops = [
    { r: 0, c: [250, 204, 21] }, // yellow    #facc15
    { r: 0.33, c: [74, 222, 128] }, // green     #4ade80
    { r: 0.67, c: [59, 130, 246] }, // blue      #3b82f6
    { r: 1, c: [30, 64, 175] }, // dark blue #1e40af
  ];
  let lo = stops[0],
    hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (ratio <= stops[i + 1].r) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = (ratio - lo.r) / (hi.r - lo.r || 1);
  const r = Math.round(lo.c[0] + t * (hi.c[0] - lo.c[0]));
  const g = Math.round(lo.c[1] + t * (hi.c[1] - lo.c[1]));
  const b = Math.round(lo.c[2] + t * (hi.c[2] - lo.c[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

function buildTooltip(d) {
  const container = document.createElement("div");
  container.className = "block-tooltip";

  const idDiv = document.createElement("div");
  idDiv.className = "tt-id";
  idDiv.textContent = `Block ${d.DBUID}`;
  container.appendChild(idDiv);

  const csdDiv = document.createElement("div");
  csdDiv.className = "tt-csd";
  csdDiv.textContent = d.CSDNAME;
  container.appendChild(csdDiv);

  for (const f of activeFilters) {
    const v = d.prox[f.field];
    const mins = v !== null ? proxToMinutes(v) : "—";
    const color =
      v !== null
        ? proximityColor(
            (v - minutesToProx(f.minutes)) / (1 - minutesToProx(f.minutes))
          )
        : PALETTE.grayMid;

    const row = document.createElement("div");
    row.className = "tt-svc";

    const dot = document.createElement("div");
    dot.className = "tt-dot";
    dot.style.background = color;
    row.appendChild(dot);

    const lbl = document.createElement("span");
    lbl.className = "tt-svc-label";
    lbl.textContent = f.label;
    row.appendChild(lbl);

    const val = document.createElement("span");
    val.className = "tt-svc-val";
    val.textContent = mins !== "—" ? `${mins} min` : "—";
    row.appendChild(val);

    container.appendChild(row);
  }

  return container;
}

function addService(key) {
  const svc = ALL_SERVICES.find((s) => s.key === key);
  if (!svc || activeFilters.find((f) => f.key === key)) return;
  activeFilters.push({ ...svc, minutes: 15 });
  pickerOpen = false;
  renderFilters();
  updateMap();
}

function removeService(key) {
  activeFilters = activeFilters.filter((f) => f.key !== key);
  renderFilters();
  updateMap();
}

function updateMinutes(key, minutes) {
  const f = activeFilters.find((f) => f.key === key);
  if (f) f.minutes = parseInt(minutes);
  updateMap();
}

function renderFilters() {
  const list = document.getElementById("service-list");
  list.replaceChildren();

  for (const f of activeFilters) {
    const card = document.createElement("div");
    card.className = "service-card";

    const header = document.createElement("div");
    header.className = "service-card-header";

    const name = document.createElement("span");
    name.className = "svc-name";
    name.textContent = f.label;
    header.appendChild(name);

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;align-items:center;gap:0.3rem";

    const timeLabel = document.createElement("span");
    timeLabel.className = "svc-time";
    timeLabel.id = `time-label-${f.key}`;
    timeLabel.textContent = `${f.minutes} min walk`;
    controls.appendChild(timeLabel);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.title = "Remove";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => removeService(f.key);
    controls.appendChild(removeBtn);

    header.appendChild(controls);
    card.appendChild(header);

    const sliderRow = document.createElement("div");
    sliderRow.className = "slider-row";

    const minLabel = document.createElement("span");
    minLabel.textContent = "5 min";
    sliderRow.appendChild(minLabel);

    const input = document.createElement("input");
    input.type = "range";
    input.min = "5";
    input.max = "30";
    input.step = "1";
    input.value = f.minutes;
    input.oninput = function () {
      timeLabel.textContent = `${this.value} min walk`;
      updateMinutes(f.key, this.value);
    };
    sliderRow.appendChild(input);

    const maxLabel = document.createElement("span");
    maxLabel.textContent = "30 min";
    sliderRow.appendChild(maxLabel);

    card.appendChild(sliderRow);
    list.appendChild(card);
  }

  buildPickerList();
}

function buildPickerList() {
  const picker = document.getElementById("svc-picker");
  picker.replaceChildren();

  const activeKeys = activeFilters.map((f) => f.key);
  const available = ALL_SERVICES.filter((s) => !activeKeys.includes(s.key));

  for (const s of available) {
    const item = document.createElement("div");
    item.className = "svc-picker-item";
    item.textContent = s.label;
    item.onclick = () => addService(s.key);
    picker.appendChild(item);
  }
}

function togglePicker() {
  pickerOpen = !pickerOpen;
  document.getElementById("svc-picker").classList.toggle("open", pickerOpen);
}

document.addEventListener("click", (e) => {
  if (!document.getElementById("add-svc-wrap").contains(e.target)) {
    pickerOpen = false;
    document.getElementById("svc-picker").classList.remove("open");
  }
});
