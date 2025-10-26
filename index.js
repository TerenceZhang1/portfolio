import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

(async () => {
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = Array.isArray(projects) ? projects.slice(0, 3) : [];
  const projectsContainer = document.querySelector('.projects');
  if (projectsContainer) {
    renderProjects(latestProjects, projectsContainer, 'h2');
  }

  const GITHUB_USER = 'TerenceZhang1'; 
  const githubData = await fetchGitHubData(GITHUB_USER);
  const profileStats = document.querySelector('#profile-stats');
  if (profileStats && githubData) {
    profileStats.innerHTML = `
      <h2>GitHub Stats</h2>
      <dl class="grid-stats">
        <dt>Public Repos</dt><dd>${githubData.public_repos ?? 0}</dd>
        <dt>Public Gists</dt><dd>${githubData.public_gists ?? 0}</dd>
        <dt>Followers</dt><dd>${githubData.followers ?? 0}</dd>
        <dt>Following</dt><dd>${githubData.following ?? 0}</dd>
      </dl>
    `;
  }
})();
