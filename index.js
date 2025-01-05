// index.js
const generateIndexContent = (title, pageLinks, postLinks) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
  <title>${title}</title>
</head>
<body>
  <header>
    <nav>
        <ul>
            <li><a href="/home.html" data-turbo-frame="content" data-turbo-action="advance">Home</a></li>
            ${pageLinks.join('\n')}
            ${postLinks.length > 0 ? '<li><a href="/posts.html" data-turbo-frame="content" data-turbo-action="advance">Posts</a></li>' : ''}
        </ul>
    </nav>
    <h1>${title}</h1>
  </header>
  <main>
    <turbo-frame id="content">
    </turbo-frame>
  </main>
  <footer>
    Run <code>npm run build</code> to build the pages in the dist folder.
    Run <code>npm start</code> to start a local server.
  </footer>
</body>
</html>
  `;
};

module.exports = { generateIndexContent };
