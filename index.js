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
    </turbo-frame>
  </main>
  <footer>
    Run <code>npx http-server dist</code> to start the server.
    Go to "localhost:8080" to see the homepage
  </footer>
</body>
</html>
  `;
};

module.exports = { generateIndexContent };
