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

