import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits = [];
let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
	const data = await d3.csv('loc.csv', (row) => ({
		...row,
		line: +row.line,
		depth: +row.depth,
		length: +row.length,
		date: new Date(row.date + 'T00:00' + (row.timezone || '')),
		datetime: new Date(row.datetime),
	}));
	return data;
}

function processCommits(data) {
	return d3
		.groups(data, (d) => d.commit)
		.map(([commit, lines]) => {
			const first = lines[0];
			const { author, date, time, timezone, datetime } = first;
			const ret = {
				id: commit,
				url: 'https://github.com/TerenceZhang1/portfolio/commit/' + commit,
				author,
				date,
				time,
				timezone,
				datetime,
				hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
				totalLines: lines.length,
			};
			Object.defineProperty(ret, 'lines', {
				value: lines,
				enumerable: false,
				writable: false,
				configurable: false,
			});
			return ret;
		});
}

function distinctCount(data, accessor) {
	return d3.group(data, accessor).size;
}

function longestFileInfo(data) {
	const fileLengths = d3.rollups(data, (v) => d3.max(v, (r) => r.line), (d) => d.file);
	const longest = d3.greatest(fileLengths, (d) => d[1]);
	return { file: longest?.[0] ?? 'N/A', length: longest?.[1] ?? 0 };
}

function averageFileLength(data) {
	const fileLengths = d3.rollups(data, (v) => d3.max(v, (r) => r.line), (d) => d.file);
	return d3.mean(fileLengths, (d) => d[1]) ?? 0;
}

function averageLineCharLength(data) {
	return d3.mean(data, (d) => d.length) ?? 0;
}

function maxDepthInfo(data) {
	const deepest = d3.greatest(data, (d) => d.depth);
	return deepest
		? { depth: deepest.depth, file: deepest.file, line: deepest.line }
		: { depth: 0, file: 'N/A', line: 0 };
}

function busiestDayPeriod(data) {
	const rolled = d3.rollups(
		data,
		(v) => v.length,
		(d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
	);
	const max = d3.greatest(rolled, (d) => d[1]);
	return max?.[0] ?? 'N/A';
}

function busiestWeekday(data) {
	const rolled = d3.rollups(
		data,
		(v) => v.length,
		(d) => new Date(d.datetime).toLocaleString('en', { weekday: 'long' })
	);
	const max = d3.greatest(rolled, (d) => d[1]);
	return max?.[0] ?? 'N/A';
}

function renderCommitInfo(data, commits) {
	const dl = d3.select('#stats').append('dl').attr('class', 'stats');
	const add = (term, val) => {
		dl.append('dt').html(term);
		dl.append('dd').text(val);
	};
	add('Total <abbr title="Lines of code">LOC</abbr>', data.length);
	add('Total commits', commits.length);
	add('Files', distinctCount(data, (d) => d.file));
	const { file: lf, length: ll } = longestFileInfo(data);
	add('Longest file', `${lf} (${ll} lines)`);
	add('Avg file length (lines)', d3.format('.2f')(averageFileLength(data)));
	add('Avg line length (chars)', d3.format('.2f')(averageLineCharLength(data)));
	const { depth, file, line } = maxDepthInfo(data);
	add('Max depth', `${depth} (at ${file}:${line})`);
	add('Busiest time of day', busiestDayPeriod(data));
	add('Busiest weekday', busiestWeekday(data));
}

function renderTooltipContent(commit) {
	const link = document.getElementById('commit-link');
	const date = document.getElementById('commit-date');
	const time = document.getElementById('commit-tooltip-time');
	const author = document.getElementById('commit-author');
	const lines = document.getElementById('commit-lines');
	if (Object.keys(commit).length === 0) return;
	link.href = commit.url;
	link.textContent = commit.id;
	date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
	time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
	author.textContent = commit.author;
	lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
	const tooltip = document.getElementById('commit-tooltip');
	tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
	const tooltip = document.getElementById('commit-tooltip');
	tooltip.style.left = `${event.clientX + 10}px`;
	tooltip.style.top = `${event.clientY + 10}px`;
}

function renderSelectionCount(selection, commits, xScale, yScale) {
	const selectedCommits = selection
		? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
		: [];
	const el = document.getElementById('selection-count');
	el.textContent = `${selectedCommits.length || 'No'} commits selected`;
	return selectedCommits;
}

function renderLanguageBreakdown(selection, commits, xScale, yScale) {
	const selected = selection
		? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
		: [];
	const container = document.getElementById('language-breakdown');
	if (selected.length === 0) {
		container.innerHTML = '';
		return;
	}
	const lines = selected.flatMap((d) => d.lines);
	const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);
	container.innerHTML = '';
	for (const [language, count] of breakdown) {
		const proportion = count / lines.length;
		const formatted = d3.format('.1~%')(proportion);
		container.innerHTML += `
			<dt>${language}</dt>
			<dd>${count} lines (${formatted})</dd>
		`;
	}
}

function isCommitSelected(selection, commit, xScale, yScale) {
	if (!selection) return false;
	const [[x0, y0], [x1, y1]] = selection;
	const x = xScale(commit.datetime);
	const y = yScale(commit.hourFrac);
	return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderScatterPlot(data, commits) {
	const width = 1000;
	const height = 600;
	const margin = { top: 10, right: 10, bottom: 30, left: 40 };
	const svg = d3
		.select('#chart')
		.append('svg')
		.attr('viewBox', `0 0 ${width} ${height}`)
		.style('overflow', 'visible');
	const usable = {
		left: margin.left,
		right: width - margin.right,
		top: margin.top,
		bottom: height - margin.bottom,
		width: width - margin.left - margin.right,
		height: height - margin.top - margin.bottom,
	};
	const xScale = d3
		.scaleTime()
		.domain(d3.extent(commits, (d) => d.datetime))
		.range([usable.left, usable.right])
		.nice();
	const yScale = d3.scaleLinear().domain([0, 24]).range([usable.bottom, usable.top]);
	const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
	const rScale = d3.scaleSqrt().domain([minLines ?? 0, maxLines ?? 1]).range([2, 30]);
	svg.append('g')
		.attr('class', 'gridlines')
		.attr('transform', `translate(${usable.left},0)`)
		.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));
	const xAxis = d3.axisBottom(xScale);
	const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
	svg.append('g')
		.attr('transform', `translate(0,${usable.bottom})`)
		.call(xAxis);
	svg.append('g')
		.attr('transform', `translate(${usable.left},0)`)
		.call(yAxis);
	const dots = svg.append('g').attr('class', 'dots');
	const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
	dots
		.selectAll('circle')
		.data(sortedCommits, (d) => d.id)
		.join('circle')
		.attr('cx', (d) => xScale(d.datetime))
		.attr('cy', (d) => yScale(d.hourFrac))
		.attr('r', (d) => rScale(d.totalLines))
		.attr('fill', 'steelblue')
		.style('fill-opacity', 0.7)
		.on('mouseenter', (event, commit) => {
			d3.select(event.currentTarget).style('fill-opacity', 1);
			renderTooltipContent(commit);
			updateTooltipVisibility(true);
			updateTooltipPosition(event);
		})
		.on('mousemove', (event) => {
			updateTooltipPosition(event);
		})
		.on('mouseleave', (event) => {
			d3.select(event.currentTarget).style('fill-opacity', 0.7);
			updateTooltipVisibility(false);
		});
	const brush = d3.brush().on('start brush end', (event) => {
		const sel = event.selection;
		d3.selectAll('circle').classed('selected', (d) => isCommitSelected(sel, d, xScale, yScale));
		renderSelectionCount(sel, commits, xScale, yScale);
		renderLanguageBreakdown(sel, commits, xScale, yScale);
	});
	svg.call(brush);
	svg.selectAll('.dots, .overlay ~ *').raise();
}
function updateScatterPlot(data, commitsToShow) {
  const svg = d3.select('#chart').select('svg');

  const usableLeft = 40;
  const usableRight = 1000 - 10;
  const usableBottom = 600 - 30;

  const xScale = d3.scaleTime()
    .domain(d3.extent(commitsToShow, d => d.datetime))
    .range([usableLeft, usableRight])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableBottom, 10]);

  const [minLines, maxLines] = d3.extent(commitsToShow, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines ?? 0, maxLines ?? 1])
    .range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select('g').filter(function () {
    return d3.select(this).attr('transform')?.includes(`translate(0,${usableBottom})`);
  });
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commitsToShow, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0)
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
          d3.select(event.currentTarget).style('fill-opacity', 1);
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
          d3.select(event.currentTarget).style('fill-opacity', 0.7);
          updateTooltipVisibility(false);
        }),
      update => update,
      exit => exit.remove()
    )
    .transition()
    .duration(300)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines));
}


const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);
filteredCommits = commits; 

const slider = document.querySelector('#commit-progress');
const timeEl = document.querySelector('#commit-time');

function onTimeSliderChange() {
  commitProgress = +slider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  timeEl.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

slider.addEventListener('input', onTimeSliderChange);

onTimeSliderChange();

function updateFileDisplay(commitsSubset) {
  const lines = commitsSubset.flatMap(d => d.lines);

  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
	.selectAll('div')
	.data(files, d => d.name)
	.join(
		enter => enter.append('div').call(div => {
			div.append('dt').append('code');
			div.append('dd');
		})
  )
  .attr('style', d => `--color: ${colors(d.lines[0].type)}`);

  filesContainer
    .select('dt > code')
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}
