const DATA_PATH = "./PMD-en.csv";

const SERVICE_TYPE_INFO = [
  { label: "Employment", field: "in_db_emp", color: "#4363ee" },
  { label: "Pharmacy", field: "in_db_pharma", color: "#6c63ff" },
  { label: "Childcare", field: "in_db_childcare", color: "#f2b441" },
  { label: "Health", field: "in_db_health", color: "#e49b8c" },
  { label: "Grocery", field: "in_db_grocery", color: "#58a55c" },
  { label: "Primary School", field: "in_db_educpri", color: "#2a9d8f" },
  { label: "Secondary School", field: "in_db_educsec", color: "#8e7dff" },
  { label: "Library", field: "in_db_lib", color: "#c77dff" },
  { label: "Park", field: "in_db_parks", color: "#7cb342" },
  { label: "Transit", field: "in_db_transit", color: "#f28482" },
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

      initDropdown();
      render(bcData);
      initOverallAccessibilityScrolly(bcData);
      renderScatter(bcData);
      d3.select("#amenity-select").on("change", () => {
        render(bcData);
      });
    })
    .catch((error) => {
      console.error(error);
      showError(
        "Could not load the dataset. Check the file path and column names in index.js.",
      );
    });
});

function initDropdown() {
  d3.select("#amenity-select")
    .selectAll("option")
    .data(Object.keys(AMENITY_INFO))
    .join("option")
    .attr("value", (d) => d)
    .property("selected", (d) => d === "Grocery")
    .text((d) => d);
}

function render(data) {
  d3.select("#chart1").html("");
  d3.select("#message").html("");

  const selectedAmenity = d3.select("#amenity-select").property("value");
  const amenityInfo = AMENITY_INFO[selectedAmenity];
  const field = amenityInfo?.field;

  if (!field) {
    showError("No amenity field found for the selected dropdown value.");
    return;
  }

  const validRows = data.filter((d) => Number.isFinite(d[field]));

  if (!validRows.length) {
    showError(
      `No valid rows found for ${selectedAmenity} in British Columbia.`,
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
      (d) => d.division,
    )
    .map(([, value]) => value)
    .filter((d) => Number.isFinite(d.indexValue));

  if (!divisionRows.length) {
    showError(
      `No division-level values could be calculated for ${selectedAmenity}.`,
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
    Number.isFinite(d.estimatedMinutes),
  );

  if (!walkRows.length) {
    showError(
      `No estimated walking times could be calculated for ${selectedAmenity}.`,
    );
    return;
  }

  const sortedByIndex = walkRows
    .slice()
    .sort((a, b) => d3.descending(a.indexValue, b.indexValue));

  const shortestWalk = sortedByIndex[0];
  const longestWalk = sortedByIndex[sortedByIndex.length - 1];

  const maxMinutes = Math.max(
    12,
    d3.max(walkRows, (d) => d.estimatedMinutes) || 12,
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
    datum: shortestWalk,
    amenity: selectedAmenity,
    xScale,
    colorScale: timeColor,
    maxMinutes,
    icon: amenityInfo.icon,
    thresholdLabel: amenityInfo.label,
  });

  drawWalkingRow(svg, {
    y: 545,
    datum: longestWalk,
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
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", y + 64)
      .attr("font-size", 13)
      .attr(
        "text-anchor",
        i === 0 ? "start" : i === tickValues.length - 1 ? "end" : "middle",
      )
      .attr("fill", "#555")
      .text(`${Math.round(val)} min`);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", y + 84)
      .attr("font-size", 12)
      .attr(
        "text-anchor",
        i === 0 ? "start" : i === tickValues.length - 1 ? "end" : "middle",
      )
      .attr("fill", "#555")
      .text(tickLabels[i]);
  });
}

function drawBarWithTrack(
  svg,
  { barX, barY, barHeight, trackWidth, visibleBarWidth, fill, icon },
) {
  svg
    .append("rect")
    .attr("x", barX)
    .attr("y", barY)
    .attr("width", trackWidth)
    .attr("height", barHeight)
    .attr("rx", 23)
    .attr("ry", 23)
    .attr("fill", "#e6e6e6");

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
    .attr("fill", "#555")
    .text(`Average proximity index: ${proximityText}`);

  svg
    .append("text")
    .attr("x", leftX)
    .attr("y", y + 186)
    .attr("font-size", 17)
    .attr("fill", "#555")
    .text(
      `Approximation based on the ${thresholdLabel}, averaged across blocks in this division.`,
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
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5);

    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", barY + barHeight + 48)
      .attr("font-size", 14)
      .attr("font-weight", 500)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
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
    .attr("fill", "#555")
    .text(
      `Measured using ${label}, averaged across blocks in this division. Walking-time estimate not shown.`,
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
const MIN_BLOCK_THRESHOLD = 100;

function formatPopulation(value) {
  if (!Number.isFinite(value)) return "N/A";
  return d3.format(",")(Math.round(value));
}

function countServicePresenceAcrossBlocks(rows, field) {
  return d3.sum(rows, (row) => {
    const value = row[field];
    return Number.isFinite(value) && value >= 1 ? 1 : 0;
  });
}

function computeServicePresencePercentage(rows, field) {
  if (!rows.length) return 0;
  const count = countServicePresenceAcrossBlocks(rows, field);
  return (count / rows.length) * 100;
}

function computeOverallAccessibilityExtremes(data) {
  const grouped = d3
    .rollups(
      data,
      (rows) => {
        const servicePercentages = {};

        SERVICE_TYPE_INFO.forEach((service) => {
          servicePercentages[service.field] = computeServicePresencePercentage(
            rows,
            service.field,
          );
        });

        const averageServicePercentage =
          d3.mean(SERVICE_TYPE_INFO, (service) => {
            return servicePercentages[service.field];
          }) || 0;

        const population = d3.sum(rows, (row) =>
          Number.isFinite(row.population) ? row.population : 0,
        );

        return {
          division: rows[0]?.division || "Unknown Division",
          province: rows[0]?.province || "Unknown Province",
          blockCount: rows.length,
          population,
          averageServicePercentage,
          ...servicePercentages,
        };
      },
      (d) => d.division,
    )
    .map(([, value]) => value)
    .filter((d) => Number.isFinite(d.averageServicePercentage));

  if (!grouped.length) return null;

  const eligible = grouped.filter((d) => d.blockCount >= MIN_BLOCK_THRESHOLD);
  const pool = eligible.length ? eligible : grouped;

  const sorted = pool
    .slice()
    .sort((a, b) =>
      d3.descending(a.averageServicePercentage, b.averageServicePercentage),
    );

  const most = sorted[0];

  const kelowna =
    pool.find((d) => (d.division || "").trim().toLowerCase() === "kelowna") ||
    pool.find((d) =>
      (d.division || "").trim().toLowerCase().includes("kelowna"),
    ) ||
    sorted[sorted.length - 1];

  return {
    most,
    least: kelowna,
    grouped: pool,
  };
}

function getTopServicesForDivision(divisionData, topN = 3) {
  return SERVICE_TYPE_INFO.map((service) => ({
    ...service,
    value: Number.isFinite(divisionData[service.field])
      ? divisionData[service.field]
      : 0,
  }))
    .sort((a, b) => d3.descending(a.value, b.value))
    .slice(0, topN);
}

function formatServiceList(services) {
  const names = services.map((d) => d.label);

  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function initOverallAccessibilityScrolly(data) {
  const extremes = computeOverallAccessibilityExtremes(data);

  if (!extremes) {
    d3.select("#overall-vis").html(
      "<div class='error'>Could not compute overall accessibility.</div>",
    );
    return;
  }

  const container = d3.select("#overall-vis");
  container.html("");

  const layout = container.append("div").attr("class", "overall-layout");

  const visPane = layout.append("div").attr("class", "overall-vis-pane");
  const note = layout.append("div").attr("class", "overall-note");

  const width = 1200;
  const height = 780;

  const svg = visPane
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

  const margin = { top: 90, right: 120, bottom: 90, left: 260 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = 460;

  const maxPercent = d3.max(extremes.grouped, (division) =>
    d3.max(SERVICE_TYPE_INFO, (service) => {
      const value = division[service.field];
      return Number.isFinite(value) ? value : 0;
    }),
  );

  const xScale = d3
    .scaleLinear()
    .domain([0, Math.max(100, maxPercent || 0)])
    .nice()
    .range([0, chartWidth]);

  const yScale = d3
    .scaleBand()
    .domain(SERVICE_TYPE_INFO.map((d) => d.label))
    .range([0, chartHeight])
    .padding(0.28);

  const overallTitle = svg
    .append("text")
    .attr("x", 40)
    .attr("y", 38)
    .attr("font-size", 30)
    .attr("font-weight", 800);

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
        .tickFormat((d) => `${d}%`),
    )
    .call((g) => g.selectAll("text").attr("font-size", 13))
    .call((g) => g.selectAll("line").attr("stroke", "#555"))
    .call((g) => g.select(".domain").attr("stroke", "#555"));

  chart
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 52)
    .attr("text-anchor", "middle")
    .attr("font-size", 15)
    .attr("fill", "#555")
    .text("Percent of blocks in the division where the service is present");

  chart
    .append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll("text").attr("font-size", 16).attr("font-weight", 700),
    );

  chart
    .append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(xScale).ticks(5).tickSize(chartHeight).tickFormat(""))
    .call((g) => g.attr("transform", `translate(0, 0)`))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("line").attr("stroke", "#ddd"));

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
    .attr("fill", "#e3e3e3")
    .attr("opacity", 0.9);

  rows
    .append("rect")
    .attr("class", "overall-bar-reference")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", (d) => {
      const referenceValue = Math.max(0, +extremes.most[d.field] || 0);
      return xScale(referenceValue);
    })
    .attr("height", yScale.bandwidth())
    .attr("rx", (d) => {
      const referenceValue = Math.max(0, +extremes.most[d.field] || 0);
      const referenceWidth = xScale(referenceValue);
      return Math.min(8, referenceWidth / 2, yScale.bandwidth() / 2);
    })
    .attr("ry", (d) => {
      const referenceValue = Math.max(0, +extremes.most[d.field] || 0);
      const referenceWidth = xScale(referenceValue);
      return Math.min(8, referenceWidth / 2, yScale.bandwidth() / 2);
    })
    .attr("fill", "#bdbdbd")
    .attr("opacity", 0);

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
    .attr("font-size", 15)
    .attr("font-weight", 700)
    .attr("fill", "#555")
    .text("0%");

  function updateState(stateName) {
    const isLeast = stateName === "least" || stateName === "least-annotated";
    const isAnnotated =
      stateName === "most-annotated" || stateName === "least-annotated";

    const current = isLeast ? extremes.least : extremes.most;
    const highlightCount = isLeast ? 2 : 3;
    const topServices = getTopServicesForDivision(current, highlightCount);
    const highlightedFields = new Set(topServices.map((d) => d.field));

    const currentProvince = cleanProvinceName(current.province);
    overallTitle.text(
      `Relative service access in ${current.division}, ${currentProvince}`,
    );

    rows.each(function (service) {
      const currentValue = Math.max(0, +current[service.field] || 0);
      const referenceValue = Math.max(0, +extremes.most[service.field] || 0);

      const row = d3.select(this);

      const rawCurrentBarWidth = xScale(currentValue);
      const referenceBarWidth = xScale(referenceValue);
      const currentBarWidth = Math.min(rawCurrentBarWidth, referenceBarWidth);

      row
        .select(".overall-bar-reference")
        .transition()
        .duration(250)
        .ease(d3.easeLinear)
        .attr("opacity", isLeast ? 0.45 : 0);

      const dynamicRadius = Math.min(
        8,
        currentBarWidth / 2,
        yScale.bandwidth() / 2,
      );

      row
        .select(".overall-bar-fill")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("width", currentBarWidth)
        .attr("rx", dynamicRadius)
        .attr("ry", dynamicRadius)
        .attr(
          "opacity",
          isAnnotated ? (highlightedFields.has(service.field) ? 1 : 0.22) : 1,
        )
        .attr(
          "stroke",
          isAnnotated && highlightedFields.has(service.field) ? "#222" : "none",
        )
        .attr(
          "stroke-width",
          isAnnotated && highlightedFields.has(service.field) ? 2 : 0,
        );

      row
        .select(".overall-bar-value")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("x", Math.min(currentBarWidth + 10, chartWidth + 10))
        .attr(
          "font-weight",
          isAnnotated && highlightedFields.has(service.field) ? 800 : 700,
        )
        .attr(
          "fill",
          isAnnotated && highlightedFields.has(service.field) ? "#111" : "#555",
        )
        .tween("text", function () {
          const that = d3.select(this);
          const start = parseFloat(that.text().replace("%", "")) || 0;
          const i = d3.interpolateNumber(start, currentValue);
          return function (t) {
            that.text(`${d3.format(".1f")(i(t))}%`);
          };
        });
    });

    if (!isAnnotated) {
      note.html(`
        <strong>${current.division}</strong>, ${cleanProvinceName(
          current.province,
        )} is shown here as the <strong>${
          isLeast ? "comparison division" : "most accessible division"
        }</strong>.
        <br /><br />
        Across all categories, <strong>${d3.format(".1f")(
          current.averageServicePercentage,
        )}%</strong> of blocks contain these services on average.
        <br />
        <strong>Blocks included:</strong> ${current.blockCount}
        <br />
        <strong>Population:</strong> ${formatPopulation(current.population)}
        <br />
      `);
      return;
    }

    if (!isLeast) {
      note.html(`
        <strong>In ${current.division}</strong> (most accessible), <strong>${formatServiceList(
          topServices,
        )}</strong> are most commonly found inside each block.
        <br /><br />
        Across all categories, <strong>${d3.format(".1f")(
          current.averageServicePercentage,
        )}%</strong> of blocks contain these services on average.
        <br />
        <strong>Blocks included:</strong> ${current.blockCount}
        <br />
        <strong>Population:</strong> ${formatPopulation(current.population)}
        <br />
      `);
    } else {
      note.html(`
        <strong>In ${current.division}</strong>, <strong>${formatServiceList(
          topServices,
        )}</strong> are the most commonly present services across blocks.
        <br /><br />
        Across all categories, <strong>${d3.format(".1f")(
          current.averageServicePercentage,
        )}%</strong> of blocks contain these services on average.
        <br />
        <strong>Blocks included:</strong> ${current.blockCount}
        <br />
        <strong>Population:</strong> ${formatPopulation(current.population)}
        <br />
      `);
    }
  }

  updateState("most");

  const steps = document.querySelectorAll(".overall-step");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        updateState(entry.target.dataset.state);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -25% 0px",
    },
  );

  steps.forEach((step) => observer.observe(step));
}

/* Vis 3 */
let selectedScatterDivisions = new Set();

function renderScatter(data) {
  d3.select("#scatter-vis").html("");
  d3.select("#scatter-selection").html("");

  const selectedAmenity = d3.select("#amenity-select").property("value");
  const amenityInfo = AMENITY_INFO[selectedAmenity];
  const field = amenityInfo?.field;

  if (!field) return;

  const scatterData = d3
    .rollups(
      data.filter(
        (d) => Number.isFinite(d.population) && Number.isFinite(d[field]),
      ),
      (rows) => ({
        division: rows[0]?.division || "Unknown Division",
        province: rows[0]?.province || "Unknown Province",
        population: rows[0]?.population || 0,
        proximity: d3.mean(rows, (d) => d[field]),
        blockCount: rows.length,
      }),
      (d) => d.division,
    )
    .map(([, value]) => value)
    .filter(
      (d) => Number.isFinite(d.population) && Number.isFinite(d.proximity),
    );

  if (!scatterData.length) return;

  const width = 760;
  const height = 460;
  const margin = { top: 50, right: 40, bottom: 65, left: 75 };

  const svg = d3
    .select("#scatter-vis")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

  const x = d3
    .scaleLinear()
    .domain(d3.extent(scatterData, (d) => d.population))
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(scatterData, (d) => d.proximity))
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(",")))
    .call((g) => g.selectAll("text").attr("font-size", 12));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(6))
    .call((g) => g.selectAll("text").attr("font-size", 12));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 18)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .text("Population");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .text(`Average ${selectedAmenity.toLowerCase()} proximity`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .attr("font-weight", 700)
    .text(`Population vs ${selectedAmenity} accessibility in British Columbia`);

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
    .style("border", "1px solid #bbb")
    .style("border-radius", "10px")
    .style("padding", "0.65rem 0.8rem")
    .style("font-size", "0.9rem")
    .style("line-height", "1.35")
    .style("box-shadow", "0 6px 18px rgba(0,0,0,0.12)")
    .style("z-index", 9999);

  const points = svg
    .append("g")
    .selectAll("circle")
    .data(scatterData, (d) => d.division)
    .join("circle")
    .attr("cx", (d) => x(d.population))
    .attr("cy", (d) => y(d.proximity))
    .attr("r", 5)
    .attr("fill", (d) =>
      selectedScatterDivisions.has(d.division) ? "#d62828" : color(d.division),
    )
    .attr("opacity", 0.9)
    .attr("stroke", "transparent")
    .attr("stroke-width", 0);

  points
    .on("mouseenter", function (event, d) {
      d3.select(this).raise().attr("stroke", "#111").attr("stroke-width", 2.5);

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
    .on("mouseleave", function (event, d) {
      d3.select(this)
        .attr(
          "stroke",
          selectedScatterDivisions.has(d.division) ? "#7f0000" : "transparent",
        )
        .attr("stroke-width", selectedScatterDivisions.has(d.division) ? 2 : 0);

      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      selectedScatterDivisions.add(d.division);
      updateScatterSelection(scatterData, points, color);
    });

  const topOutliers = scatterData
    .slice()
    .sort((a, b) => d3.descending(a.proximity, b.proximity))
    .slice(0, 10);

  svg
    .append("g")
    .selectAll("text.scatter-label")
    .data(topOutliers)
    .join("text")
    .attr("class", "scatter-label")
    .attr("x", (d) => x(d.population))
    .attr("y", (d) => y(d.proximity) - 8)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("fill", "#111")
    .text((d) => d.division);

  updateScatterSelection(scatterData, points, color);
}

function updateScatterSelection(scatterData, points, color) {
  points
    .attr("fill", (d) =>
      selectedScatterDivisions.has(d.division) ? "#d62828" : color(d.division),
    )
    .attr("stroke", (d) =>
      selectedScatterDivisions.has(d.division) ? "#7f0000" : "transparent",
    )
    .attr("stroke-width", (d) =>
      selectedScatterDivisions.has(d.division) ? 2 : 0,
    );

  const selectedData = scatterData
    .filter((d) => selectedScatterDivisions.has(d.division))
    .sort((a, b) => d3.descending(a.population, b.population));

  const container = d3.select("#scatter-selection");

  container.html("");

  container
    .append("h3")
    .style("margin", "1rem 0 0.75rem 0")
    .style("font-size", "1.05rem")
    .text("Selected divisions");

  const items = container
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "0.6rem")
    .selectAll(".scatter-selected-item")
    .data(selectedData, (d) => d.division)
    .join("div")
    .attr("class", "scatter-selected-item")
    .style("display", "flex")
    .style("justify-content", "space-between")
    .style("align-items", "center")
    .style("gap", "1rem")
    .style("padding", "0.75rem 0.9rem")
    .style("background", "#fff")
    .style("border", "1px solid #d9d9d9")
    .style("border-left", "8px solid #d62828")
    .style("border-radius", "10px");

  const textWrap = items
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "0.2rem");

  textWrap
    .append("div")
    .style("font-weight", 700)
    .text((d) => d.division);

  textWrap
    .append("div")
    .style("font-size", "0.92rem")
    .style("color", "#555")
    .text((d) => `Population: ${d3.format(",")(d.population)}`);

  textWrap
    .append("div")
    .style("font-size", "0.92rem")
    .style("color", "#555")
    .text((d) => `Average proximity: ${d3.format(".3f")(d.proximity)}`);

  items
    .append("button")
    .attr("type", "button")
    .text("×")
    .style("border", "none")
    .style("background", "transparent")
    .style("font-size", "1.2rem")
    .style("cursor", "pointer")
    .style("line-height", 1)
    .style("padding", "0.2rem 0.35rem")
    .on("click", function (event, d) {
      event.stopPropagation();
      selectedScatterDivisions.delete(d.division);
      updateScatterSelection(scatterData, points, color);
    });
}

// ── BC TIME-TO-LIFE INDEX VISUALIZATION ──────────────────────────────

// ── LIFESTYLE ARCHETYPES ─────────────────────────────────────────────

const serviceColors = {
  grocery: "#7fd3a0",
  transit: "#5b9fd4",
  health: "#f4a5a5",
  parks: "#f4d79f",
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

function renderArchetypes(filter = "") {
  const grid = document.getElementById("archetypesGrid");
  grid.replaceChildren();

  const filtered = filter
    ? archetypesData.filter(
        (a) => a.name.toLowerCase().replace(/\s+/g, "_") === filter,
      )
    : archetypesData;

  for (const arch of filtered) {
    const card = document.createElement("div");
    card.className = "archetype-card";
    card.style.borderLeftColor = arch.color;

    const archHeader = document.createElement("div");
    archHeader.className = "archetype-header";

    const iconDiv = document.createElement("div");
    iconDiv.className = "archetype-icon";
    iconDiv.style.background = `rgba(${hexToRgb(arch.color)}, 0.2)`;
    iconDiv.style.color = arch.color;
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
      barFill.style.width = `${Math.min(value, 100)}%`;
      barFill.style.background = serviceColors[service];
      barBg.appendChild(barFill);
      barDiv.appendChild(barBg);

      const valueDiv = document.createElement("div");
      valueDiv.className = "service-value";
      valueDiv.textContent = Math.round(value);
      barDiv.appendChild(valueDiv);

      card.appendChild(barDiv);
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
    card.appendChild(citiesSection);

    grid.appendChild(card);
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16,
      )}`
    : "255, 255, 255";
}

loadData();

// ── BC TIME-TO-LIFE INDEX CHART ───────────────────────────────────────

// Data
const data = [
  {
    city: "Vancouver",
    grocery: 37.5,
    transit: 150.0,
    healthcare: 7.5,
    parks: 60.0,
    total: 255.0,
  },
  {
    city: "Victoria",
    grocery: 75.0,
    transit: 150.0,
    healthcare: 15.0,
    parks: 60.0,
    total: 300.0,
  },
  {
    city: "Burnaby",
    grocery: 75.0,
    transit: 150.0,
    healthcare: 27.5,
    parks: 60.0,
    total: 312.5,
  },
  {
    city: "Chilliwack",
    grocery: 137.5,
    transit: 275.0,
    healthcare: 27.5,
    parks: 60.0,
    total: 500.0,
  },
  {
    city: "Prince George",
    grocery: 137.5,
    transit: 275.0,
    healthcare: 27.5,
    parks: 60.0,
    total: 500.0,
  },
  {
    city: "Fort St. John",
    grocery: 137.5,
    transit: 275.0,
    healthcare: 27.5,
    parks: 110.0,
    total: 550.0,
  },
];

// Service colors (matching the screenshot style)
const colors = {
  grocery: "#7fd3a0", // green
  transit: "#5b9fd4", // blue
  healthcare: "#f4a5a5", // pink/red
  parks: "#f4d79f", // yellow/beige
};

const services = ["grocery", "transit", "healthcare", "parks"];

// Render legend
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

// Draw chart
function drawChart() {
  const svg = d3.select("#chart");
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const width =
    Math.min(900, window.innerWidth - 80) - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  svg.attr(
    "viewBox",
    `0 0 ${width + margin.left + margin.right} ${
      height + margin.top + margin.bottom
    }`,
  );

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.city))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear().domain([0, 800]).range([height, 0]);

  // Stack the data
  const stack = d3.stack().keys(services);

  const stackedData = stack(data);

  // Draw bars
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
    .attr("stroke-width", 1);

  // Add total labels on top
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
  const yAxis = d3
    .axisLeft(y)
    .ticks(5)
    .tickFormat((d) => d);

  g.append("g")
    .call(yAxis)
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
  const xAxis = d3.axisBottom(x);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#666");

  // Grid lines
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

  // Move grid lines to back
  g.selectAll(".grid-line").lower();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderLegend();
  drawChart();
});

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
let activeFilters = [];
let selectedCSD = "";
let pickerOpen = false;

// Leaflet stuff
let map,
  canvasRenderer,
  markersLayer = null;

function initMap() {
  map = L.map("map", { zoomControl: true, preferCanvas: true }).setView(
    [49.25, -122.9],
    10,
  );

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    },
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
  buildPickerList();
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
  const hue = Math.round(48 + ratio * 94); // 48° = yellow, 142° = green
  return `hsl(${hue}, 85%, 52%)`;
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
            (v - minutesToProx(f.minutes)) / (1 - minutesToProx(f.minutes)),
          )
        : "#ccc";

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
