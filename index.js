// index.js
const generateIndexContent = (pageLinks, postLinks) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
  <script type="module">import * as Turbo from 'https://esm.sh/@hotwired/turbo';</script>
  <title>Swifty Demo</title>
</head>
<body>
  <header>
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
            ${pageLinks.join('\n')}
            ${postLinks.length > 0 ? '<li><a href="/posts.html" data-turbo-frame="content" data-turbo-action="advance">Blog</a></li>' : ''}
        </ul>
    </nav>
    <h1>Swifty</h1>
  </header>
  <main>
    <turbo-frame id="content">
      Hello World From Swifty!
    </turbo-frame>
  </main>
  <footer>
    Run <code>npx http-server dist</code> to start the server.
    Go to "localhost:8080" to see the homepage
  </footer>
  <script>
  document.addEventListener("DOMContentLoaded", () => {
    const turboFrame = document.querySelector("turbo-frame#content");
    const path = window.location.pathname;

    // Map the current path to the corresponding HTML file
    const pagePath = path === "/" ? "/index.html" : path + ".html";
    console.log(path,pagePath)
    // Set the src attribute to load the content based on the URL
    turboFrame.setAttribute("src", pagePath);
  });
  document.addEventListener("turbo:frame-load", (event) => {
    const frameSrc = event.target.getAttribute("src");

    // Only proceed if the frame source ends with .html
    if (frameSrc && frameSrc.endsWith(".html")) {
      // Strip .html and update the browser's address bar without reloading
      const newPath = frameSrc.replace(".html", "");
      window.history.pushState({}, "", newPath);
    }
  });
  </script>
</body>
</html>
  `;
};

module.exports = { generateIndexContent };
