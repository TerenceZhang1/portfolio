import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');

  const projectsContainer = document.querySelector('.projects');

  if (!projectsContainer) {
    console.error('Error: Could not find an element with class "projects"');
    return;
  }

  renderProjects(projects, projectsContainer, 'h2');

  const titleElement = document.querySelector('.projects-title');
  if (titleElement) {
    const count = Array.isArray(projects) ? projects.length : 0;
    titleElement.textContent = `My Projects (${count})`;
  }
})();


import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value(d => d.value);
const color = d3.scaleOrdinal(d3.schemeTableau10);

const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let allProjects = [];
let query = '';
let selectedYear = null;

function computePieData(list) {
  const rolled = d3.rollups(list, v => v.length, d => String(d.year));
  return rolled.map(([year, count]) => ({ label: year, value: count }));
}

function textFilter(list) {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(p =>
    String(p.title || '').toLowerCase().includes(q) ||
    String(p.description || '').toLowerCase().includes(q)
  );
}

function yearFilter(list) {
  if (!selectedYear) return list;
  return list.filter(p => String(p.year) === String(selectedYear));
}

function renderList(list) {
  if (typeof renderProjects === 'function' && projectsContainer) {
    renderProjects(list, projectsContainer, 'h2');
  }
  if (titleElement) titleElement.textContent = `My Projects (${list.length})`;
}

function renderPieChart(list) {
  const data = computePieData(list);
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();
  const arcData = sliceGenerator(data);
  const selectedIndex = data.findIndex(d => d.label === String(selectedYear));

  arcData.forEach((slice, i) => {
    svg.append('path')
      .attr('d', arcGenerator(slice))
      .attr('fill', color(i))
      .attr('style', `--color:${color(i)}`)
      .attr('class', i === selectedIndex ? 'selected' : null)
      .on('click', () => {
        const nextIndex = i === selectedIndex ? -1 : i;
        selectedYear = nextIndex === -1 ? null : data[nextIndex].label;
        update();
      });
  });

  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', `legend__item${i === selectedIndex ? ' selected' : ''}`)
      .attr('style', `--color:${color(i)}`)
      .html(`<span class="legend__swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedYear = i === selectedIndex ? null : d.label;
        update();
      });
  });
}

function update() {
  const afterText = textFilter(allProjects);
  const yearsInSearch = new Set(afterText.map(p => String(p.year)));
  if (selectedYear && !yearsInSearch.has(String(selectedYear))) selectedYear = null;
  const forList = yearFilter(afterText);
  renderList(forList);
  renderPieChart(afterText);
}

(async () => {
  allProjects = await fetch('../lib/projects.json').then(r => r.json());
  update();
})();

searchInput.addEventListener('input', e => {
  query = e.target.value;
  update();
});
