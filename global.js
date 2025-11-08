console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// currentLink?.classList.add("current");

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact Me' },
  { url: 'resume.html', title: 'Resume' },
  { url: 'meta/', title: 'Meta' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";


for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a)
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }   
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`,
);

let select = document.querySelector('.color-scheme select');
if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}
select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  document.documentElement.style.setProperty('color-scheme', event.target.value);
  localStorage.colorScheme = event.target.value;

});


let form = document.querySelector('form');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + '?';
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join('&');
  location.href = url;
});



export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!(containerElement instanceof Element)) return;
  const valid = new Set(['h1','h2','h3','h4','h5','h6']);
  const tag = valid.has(String(headingLevel).toLowerCase()) ? String(headingLevel).toLowerCase() : 'h2';
  const list = Array.isArray(projects) ? projects : (projects ? [projects] : []);
  containerElement.innerHTML = '';
  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'projects-empty';
    p.textContent = 'No projects to display.';
    containerElement.appendChild(p);
    return;
  }
  for (const proj of list) {
    const title = proj?.title ?? 'Untitled Project';
    const imgSrc = proj?.image ?? '';
    const desc = proj?.description ?? '';
    const year = proj?.year ?? '';
    const article = document.createElement('article');
    const heading = document.createElement(tag);
    heading.textContent = title;
    article.appendChild(heading);
    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = title || 'Project image';
      article.appendChild(img);
    }
    
    const p = document.createElement('p');
    p.textContent = desc;
    const textDiv = document.createElement('div');
    textDiv.appendChild(p);

    const y = document.createElement('p');
    y.textContent = "Year: "+year;
    y.classList.add('project-year');
    textDiv.appendChild(y);
    article.appendChild(textDiv);

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  if (!username) return null;
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
